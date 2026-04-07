import type { AideAPI } from '../types/ipc';

declare global {
  interface Window {
    aide: AideAPI;
  }
}
