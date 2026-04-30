import { useEffect, useMemo, useState } from 'react';
import type { RegistrySummary } from '../../../../types/plugin-registry';
import { BaseDialog } from './dialogs/BaseDialog';

type Category = 'all' | 'installed' | 'updates' | 'recent';

interface RegistryBrowserProps {
  open: boolean;
  onClose: () => void;
  /** Names of plugins already installed in the workspace (for "Installed" badge). */
  installedNames: Set<string>;
  /** Registry-ids of plugins that have an update available locally. */
  updateAvailableIds?: Set<string>;
  onImport: (registryId: string) => Promise<void> | void;
}

const PluginIconStub = () => (
  <div className="grid grid-cols-2 grid-rows-2 gap-0.5 shrink-0" style={{ width: 28, height: 28 }}>
    <span className="bg-smalti-cyan rounded-sm" />
    <span className="bg-aide-text-tertiary/50 rounded-sm" />
    <span className="bg-aide-text-tertiary/50 rounded-sm" />
    <span className="bg-smalti-gold rounded-sm" />
  </div>
);

export function RegistryBrowser({
  open,
  onClose,
  installedNames,
  updateAvailableIds,
  onImport,
}: RegistryBrowserProps) {
  const [summaries, setSummaries] = useState<RegistrySummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await window.aide.plugin.registry.list();
        if (!cancelled) setSummaries(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load registry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!summaries) return [];
    const lower = search.trim().toLowerCase();
    return summaries.filter((s) => {
      if (lower) {
        const hay = `${s.name} ${s.description}`.toLowerCase();
        if (!hay.includes(lower)) return false;
      }
      switch (category) {
        case 'installed':
          return installedNames.has(s.name);
        case 'updates':
          return Boolean(updateAvailableIds?.has(s.id));
        case 'recent':
          // Stub: registry summary has no createdAt, treat as no-op (show all).
          return true;
        case 'all':
        default:
          return true;
      }
    });
  }, [summaries, search, category, installedNames, updateAvailableIds]);

  const handleImport = async (id: string) => {
    if (importing) return;
    setImporting(id);
    try {
      await onImport(id);
    } finally {
      setImporting(null);
    }
  };

  return (
    <BaseDialog open={open} onClose={onClose} title="Plugin Registry" width={800}>
      {/* Search row */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search plugins..."
          aria-label="Search plugins"
          className="flex-1 bg-aide-background border border-aide-border rounded px-3 py-2 text-xs font-mono text-aide-text-primary focus:outline-none focus:border-aide-accent"
        />
      </div>

      <div className="flex gap-4" style={{ minHeight: 380, maxHeight: 460 }}>
        {/* Categories */}
        <nav
          className="flex flex-col gap-1 shrink-0 border-r border-aide-border pr-3"
          style={{ width: 160 }}
          aria-label="Registry categories"
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'installed', label: 'Installed' },
              { key: 'updates', label: 'Updates available' },
              { key: 'recent', label: 'Recently added' },
            ] as { key: Category; label: string }[]
          ).map((c) => {
            const active = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                data-testid={`registry-category-${c.key}`}
                aria-current={active ? 'page' : undefined}
                className={`text-left text-xs font-mono px-2 py-1.5 rounded transition-colors ${
                  active
                    ? 'bg-aide-surface text-aide-text-primary'
                    : 'text-aide-text-secondary hover:text-aide-text-primary'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </nav>

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="text-xs font-mono text-aide-text-secondary py-6 text-center">
              Loading registry…
            </div>
          )}
          {!loading && error && (
            <div className="text-xs font-mono text-smalti-crimson py-6 text-center">
              {error}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-xs font-mono text-aide-text-tertiary py-6 text-center">
              No plugins found.
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3" data-testid="registry-grid">
              {filtered.map((s) => {
                const isInstalled = installedNames.has(s.name);
                return (
                  <article
                    key={s.id}
                    data-testid={`registry-card-${s.id}`}
                    className="border border-aide-border rounded-lg flex flex-col gap-3 bg-aide-background"
                    style={{ padding: 16 }}
                  >
                    <header className="flex items-start gap-3">
                      <PluginIconStub />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-mono text-aide-text-primary truncate m-0">
                          {s.name}
                        </h3>
                        <p className="text-[11px] font-mono text-aide-text-secondary mt-1 leading-snug line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                    </header>

                    <footer className="flex items-center justify-between mt-auto">
                      <span className="inline-flex items-center text-[10px] font-mono text-aide-accent border border-aide-border rounded px-1.5 py-0.5">
                        v{s.latest}
                      </span>
                      {isInstalled ? (
                        <span
                          data-testid={`registry-installed-${s.id}`}
                          className="text-[10px] font-mono text-aide-text-tertiary"
                        >
                          Installed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleImport(s.id)}
                          disabled={importing === s.id}
                          data-testid={`registry-import-${s.id}`}
                          className="px-3 py-1 text-xs font-mono rounded border border-aide-accent text-aide-accent hover:bg-aide-accent hover:text-aide-background transition-colors disabled:opacity-40"
                        >
                          {importing === s.id ? 'Importing…' : 'Import'}
                        </button>
                      )}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BaseDialog>
  );
}
