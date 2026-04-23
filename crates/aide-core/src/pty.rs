/// PTY spawn/write/resize/kill abstraction built on `portable-pty`.
///
/// JS business logic (env allowlist, nvm injection, status detection, session-ID
/// polling, echo suppression) lives entirely on the JS side. This module is
/// responsible only for the low-level PTY lifecycle.
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{self, Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;

/// Opaque handle that owns a running PTY child process.
///
/// Dropping this value kills the child and joins the reader thread.
pub struct PtyHandle {
    /// Locked write-end of the master PTY.
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    /// Locked master for resize.
    master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
    /// Locked child for kill.
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    /// Reader thread handle — joined on drop.
    reader_thread: Option<thread::JoinHandle<()>>,
}

impl Drop for PtyHandle {
    fn drop(&mut self) {
        // Best-effort kill; ignore errors (child may already be dead).
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
        }
        if let Some(t) = self.reader_thread.take() {
            let _ = t.join();
        }
    }
}

impl PtyHandle {
    /// Write `data` bytes to the PTY stdin.
    pub fn write(&self, data: &[u8]) -> io::Result<()> {
        let mut w = self.writer.lock().map_err(|_| {
            io::Error::new(io::ErrorKind::Other, "pty writer lock poisoned")
        })?;
        w.write_all(data)
    }

    /// Resize the PTY to `cols` × `rows`.
    pub fn resize(&self, cols: u16, rows: u16) -> io::Result<()> {
        let master = self.master.lock().map_err(|_| {
            io::Error::new(io::ErrorKind::Other, "pty master lock poisoned")
        })?;
        master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))
    }

    /// Kill the PTY child process.
    pub fn kill(&self) -> io::Result<()> {
        let mut child = self.child.lock().map_err(|_| {
            io::Error::new(io::ErrorKind::Other, "pty child lock poisoned")
        })?;
        child.kill().map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))
    }
}

