#![warn(clippy::all)]

use napi_derive::napi;

/// napi-exported shape. Named separately from `aide_core::FileNode` to avoid
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
    aide_core::read_tree(&dir_path)
        .into_iter()
        .map(|n| ExportedFileNode {
            name: n.name,
            path: n.path,
            node_type: match n.node_type {
                aide_core::NodeType::File => "file".to_string(),
                aide_core::NodeType::Directory => "directory".to_string(),
            },
        })
        .collect()
}

fn file_node_to_exported(n: aide_core::FileNode) -> ExportedFileNode {
    ExportedFileNode {
        name: n.name,
        path: n.path,
        node_type: match n.node_type {
            aide_core::NodeType::File => "file".to_string(),
            aide_core::NodeType::Directory => "directory".to_string(),
        },
    }
}

/// Mirrors FsReadTreeError in TypeScript ipc.ts.
#[napi(object)]
pub struct ExportedReadTreeError {
    /// "EPERM" | "ENOENT" | "ENOTDIR" | "UNKNOWN"
    pub code: String,
    pub path: String,
    pub message: String,
}

/// Return value of read_tree_with_error — mirrors { nodes, error? } in TS.
#[napi(object)]
pub struct ExportedReadTreeResult {
    pub nodes: Vec<ExportedFileNode>,
    pub error: Option<ExportedReadTreeError>,
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
    aide_core::read_file(&path).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn write_file(path: String, content: String) -> napi::Result<()> {
    aide_core::write_file(&path, &content).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn delete_path(path: String) -> napi::Result<()> {
    aide_core::delete_path(&path).map_err(|e| io_to_napi(&path, e))
}

#[napi]
pub fn read_tree_with_error(dir_path: String) -> ExportedReadTreeResult {
    let result = aide_core::read_tree_with_error(&dir_path);
    ExportedReadTreeResult {
        nodes: result.nodes.into_iter().map(file_node_to_exported).collect(),
        error: result.error.map(|e| ExportedReadTreeError {
            code: match e.code {
                aide_core::ReadTreeErrorCode::EPERM => "EPERM".to_string(),
                aide_core::ReadTreeErrorCode::ENOENT => "ENOENT".to_string(),
                aide_core::ReadTreeErrorCode::ENOTDIR => "ENOTDIR".to_string(),
                aide_core::ReadTreeErrorCode::UNKNOWN => "UNKNOWN".to_string(),
            },
            path: e.path,
            message: e.message,
        }),
    }
}
