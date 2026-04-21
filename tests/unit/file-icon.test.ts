import { describe, it, expect } from 'vitest';
import { getFileIcon, getFolderIcon } from '../../src/renderer/utils/file-icon';

describe('getFileIcon', () => {
  describe('TypeScript / JavaScript', () => {
    it('returns ts icon for .ts files', () => {
      const icon = getFileIcon('index.ts');
      expect(icon.iconName).toBe('typescript');
      expect(icon.color).toBe('#3178C6');
    });

    it('returns tsx icon for .tsx files', () => {
      const icon = getFileIcon('App.tsx');
      expect(icon.iconName).toBe('react_ts');
      expect(icon.color).toBe('#61DAFB');
    });

    it('returns js icon for .js files', () => {
      const icon = getFileIcon('main.js');
      expect(icon.iconName).toBe('javascript');
      expect(icon.color).toBe('#F7DF1E');
    });

    it('returns jsx icon for .jsx files', () => {
      const icon = getFileIcon('App.jsx');
      expect(icon.iconName).toBe('react');
      expect(icon.color).toBe('#61DAFB');
    });

    it('returns mts icon for .mts files', () => {
      const icon = getFileIcon('config.mts');
      expect(icon.iconName).toBe('typescript');
      expect(icon.color).toBe('#3178C6');
    });

    it('returns cts icon for .cts files', () => {
      const icon = getFileIcon('module.cts');
      expect(icon.iconName).toBe('typescript');
      expect(icon.color).toBe('#3178C6');
    });
  });

  describe('Markup / Style', () => {
    it('returns html icon for .html files', () => {
      const icon = getFileIcon('index.html');
      expect(icon.iconName).toBe('html');
      expect(icon.color).toBe('#E44D26');
    });

    it('returns css icon for .css files', () => {
      const icon = getFileIcon('styles.css');
      expect(icon.iconName).toBe('css');
      expect(icon.color).toBe('#264de4');
    });

    it('returns scss icon for .scss files', () => {
      const icon = getFileIcon('main.scss');
      expect(icon.iconName).toBe('sass');
      expect(icon.color).toBe('#CC6699');
    });
  });

  describe('Data / Config', () => {
    it('returns json icon for .json files', () => {
      const icon = getFileIcon('package.json');
      expect(icon.iconName).toBe('json');
      expect(icon.color).toBe('#F5A623');
    });

    it('returns yaml icon for .yaml files', () => {
      const icon = getFileIcon('config.yaml');
      expect(icon.iconName).toBe('yaml');
      expect(icon.color).toBe('#CB171E');
    });

    it('returns yaml icon for .yml files', () => {
      const icon = getFileIcon('.github/workflows/ci.yml');
      expect(icon.iconName).toBe('yaml');
      expect(icon.color).toBe('#CB171E');
    });

    it('returns toml icon for .toml files', () => {
      const icon = getFileIcon('Cargo.toml');
      expect(icon.iconName).toBe('toml');
      expect(icon.color).toBe('#9C4121');
    });

    it('returns env icon for .env files', () => {
      const icon = getFileIcon('.env');
      expect(icon.iconName).toBe('dotenv');
      expect(icon.color).toBe('#ECD53F');
    });

    it('returns env icon for .env.local files', () => {
      const icon = getFileIcon('.env.local');
      expect(icon.iconName).toBe('dotenv');
      expect(icon.color).toBe('#ECD53F');
    });
  });

  describe('Documentation', () => {
    it('returns markdown icon for .md files', () => {
      const icon = getFileIcon('README.md');
      expect(icon.iconName).toBe('markdown');
      expect(icon.color).toBe('#4A9EBF');
    });

    it('returns markdown icon for .mdx files', () => {
      const icon = getFileIcon('page.mdx');
      expect(icon.iconName).toBe('markdown');
      expect(icon.color).toBe('#4A9EBF');
    });
  });

  describe('Images', () => {
    it('returns image icon for .png files', () => {
      const icon = getFileIcon('logo.png');
      expect(icon.iconName).toBe('image');
      expect(icon.color).toBe('#A074C4');
    });

    it('returns image icon for .svg files', () => {
      const icon = getFileIcon('icon.svg');
      expect(icon.iconName).toBe('svg');
      expect(icon.color).toBe('#FFB13B');
    });

    it('returns image icon for .jpg files', () => {
      const icon = getFileIcon('photo.jpg');
      expect(icon.iconName).toBe('image');
      expect(icon.color).toBe('#A074C4');
    });
  });

  describe('System languages', () => {
    it('returns rust icon for .rs files', () => {
      const icon = getFileIcon('main.rs');
      expect(icon.iconName).toBe('rust');
      expect(icon.color).toBe('#DEA584');
    });

    it('returns python icon for .py files', () => {
      const icon = getFileIcon('app.py');
      expect(icon.iconName).toBe('python');
      expect(icon.color).toBe('#3572A5');
    });

    it('returns go icon for .go files', () => {
      const icon = getFileIcon('main.go');
      expect(icon.iconName).toBe('go');
      expect(icon.color).toBe('#00ADD8');
    });

    it('returns java icon for .java files', () => {
      const icon = getFileIcon('Main.java');
      expect(icon.iconName).toBe('java');
      expect(icon.color).toBe('#B07219');
    });

    it('returns c icon for .c files', () => {
      const icon = getFileIcon('main.c');
      expect(icon.iconName).toBe('c');
      expect(icon.color).toBe('#555555');
    });

    it('returns cpp icon for .cpp files', () => {
      const icon = getFileIcon('main.cpp');
      expect(icon.iconName).toBe('cpp');
      expect(icon.color).toBe('#F34B7D');
    });
  });

  describe('Special filenames', () => {
    it('returns git icon for .gitignore', () => {
      const icon = getFileIcon('.gitignore');
      expect(icon.iconName).toBe('git');
      expect(icon.color).toBe('#F05133');
    });

    it('returns docker icon for Dockerfile', () => {
      const icon = getFileIcon('Dockerfile');
      expect(icon.iconName).toBe('docker');
      expect(icon.color).toBe('#2496ED');
    });

    it('returns docker icon for docker-compose.yml', () => {
      const icon = getFileIcon('docker-compose.yml');
      expect(icon.iconName).toBe('docker');
      expect(icon.color).toBe('#2496ED');
    });

    it('returns license icon for LICENSE file', () => {
      const icon = getFileIcon('LICENSE');
      expect(icon.iconName).toBe('license');
      expect(icon.color).toBe('#D0A85C');
    });

    it('returns shell icon for .sh files', () => {
      const icon = getFileIcon('build.sh');
      expect(icon.iconName).toBe('shell');
      expect(icon.color).toBe('#89E051');
    });
  });

  describe('Fallback', () => {
    it('returns default icon for unknown extensions', () => {
      const icon = getFileIcon('mystery.xyz123');
      expect(icon.iconName).toBe('file');
      expect(icon.color).toBe('#6D8086');
    });

    it('returns makefile icon for Makefile (special-cased filename)', () => {
      const icon = getFileIcon('Makefile');
      expect(icon.iconName).toBe('makefile');
    });

    it('handles deeply nested path correctly', () => {
      const icon = getFileIcon('src/renderer/components/App.tsx');
      expect(icon.iconName).toBe('react_ts');
    });
  });
});

describe('getFolderIcon', () => {
  it('returns open folder icon when expanded=true', () => {
    const icon = getFolderIcon(true);
    expect(icon.iconName).toBe('folder_open');
    expect(icon.color).toBeDefined();
  });

  it('returns closed folder icon when expanded=false', () => {
    const icon = getFolderIcon(false);
    expect(icon.iconName).toBe('folder');
    expect(icon.color).toBeDefined();
  });

  it('open and closed icons have the same color', () => {
    const open = getFolderIcon(true);
    const closed = getFolderIcon(false);
    expect(open.color).toBe(closed.color);
  });

  it('named src folder returns src-specific icon', () => {
    const icon = getFolderIcon(false, 'src');
    expect(icon.iconName).toBe('folder_src');
  });

  it('named node_modules folder returns node_modules icon', () => {
    const icon = getFolderIcon(false, 'node_modules');
    expect(icon.iconName).toBe('folder_node_modules');
  });

  it('named .git folder returns git icon', () => {
    const icon = getFolderIcon(true, '.git');
    expect(icon.iconName).toBe('folder_git');
  });

  it('unknown folder name returns generic folder icon', () => {
    const icon = getFolderIcon(false, 'someRandomFolder');
    expect(icon.iconName).toBe('folder');
  });
});
