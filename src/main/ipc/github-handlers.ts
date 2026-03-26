import { IpcMain } from 'electron';
import { Octokit } from '@octokit/rest';
import { IPC_CHANNELS } from './channels';

let octokit: Octokit | null = null;

function getOctokit(token?: string): Octokit {
  if (!octokit || token) {
    octokit = new Octokit(token ? { auth: token } : {});
  }
  return octokit;
}

export function registerGithubHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.GITHUB_LIST_PRS, async (_event, owner: string, repo: string, token?: string) => {
    try {
      const ok = getOctokit(token);
      const { data } = await ok.pulls.list({ owner, repo, state: 'open', per_page: 30 });
      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user?.login ?? '',
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        url: pr.html_url,
        draft: pr.draft ?? false,
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.GITHUB_LIST_ISSUES, async (_event, owner: string, repo: string, token?: string) => {
    try {
      const ok = getOctokit(token);
      const { data } = await ok.issues.listForRepo({ owner, repo, state: 'open', per_page: 30 });
      return data
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          author: issue.user?.login ?? '',
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          url: issue.html_url,
          labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name ?? '')),
        }));
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.GITHUB_GET_PR, async (_event, owner: string, repo: string, prNumber: number, token?: string) => {
    try {
      const ok = getOctokit(token);
      const { data } = await ok.pulls.get({ owner, repo, pull_number: prNumber });
      return {
        number: data.number,
        title: data.title,
        state: data.state,
        author: data.user?.login ?? '',
        body: data.body ?? '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        url: data.html_url,
        draft: data.draft ?? false,
        additions: data.additions,
        deletions: data.deletions,
        changedFiles: data.changed_files,
        mergeable: data.mergeable,
        base: data.base.ref,
        head: data.head.ref,
      };
    } catch {
      return null;
    }
  });
}
