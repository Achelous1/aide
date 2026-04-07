/**
 * Reliable home directory resolver.
 * macOS Finder launches packaged apps with HOME=/ — this rejects
 * that and falls back to os.userInfo().homedir (getpwuid).
 */
import { userInfo } from 'os';

export function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  try { return userInfo().homedir; } catch { /* ignore */ }
  return '/tmp';
}
