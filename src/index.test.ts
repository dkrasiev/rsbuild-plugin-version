import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getVersionInfo } from './index';

describe('getVersionInfo', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rsbuild-plugin-version-'));
    execFileSync('git', ['init', '-b', 'main'], { cwd: dir });
    execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'T'], { cwd: dir });
    writeFileSync(join(dir, 'a'), 'a');
    execFileSync('git', ['add', '.'], { cwd: dir });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns commit, branch, date', () => {
    const info = getVersionInfo(dir);
    expect(info.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(info.commitShort.length).toBeGreaterThanOrEqual(7);
    expect(info.branch).toBe('main');
    expect(info.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(info.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws on non-git dir', () => {
    const empty = mkdtempSync(join(tmpdir(), 'no-git-'));
    expect(() => getVersionInfo(empty)).toThrow(/failed to read git info/);
    rmSync(empty, { recursive: true, force: true });
  });

  it('test setup created readable file', () => {
    expect(readFileSync(join(dir, 'a'), 'utf8')).toBe('a');
  });
});
