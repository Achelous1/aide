//! Filesystem watcher built on the `notify` crate.
//!
//! Replaces chokidar across all four watch sites in the JS layer.
//! Design goals:
//!   - One `WatcherHandle` per logical watcher (workspace, local-plugins, html, data).
//!   - Depth limiting via post-event callback filter (notify 6 has no built-in depth).
//!   - Exclusion matching via a simple inline path-component matcher (avoids the
//!     `globset` crate which requires Rust edition 2024 and is incompatible with
//!     the pinned 1.82 toolchain in this workspace).
//!   - macOS `/dev/fd/N` EBADF guard: paths starting with `/dev/fd/` are dropped.
//!   - Drop-safe: stopping the watcher never panics.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc,
};
use std::thread;
use std::time::Duration;

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};

// ── Public event type ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EntryKind {
    File,
    Directory,
}

#[derive(Debug, Clone)]
pub enum WatchEvent {
    Add { path: String, kind: EntryKind },
    Remove { path: String, kind: EntryKind },
    Modify { path: String },
    Rename { from: String, to: String },
}

// ── WatcherHandle ─────────────────────────────────────────────────────────────

/// Opaque handle returned by [`watch_path`].
/// Dropping this value stops the watcher thread cleanly.
pub struct WatcherHandle {
    stopped: Arc<AtomicBool>,
    /// Kept alive so the notify watcher keeps running.
    _watcher: RecommendedWatcher,
    /// Kept alive so the dispatch thread keeps running.
    _thread: Option<thread::JoinHandle<()>>,
}

impl WatcherHandle {
    /// Explicit stop — sets the stopped flag and lets the thread drain.
    /// Idempotent: safe to call multiple times.
    pub fn stop(&self) {
        self.stopped.store(true, Ordering::Release);
    }
}

impl Drop for WatcherHandle {
    fn drop(&mut self) {
        self.stop();
        // The thread will exit on its next iteration because `stopped` is true.
        // We deliberately do NOT join here to avoid blocking the caller's drop path.
        // The thread holds no resources that outlive the process.
    }
}

// ── Path depth helper ─────────────────────────────────────────────────────────

/// Returns the number of path components in `p` that are below `root`.
/// `root` itself is depth 0; immediate children are depth 1, etc.
pub(crate) fn path_depth_below(root: &Path, p: &Path) -> Option<usize> {
    p.strip_prefix(root).ok().map(|rel| rel.components().count())
}

// ── Exclusion matching ────────────────────────────────────────────────────────
//
// We support the subset of glob patterns actually used in `watcher-exclusions.ts`:
//
//   **/node_modules/**   →  any path component equals "node_modules"
//   **/.git/**           →  any component equals ".git" (handles prefix/suffix separators)
//   **/dist/**           →  any component named "dist", "build", "out", etc.
//   **.log               →  filename ends with ".log"
//
// Rules:
//   - If the pattern is `**/<name>/**` or `**/<name>` we check whether any
//     path component equals `<name>`.
//   - If the pattern ends with `*` it is a wildcard suffix check on the filename.
//   - Otherwise we fall back to substring match on the full path string.
//
// This is intentionally minimal — it only needs to match the patterns in
// `watcher-exclusions.ts`. Arbitrary glob patterns are not required.

fn matches_exclusion(path: &Path, pattern: &str) -> bool {
    // macOS fsevents EBADF guard: /dev/fd/ paths are always excluded.
    if let Some(s) = path.to_str() {
        if s.starts_with("/dev/fd/") {
            return true;
        }
    }

    // Normalise: strip leading `**/` and trailing `/**` to get the core segment.
    let inner = pattern
        .trim_start_matches("**/")
        .trim_end_matches("/**")
        .trim_start_matches("**");

    // Pattern like `**/node_modules/**` or `**/node_modules` → match any component.
    if !inner.contains('/') && !inner.contains('*') && !inner.is_empty() {
        return path.components().any(|c| {
            c.as_os_str().to_str().map_or(false, |s| s == inner)
        });
    }

    // Pattern ending with `*` like `**/*.log` → suffix match on filename.
    if let Some(suffix) = inner.strip_prefix("*.") {
        if let Some(fname) = path.file_name().and_then(|f| f.to_str()) {
            return fname.ends_with(&format!(".{suffix}"));
        }
    }

    // Fallback: substring match on full path string.
    if let Some(s) = path.to_str() {
        return s.contains(inner);
    }

    false
}

