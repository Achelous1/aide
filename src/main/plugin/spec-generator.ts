import * as crypto from 'crypto';

export interface PluginSpec {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  entryPoint: string;
}

export function generatePluginSpec(name: string, description: string): PluginSpec {
  const id = `plugin-${crypto.randomUUID().slice(0, 8)}`;
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  return {
    id,
    name: safeName,
    description,
    version: '0.1.0',
    permissions: ['fs:read'],
    entryPoint: 'index.js',
  };
}
