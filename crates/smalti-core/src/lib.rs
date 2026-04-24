pub mod pty;
pub mod watcher;

use std::fs;
use std::io;
use std::path::Path;

/// Mirrors the TypeScript `FileTreeNode` type.
#[derive(Debug, PartialEq)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub node_type: NodeType,
}

#[derive(Debug, PartialEq)]
pub enum NodeType {
    File,
    Directory,
}

/// Read the immediate children of `dir_path`.
/// Returns an empty vec on any error — matches JS semantics exactly.
pub fn read_tree(dir_path: &str) -> Vec<FileNode> {
    let entries = match fs::read_dir(dir_path) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut nodes = Vec::new();
    for entry in entries.flatten() {
        // Skip entries whose names are not valid UTF-8.
        // NOTE: to_string_lossy would silently produce paths with U+FFFD replacement
        // characters that can't be opened again. Skipping is safer for Phase 1 scope.
        // A Buffer-returning API for non-UTF8 names is deferred to a future phase.
        let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
            eprintln!("[smalti-core] skipping non-UTF-8 filename in {dir_path}");
            continue;
        };
        let full_path = Path::new(dir_path).join(&name);
        let Some(path_str) = full_path.to_str().map(str::to_owned) else {
            eprintln!("[smalti-core] skipping non-UTF-8 path in {dir_path}");
            continue;
        };

        // NOTE: symlinks are classified as 'file' to match Node.js Dirent.isDirectory()
        // semantics: isDirectory() returns false for symlinks by default (does not follow).
        // Symlink-to-dir, symlink-to-file, and broken symlinks all map to NodeType::File.
        let node_type = match entry.file_type() {
            Ok(ft) if ft.is_dir() => NodeType::Directory,
            Ok(_) => NodeType::File,
            Err(_) => NodeType::File,
        };

        nodes.push(FileNode { name, path: path_str, node_type });
    }
    nodes
}

/// Error code for read_tree_with_error, mirroring FsReadTreeError['code'] in TS.
#[derive(Debug, PartialEq)]
pub enum ReadTreeErrorCode {
    EPERM,
    ENOENT,
    ENOTDIR,
    UNKNOWN,
}

/// Error detail returned when the directory cannot be read.
#[derive(Debug, PartialEq)]
pub struct ReadTreeError {
    pub code: ReadTreeErrorCode,
    pub path: String,
    pub message: String,
}

/// Result type for read_tree_with_error.
#[derive(Debug)]
pub struct ReadTreeResult {
    pub nodes: Vec<FileNode>,
    pub error: Option<ReadTreeError>,
    /// Number of directory entries skipped because their names were not valid UTF-8.
    /// Renderer can surface this count; previously only an eprintln was emitted.
    pub skipped_count: u32,
}