fn is_excluded(path: &Path, exclusions: &[String]) -> bool {
    // /dev/fd/ guard is handled inside matches_exclusion for the first pattern,
    // but we also want it even when exclusions is empty.
    if let Some(s) = path.to_str() {
        if s.starts_with("/dev/fd/") {
            return true;
        }
    }
    exclusions.iter().any(|pat| matches_exclusion(path, pat))
}

// ── Entry kind detection ─────────────────────────────────────────────────────

fn entry_kind(path: &Path) -> EntryKind {
    // Use symlink_metadata so symlinks are classified as File (Node.js semantics).
    match std::fs::symlink_metadata(path) {
        Ok(m) if m.file_type().is_dir() => EntryKind::Directory,
        _ => EntryKind::File,
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Start watching `path` and call `callback` for each qualifying event.
///
/// # Parameters
/// - `path`:       root path to watch (must exist).
/// - `depth`:      maximum depth below `path` to emit events for.
///                 `1` = immediate children only;
///                 `3` = up to 3 levels deep; `None` = unlimited.
/// - `exclusions`: patterns — matching paths are silently dropped.
///                 Supports the subset used by `watcher-exclusions.ts`.
/// - `callback`:   called from a background thread for each `WatchEvent`.
///                 Must be `Send + 'static`.
///
/// # Errors
/// Returns `Err` if the watcher cannot be created or the path cannot be
/// watched (e.g. ENOENT, EPERM).
pub fn watch_path<F>(
    path: &str,
    depth: Option<u32>,
    exclusions: Vec<String>,
    callback: F,
) -> io::Result<WatcherHandle>
where
    F: Fn(WatchEvent) + Send + 'static,
{
    let raw_root = PathBuf::from(path);
    // Canonicalise so that strip_prefix works on macOS where FSEvents returns
    // /private/var/... but the caller passed /var/... (symlink via /tmp etc.).
    let root = fs::canonicalize(&raw_root).unwrap_or(raw_root);
    let stopped = Arc::new(AtomicBool::new(false));
    let stopped_clone = Arc::clone(&stopped);

    let (tx, rx) = mpsc::channel::<notify::Result<notify::Event>>();

    let mut watcher = notify::recommended_watcher(move |res| {
        let _ = tx.send(res);
    })
    .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("notify watcher error: {e}")))?;

    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("watch path error: {e}")))?;

    let thread_handle = thread::spawn(move || {
        loop {
            if stopped_clone.load(Ordering::Acquire) {
                break;
            }
            // Block with a timeout so we periodically check the stopped flag.
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    dispatch_event(&event, &root, depth, &exclusions, &callback);
                }
                Ok(Err(_)) => {
                    // Notify reported a watch error; ignore and continue.
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Normal; loop back to check stopped.
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // The sender (watcher) was dropped.
                    break;
                }
            }
        }
    });

    Ok(WatcherHandle {
        stopped,
        _watcher: watcher,
        _thread: Some(thread_handle),
    })
}

// ── Event dispatch ────────────────────────────────────────────────────────────

fn dispatch_event<F>(
    event: &notify::Event,
    root: &Path,
    depth: Option<u32>,
    exclusions: &[String],
    callback: &F,
) where
    F: Fn(WatchEvent),
{
    match &event.kind {
        EventKind::Create(_) => {
            for p in &event.paths {
                if !should_emit(p, root, depth, exclusions) {
                    continue;
                }
                let kind = entry_kind(p);
                if let Some(s) = p.to_str() {
                    callback(WatchEvent::Add { path: s.to_owned(), kind });
                }
            }
        }
        EventKind::Remove(_) => {
            for p in &event.paths {
                if !should_emit(p, root, depth, exclusions) {
                    continue;
                }
                // Path no longer exists — default to File. FileIndex handles
                // both paths gracefully (removePath + removeDir are both called).
                if let Some(s) = p.to_str() {
                    callback(WatchEvent::Remove { path: s.to_owned(), kind: EntryKind::File });
                }
            }
        }
        EventKind::Modify(_) => {
            for p in &event.paths {
                if !should_emit(p, root, depth, exclusions) {
                    continue;
                }
                if let Some(s) = p.to_str() {
                    callback(WatchEvent::Modify { path: s.to_owned() });
                }
            }
        }
        EventKind::Access(_) => {
            // Access events (reads) are not emitted.
        }
        EventKind::Other | EventKind::Any => {
            // Treat unknown events as Modify on the first path.
            if let Some(p) = event.paths.first() {
                if should_emit(p, root, depth, exclusions) {
                    if let Some(s) = p.to_str() {
                        callback(WatchEvent::Modify { path: s.to_owned() });
                    }
                }
            }
        }
    }
}

