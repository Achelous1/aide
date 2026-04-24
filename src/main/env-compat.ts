/**
 * Back-compat shim: read SMALTI_* first, fall back to AIDE_* for 1 release.
 * TODO(task_reb_f03): drop AIDE_* fallback after v0.2.0.
 */
export function readEnv(name: string): string | undefined {
  return process.env[`SMALTI_${name}`] ?? process.env[`AIDE_${name}`];
}
