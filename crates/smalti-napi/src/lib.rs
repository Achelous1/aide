#![warn(clippy::all)]

use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;

/// napi-exported shape. Named separately from `smalti_core::FileNode` to avoid
/// confusion between the domain type (aide-core) and the JS-boundary type (aide-napi).
#[napi(object)]
pub struct ExportedFileNode {
    pub name: String,
    pub path: String,
    /// "file" or "directory" — mirrors TypeScript FileTreeNode.type
    #[napi(js_name = "type")]
    pub node_type: String,
}

#[napi]
pub fn read_tree(dir_path: String) -> Vec<ExportedFileNode> {
    smalti_core::read_tree(&dir_path)
        .into_iter()
        .map(|n| ExportedFileNode {
            name: n.name,
            path: n.path,
            node_type: match n.node_type {
                smalti_core::NodeType::File => "file".to_string(),
                smalti_core::NodeType::Directory => "directory".to_string(),
            },
        })
        .collect()
}

fn file_node_to_exported(n: smalti_core::FileNode) -> ExportedFileNode {
    ExportedFileNode {
        name: n.name,
        path: n.path,
        node_type: match n.node_type {
            smalti_core::NodeType::File => "file".to_string(),
            smalti_core::NodeType::Directory => "directory".to_string(),
        },
    }
}

/// String enum for `ExportedReadTreeError.code`.
/// napi-rs marshals this to/from `'EPERM' | 'ENOENT' | 'ENOTDIR' | 'UNKNOWN'` on the TS side,
/// which is stronger than a plain `string`.
#[napi(string_enum)]
pub enum ExportedReadTreeErrorCode {
    EPERM,
    ENOENT,
    ENOTDIR,
    UNKNOWN,
}

/// Mirrors FsReadTreeError in TypeScript ipc.ts.
#[napi(object)]
pub struct ExportedReadTreeError {
    pub code: ExportedReadTreeErrorCode,
    pub path: String,
    pub message: String,
}

/// Return value of read_tree_with_error — mirrors { nodes, error?, skippedCount } in TS.
#[napi(object)]
pub struct ExportedReadTreeResult {
    pub nodes: Vec<ExportedFileNode>,
    pub error: Option<ExportedReadTreeError>,
    /// Number of entries skipped because their names were not valid UTF-8.
    /// Zero on most systems; non-zero only on Linux ext4/tmpfs with non-UTF8 filenames.
    pub skipped_count: u32,
}

/// Converts an `io::Error` to a `napi::Error` with a Node.js-compatible error code
/// prefix in the message (e.g. "ENOENT: No such file or directory '/path'").
/// This mirrors the format Node.js uses for `fs` errors so callers can match on
/// `err.message.startsWith('ENOENT')` etc.
fn io_to_napi(path: &str, err: std::io::Error) -> napi::Error {
    let code = match err.kind() {
        std::io::ErrorKind::NotFound => "ENOENT",
        std::io::ErrorKind::PermissionDenied => "EACCES",
        std::io::ErrorKind::AlreadyExists => "EEXIST",
        std::io::ErrorKind::InvalidInput => "EINVAL",
        std::io::ErrorKind::InvalidData => "EINVAL",
        _ => "EIO",
    };
    napi::Error::from_reason(format!("{}: {} '{}'", code, err, path))
}

