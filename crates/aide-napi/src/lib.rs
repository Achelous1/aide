#![warn(clippy::all)]

use napi::threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode};
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
    inner: aide_core::watcher::WatcherHandle,
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
    let handle = aide_core::watcher::watch_path(&path, depth, exclusions, move |ev| {
        let payload = match ev {
            aide_core::watcher::WatchEvent::Add { path, kind } => WatcherEventPayload {
                kind: "add".to_string(),
                path,
                entry_kind: Some(match kind {
                    aide_core::watcher::EntryKind::File => "file".to_string(),
                    aide_core::watcher::EntryKind::Directory => "directory".to_string(),
                }),
                from: None,
            },
            aide_core::watcher::WatchEvent::Remove { path, kind } => WatcherEventPayload {
                kind: "remove".to_string(),
                path,
                entry_kind: Some(match kind {
                    aide_core::watcher::EntryKind::File => "file".to_string(),
                    aide_core::watcher::EntryKind::Directory => "directory".to_string(),
                }),
                from: None,
            },
            aide_core::watcher::WatchEvent::Modify { path } => WatcherEventPayload {
                kind: "modify".to_string(),
                path,
                entry_kind: None,
                from: None,
            },
            aide_core::watcher::WatchEvent::Rename { from, to } => WatcherEventPayload {
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
