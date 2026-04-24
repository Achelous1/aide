import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

describe('Rust crate rename to smalti-* (D7)', () => {
  it('crates/smalti-core directory exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'crates/smalti-core'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'crates/aide-core'))).toBe(false);
  });
  it('crates/smalti-napi directory exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'crates/smalti-napi'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'crates/aide-napi'))).toBe(false);
  });
  it('Cargo.toml of smalti-core has name = "smalti-core"', () => {
    const cargo = fs.readFileSync(path.join(ROOT, 'crates/smalti-core/Cargo.toml'), 'utf-8');
    expect(cargo).toMatch(/name\s*=\s*"smalti-core"/);
  });
  it('Cargo.toml of smalti-napi has name = "smalti-napi"', () => {
    const cargo = fs.readFileSync(path.join(ROOT, 'crates/smalti-napi/Cargo.toml'), 'utf-8');
    expect(cargo).toMatch(/name\s*=\s*"smalti-napi"/);
  });
  it('smalti-napi depends on smalti-core via path', () => {
    const cargo = fs.readFileSync(path.join(ROOT, 'crates/smalti-napi/Cargo.toml'), 'utf-8');
    expect(cargo).toMatch(/smalti-core\s*=\s*\{\s*path\s*=\s*"\.\.\/smalti-core"/);
  });
});
