/**
 * file-icon.ts
 * Zero-dependency VSCode material-icon-theme–style file/folder icon mapper.
 * Returns iconName (Material Symbols Rounded glyph name) + color hex.
 */

export interface FileIconInfo {
  /** Material Symbols Rounded icon name */
  iconName: string;
  /** CSS color hex string */
  color: string;
}

// ---------------------------------------------------------------------------
// Exact filename overrides (checked before extension mapping)
// ---------------------------------------------------------------------------
const FILENAME_MAP: Record<string, FileIconInfo> = {
  // Git
  '.gitignore': { iconName: 'git', color: '#F05133' },
  '.gitattributes': { iconName: 'git', color: '#F05133' },
  '.gitmodules': { iconName: 'git', color: '#F05133' },
  '.gitkeep': { iconName: 'git', color: '#F05133' },

  // Docker
  'Dockerfile': { iconName: 'docker', color: '#2496ED' },
  'dockerfile': { iconName: 'docker', color: '#2496ED' },
  'docker-compose.yml': { iconName: 'docker', color: '#2496ED' },
  'docker-compose.yaml': { iconName: 'docker', color: '#2496ED' },
  'docker-compose.dev.yml': { iconName: 'docker', color: '#2496ED' },
  'docker-compose.prod.yml': { iconName: 'docker', color: '#2496ED' },
  'docker-compose.override.yml': { iconName: 'docker', color: '#2496ED' },

  // License
  'LICENSE': { iconName: 'license', color: '#D0A85C' },
  'LICENSE.md': { iconName: 'license', color: '#D0A85C' },
  'LICENSE.txt': { iconName: 'license', color: '#D0A85C' },
  'LICENCE': { iconName: 'license', color: '#D0A85C' },

  // Node / package managers
  'package.json': { iconName: 'json', color: '#F5A623' },
  'package-lock.json': { iconName: 'json', color: '#F5A623' },
  'pnpm-lock.yaml': { iconName: 'yaml', color: '#CB171E' },
  'yarn.lock': { iconName: 'lock', color: '#2C8EBB' },
  '.npmrc': { iconName: 'npm', color: '#CB3837' },
  '.nvmrc': { iconName: 'npm', color: '#CB3837' },
  '.node-version': { iconName: 'npm', color: '#CB3837' },

  // Env
  '.env': { iconName: 'dotenv', color: '#ECD53F' },
  '.env.local': { iconName: 'dotenv', color: '#ECD53F' },
  '.env.development': { iconName: 'dotenv', color: '#ECD53F' },
  '.env.production': { iconName: 'dotenv', color: '#ECD53F' },
  '.env.test': { iconName: 'dotenv', color: '#ECD53F' },
  '.env.example': { iconName: 'dotenv', color: '#ECD53F' },

  // Configs
  'tsconfig.json': { iconName: 'json', color: '#3178C6' },
  'tsconfig.base.json': { iconName: 'json', color: '#3178C6' },
  'jsconfig.json': { iconName: 'json', color: '#F7DF1E' },
  '.eslintrc': { iconName: 'settings', color: '#4B32C3' },
  '.eslintrc.js': { iconName: 'settings', color: '#4B32C3' },
  '.eslintrc.cjs': { iconName: 'settings', color: '#4B32C3' },
  '.eslintrc.json': { iconName: 'settings', color: '#4B32C3' },
  '.eslintrc.yaml': { iconName: 'settings', color: '#4B32C3' },
  '.eslintrc.yml': { iconName: 'settings', color: '#4B32C3' },
  '.eslintignore': { iconName: 'settings', color: '#4B32C3' },
  '.prettierrc': { iconName: 'settings', color: '#EA5E5E' },
  '.prettierrc.js': { iconName: 'settings', color: '#EA5E5E' },
  '.prettierrc.json': { iconName: 'settings', color: '#EA5E5E' },
  '.prettierrc.yaml': { iconName: 'settings', color: '#EA5E5E' },
  '.prettierrc.yml': { iconName: 'settings', color: '#EA5E5E' },
  '.prettierignore': { iconName: 'settings', color: '#EA5E5E' },
  'vite.config.ts': { iconName: 'settings', color: '#646CFF' },
  'vite.config.js': { iconName: 'settings', color: '#646CFF' },
  'vitest.config.ts': { iconName: 'settings', color: '#646CFF' },
  'vitest.config.js': { iconName: 'settings', color: '#646CFF' },
  'webpack.config.js': { iconName: 'settings', color: '#8DD6F9' },
  'webpack.config.ts': { iconName: 'settings', color: '#8DD6F9' },
  'rollup.config.js': { iconName: 'settings', color: '#FF3333' },
  'rollup.config.ts': { iconName: 'settings', color: '#FF3333' },
  'tailwind.config.js': { iconName: 'settings', color: '#38BDF8' },
  'tailwind.config.ts': { iconName: 'settings', color: '#38BDF8' },
  'postcss.config.js': { iconName: 'settings', color: '#DD3A0A' },
  'postcss.config.ts': { iconName: 'settings', color: '#DD3A0A' },
  'babel.config.js': { iconName: 'settings', color: '#F5DA55' },
  'babel.config.json': { iconName: 'settings', color: '#F5DA55' },
  '.babelrc': { iconName: 'settings', color: '#F5DA55' },
  'jest.config.js': { iconName: 'settings', color: '#C21325' },
  'jest.config.ts': { iconName: 'settings', color: '#C21325' },
  'playwright.config.ts': { iconName: 'settings', color: '#2EAD33' },
  'playwright.config.js': { iconName: 'settings', color: '#2EAD33' },

  // Readme
  'README.md': { iconName: 'markdown', color: '#4A9EBF' },
  'readme.md': { iconName: 'markdown', color: '#4A9EBF' },
  'CHANGELOG.md': { iconName: 'markdown', color: '#4A9EBF' },
  'CONTRIBUTING.md': { iconName: 'markdown', color: '#4A9EBF' },

  // Makefile
  'Makefile': { iconName: 'makefile', color: '#6D8086' },
  'makefile': { iconName: 'makefile', color: '#6D8086' },
  'GNUmakefile': { iconName: 'makefile', color: '#6D8086' },
};