#[napi]
pub fn read_file(path: String) -> napi::Result<String> {
    smalti_core::read_file(&path).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn write_file(path: String, content: String) -> napi::Result<()> {
    smalti_core::write_file(&path, &content).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn delete_path(path: String) -> napi::Result<()> {
    smalti_core::delete_path(&path).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn read_tree_with_error(dir_path: String) -> ExportedReadTreeResult {
    let result = smalti_core::read_tree_with_error(&dir_path);
    ExportedReadTreeResult {
        nodes: result.nodes.into_iter().map(file_node_to_exported).collect(),
        error: result.error.map(|e| ExportedReadTreeError {
            code: match e.code {
                smalti_core::ReadTreeErrorCode::EPERM => ExportedReadTreeErrorCode::EPERM,
                smalti_core::ReadTreeErrorCode::ENOENT => ExportedReadTreeErrorCode::ENOENT,
                smalti_core::ReadTreeErrorCode::ENOTDIR => ExportedReadTreeErrorCode::ENOTDIR,
                smalti_core::ReadTreeErrorCode::UNKNOWN => ExportedReadTreeErrorCode::UNKNOWN,
            },
            path: e.path,
            message: e.message,
        }),
        skipped_count: result.skipped_count,
    }
}

// ── PTY bindings ──────────────────────────────────────────────────────────────

/// Payload delivered to the JS `onData` callback.
#[napi(object)]
pub struct PtyDataPayload {
    pub data: String,
}

/// Payload delivered to the JS `onExit` callback.
#[napi(object)]
pub struct PtyExitPayload {
    pub exit_code: i32,
}

/// Opaque JS handle for a running PTY process.
/// Call `.write()`, `.resize()`, or `.kill()` to interact with it.
#[napi]
pub struct PtyJsHandle {
    inner: smalti_core::pty::PtyHandle,
}

#[napi]
impl PtyJsHandle {
    /// Write a string to the PTY stdin.
    #[napi]
    pub fn write(&self, data: String) -> napi::Result<()> {
        self.inner
            .write(data.as_bytes())
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Resize the PTY.
    #[napi]
    pub fn resize(&self, cols: u16, rows: u16) -> napi::Result<()> {
        self.inner
            .resize(cols, rows)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Kill the PTY child process.
    #[napi]
    pub fn kill(&self) -> napi::Result<()> {
        self.inner
            .kill()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}

/// Spawn a PTY process.
///
/// - `env`: list of `[key, value]` tuples forwarded to the child process.
/// - `on_data`: called on the JS thread with each output chunk.
/// - `on_exit`: called on the JS thread once when the process exits.
///
/// Returns a `PtyJsHandle` for write / resize / kill.
#[napi]
pub fn spawn_pty(
    command: String,
    args: Vec<String>,
    cwd: String,
    env: Vec<(String, String)>,
    cols: u16,
    rows: u16,
    on_data: ThreadsafeFunction<PtyDataPayload, ErrorStrategy::Fatal>,
    on_exit: ThreadsafeFunction<PtyExitPayload, ErrorStrategy::Fatal>,
) -> napi::Result<PtyJsHandle> {
    let handle = smalti_core::pty::spawn_pty(
        &command,
        &args,
        &cwd,
        env,
        cols,
        rows,
        move |data| {
            on_data.call(
                PtyDataPayload { data },
                ThreadsafeFunctionCallMode::NonBlocking,
            );
        },
        move |exit_code| {
            on_exit.call(
                PtyExitPayload { exit_code },
                ThreadsafeFunctionCallMode::NonBlocking,
            );
        },
    )
    .map_err(|e| napi::Error::from_reason(format!("spawn_pty: {e}")))?;

    Ok(PtyJsHandle { inner: handle })
}

// ── Watcher bindings ──────────────────────────────────────────────────────────

/// Event payload sent from the Rust watcher thread to JS via ThreadsafeFunction.
#[napi(object)]
pub struct WatcherEventPayload {
    /// "add" | "remove" | "modify" | "rename"
    pub kind: String,
    pub path: String,
    /// "file" | "directory" — present for add/remove events
    pub entry_kind: Option<String>,
    /// Source path — present for rename events
    pub from: Option<String>,
}

/// Opaque JS handle for a running watcher. Call `.stop()` to terminate.
#[napi]
pub struct WatcherJsHandle {
    inner: smalti_core::watcher::WatcherHandle,
}

#[napi]
impl WatcherJsHandle {
    /// Stop the watcher. Idempotent — safe to call multiple times.
    #[napi]
    pub fn stop(&mut self) {
        self.inner.stop();
    }
}

/// Start a filesystem watcher at `path`.
///
/// - `depth`: maximum depth below `path` to emit events for (1 = immediate
///   children). Pass `undefined`/`null` for unlimited depth.
/// - `exclusions`: array of glob-style patterns to exclude (same syntax as
///   `watcher-exclusions.ts`).
/// - `callback`: called on the JS thread for each qualifying event.
///
/// Returns a `WatcherJsHandle`; call `.stop()` when done.
#[napi]
pub fn start_watcher(
    path: String,
    depth: Option<u32>,
    exclusions: Vec<String>,
    callback: ThreadsafeFunction<WatcherEventPayload, ErrorStrategy::Fatal>,
) -> napi::Result<WatcherJsHandle> {
    let handle = smalti_core::watcher::watch_path(&path, depth, exclusions, move |ev| {
        let payload = match ev {
            smalti_core::watcher::WatchEvent::Add { path, kind } => WatcherEventPayload {
                kind: "add".to_string(),
                path,
                entry_kind: Some(match kind {
                    smalti_core::watcher::EntryKind::File => "file".to_string(),
                    smalti_core::watcher::EntryKind::Directory => "directory".to_string(),
                }),
                from: None,
            },
            smalti_core::watcher::WatchEvent::Remove { path, kind } => WatcherEventPayload {
                kind: "remove".to_string(),
                path,
                entry_kind: Some(match kind {
                    smalti_core::watcher::EntryKind::File => "file".to_string(),
                    smalti_core::watcher::EntryKind::Directory => "directory".to_string(),
                }),
                from: None,
            },
            smalti_core::watcher::WatchEvent::Modify { path } => WatcherEventPayload {
                kind: "modify".to_string(),
                path,
                entry_kind: None,
                from: None,
            },
            smalti_core::watcher::WatchEvent::Rename { from, to } => WatcherEventPayload {
                kind: "rename".to_string(),
                path: to,
                entry_kind: None,
                from: Some(from),
            },
        };
        // NonBlocking: the Rust watcher thread never waits for JS to process.
        callback.call(payload, ThreadsafeFunctionCallMode::NonBlocking);
    })
    .map_err(|e| napi::Error::from_reason(format!("start_watcher: {e}")))?;

    Ok(WatcherJsHandle { inner: handle })
}