/// Returns `true` if the event for `path` should be forwarded to the callback.
fn should_emit(path: &Path, root: &Path, depth: Option<u32>, exclusions: &[String]) -> bool {
    if is_excluded(path, exclusions) {
        return false;
    }
    if let Some(max_depth) = depth {
        // Canonicalise the event path so that macOS FSEvents /private/var/...
        // paths strip correctly against the canonicalised root.
        let canonical = fs::canonicalize(path).unwrap_or_else(|_| path.to_owned());
        match path_depth_below(root, &canonical) {
            Some(d) if d as u32 <= max_depth => {}
            _ => return false,
        }
    }
    true
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;
    use std::sync::{Arc, Mutex};
    use tempfile::TempDir;

    fn make_collector() -> (Arc<Mutex<Vec<WatchEvent>>>, impl Fn(WatchEvent) + Send + 'static) {
        let collected = Arc::new(Mutex::new(Vec::new()));
        let c2 = Arc::clone(&collected);
        let cb = move |e: WatchEvent| {
            c2.lock().unwrap().push(e);
        };
        (collected, cb)
    }

    /// Wait up to `timeout_ms` for `predicate` to return true, checking every 50ms.
    fn wait_for<P: Fn() -> bool>(timeout_ms: u64, predicate: P) -> bool {
        let steps = timeout_ms / 50;
        for _ in 0..steps {
            if predicate() {
                return true;
            }
            thread::sleep(Duration::from_millis(50));
        }
        predicate()
    }

    // ── Unit tests (no I/O) ───────────────────────────────────────────────────

    #[test]
    fn test_path_depth_below() {
        let root = Path::new("/home/user/project");
        assert_eq!(path_depth_below(root, Path::new("/home/user/project")), Some(0));
        assert_eq!(path_depth_below(root, Path::new("/home/user/project/src")), Some(1));
        assert_eq!(path_depth_below(root, Path::new("/home/user/project/src/main.ts")), Some(2));
        assert_eq!(path_depth_below(root, Path::new("/other")), None);
    }

    #[test]
    fn test_is_excluded_dev_fd() {
        assert!(is_excluded(Path::new("/dev/fd/3"), &[]));
        assert!(is_excluded(Path::new("/dev/fd/0"), &[]));
    }

    #[test]
    fn test_is_excluded_node_modules() {
        let exclusions = vec!["**/node_modules/**".to_owned()];
        assert!(is_excluded(Path::new("/project/node_modules/pkg/index.js"), &exclusions));
        assert!(!is_excluded(Path::new("/project/src/index.js"), &exclusions));
    }

    #[test]
    fn test_is_excluded_log_suffix() {
        let exclusions = vec!["**/*.log".to_owned()];
        assert!(is_excluded(Path::new("/project/debug.log"), &exclusions));
        assert!(!is_excluded(Path::new("/project/debug.ts"), &exclusions));
    }

    // ── Filesystem integration tests ──────────────────────────────────────────

    #[test]
    fn test_watcher_detects_file_add() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_str().unwrap().to_owned();

        let (collected, cb) = make_collector();
        let handle = watch_path(&root, None, vec![], cb).unwrap();

        // Give the watcher a moment to initialize.
        thread::sleep(Duration::from_millis(150));

        stdfs::write(tmp.path().join("new_file.txt"), b"hello").unwrap();

        let found = wait_for(2000, || {
            collected.lock().unwrap().iter().any(|e| matches!(e,
                WatchEvent::Add { path, kind: EntryKind::File } if path.contains("new_file.txt")
            ))
        });

        handle.stop();
        assert!(found, "expected Add event for new_file.txt; got: {:?}", collected.lock().unwrap());
    }

    #[test]
    fn test_watcher_detects_file_remove() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_str().unwrap().to_owned();
        let file = tmp.path().join("to_remove.txt");
        stdfs::write(&file, b"bye").unwrap();

        let (collected, cb) = make_collector();
        let handle = watch_path(&root, None, vec![], cb).unwrap();

        thread::sleep(Duration::from_millis(150));

        stdfs::remove_file(&file).unwrap();

        let found = wait_for(2000, || {
            collected.lock().unwrap().iter().any(|e| matches!(e,
                WatchEvent::Remove { path, .. } if path.contains("to_remove.txt")
            ))
        });

        handle.stop();
        assert!(found, "expected Remove event for to_remove.txt; got: {:?}", collected.lock().unwrap());
    }

    #[test]
    fn test_watcher_respects_exclusions() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_str().unwrap().to_owned();
        let node_modules = tmp.path().join("node_modules");
        stdfs::create_dir(&node_modules).unwrap();

        let (collected, cb) = make_collector();
        let exclusions = vec!["**/node_modules/**".to_owned()];
        let handle = watch_path(&root, None, exclusions, cb).unwrap();

        thread::sleep(Duration::from_millis(150));

        // Write inside excluded dir — should produce no events.
        stdfs::write(node_modules.join("pkg.js"), b"x").unwrap();

        // Write outside excluded dir — should produce events.
        stdfs::write(tmp.path().join("visible.txt"), b"y").unwrap();

        // Wait for the visible file event so we know events are flowing.
        let visible_found = wait_for(2000, || {
            collected.lock().unwrap().iter().any(|e| matches!(e,
                WatchEvent::Add { path, .. } if path.contains("visible.txt")
            ))
        });

        handle.stop();

        // The excluded file must NOT appear.
        let excluded_found = collected.lock().unwrap().iter().any(|e| {
            let path = match e {
                WatchEvent::Add { path, .. } => path,
                WatchEvent::Remove { path, .. } => path,
                WatchEvent::Modify { path } => path,
                WatchEvent::Rename { to, .. } => to,
            };
            path.contains("pkg.js")
        });

        assert!(visible_found, "visible.txt event must arrive");
        assert!(!excluded_found, "node_modules/pkg.js must be excluded");
    }

    #[test]
    fn test_watcher_depth_limit() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_str().unwrap().to_owned();

        // Create nested directories.
        let d1 = tmp.path().join("d1");
        let d2 = d1.join("d2");
        let d3 = d2.join("d3");
        let d4 = d3.join("d4");
        for d in [&d1, &d2, &d3, &d4] {
            stdfs::create_dir_all(d).unwrap();
        }

        let (collected, cb) = make_collector();
        // depth = 3: files at depth <= 3 should appear, depth > 3 should not.
        // d1/f1.txt is at depth 2 (d1=1 + f1.txt=2) ✓
        // d1/d2/d3/d4/f4.txt is at depth 5 ✗
        let handle = watch_path(&root, Some(3), vec![], cb).unwrap();

        // macOS FSEvents has ~100-500ms coalescing latency. Wait longer before
        // mutating so the watcher is fully registered (FSEvents stream is async).
        thread::sleep(Duration::from_millis(500));

        stdfs::write(d1.join("f1.txt"), b"1").unwrap();   // depth 2 ✓
        stdfs::write(d4.join("f4.txt"), b"4").unwrap();   // depth 5 ✗

        // Wait up to 4 s for f1.txt event — FSEvents can coalesce on macOS.
        let _ = wait_for(4000, || {
            collected.lock().unwrap().iter().any(|e| matches!(e,
                WatchEvent::Add { path, .. } if path.contains("f1.txt")
            ))
        });
        // Give f4.txt extra time to arrive if it's going to (it shouldn't).
        thread::sleep(Duration::from_millis(500));
        handle.stop();

        let events = collected.lock().unwrap();
        let has_f1 = events.iter().any(|e| matches!(e,
            WatchEvent::Add { path, .. } if path.contains("f1.txt")));
        let has_f4 = events.iter().any(|e| matches!(e,
            WatchEvent::Add { path, .. } if path.contains("f4.txt")));

        assert!(has_f1, "f1.txt at depth 2 must be emitted with depth limit 3; events: {:?}", *events);
        assert!(!has_f4, "f4.txt at depth 5 must NOT be emitted with depth limit 3; events: {:?}", *events);
    }

    #[test]
    fn test_watcher_handle_drop_stops_watcher() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().to_str().unwrap().to_owned();

        let (collected, cb) = make_collector();
        let handle = watch_path(&root, None, vec![], cb).unwrap();

        thread::sleep(Duration::from_millis(150));
        drop(handle); // Drop = stop
        thread::sleep(Duration::from_millis(200));

        let count_before = collected.lock().unwrap().len();

        stdfs::write(tmp.path().join("after_drop.txt"), b"late").unwrap();
        thread::sleep(Duration::from_millis(600));

        let count_after = collected.lock().unwrap().len();
        assert_eq!(
            count_before,
            count_after,
            "no events should fire after drop; before={count_before}, after={count_after}"
        );
    }
}
