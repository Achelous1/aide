import { IpcMain } from 'electron';
// eslint-disable-next-line import/no-named-as-default
import simpleGit from 'simple-git';
import { IPC_CHANNELS } from './channels';
import type { GitStatus } from '../../types/ipc';

export function registerGitHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_event, cwd: string): Promise<GitStatus | null> => {
    try {
      const git = simpleGit(cwd);
      const status = await git.status();
      return {
        branch: status.current ?? '',
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_event, cwd: string, message: string) => {
    const git = simpleGit(cwd);
    return git.commit(message);
  });

  ipcMain.handle(IPC_CHANNELS.GIT_PUSH, async (_event, cwd: string) => {
    const git = simpleGit(cwd);
    return git.push();
  });

  ipcMain.handle(IPC_CHANNELS.GIT_PULL, async (_event, cwd: string) => {
    const git = simpleGit(cwd);
    return git.pull();
  });

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCH, async (_event, cwd: string) => {
    const git = simpleGit(cwd);
    return git.branchLocal();
  });

  ipcMain.handle(IPC_CHANNELS.GIT_LOG, async (_event, cwd: string, limit = 20) => {
    const git = simpleGit(cwd);
    return git.log({ maxCount: limit });
  });

  ipcMain.handle(IPC_CHANNELS.GIT_REMOTE_URL, async (_event, cwd: string): Promise<{ owner: string; repo: string } | null> => {
    try {
      const git = simpleGit(cwd);
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');
      if (!origin?.refs?.fetch) return null;
      const url = origin.refs.fetch;
      // Parse GitHub URL: https://github.com/owner/repo.git or git@github.com:owner/repo.git
      const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
      if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };
      const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)/);
      if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };
      return null;
    } catch {
      return null;
    }
  });
}