// ---------------------------------------------------------------------------
// Extension → icon mapping
// ---------------------------------------------------------------------------
const EXT_MAP: Record<string, FileIconInfo> = {
  // TypeScript
  ts: { iconName: 'typescript', color: '#3178C6' },
  mts: { iconName: 'typescript', color: '#3178C6' },
  cts: { iconName: 'typescript', color: '#3178C6' },
  tsx: { iconName: 'react_ts', color: '#61DAFB' },

  // JavaScript
  js: { iconName: 'javascript', color: '#F7DF1E' },
  mjs: { iconName: 'javascript', color: '#F7DF1E' },
  cjs: { iconName: 'javascript', color: '#F7DF1E' },
  jsx: { iconName: 'react', color: '#61DAFB' },

  // Web
  html: { iconName: 'html', color: '#E44D26' },
  htm: { iconName: 'html', color: '#E44D26' },
  css: { iconName: 'css', color: '#264de4' },
  scss: { iconName: 'sass', color: '#CC6699' },
  sass: { iconName: 'sass', color: '#CC6699' },
  less: { iconName: 'css', color: '#1D365D' },
  styl: { iconName: 'css', color: '#FF6347' },
  vue: { iconName: 'vue', color: '#42B883' },
  svelte: { iconName: 'svelte', color: '#FF3E00' },

  // Data / Config
  json: { iconName: 'json', color: '#F5A623' },
  jsonc: { iconName: 'json', color: '#F5A623' },
  json5: { iconName: 'json', color: '#F5A623' },
  yaml: { iconName: 'yaml', color: '#CB171E' },
  yml: { iconName: 'yaml', color: '#CB171E' },
  toml: { iconName: 'toml', color: '#9C4121' },
  ini: { iconName: 'settings', color: '#6D8086' },
  env: { iconName: 'dotenv', color: '#ECD53F' },
  xml: { iconName: 'xml', color: '#F47742' },
  plist: { iconName: 'xml', color: '#F47742' },

  // Documentation
  md: { iconName: 'markdown', color: '#4A9EBF' },
  mdx: { iconName: 'markdown', color: '#4A9EBF' },
  rst: { iconName: 'markdown', color: '#4A9EBF' },
  txt: { iconName: 'text', color: '#6D8086' },
  pdf: { iconName: 'pdf', color: '#E8291C' },

  // Images
  png: { iconName: 'image', color: '#A074C4' },
  jpg: { iconName: 'image', color: '#A074C4' },
  jpeg: { iconName: 'image', color: '#A074C4' },
  gif: { iconName: 'image', color: '#A074C4' },
  webp: { iconName: 'image', color: '#A074C4' },
  bmp: { iconName: 'image', color: '#A074C4' },
  ico: { iconName: 'image', color: '#A074C4' },
  tif: { iconName: 'image', color: '#A074C4' },
  tiff: { iconName: 'image', color: '#A074C4' },
  svg: { iconName: 'svg', color: '#FFB13B' },

  // Audio / Video
  mp3: { iconName: 'audio', color: '#EE82EE' },
  wav: { iconName: 'audio', color: '#EE82EE' },
  ogg: { iconName: 'audio', color: '#EE82EE' },
  flac: { iconName: 'audio', color: '#EE82EE' },
  mp4: { iconName: 'video', color: '#EE82EE' },
  webm: { iconName: 'video', color: '#EE82EE' },
  mov: { iconName: 'video', color: '#EE82EE' },
  avi: { iconName: 'video', color: '#EE82EE' },

  // Shell / Scripts
  sh: { iconName: 'shell', color: '#89E051' },
  bash: { iconName: 'shell', color: '#89E051' },
  zsh: { iconName: 'shell', color: '#89E051' },
  fish: { iconName: 'shell', color: '#89E051' },
  ps1: { iconName: 'shell', color: '#012456' },
  bat: { iconName: 'shell', color: '#C1F12E' },
  cmd: { iconName: 'shell', color: '#C1F12E' },

  // Python
  py: { iconName: 'python', color: '#3572A5' },
  pyw: { iconName: 'python', color: '#3572A5' },
  pyi: { iconName: 'python', color: '#3572A5' },
  ipynb: { iconName: 'python', color: '#3572A5' },

  // Rust
  rs: { iconName: 'rust', color: '#DEA584' },
  toml_cargo: { iconName: 'rust', color: '#DEA584' }, // internal key, not real ext

  // Go
  go: { iconName: 'go', color: '#00ADD8' },

  // Java / JVM
  java: { iconName: 'java', color: '#B07219' },
  class: { iconName: 'java', color: '#B07219' },
  jar: { iconName: 'java', color: '#B07219' },
  kt: { iconName: 'kotlin', color: '#A97BFF' },
  kts: { iconName: 'kotlin', color: '#A97BFF' },
  groovy: { iconName: 'groovy', color: '#4298B8' },
  scala: { iconName: 'scala', color: '#DC322F' },

  // C / C++ / C#
  c: { iconName: 'c', color: '#555555' },
  h: { iconName: 'c', color: '#555555' },
  cpp: { iconName: 'cpp', color: '#F34B7D' },
  cc: { iconName: 'cpp', color: '#F34B7D' },
  cxx: { iconName: 'cpp', color: '#F34B7D' },
  hpp: { iconName: 'cpp', color: '#F34B7D' },
  cs: { iconName: 'csharp', color: '#178600' },

  // Swift / Objective-C
  swift: { iconName: 'swift', color: '#F05138' },
  m: { iconName: 'objc', color: '#438EFF' },
  mm: { iconName: 'objc', color: '#438EFF' },

  // Ruby
  rb: { iconName: 'ruby', color: '#CC342D' },
  rake: { iconName: 'ruby', color: '#CC342D' },
  gemspec: { iconName: 'ruby', color: '#CC342D' },
  erb: { iconName: 'ruby', color: '#CC342D' },

  // PHP
  php: { iconName: 'php', color: '#777BB4' },

  // Dart / Flutter
  dart: { iconName: 'dart', color: '#00B4AB' },

  // Lua
  lua: { iconName: 'lua', color: '#000080' },

  // R
  r: { iconName: 'r', color: '#198CE7' },
  rmd: { iconName: 'r', color: '#198CE7' },

  // SQL / DB
  sql: { iconName: 'database', color: '#336791' },
  sqlite: { iconName: 'database', color: '#003B57' },
  db: { iconName: 'database', color: '#6D8086' },

  // GraphQL
  graphql: { iconName: 'graphql', color: '#E535AB' },
  gql: { iconName: 'graphql', color: '#E535AB' },

  // Terraform / Infrastructure
  tf: { iconName: 'terraform', color: '#7B42BC' },
  tfvars: { iconName: 'terraform', color: '#7B42BC' },

  // Prisma
  prisma: { iconName: 'database', color: '#0C344B' },

  // Binary / Archive
  zip: { iconName: 'archive', color: '#6D8086' },
  tar: { iconName: 'archive', color: '#6D8086' },
  gz: { iconName: 'archive', color: '#6D8086' },
  rar: { iconName: 'archive', color: '#6D8086' },
  '7z': { iconName: 'archive', color: '#6D8086' },
  dmg: { iconName: 'archive', color: '#6D8086' },
  exe: { iconName: 'archive', color: '#6D8086' },

  // Fonts
  ttf: { iconName: 'font', color: '#AAAAAA' },
  otf: { iconName: 'font', color: '#AAAAAA' },
  woff: { iconName: 'font', color: '#AAAAAA' },
  woff2: { iconName: 'font', color: '#AAAAAA' },
  eot: { iconName: 'font', color: '#AAAAAA' },

  // Certificates / Keys
  pem: { iconName: 'key', color: '#ECD53F' },
  crt: { iconName: 'key', color: '#ECD53F' },
  cer: { iconName: 'key', color: '#ECD53F' },
  key: { iconName: 'key', color: '#ECD53F' },
  p12: { iconName: 'key', color: '#ECD53F' },
  pfx: { iconName: 'key', color: '#ECD53F' },

  // Lock files
  lock: { iconName: 'lock', color: '#2C8EBB' },
};