/// Spawn a PTY running `command` with `args`.
///
/// - `env`: list of (key, value) pairs for the child environment.
/// - `on_data`: called from a reader thread with UTF-8 lossy decoded output chunks.
/// - `on_exit`: called once when the child exits or the reader hits EOF.
///
/// Returns a `PtyHandle` for write/resize/kill operations.
pub fn spawn_pty(
    command: &str,
    args: &[String],
    cwd: &str,
    env: Vec<(String, String)>,
    cols: u16,
    rows: u16,
    on_data: impl Fn(String) + Send + 'static,
    on_exit: impl FnOnce(i32) + Send + 'static,
) -> io::Result<PtyHandle> {
    let pty_system = native_pty_system();
    let size = PtySize { rows, cols, pixel_width: 0, pixel_height: 0 };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let mut cmd = CommandBuilder::new(command);
    cmd.args(args);
    cmd.cwd(cwd);
    for (k, v) in env {
        cmd.env(k, v);
    }

    let child = pair.slave
        .spawn_command(cmd)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    // portable-pty requires the slave to be dropped before reading from master
    // on some platforms to avoid blocking.
    drop(pair.slave);

    let writer = pair.master
        .take_writer()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let mut reader = pair.master
        .try_clone_reader()
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    let master = Arc::new(Mutex::new(pair.master));
    let child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>> = Arc::new(Mutex::new(child));
    let writer = Arc::new(Mutex::new(writer));

    let child_for_thread = Arc::clone(&child);
    let reader_thread = thread::spawn(move || {
        let mut buf = [0u8; 4096];
        let mut on_exit = Some(on_exit);
        // Trailing bytes from the previous read that didn't form a complete
        // UTF-8 sequence. A Korean character is 3 bytes in UTF-8 and can
        // straddle chunk boundaries; without this carry-over, from_utf8_lossy
        // would replace the split bytes with U+FFFD on each side.
        let mut pending: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    pending.extend_from_slice(&buf[..n]);
                    let (valid_end, keep_invalid) = match std::str::from_utf8(&pending) {
                        Ok(_) => (pending.len(), false),
                        Err(e) => {
                            // valid_up_to() gives us the last complete UTF-8 boundary.
                            // If error_len is None, the remainder is an incomplete
                            // multi-byte sequence — carry it to the next read.
                            // If Some, the bytes are genuinely invalid — surface them
                            // via lossy replacement rather than stalling forever.
                            match e.error_len() {
                                None => (e.valid_up_to(), false),
                                Some(_) => (pending.len(), true),
                            }
                        }
                    };
                    if valid_end > 0 {
                        let text = if keep_invalid {
                            String::from_utf8_lossy(&pending[..valid_end]).into_owned()
                        } else {
                            // SAFETY: valid_up_to guaranteed this slice is valid UTF-8.
                            unsafe { String::from_utf8_unchecked(pending[..valid_end].to_vec()) }
                        };
                        on_data(text);
                        pending.drain(..valid_end);
                    }
                    // Cap pending growth to avoid unbounded memory if a stream
                    // never produces a valid UTF-8 boundary (shouldn't happen in
                    // practice — terminals are text — but defensive).
                    if pending.len() > 16 * 1024 {
                        let text = String::from_utf8_lossy(&pending).into_owned();
                        on_data(text);
                        pending.clear();
                    }
                }
                Err(_) => break,
            }
        }
        // Flush any remaining bytes (incomplete sequence at EOF gets lossy decoded).
        if !pending.is_empty() {
            let text = String::from_utf8_lossy(&pending).into_owned();
            on_data(text);
        }
        // Determine exit code from child.
        let exit_code = if let Ok(mut child) = child_for_thread.lock() {
            // Try to wait for the process to finish.
            match child.wait() {
                Ok(status) => status.exit_code() as i32,
                Err(_) => 0,
            }
        } else {
            0
        };
        if let Some(f) = on_exit.take() {
            f(exit_code);
        }
    });

    Ok(PtyHandle {
        writer,
        master,
        child,
        reader_thread: Some(reader_thread),
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
#[cfg(unix)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    /// Spawn `/bin/sh -c "echo hello"`, collect on_data output,
    /// assert "hello" substring is received.
    #[test]
    fn test_pty_spawn_echo_receives_output() {
        let (tx_data, rx_data) = mpsc::channel::<String>();
        let (tx_exit, rx_exit) = mpsc::channel::<i32>();

        let handle = spawn_pty(
            "/bin/sh",
            &["-c".to_string(), "echo hello".to_string()],
            "/tmp",
            vec![("TERM".to_string(), "xterm".to_string())],
            80,
            24,
            move |data| { let _ = tx_data.send(data); },
            move |code| { let _ = tx_exit.send(code); },
        ).expect("spawn_pty failed");

        // Collect output until exit
        let _ = rx_exit.recv_timeout(Duration::from_secs(5))
            .expect("on_exit not fired within 5s");

        let mut combined = String::new();
        while let Ok(chunk) = rx_data.try_recv() {
            combined.push_str(&chunk);
        }

        assert!(combined.contains("hello"), "expected 'hello' in output, got: {:?}", combined);
        drop(handle);
    }

    /// Spawn `/bin/cat`, write "ping\n", expect "ping" echoed back in output.
    #[test]
    fn test_pty_write_reaches_stdin() {
        let (tx_data, rx_data) = mpsc::channel::<String>();
        let (tx_exit, rx_exit) = mpsc::channel::<i32>();

        let handle = spawn_pty(
            "/bin/cat",
            &[],
            "/tmp",
            vec![("TERM".to_string(), "xterm".to_string())],
            80,
            24,
            move |data| { let _ = tx_data.send(data); },
            move |code| { let _ = tx_exit.send(code); },
        ).expect("spawn_pty failed");

        // Write "ping\n" to the PTY stdin
        handle.write(b"ping\n").expect("write failed");

        // Give cat time to echo it back
        std::thread::sleep(Duration::from_millis(200));

        let mut combined = String::new();
        while let Ok(chunk) = rx_data.try_recv() {
            combined.push_str(&chunk);
        }

        // Kill cat so on_exit fires
        let _ = handle.kill();
        let _ = rx_exit.recv_timeout(Duration::from_secs(2));

        assert!(combined.contains("ping"), "expected 'ping' echoed back, got: {:?}", combined);
    }

    /// Spawn `/bin/sleep 10`, kill it, expect on_exit fires within 2s.
    #[test]
    fn test_pty_kill_triggers_exit() {
        let (tx_exit, rx_exit) = mpsc::channel::<i32>();

        let handle = spawn_pty(
            "/bin/sleep",
            &["10".to_string()],
            "/tmp",
            vec![("TERM".to_string(), "xterm".to_string())],
            80,
            24,
            |_data| {},
            move |code| { let _ = tx_exit.send(code); },
        ).expect("spawn_pty failed");

        handle.kill().expect("kill failed");

        rx_exit.recv_timeout(Duration::from_secs(2))
            .expect("on_exit not fired within 2s after kill");

        drop(handle);
    }
}
