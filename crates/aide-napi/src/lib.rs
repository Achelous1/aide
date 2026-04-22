#![deny(clippy::all)]

use napi_derive::napi;

#[napi(object)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    /// "file" or "directory" — mirrors TypeScript FileTreeNode.type
    #[napi(js_name = "type")]
    pub node_type: String,
}

#[napi]
pub fn read_tree(dir_path: String) -> Vec<FileNode> {
    aide_core::read_tree(&dir_path)
        .into_iter()
        .map(|n| FileNode {
            name: n.name,
            path: n.path,
            node_type: match n.node_type {
                aide_core::NodeType::File => "file".to_string(),
                aide_core::NodeType::Directory => "directory".to_string(),
            },
        })
        .collect()
}
