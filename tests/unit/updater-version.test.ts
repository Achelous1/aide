import { describe, it, expect } from 'vitest';
import { parseVersion, isNewer } from '../../src/main/updater/check';

describe('parseVersion', () => {
  it('strips leading v and splits into numbers', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3]);
  });

  it('works without leading v', () => {
    expect(parseVersion('0.0.1')).toEqual([0, 0, 1]);
  });
});

describe('isNewer', () => {
  it('returns true when patch is higher', () => {
    expect(isNewer('v0.0.2', '0.0.1')).toBe(true);
  });

  it('returns false when equal (no leading v on current)', () => {
    expect(isNewer('v0.0.1', '0.0.1')).toBe(false);
  });

  it('returns false when older', () => {
    expect(isNewer('v0.0.0', '0.0.1')).toBe(false);
  });

  it('returns true when major is higher', () => {
    expect(isNewer('v1.0.0', '0.9.9')).toBe(true);
  });

  it('returns true when minor is higher', () => {
    expect(isNewer('v0.10.0', '0.9.9')).toBe(true);
  });

  it('returns false when equal with leading v on both', () => {
    expect(isNewer('v0.0.1', 'v0.0.1')).toBe(false);
  });
});
