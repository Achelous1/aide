use std::fs;
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
            eprintln!("[aide-core] skipping non-UTF-8 filename in {dir_path}");
            continue;
        };
        let full_path = Path::new(dir_path).join(&name);
        let Some(path_str) = full_path.to_str().map(str::to_owned) else {
            eprintln!("[aide-core] skipping non-UTF-8 path in {dir_path}");
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
        let with_slash = format!("{}/", base);

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
}
