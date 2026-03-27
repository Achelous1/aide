import * as crypto from 'crypto';

export interface PluginTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; required?: boolean }>;
}

export interface PluginSpec {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  entryPoint: string;
  dependencies: Record<string, string>;
  tools: PluginTool[];
}

const ALL_PERMISSIONS = ['fs:read', 'fs:write', 'network', 'process'] as const;

function inferPermissions(description: string): string[] {
  const lower = description.toLowerCase();
  const perms: string[] = ['fs:read'];

  if (lower.includes('write') || lower.includes('creat') || lower.includes('generat') || lower.includes('save')) {
    perms.push('fs:write');
  }
  if (lower.includes('http') || lower.includes('fetch') || lower.includes('api') || lower.includes('network') || lower.includes('request')) {
    perms.push('network');
  }
  if (lower.includes('run') || lower.includes('exec') || lower.includes('process') || lower.includes('command') || lower.includes('spawn')) {
    perms.push('process');
  }

  return perms.filter((p) => ALL_PERMISSIONS.includes(p as typeof ALL_PERMISSIONS[number]));
}

function generateTools(name: string, description: string): PluginTool[] {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const lower = description.toLowerCase();
  const tools: PluginTool[] = [];

  // Primary tool based on plugin name
  tools.push({
    name: `${safeName}-run`,
    description: `Execute the main ${name} functionality: ${description}`,
    parameters: {
      input: { type: 'string', required: true },
    },
  });

  // Add read tool if filesystem related
  if (lower.includes('file') || lower.includes('read') || lower.includes('scan')) {
    tools.push({
      name: `${safeName}-read`,
      description: `Read and process files for ${name}`,
      parameters: {
        filePath: { type: 'string', required: true },
      },
    });
  }

  return tools;
}

export function generatePluginSpec(name: string, description: string): PluginSpec {
  const id = `plugin-${crypto.randomUUID().slice(0, 8)}`;
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  return {
    id,
    name: safeName,
    description,
    version: '0.1.0',
    permissions: inferPermissions(description),
    entryPoint: 'index.js',
    dependencies: {},
    tools: generateTools(safeName, description),
  };
}