// ---------------------------------------------------------------------------
// Default fallback
// ---------------------------------------------------------------------------
const DEFAULT_FILE_ICON: FileIconInfo = { iconName: 'file', color: '#6D8086' };

// ---------------------------------------------------------------------------
// Material Symbols → SVG path lookup
// Maps iconName keys to SVG path data for rendering without a font dependency.
// ---------------------------------------------------------------------------
export const ICON_PATHS: Record<string, string> = {
  // Folder states
  folder_open:
    'M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
  folder:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  folder_src:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm2 11.5L8.5 12 12 8.5l1.41 1.41L11.33 12l2.08 2.09L12 15.5zm4 0l-1.41-1.41L16.67 12l-2.08-2.09L16 8.5 19.5 12 16 15.5z',
  folder_node_modules:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm2 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 8.5 12 8.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm0-3.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z',
  folder_git:
    'M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm3 10h-1v-3.59l-1.5 1.5-1.06-1.06L12 8.29l2.56 2.56L13.5 11.91V14z',

  // Generic file
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z',

  // Code
  code: 'M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',

  // TypeScript / JavaScript
  typescript:
    'M3 3h18v18H3V3zm10.71 14.86c.5.98 1.51 1.57 2.59 1.57 1.53 0 2.5-.81 2.5-2.05 0-1.16-.74-1.75-2.05-2.21l-.58-.2c-.68-.22-.97-.44-.97-.87 0-.36.28-.63.74-.63.43 0 .73.2.91.62l1.29-.86c-.54-1.02-1.42-1.4-2.2-1.4-1.38 0-2.27.86-2.27 2.01 0 1.08.68 1.68 1.87 2.11l.58.2c.73.26 1.15.48 1.15.97 0 .43-.4.72-1 .72-.67 0-1.17-.32-1.47-.98l-1.09.99zm-3.44-.14V14.5H12V13H7v1.5h1.71v3.22H10.27z',
  javascript:
    'M3 3h18v18H3V3zm16 16V5H5v14h14zm-8.56-4.14c.23.42.64.74 1.15.74.52 0 .85-.26.85-.64 0-.44-.34-.6-1.03-.86l-.36-.15c-1.04-.44-1.73-.99-1.73-2.16 0-1.07.82-1.89 2.1-1.89.91 0 1.57.32 2.04 1.15l-1.12.72c-.24-.44-.5-.61-.92-.61-.41 0-.67.26-.67.61 0 .43.26.6.86.86l.36.15c1.22.52 1.91 1.05 1.91 2.24 0 1.28-.99 2-2.33 2-1.3 0-2.15-.62-2.56-1.43l1.45-.73z',

  // React
  react:
    'M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85-1.03 0-1.87-.85-1.87-1.85 0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9-.82-.08-1.63-.2-2.4-.36-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47m-7.07-.9c.36-.51.8-1.05 1.27-1.59-.82.06-1.57.17-2.26.3.21.76.48 1.5.99 2.29zm9.35 0l-.99-1.59c.51-.79.78-1.53.99-2.29-.69-.13-1.44-.24-2.26-.3.47.54.91 1.08 1.27 1.59l-.01.59zM16.62 4c-.63-.38-2.01.2-3.6 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.31-3.96m-.71 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m-3.54-5.48c-.36.52-.8 1.06-1.27 1.6.82-.06 1.57-.17 2.26-.3-.21-.76-.48-1.5-.99-2.3zm-4.71 13.23c-.36.52-.8 1.06-1.27 1.6.82-.06 1.57-.17 2.26-.3-.21-.76-.48-1.5-.99-2.3zm9.13-.33c.51 2.14.32 3.61-.31 3.96-.63.38-2.01-.2-3.6-1.7.52-.59 1.03-1.23 1.51-1.9.82-.08 1.63-.2 2.4-.36zm-4.71-1.9l.29.51.3-.51c-.1 0-.2-.01-.3-.01-.1 0-.2.01-.29.01z',
  react_ts:
    'M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85-1.03 0-1.87-.85-1.87-1.85 0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9-.82-.08-1.63-.2-2.4-.36-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47m-7.07-.9c.36-.51.8-1.05 1.27-1.59-.82.06-1.57.17-2.26.3.21.76.48 1.5.99 2.29zm9.35 0l-.99-1.59c.51-.79.78-1.53.99-2.29-.69-.13-1.44-.24-2.26-.3.47.54.91 1.08 1.27 1.59l-.01.59zM16.62 4c-.63-.38-2.01.2-3.6 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.31-3.96m-.71 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m-3.54-5.48c-.36.52-.8 1.06-1.27 1.6.82-.06 1.57-.17 2.26-.3-.21-.76-.48-1.5-.99-2.3zm-4.71 13.23c-.36.52-.8 1.06-1.27 1.6.82-.06 1.57-.17 2.26-.3-.21-.76-.48-1.5-.99-2.3zm9.13-.33c.51 2.14.32 3.61-.31 3.96-.63.38-2.01-.2-3.6-1.7.52-.59 1.03-1.23 1.51-1.9.82-.08 1.63-.2 2.4-.36zm-4.71-1.9l.29.51.3-.51c-.1 0-.2-.01-.3-.01-.1 0-.2.01-.29.01z',

  // Markup / Style
  html: 'M4 2h16l-1.5 14-6.5 2-6.5-2L4 2zm13.1 3H6.9l.3 3.5h9.6l-.3 3H9.5l.2 2.5 2.3.6 2.3-.6.2-2h2.6l-.4 4L12 19.1 7.3 17.5l-.3-3.5H9.4l.2 1.7 2.4.7 2.4-.7.2-2.1H6.7L6.1 5h11.8z',
  css: 'M4 2h16l-1.5 14-6.5 2-6.5-2L4 2zm13 3H7l.3 2.5h9.1l-.3 2H9.5l.3 2.5h6.4l-.4 3.3L12 16l-3.8-1.2-.2-2.8h2.3l.1 1.7 1.6.4 1.6-.4.2-2.3H6.4L5.9 5h12.1z',
  sass: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.83 14.17c-.31.19-.67.29-1.04.29-.56 0-1.08-.23-1.46-.64-.74.4-1.57.61-2.41.61-2.2 0-3.99-1.79-3.99-3.99 0-2.2 1.79-3.99 3.99-3.99.55 0 1.08.11 1.56.32.48-.21.99-.32 1.51-.32 1.2 0 2.27.59 2.93 1.5.37.51.59 1.12.59 1.79 0 .72-.22 1.39-.59 1.95l.08.48c.22-.1.46-.16.71-.16.97 0 1.75.78 1.75 1.75 0 .51-.22.97-.57 1.3l-.11-.54c.22-.21.35-.49.35-.79 0-.58-.47-1.05-1.05-1.05-.2 0-.38.05-.54.15l.29 1.34z',

  // Data
  json: 'M5 3h2v2H5v5a2 2 0 01-2 2 2 2 0 012 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 00-2-2H0v-2h1a2 2 0 002-2V5a2 2 0 012-2m14 0c1.07.27 2 .9 2 2v4a2 2 0 002 2h1v2h-1a2 2 0 00-2 2v4a2 2 0 01-2 2h-2v-2h2v-5a2 2 0 012-2 2 2 0 01-2-2V5h-2V3h2z',
  yaml: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  toml: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1H8v-1zm0 3h6v1H8v-1zm0-6h3v1H8v-1z',
  xml: 'M12.89 3L14.85 3.4L11.11 21L9.15 20.6L12.89 3M19.8 12L16 8.2V5.4L22.6 12L16 18.6V15.8L19.8 12M1.4 12L8 5.4V8.2L4.2 12L8 15.8V18.6L1.4 12Z',

  // Markdown / Text
  markdown:
    'M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12C21.35 6 22 6.63 22 7.41v9.18c0 .78-.65 1.41-1.44 1.41zM9.61 15.5V12l2.39 2.94 2.39-2.94v3.5H16V9h-1.61l-2.39 2.94L9.61 9H8v6.5h1.61zM4 15l3.5-3.5L4 8l-.9.9 2.1 2.6H2v1h3.2l-2.1 2.6z',
  text: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z',
  pdf: 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z',

  // Images
  image:
    'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',

  // Audio / Video
  audio:
    'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
  video:
    'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',

  // Shell
  shell:
    'M20 19.59V8l-6-6H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c.45 0 .85-.15 1.19-.4l-4.43-4.43c-.8.52-1.74.83-2.76.83-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5c0 1.02-.31 1.96-.83 2.75L20 19.59zM9 13c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z',

  // Languages
  python:
    'M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13H9v2h2v-2zm4 0h-2v2h2V7zm-6 4H7v2h2v-2zm8 0h-2v2h2v-2zm-4 0h-2v2h2v-2z',
  rust: 'M19.55 9.56L17.5 8.34V6.5a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5v1L12 5.5 8.5 7.5v-1a.5.5 0 00-.5-.5H7a.5.5 0 00-.5.5v1.84L4.45 9.56A1 1 0 004 10.44v3.12a1 1 0 00.45.88l2.05 1.22V17.5a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1l3.5 2 3.5-2v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1.84l2.05-1.22a1 1 0 00.45-.88v-3.12a1 1 0 00-.45-.88zM12 15.5L9 13.87V10.13L12 8.5l3 1.63v3.74L12 15.5z',
  go: 'M1.811 10.231c-.047 0-.058-.023-.035-.059l.246-.315c.023-.035.081-.058.128-.058h4.172c.046 0 .058.035.035.07l-.199.303c-.023.036-.082.07-.117.07l-4.23-.011zm-1.235 1.234c-.047 0-.059-.023-.035-.058l.245-.316c.023-.035.082-.058.129-.058h5.328c.047 0 .07.035.058.07l-.093.28c-.012.047-.058.07-.105.07l-5.527.012zm2.006 1.234c-.047 0-.059-.023-.035-.058l.163-.292c.023-.035.07-.07.117-.07h2.337c.047 0 .07.035.07.082l-.023.28c0 .047-.047.082-.082.082l-2.547-.024zm11.532-3.104c-.736.187-1.239.327-1.963.514-.176.046-.187.058-.34-.117-.175-.199-.303-.327-.548-.444-.737-.362-1.45-.257-2.11.175-.795.514-1.204 1.274-1.192 2.22.011.935.654 1.706 1.577 1.835.795.105 1.46-.175 1.987-.771.105-.13.198-.27.315-.434H8.843c-.257 0-.316-.163-.234-.374.163-.41.467-1.099.64-1.45.035-.07.105-.175.257-.175h5.562c-.023.316-.023.631-.07.947-.198 1.285-.7 2.397-1.578 3.304-.174.187-.35.362-.513.527-.339.339-.783.56-1.204.713-.562.2-1.143.27-1.716.2-.315-.047-.618-.117-.9-.257-.515-.245-.947-.596-1.204-1.087-.362-.678-.433-1.39-.233-2.116.046-.177.105-.352.175-.515.222-.503.527-.947.9-1.344.129-.134.269-.257.408-.374.175-.14.363-.257.55-.363l.34-.175c.374-.175.771-.28 1.19-.316.409-.024.806.012 1.192.128.385.117.736.3 1.04.562.2.163.373.363.502.585a.5.5 0 00.444.245z',
  java: 'M8.5 19c-.32 0-.5-.14-.5-.35v-1.3c0-.21.18-.35.5-.35h7c.32 0 .5.14.5.35v1.3c0 .21-.18.35-.5.35h-7zm3.5-3v-1h1v1h-1zm-1.5-1v-1h1v1h-1zm3 0v-1h1v1h-1zm-1.5-1v-1h1v1h-1zM8 5V3h8v2H8zm-2 0c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V5z',
  kotlin:
    'M3 3h9.5L3 12.5V3zm9.5 0H21L12 12 3 21h9.5L21 9.5 12.5 3h-.998zM3 21l9-9 9 9H3z',
  groovy: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  scala:
    'M3 16.5v-2l18-6v2L3 16.5zm0-4v-2l18-6v2L3 12.5zm0-4v-2l18-6v2L3 8.5z',
  c: 'M9.26 12c0-.37.07-.73.2-1.07l-1.64-.84C7.3 10.7 7 11.33 7 12c0 .67.3 1.3.82 1.91l1.64-.84A3.41 3.41 0 019.26 12zM12 9.26c.37 0 .73.07 1.07.2l.84-1.64C13.3 7.3 12.67 7 12 7c-.67 0-1.3.3-1.91.82l.84 1.64A3.41 3.41 0 0112 9.26zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  cpp: 'M14.5 2.5c0 1.5-1.5 3-1.5 3s-1.5-1.5-1.5-3 1.5-1 1.5-1 1.5-.5 1.5 1zm3 3.5c-1.5 0-3 1.5-3 1.5s1.5 1.5 3 1.5 1-1.5 1-1.5-.5-1.5-1-1.5zm-11 0c1.5 0 3 1.5 3 1.5S8 9 6.5 9 5.5 7.5 5.5 7.5 5 6 6.5 6zm2 8c-1.5 0-3 1.5-3 1.5s1.5 1.5 3 1.5 1-1.5 1-1.5-.5-1.5-1-1.5zm7 0c1.5 0 3 1.5 3 1.5s-1.5 1.5-3 1.5-1-1.5-1-1.5.5-1.5 1-1.5zm-3.5 3.5c0-1.5-1.5-3-1.5-3s-1.5 1.5-1.5 3 1.5 1 1.5 1 1.5-.5 1.5-1zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z',
  csharp:
    'M11.5 15.97l.41 2.44c-.26.14-.68.27-1.24.39-.57.13-1.24.2-2.01.2-2.21-.04-3.87-.7-4.98-1.96C2.56 15.77 2 14.16 2 12.21c.05-2.31.72-4.08 2-5.32C5.32 5.64 6.96 5 8.94 5c.75 0 1.4.07 1.94.19s.88.25 1.12.4l-.51 2.4-.71-.26c-.29-.08-.71-.12-1.25-.12-1.17.01-2.09.45-2.77 1.32S6.5 10.62 6.5 11.9c0 1.41.36 2.5 1.07 3.26s1.63 1.14 2.77 1.14c.45 0 .88-.05 1.28-.16.4-.11.69-.24.88-.4zM13 11h2V9h1.5v2H18v1.5h-1.5V14H15v-1.5h-2V11z',

  // Swift
  swift:
    'M19.32 15.89C17.39 19.86 13 22.13 8.46 21.29 4.98 20.64 2.2 18.06 1.21 14.69.46 12.18.79 9.44 2.1 7.18c.07.83.33 1.64.77 2.37C1.6 12.3 1.82 15.35 3.35 17.6c1.07 1.57 2.7 2.72 4.55 3.12C10.92 21.47 14.38 20 16.2 17.3c-2.5-.64-5.16-.16-7.34 1.28-.49-.49-.94-1.03-1.3-1.61C6 14.94 5.18 12.08 6.2 9.52c.24-.58.57-1.12.97-1.6l.16-.19c-.07-.61-.04-1.23.07-1.83.55-2.75 2.61-4.97 5.35-5.69 2.95-.78 6.07.18 8.04 2.5l-.1.06C19.1 3.21 18.08 3.5 17.2 4c2.12 1.42 3.46 3.82 3.46 6.37 0 2.01-.78 3.85-2.06 5.22l-.04-.04c.77-.54 1.47-1.18 2.11-1.93l.65 2.27z',
  objc: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2V7h-2v8z',

  // Ruby
  ruby: 'M3.11 14.86L2 19l4.16-.35L9 21.65V19.5l-2.96-1.39L3.11 14.86zm17.78 0l-2.96 3.25L15 19.5v2.15l2.84-2.65L22 19l-1.11-4.14zM12 2L7.33 4.02 4 7.42 2.43 12 4 16.58 7.33 19.98 12 22l4.67-2.02L20 16.58 21.57 12 20 7.42l-3.33-3.4L12 2zm0 3.38L15.38 7 17 10.38 15.38 13.77 12 15.38l-3.38-1.62L7 10.38 8.62 7 12 5.38z',

  // PHP
  php: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.17 13H8.67l.33-2h-2l-.33 2H5l1.07-6h2.67l-.34 2h2l.34-2h2.67L12 15zm5.83 0h-2l.5-3.17c.04-.24-.04-.47-.33-.57-.19-.06-.67-.09-.83-.07l-.67 3.81H11.5l1.17-6.47c.5-.11 1.33-.23 2.5-.23 1 0 1.67.23 2 .68.34.44.43 1.04.28 1.82L17 13.11c-.2.65-.2.96.83.89v1z',

  // Dart
  dart: 'M4.37 2h15.26l2.37 2.37v15.26l-2.37 2.37H4.37L2 19.63V4.37L4.37 2zm.33 14.95L12 20.58l7.3-3.63V7.05L12 3.42 4.7 7.05v9.9z',

  // Lua
  lua: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V7h2v10zm4 0h-2V7h2v10z',

  // R
  r: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6H9V9h6v2h-2v6z',

  // SQL
  database:
    'M12 2C8.13 2 5 3.79 5 6v12c0 2.21 3.13 4 7 4s7-1.79 7-4V6c0-2.21-3.13-4-7-4zm0 2c3.31 0 5 1.34 5 2s-1.69 2-5 2-5-1.34-5-2 1.69-2 5-2zm0 16c-3.31 0-5-1.34-5-2v-2.23C8.31 16.55 10.08 17 12 17s3.69-.45 5-1.23V18c0 .66-1.69 2-5 2zm0-4c-3.31 0-5-1.34-5-2v-2.23C8.31 12.55 10.08 13 12 13s3.69-.45 5-1.23V14c0 .66-1.69 2-5 2zm0-4c-3.31 0-5-1.34-5-2V8.77C8.31 9.55 10.08 10 12 10s3.69-.45 5-1.23V10c0 .66-1.69 2-5 2z',

  // GraphQL
  graphql:
    'M12 2L2 7l10 5 10-5-10-5zm0 15l-8-4v-5l8 4 8-4v5l-8 4z',

  // Terraform
  terraform:
    'M14.85 2L20 5.13v9.43L14.85 17.7V8.27L9.7 5.14l5.15-3.14zm-5.85 3.73l5.15 3.13v9.43L9 21.42V11.99L3.85 8.86l5.15-3.13z',

  // DevOps
  docker:
    'M13.5 13H8.5v-2h5v2zm0-3H8.5V8h5v2zm0-3H8.5V5h5v2zM6.5 10h-2V8h2v2zm0 3h-2v-2h2v2zm2.5 3h5v2h-5v-2zm5-3h2v-2h-2v2zm0-3h2V8h-2v2zm0-3h2V5h-2v2zm4.56 2.26C20.55 9.41 21 10.28 21 11c0 2.21-2.24 4-5 4H8c-2.76 0-5-1.79-5-4 0-.89.38-1.73 1.05-2.45l-.3-.55-.05.09A2.38 2.38 0 011.5 9c-.73 0-1.3-.34-1.5-.9.1-.4.47-.68.93-.78l.07-.02c.04 0 .08-.01.12-.01.42 0 .86.22 1.11.57l.14.2.41-.72c.44-.77 1.16-1.3 2.12-1.34H5c.55 0 1 .2 1.41.5V6h-.01c-.33-.35-.78-.56-1.34-.61l.09-.01C5.1 5.38 5.05 5.38 5 5.38c-.7 0-1.32.27-1.78.71L2.88 5.7A4.5 4.5 0 015 4.5h1l-.5-.87C5.24 3.25 5 2.89 5 2.5c0-.72.63-1.26 1.37-1.14.5.09.91.5 1 1.01l.09.5A4.4 4.4 0 0110 2c.49 0 .97.07 1.41.2l.09-.5c.09-.51.5-.92 1-.1.75-.12 1.38.42 1.38 1.14 0 .39-.24.75-.5 1.13l-.5.87H14c.9 0 1.7.35 2.3.88l-.35.4A3.57 3.57 0 0013.5 6h-.09c-.56.05-1.01.26-1.34.61H12V6.5c.41-.3.86-.5 1.41-.5h.09c.96.04 1.68.57 2.12 1.34l.41.72.14-.2c.25-.35.69-.57 1.11-.57.04 0 .08.01.12.01l.07.02c.46.1.83.38.93.78-.2.56-.77.9-1.5.9a2.38 2.38 0 01-2.2-1.17l-.05-.09-.3.55z',
  git: 'M6.28 3a7 7 0 11-3.28 3.28l2.01 2.01A4 4 0 103.28 6.28L1.27 4.27A7 7 0 016.28 3zm8.14 2.72l-1.41 1.41A3 3 0 1116 9h-2a1 1 0 100 2h2a3 3 0 01-1.58 2.63l1.41 1.41A5 5 0 0016 9a5 5 0 00-1.58-3.28z',

  // Settings / Config
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',

  // Env
  dotenv:
    'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 3h2v1h-2V7zm0 2h2v1h-2V9zm-3-2h2v1h-2V7zm0 2h2v1h-2V9zm-3-2h2v1H9V7zm0 2h2v1H9V9zm-2 0H5V8h2v1zm0-2H5V6h2v1zm12 8H5v-5h14v5zm0-6h-2V6h2v3z',

  // Lock
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',

  // License
  license:
    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM9 17H7v-1h2v1zm0-3H7v-1h2v1zm0-3H7V9h2v2zm7 6h-5v-1h5v1zm0-3h-5v-1h5v1zm0-3h-5V9h5v2zm-1-5V3.5L18.5 9H15z',

  // Makefile
  makefile:
    'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM7 14h10v1H7v-1zm0 3h7v1H7v-1zm0-6h10v1H7v-1zM7 8h2v1H7V8zm4 0h5v1h-5V8zm-4-2h5V5l1.5 1.5L14 8H7V6z',

  // Archive
  archive:
    'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z',

  // Font
  font: 'M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z',

  // Key / Certificate
  key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',

  // Npm
  npm: 'M0 7v10h6v-7h3v7h3V7H0zm21 0H9v10h6v-7h3v7h3V7z',

  // Vue
  vue: 'M2 3l10 18L22 3h-4l-6 10.5L6 3H2z',

  // Svelte
  svelte:
    'M19.07 4.47c-1.58-2.28-4.72-2.93-7.02-1.43l-4.03 2.65c-1.95 1.28-2.59 3.82-1.5 5.87-.71 1.01-.97 2.27-.7 3.51.44 2.01 2.13 3.48 4.13 3.58.58.81 1.4 1.41 2.33 1.72 2.55.83 5.38-.54 6.29-3.08.46-1.35.3-2.82-.44-4.04.71-1.01.97-2.27.7-3.51-.14-.64-.43-1.23-.82-1.77.37-.5.65-1.07.84-1.7zM11.14 17.1c-.92-.31-1.6-1.16-1.6-2.16 0-1.24.98-2.25 2.2-2.25 1.22 0 2.2 1.01 2.2 2.25 0 1.31-1.05 2.38-2.37 2.38l-.43-.22zm5.34-6.54c-.43.38-.99.59-1.58.59H8.9c-.8 0-1.49-.43-1.88-1.07.21-.39.54-.71.96-.88.44-.18.93-.18 1.38 0 .37.15.68.41.9.74.38-.62 1.04-1 1.77-1 .73 0 1.39.38 1.77 1 .21-.32.51-.58.87-.73.44-.18.93-.18 1.38 0 .42.17.75.49.96.88-.3.49-.71.82-1.19.97l-.39.5z',

  // GraphQL
  graphql2:
    'M12 2L2 7l10 5 10-5-10-5zm0 15l-8-4v-5l8 4 8-4v5l-8 4z',

  // Generic image as fallback for unknown icon names
  article:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  data_object:
    'M4 7l2-2h12l2 2v10l-2 2H6l-2-2V7zm0 0v10m16-10v10M7 5v14M17 5v14M7 9h10M7 12h10M7 15h10',
};

