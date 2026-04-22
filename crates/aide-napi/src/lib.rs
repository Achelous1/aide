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
