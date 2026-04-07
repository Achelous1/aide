import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import type { GithubPR, GithubIssue } from '../../../types/ipc';

type Tab = 'prs' | 'issues';

function PRItem({ pr }: { pr: GithubPR }) {
  const stateColor =
    pr.state === 'open'
      ? 'text-green-400'
      : pr.draft
        ? 'text-aide-text-tertiary'
        : 'text-purple-400';

  const stateLabel = pr.draft ? 'draft' : pr.state;

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2 rounded bg-aide-surface-elevated">
      <div className="flex items-start gap-1.5">
        <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${stateColor}`}>
          #{pr.number}
        </span>
        <span className="text-xs font-mono text-aide-text-primary leading-snug flex-1 min-w-0 break-words">
          {pr.title}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-5">
        <span className={`text-[10px] font-mono ${stateColor}`}>{stateLabel}</span>
        <span className="text-[10px] font-mono text-aide-text-tertiary">{pr.author}</span>
        <span className="text-[10px] font-mono text-aide-text-tertiary">
          {new Date(pr.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: GithubIssue }) {
  const stateColor = issue.state === 'open' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex flex-col gap-0.5 px-2 py-2 rounded bg-aide-surface-elevated">
      <div className="flex items-start gap-1.5">
        <span className={`text-[10px] font-mono shrink-0 mt-0.5 ${stateColor}`}>
          #{issue.number}
        </span>
        <span className="text-xs font-mono text-aide-text-primary leading-snug flex-1 min-w-0 break-words">
          {issue.title}
        </span>
      </div>
      <div className="flex items-center flex-wrap gap-1 pl-5">
        <span className={`text-[10px] font-mono ${stateColor}`}>{issue.state}</span>
        {issue.labels.map((label) => (
          <span
            key={label}
            className="px-1 py-0.5 text-[9px] font-mono rounded bg-aide-border text-aide-text-secondary"
          >
            {label}
          </span>
        ))}
        {issue.assignees && issue.assignees.length > 0 && (
          <span className="text-[10px] font-mono text-aide-text-tertiary">
            {issue.assignees.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

export function GitHubPanel() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const [tab, setTab] = useState<Tab>('prs');
  const [prs, setPRs] = useState<GithubPR[]>([]);
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerRepo, setOwnerRepo] = useState<{ owner: string; repo: string } | null>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const cwd = activeWorkspace?.path ?? null;

  // Detect owner/repo from git remote origin URL
  useEffect(() => {
    if (!cwd) {
      setOwnerRepo(null);
      return;
    }
    let cancelled = false;
    window.aide.git.remoteUrl(cwd).then((result) => {
      if (!cancelled) setOwnerRepo(result);
    }).catch(() => {
      if (!cancelled) setOwnerRepo(null);
    });
    return () => { cancelled = true; };
  }, [cwd]);

  // Load PRs/Issues when tab or ownerRepo changes
  useEffect(() => {
    if (!ownerRepo) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'prs') {
          const data = await window.aide.github.listPRs(ownerRepo.owner, ownerRepo.repo);
          if (!cancelled) setPRs(data);
        } else {
          const data = await window.aide.github.listIssues(ownerRepo.owner, ownerRepo.repo);
          if (!cancelled) setIssues(data);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tab, ownerRepo]);

  if (!cwd) {
    return (
      <div className="flex items-center justify-center py-8 text-aide-text-tertiary text-xs font-mono">
        No workspace open
      </div>
    );
  }

  if (!ownerRepo) {
    return (
      <div className="flex items-center justify-center py-8 text-aide-text-tertiary text-xs font-mono">
        No git remote detected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border">
        <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
          {ownerRepo.owner}/{ownerRepo.repo}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-aide-border">
        <button
          onClick={() => setTab('prs')}
          className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${
            tab === 'prs'
              ? 'text-aide-text-primary border-b-2 border-aide-accent'
              : 'text-aide-text-tertiary hover:text-aide-text-secondary'
          }`}
        >
          Pull Requests
        </button>
        <button
          onClick={() => setTab('issues')}
          className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${
            tab === 'issues'
              ? 'text-aide-text-primary border-b-2 border-aide-accent'
              : 'text-aide-text-tertiary hover:text-aide-text-secondary'
          }`}
        >
          Issues
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-6 text-aide-text-secondary text-xs font-mono">
            Loading...
          </div>
        )}

        {!loading && error && (
          <div className="px-3 py-2 text-[10px] font-mono text-red-400">{error}</div>
        )}

        {!loading && !error && tab === 'prs' && prs.length === 0 && (
          <div className="flex items-center justify-center py-8 text-aide-text-tertiary text-xs font-mono">
            No pull requests
          </div>
        )}

        {!loading && !error && tab === 'issues' && issues.length === 0 && (
          <div className="flex items-center justify-center py-8 text-aide-text-tertiary text-xs font-mono">
            No issues
          </div>
        )}

        {!loading && tab === 'prs' && prs.length > 0 && (
          <div className="flex flex-col gap-1 px-2 py-2">
            {prs.map((pr) => (
              <PRItem key={pr.number} pr={pr} />
            ))}
          </div>
        )}

        {!loading && tab === 'issues' && issues.length > 0 && (
          <div className="flex flex-col gap-1 px-2 py-2">
            {issues.map((issue) => (
              <IssueItem key={issue.number} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