// ---------------------------------------------------------------------------
// Named folder icon overrides
// ---------------------------------------------------------------------------
const NAMED_FOLDER_MAP: Record<string, FileIconInfo> = {
  src: { iconName: 'folder_src', color: '#E8AB53' },
  source: { iconName: 'folder_src', color: '#E8AB53' },
  node_modules: { iconName: 'folder_node_modules', color: '#8BC34A' },
  '.git': { iconName: 'folder_git', color: '#F05133' },
  '.github': { iconName: 'folder_git', color: '#F05133' },
  dist: { iconName: 'folder', color: '#90A4AE' },
  build: { iconName: 'folder', color: '#90A4AE' },
  out: { iconName: 'folder', color: '#90A4AE' },
  public: { iconName: 'folder', color: '#E8AB53' },
  assets: { iconName: 'folder', color: '#E8AB53' },
  components: { iconName: 'folder', color: '#61DAFB' },
  pages: { iconName: 'folder', color: '#61DAFB' },
  views: { iconName: 'folder', color: '#61DAFB' },
  hooks: { iconName: 'folder', color: '#61DAFB' },
  utils: { iconName: 'folder', color: '#E8AB53' },
  lib: { iconName: 'folder', color: '#E8AB53' },
  types: { iconName: 'folder', color: '#3178C6' },
  styles: { iconName: 'folder', color: '#CC6699' },
  tests: { iconName: 'folder', color: '#C21325' },
  __tests__: { iconName: 'folder', color: '#C21325' },
  test: { iconName: 'folder', color: '#C21325' },
  docs: { iconName: 'folder', color: '#4A9EBF' },
  '.vscode': { iconName: 'folder', color: '#007ACC' },
  '.idea': { iconName: 'folder', color: '#FE315D' },
};

