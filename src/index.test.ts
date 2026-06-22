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
    const { info, error } = getVersionInfo(dir);
    expect(error).toBeUndefined();
    expect(info.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(info.commitShort.length).toBeGreaterThanOrEqual(7);
    expect(info.branch).toBe('main');
    expect(info.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(info.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns unknown values and error on non-git dir without env vars', () => {
    const empty = mkdtempSync(join(tmpdir(), 'no-git-'));
    delete process.env.GIT_COMMIT;
    delete process.env.GIT_BRANCH;
    delete process.env.GIT_COMMIT_DATE;
    const { info, error } = getVersionInfo(empty);
    expect(error).toBeDefined();
    expect(info.commit).toBe('unknown');
    expect(info.commitShort).toBe('unknown');
    expect(info.branch).toBe('unknown');
    expect(info.date).toBe('unknown');
    expect(info.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    rmSync(empty, { recursive: true, force: true });
  });

  it('test setup created readable file', () => {
    expect(readFileSync(join(dir, 'a'), 'utf8')).toBe('a');
  });

  it('uses env vars when no .git present', () => {
    const empty = mkdtempSync(join(tmpdir(), 'no-git-env-'));
    process.env.GIT_COMMIT = '0123456789abcdef0123456789abcdef01234567';
    process.env.GIT_BRANCH = 'release';
    process.env.GIT_COMMIT_DATE = '2026-01-01T00:00:00Z';
    try {
      const { info, error } = getVersionInfo(empty);
      expect(error).toBeUndefined();
      expect(info.commit).toBe('0123456789abcdef0123456789abcdef01234567');
      expect(info.commitShort).toBe('0123456');
      expect(info.branch).toBe('release');
      expect(info.date).toBe('2026-01-01T00:00:00Z');
    } finally {
      delete process.env.GIT_COMMIT;
      delete process.env.GIT_BRANCH;
      delete process.env.GIT_COMMIT_DATE;
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('env vars override git values', () => {
    process.env.GIT_COMMIT = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    process.env.GIT_BRANCH = 'override';
    try {
      const { info } = getVersionInfo(dir);
      expect(info.commit).toBe('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
      expect(info.commitShort).toBe('deadbee');
      expect(info.branch).toBe('override');
      expect(info.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } finally {
      delete process.env.GIT_COMMIT;
      delete process.env.GIT_BRANCH;
    }
  });
});
