import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { RsbuildPlugin } from '@rsbuild/core';

export interface VersionInfo {
  commit: string;
  commitShort: string;
  branch: string;
  date: string;
  buildTime: string;
  [key: string]: unknown;
}

export interface PluginVersionOptions {
  /** Output filename, relative to dist root or absolute. Default: "version.json". */
  filename?: string;
  /** Working directory for git commands. Default: rsbuild context root. */
  cwd?: string;
  /** Emit even if dev server (default: only on build). */
  emitOnDev?: boolean;
  /** Extra static fields merged into the output. */
  extra?: Record<string, unknown>;
  /** Transform the final version object before write. */
  transform?: (info: VersionInfo) => VersionInfo | Promise<VersionInfo>;
  /** Minify output JSON (no indentation/newlines). Default: true. */
  minify?: boolean;
}

const PLUGIN_NAME = 'rsbuild-plugin-version';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export interface VersionInfoResult {
  info: VersionInfo;
  error?: Error;
}

export function getVersionInfo(cwd: string): VersionInfoResult {
  const envCommit = process.env.GIT_COMMIT;
  const envBranch = process.env.GIT_BRANCH;
  const envDate = process.env.GIT_COMMIT_DATE;

  let commit = envCommit ?? '';
  let commitShort = envCommit ? envCommit.slice(0, 7) : '';
  let branch = envBranch ?? '';
  let date = envDate ?? '';
  let error: Error | undefined;

  try {
    if (!commit) commit = git(['rev-parse', 'HEAD'], cwd);
    if (!commitShort) commitShort = git(['rev-parse', '--short', 'HEAD'], cwd);
    if (!branch) branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
    if (!date) date = git(['log', '-1', '--format=%cI'], cwd);
  } catch (err) {
    if (!commit) error = err as Error;
  }

  commit ||= 'unknown';
  commitShort ||= 'unknown';
  branch ||= 'unknown';
  date ||= 'unknown';

  return {
    info: {
      commit,
      commitShort,
      branch,
      date,
      buildTime: new Date().toISOString(),
    },
    error,
  };
}

export const pluginVersion = (
  options: PluginVersionOptions = {},
): RsbuildPlugin => ({
  name: PLUGIN_NAME,

  setup(api) {
    const {
      filename = 'version.json',
      cwd,
      emitOnDev = false,
      extra = {},
      transform,
      minify = true,
    } = options;

    const write = async () => {
      const rootDir = cwd ?? api.context.rootPath;
      const { info: gitInfo, error } = getVersionInfo(rootDir);
      if (error) {
        api.logger.warn(
          `[${PLUGIN_NAME}] failed to read git info from "${rootDir}": ${error.message}`,
        );
      }
      const info: VersionInfo = { ...gitInfo, ...extra };
      const finalInfo = transform ? await transform(info) : info;

      const distRoot = api.context.distPath;
      const outPath = isAbsolute(filename)
        ? filename
        : resolve(distRoot, filename);

      mkdirSync(dirname(outPath), { recursive: true });
      const json = minify
        ? JSON.stringify(finalInfo)
        : `${JSON.stringify(finalInfo, null, 2)}\n`;
      writeFileSync(outPath, json, 'utf8');
    };

    api.onAfterBuild(async () => {
      await write();
    });

    if (emitOnDev) {
      api.onAfterStartDevServer(async () => {
        await write();
      });
    }
  },
});

export default pluginVersion;