const FOLDER_OPEN_COLOR = '#DCB67A';
const FOLDER_CLOSED_COLOR = '#DCB67A';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the icon descriptor for a given filename or path.
 * Checks exact filename first, then extension, then falls back to default.
 */
export function getFileIcon(fileNameOrPath: string): FileIconInfo {
  const basename = fileNameOrPath.split('/').pop() ?? fileNameOrPath;
  const lower = basename.toLowerCase();

  // 1. Exact filename match (case-insensitive key lookup)
  const exactMatch =
    FILENAME_MAP[basename] ?? FILENAME_MAP[lower];
  if (exactMatch) return exactMatch;

  // 2. Special multi-dot patterns (.env.*)
  if (lower.startsWith('.env')) {
    return { iconName: 'dotenv', color: '#ECD53F' };
  }

  // 3. Extension-based match
  const dotIdx = lower.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = lower.slice(dotIdx + 1);
    const extMatch = EXT_MAP[ext];
    if (extMatch) return extMatch;
  }

  return DEFAULT_FILE_ICON;
}

/**
 * Returns the icon descriptor for a folder.
 * @param expanded - Whether the folder is expanded/open
 * @param name - Optional folder name for specific icon overrides
 */
export function getFolderIcon(expanded: boolean, name?: string): FileIconInfo {
  if (name) {
    const named = NAMED_FOLDER_MAP[name];
    if (named) {
      return {
        iconName: expanded
          ? named.iconName === 'folder'
            ? 'folder_open'
            : named.iconName
          : named.iconName,
        color: named.color,
      };
    }
  }

  return {
    iconName: expanded ? 'folder_open' : 'folder',
    color: expanded ? FOLDER_OPEN_COLOR : FOLDER_CLOSED_COLOR,
  };
}

/**
 * Renders a file/folder icon as an SVG element string.
 * Returns the SVG path data for use in React components.
 */
export function getIconPath(iconName: string): string {
  return ICON_PATHS[iconName] ?? ICON_PATHS['file'];
}