/// Read the immediate children of `dir_path`, returning structured error info on failure.
/// On success: `{ nodes: [...], error: None }`.
/// On failure: `{ nodes: [], error: Some(...) }`.
/// Error code mapping mirrors the JS readTreeWithError():
///   PermissionDenied (EPERM/EACCES) → EPERM
///   NotFound (ENOENT)               → ENOENT
///   raw OS error 20 (ENOTDIR)       → ENOTDIR  (std::io::ErrorKind lacks a discriminant)
///   everything else                 → UNKNOWN
pub fn read_tree_with_error(dir_path: &str) -> ReadTreeResult {
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            let mut nodes = Vec::new();
            let mut skipped_count: u32 = 0;
            for entry in entries.flatten() {
                let Some(name) = entry.file_name().to_str().map(str::to_owned) else {
                    skipped_count += 1;
                    continue;
                };
                let full_path = Path::new(dir_path).join(&name);
                let Some(path_str) = full_path.to_str().map(str::to_owned) else {
                    skipped_count += 1;
                    continue;
                };
                let node_type = match entry.file_type() {
                    Ok(ft) if ft.is_dir() => NodeType::Directory,
                    Ok(_) => NodeType::File,
                    Err(_) => NodeType::File,
                };
                nodes.push(FileNode { name, path: path_str, node_type });
            }
            ReadTreeResult { nodes, error: None, skipped_count }
        }
        Err(e) => {
            use std::io::ErrorKind;
            // ENOTDIR has no ErrorKind variant in stable Rust — check raw OS error.
            // Unix: errno 20. Windows: ERROR_DIRECTORY (267).
            let code = match e.raw_os_error() {
                #[cfg(unix)]
                Some(20) => ReadTreeErrorCode::ENOTDIR,
                #[cfg(windows)]
                Some(267) => ReadTreeErrorCode::ENOTDIR,
                _ => match e.kind() {
                    ErrorKind::PermissionDenied => ReadTreeErrorCode::EPERM,
                    ErrorKind::NotFound => ReadTreeErrorCode::ENOENT,
                    _ => ReadTreeErrorCode::UNKNOWN,
                },
            };
            ReadTreeResult {
                nodes: vec![],
                error: Some(ReadTreeError {
                    code,
                    path: dir_path.to_owned(),
                    message: e.to_string(),
                }),
                skipped_count: 0,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs as stdfs;

    fn make_test_dir() -> TempDir {
        let tmp = TempDir::new().unwrap();
        stdfs::write(tmp.path().join("alpha.txt"), b"a").unwrap();
        stdfs::write(tmp.path().join("beta.txt"), b"b").unwrap();
        stdfs::create_dir(tmp.path().join("subdir")).unwrap();
        tmp
    }

    #[test]
    fn test_read_tree_returns_three_entries() {
        let tmp = make_test_dir();
        let mut result = read_tree(tmp.path().to_str().unwrap());
        result.sort_by(|a, b| a.name.cmp(&b.name));
        assert_eq!(result.len(), 3, "expected 3 entries");
        assert_eq!(result[0].name, "alpha.txt");
        assert_eq!(result[0].node_type, NodeType::File);
        assert_eq!(result[1].name, "beta.txt");
        assert_eq!(result[1].node_type, NodeType::File);
        assert_eq!(result[2].name, "subdir");
        assert_eq!(result[2].node_type, NodeType::Directory);

        // paths must be absolute and contain the name
        assert!(result[0].path.contains("alpha.txt"));
        assert!(result[2].path.contains("subdir"));
    }

    #[test]
    fn test_read_tree_nonexistent_returns_empty() {
        let result = read_tree("/nonexistent/path/that/does/not/exist/abc123");
        assert!(result.is_empty(), "expected empty vec for nonexistent path");
    }

    /// Trailing-slash parity: a dir path with a trailing separator must
    /// produce identical output to the same path without one.
    #[test]
    fn test_read_tree_strips_trailing_slash() {
        let tmp = make_test_dir();
        let base = tmp.path().to_str().unwrap();
        // Use platform-native separator. Mixing (e.g. '/' on Windows where
        // base uses '\') would produce paths like `C:\tmp/file` that don't
        // match the non-trailing form `C:\tmp\file`.
        let with_slash = format!("{}{}", base, std::path::MAIN_SEPARATOR);

        let mut without = read_tree(base);
        let mut with_ts = read_tree(&with_slash);
        without.sort_by(|a, b| a.name.cmp(&b.name));
        with_ts.sort_by(|a, b| a.name.cmp(&b.name));

        assert_eq!(without.len(), with_ts.len(), "entry count must match");
        for (a, b) in without.iter().zip(with_ts.iter()) {
            assert_eq!(a.name, b.name, "names must match");
            assert_eq!(a.path, b.path, "paths must match (no double-slash)");
            assert_eq!(a.node_type, b.node_type, "types must match");
        }
    }

    /// Non-UTF8 filename handling: entries whose names cannot be decoded as
    /// valid UTF-8 are silently skipped. This is documented contract — Phase 1
    /// defers a Buffer API to avoid rippling the napi type contract.
    ///
    /// gated to Linux because macOS/APFS rejects non-UTF-8 byte sequences at
    /// the filesystem level (EILSEQ), making it impossible to create such files
    /// in a portable test. On Linux (ext4, tmpfs) arbitrary bytes are allowed.
    /// The skip-contract is still enforced by the production code path and
    /// documented here for any future Windows/Linux CI run.
    ///
    /// If this test fails it means to_string_lossy replacement behaviour
    /// changed; any change must be intentional.
    #[test]
    #[cfg(target_os = "linux")]
    fn test_read_tree_skips_non_utf8_filenames() {
        use std::ffi::OsStr;
        use std::os::unix::ffi::OsStrExt;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // A valid UTF-8 file we expect to see.
        stdfs::write(root.join("valid.txt"), b"ok").unwrap();

        // A filename with an invalid UTF-8 byte sequence: 0x66 0xFF 0x6F ("f<invalid>o")
        let invalid_bytes: &[u8] = &[0x66, 0xFF, 0x6F];
        let invalid_name = OsStr::from_bytes(invalid_bytes);
        let invalid_path = root.join(invalid_name);
        stdfs::write(&invalid_path, b"bad").unwrap();

        let result = read_tree(root.to_str().unwrap());

        // The non-UTF8 entry must be skipped entirely.
        // The valid entry must still appear.
        assert_eq!(result.len(), 1, "non-UTF8 entry must be skipped");
        assert_eq!(result[0].name, "valid.txt");
    }

    /// Symlink parity test: verifies Rust classifies symlinks identically to
    /// Node.js Dirent.isDirectory() — all symlinks (to file, to dir, broken)
    /// are classified as NodeType::File, matching JS semantics.
    #[test]
    #[cfg(unix)]
    fn test_symlink_classification_matches_js_semantics() {
        use std::os::unix::fs as unix_fs;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // regular file
        let regular_file = root.join("regular.txt");
        stdfs::write(&regular_file, b"hello").unwrap();

        // subdir
        let subdir = root.join("subdir");
        stdfs::create_dir(&subdir).unwrap();

        // symlink → file
        let sym_to_file = root.join("sym_to_file");
        unix_fs::symlink(&regular_file, &sym_to_file).unwrap();

        // symlink → dir
        let sym_to_dir = root.join("sym_to_dir");
        unix_fs::symlink(&subdir, &sym_to_dir).unwrap();

        // broken symlink (target does not exist)
        let broken_sym = root.join("broken_sym");
        unix_fs::symlink(root.join("does_not_exist"), &broken_sym).unwrap();

        let mut result = read_tree(root.to_str().unwrap());
        result.sort_by(|a, b| a.name.cmp(&b.name));

        // Locate each entry by name
        let find = |name: &str| result.iter().find(|n| n.name == name).unwrap();

        assert_eq!(find("regular.txt").node_type, NodeType::File);
        assert_eq!(find("subdir").node_type, NodeType::Directory);
        // All symlinks → File (mirrors Dirent.isDirectory() = false for symlinks)
        assert_eq!(find("sym_to_file").node_type, NodeType::File,
            "symlink-to-file must be classified as File");
        assert_eq!(find("sym_to_dir").node_type, NodeType::File,
            "symlink-to-dir must be classified as File (matches JS Dirent.isDirectory()=false)");
        assert_eq!(find("broken_sym").node_type, NodeType::File,
            "broken symlink must be classified as File");
    }

    /// Windows ENOTDIR: ERROR_DIRECTORY (267) must map to ENOTDIR.
    /// Not executed on current CI (Windows CI is not enabled), but locks the
    /// mapping so future Windows CI runs validate it automatically.
    #[test]
    #[cfg(windows)]
    fn test_read_tree_with_error_enotdir_windows() {
        let tmp = TempDir::new().unwrap();
        let file_path = tmp.path().join("regular.txt");
        stdfs::write(&file_path, b"hello").unwrap();
        let result = read_tree_with_error(file_path.to_str().unwrap());
        assert!(result.nodes.is_empty());
        let err = result.error.expect("expected error");
        assert_eq!(err.code, ReadTreeErrorCode::ENOTDIR,
            "read_dir on a file on Windows must yield ENOTDIR (ERROR_DIRECTORY 267)");
    }

    // ── read_tree_with_error tests ──────────────────────────────────────────

    #[test]
    fn test_read_tree_with_error_success() {
        let tmp = make_test_dir();
        let result = read_tree_with_error(tmp.path().to_str().unwrap());
        assert!(result.error.is_none(), "expected no error on success");
        assert_eq!(result.nodes.len(), 3, "expected 3 nodes");
    }

    #[test]
    fn test_read_tree_with_error_enoent() {
        let result = read_tree_with_error("/nonexistent/path/aide-test-xyz-99999");
        assert!(result.nodes.is_empty());
        let err = result.error.expect("expected error");
        assert_eq!(err.code, ReadTreeErrorCode::ENOENT);
        assert_eq!(err.path, "/nonexistent/path/aide-test-xyz-99999");
        assert!(!err.message.is_empty());
    }

    #[test]
    fn test_read_tree_with_error_enotdir() {
        // Pass a regular file path — read_dir on a file gives ENOTDIR (OS error 20).
        let tmp = TempDir::new().unwrap();
        let file_path = tmp.path().join("regular.txt");
        stdfs::write(&file_path, b"hello").unwrap();
        let result = read_tree_with_error(file_path.to_str().unwrap());
        assert!(result.nodes.is_empty());
        let err = result.error.expect("expected error");
        assert_eq!(err.code, ReadTreeErrorCode::ENOTDIR,
            "read_dir on a file must yield ENOTDIR");
    }

    /// EPERM test: requires a directory we cannot read.
    /// On macOS/Linux this is achieved by removing read permission (chmod 000).
    /// Skipped on Windows where permission manipulation differs.
    /// Also skipped when running as root (uid 0) — root bypasses permission checks.
    #[test]
    #[cfg(unix)]
    fn test_read_tree_with_error_eperm() {
        use std::os::unix::fs::PermissionsExt;
        // Running as root bypasses permission checks — test would produce success, not EPERM.
        if unsafe { libc_getuid() } == 0 {
            return;
        }
        let tmp = TempDir::new().unwrap();
        let locked = tmp.path().join("locked_dir");
        stdfs::create_dir(&locked).unwrap();
        stdfs::set_permissions(&locked, stdfs::Permissions::from_mode(0o000)).unwrap();

        let result = read_tree_with_error(locked.to_str().unwrap());

        // Restore permissions before assertions so TempDir cleanup succeeds.
        let _ = stdfs::set_permissions(&locked, stdfs::Permissions::from_mode(0o755));

        assert!(result.nodes.is_empty());
        let err = result.error.expect("expected error for unreadable dir");
        assert_eq!(err.code, ReadTreeErrorCode::EPERM,
            "unreadable dir must yield EPERM");
    }
}

/// Read the text content of `path`, replacing invalid UTF-8 sequences with U+FFFD.
/// Matches Node.js `readFileSync(path, 'utf-8')` behavior which uses WTF-8 / lossy decode.
/// Returns `io::Error` on I/O failures (ENOENT, EACCES, etc.).
pub fn read_file(path: &str) -> Result<String, io::Error> {
    let bytes = fs::read(path)?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// Write `content` to `path`, creating or overwriting the file.
/// The parent directory must already exist; this function does NOT create it.
pub fn write_file(path: &str, content: &str) -> Result<(), io::Error> {
    fs::write(path, content)
}

/// Delete `path` — file, directory (recursive), or symlink.
/// Mirrors `fs.rmSync(path, { recursive: true })` without `force: true`:
/// throws `io::Error(NotFound)` if the path does not exist.
///
/// Uses `symlink_metadata` (does NOT follow symlinks) to prevent catastrophic
/// data loss when `path` is a symlink to a directory — only the symlink itself
/// is removed, never the target's contents.
pub fn delete_path(path: &str) -> Result<(), io::Error> {
    let meta = fs::symlink_metadata(path)?;
    let file_type = meta.file_type();
    if file_type.is_symlink() {
        // Unlink the symlink itself, do NOT follow to target.
        fs::remove_file(path)
    } else if file_type.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
}

// Minimal safe FFI shim — only used in the EPERM test to detect root.
#[cfg(all(unix, test))]
extern "C" {
    fn getuid() -> u32;
}

#[cfg(all(unix, test))]
unsafe fn libc_getuid() -> u32 {
    getuid()
}

// ── Phase 1 PR-B: failing tests for read_file / write_file / delete_path ─────
// These tests are written BEFORE the implementation (TDD). They will fail until
// the three functions are added to this module.
#[cfg(test)]
mod fs_ops_tests {
    use super::*;
    use std::fs as stdfs;
    use tempfile::TempDir;

    // ── read_file ─────────────────────────────────────────────────────────────

    #[test]
    fn test_read_file_returns_content() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("hello.txt");
        stdfs::write(&file, b"hello world").unwrap();
        let content = read_file(file.to_str().unwrap()).unwrap();
        assert_eq!(content, "hello world");
    }

    #[test]
    fn test_read_file_nonexistent_returns_enoent() {
        let err = read_file("/nonexistent/path/aide-pr-b-test/nope.txt").unwrap_err();
        assert_eq!(err.kind(), std::io::ErrorKind::NotFound);
    }

    // ── write_file ────────────────────────────────────────────────────────────

    #[test]
    fn test_write_file_creates_and_overwrites() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("out.txt");
        // Create
        write_file(file.to_str().unwrap(), "first").unwrap();
        assert_eq!(stdfs::read_to_string(&file).unwrap(), "first");
        // Overwrite
        write_file(file.to_str().unwrap(), "second").unwrap();
        assert_eq!(stdfs::read_to_string(&file).unwrap(), "second");
    }

    #[test]
    fn test_write_file_missing_parent_returns_error() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("no_such_dir").join("out.txt");
        let err = write_file(file.to_str().unwrap(), "data").unwrap_err();
        // Parent doesn't exist → NotFound or PermissionDenied depending on OS
        assert!(
            err.kind() == std::io::ErrorKind::NotFound
                || err.kind() == std::io::ErrorKind::PermissionDenied,
            "expected NotFound or PermissionDenied, got {:?}",
            err.kind()
        );
    }

    // ── delete_path ───────────────────────────────────────────────────────────

    #[test]
    fn test_delete_path_removes_file() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("to_delete.txt");
        stdfs::write(&file, b"bye").unwrap();
        assert!(file.exists());
        delete_path(file.to_str().unwrap()).unwrap();
        assert!(!file.exists());
    }

    #[test]
    fn test_delete_path_removes_directory_recursively() {
        let tmp = TempDir::new().unwrap();
        let dir = tmp.path().join("to_delete_dir");
        stdfs::create_dir(&dir).unwrap();
        stdfs::write(dir.join("child.txt"), b"x").unwrap();
        stdfs::create_dir(dir.join("nested")).unwrap();
        assert!(dir.exists());
        delete_path(dir.to_str().unwrap()).unwrap();
        assert!(!dir.exists());
    }

    #[test]
    fn test_delete_path_nonexistent_returns_error() {
        // Mirrors JS fs.rmSync({recursive:true}) without force:true — throws on ENOENT.
        let err = delete_path("/nonexistent/path/aide-pr-b-test/gone").unwrap_err();
        assert_eq!(err.kind(), std::io::ErrorKind::NotFound);
    }

    // ── delete_path symlink tests (#B1) ──────────────────────────────────────
    // All gated on unix; Windows symlink semantics differ and are deferred.

    /// delete_path on a symlink-to-dir must unlink the symlink only,
    /// NOT recursively delete the target directory's contents.
    #[test]
    #[cfg(unix)]
    fn test_delete_path_unlinks_symlink_to_dir_not_target() {
        use std::os::unix::fs as unix_fs;
        let tmp = TempDir::new().unwrap();
        let inner_dir = tmp.path().join("inner-dir");
        stdfs::create_dir(&inner_dir).unwrap();
        stdfs::write(inner_dir.join("keep.txt"), b"precious").unwrap();
        let link = tmp.path().join("link-to-dir");
        unix_fs::symlink(&inner_dir, &link).unwrap();

        delete_path(link.to_str().unwrap()).unwrap();

        assert!(!link.exists(), "symlink must be gone");
        assert!(!link.symlink_metadata().is_ok(), "symlink itself must not exist");
        assert!(inner_dir.exists(), "target dir must still exist");
        assert!(inner_dir.join("keep.txt").exists(), "target contents must be intact");
    }

    /// delete_path on a broken symlink (dangling pointer) must succeed,
    /// removing the symlink even though the target doesn't exist.
    #[test]
    #[cfg(unix)]
    fn test_delete_path_removes_broken_symlink() {
        use std::os::unix::fs as unix_fs;
        let tmp = TempDir::new().unwrap();
        let link = tmp.path().join("broken-link");
        unix_fs::symlink(tmp.path().join("nonexistent-target"), &link).unwrap();
        // Confirm the symlink itself exists (even though target doesn't).
        assert!(link.symlink_metadata().is_ok(), "broken symlink must exist before delete");

        delete_path(link.to_str().unwrap()).unwrap();

        assert!(link.symlink_metadata().is_err(), "broken symlink must be gone after delete");
    }

    /// delete_path on a symlink-to-file must unlink the symlink only,
    /// leaving the real file intact.
    #[test]
    #[cfg(unix)]
    fn test_delete_path_unlinks_symlink_to_file_not_target() {
        use std::os::unix::fs as unix_fs;
        let tmp = TempDir::new().unwrap();
        let real_file = tmp.path().join("real.txt");
        stdfs::write(&real_file, b"important").unwrap();
        let link = tmp.path().join("link-to-file");
        unix_fs::symlink(&real_file, &link).unwrap();

        delete_path(link.to_str().unwrap()).unwrap();

        assert!(link.symlink_metadata().is_err(), "symlink must be gone");
        assert!(real_file.exists(), "real file must still exist");
        assert_eq!(stdfs::read(&real_file).unwrap(), b"important");
    }

    // ── read_file non-UTF8 test (#B3) ─────────────────────────────────────────

    /// read_file on a file containing non-UTF8 bytes must succeed and replace
    /// invalid sequences with U+FFFD (matching Node.js readFileSync(p, 'utf-8') behavior).
    #[test]
    fn test_read_file_non_utf8_bytes_replaced_with_replacement_char() {
        let tmp = TempDir::new().unwrap();
        let file = tmp.path().join("binary.bin");
        // 0x66 'f', 0xFF (invalid UTF-8), 0x6F 'o' — yields "f\u{FFFD}o"
        stdfs::write(&file, &[0x66u8, 0xFF, 0x6F]).unwrap();

        let content = read_file(file.to_str().unwrap()).unwrap();

        assert!(content.contains('\u{FFFD}'),
            "expected U+FFFD replacement char, got: {:?}", content);
        assert!(content.starts_with('f'), "first byte 'f' must be preserved");
        assert!(content.ends_with('o'), "last byte 'o' must be preserved");
    }
}
