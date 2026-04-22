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
        let name = entry.file_name().to_string_lossy().into_owned();
        let full_path = Path::new(dir_path).join(&name);
        let path_str = full_path.to_string_lossy().into_owned();

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
}
