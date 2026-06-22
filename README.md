# rsbuild-plugin-version

Rsbuild plugin. Writes `version.json` with current git commit, branch, and date into build output.

## Install

```sh
yarn add -D rsbuild-plugin-version
```

## Usage

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginVersion } from 'rsbuild-plugin-version';

export default defineConfig({
  plugins: [pluginVersion()],
});
```

After build, `dist/version.json`:

```json
{
  "commit": "f1c2...",
  "commitShort": "f1c2abc",
  "branch": "main",
  "date": "2026-06-22T10:11:12+00:00",
  "buildTime": "2026-06-22T10:15:00.000Z"
}
```

## Options

| Option       | Type                              | Default          | Description                                  |
|--------------|-----------------------------------|------------------|----------------------------------------------|
| `filename`   | `string`                          | `"version.json"` | Output path (relative to dist or absolute).  |
| `cwd`        | `string`                          | rsbuild root     | Working dir for git commands.                |
| `emitOnDev`  | `boolean`                         | `false`          | Also emit when dev server starts.            |
| `extra`      | `Record<string, unknown>`         | `{}`             | Static fields merged into output.            |
| `transform`  | `(info) => info \| Promise<info>` | —                | Mutate final object before write.            |
| `minify`     | `boolean`                         | `true`           | Minify output JSON (no indentation).         |

## Example with extra fields

```ts
pluginVersion({
  filename: 'meta/version.json',
  extra: { app: 'my-app', env: process.env.NODE_ENV },
  transform: (info) => ({ ...info, tag: process.env.CI_TAG ?? '' }),
});
```

## Environment variable fallback

If `.git` is unavailable (e.g. Docker build context without `.git` copied in), the plugin falls back to these env vars:

| Variable           | Maps to       |
|--------------------|---------------|
| `GIT_COMMIT`       | `commit` (+ `commitShort` = first 7 chars) |
| `GIT_BRANCH`       | `branch`      |
| `GIT_COMMIT_DATE`  | `date`        |

Env vars take precedence over git output when both are present. If neither env nor git produce a commit, the build fails.

Docker example:

```dockerfile
ARG GIT_COMMIT
ARG GIT_BRANCH
ARG GIT_COMMIT_DATE
ENV GIT_COMMIT=$GIT_COMMIT \
    GIT_BRANCH=$GIT_BRANCH \
    GIT_COMMIT_DATE=$GIT_COMMIT_DATE
```

```sh
docker build \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  --build-arg GIT_COMMIT_DATE=$(git log -1 --format=%cI) \
  .
```

## License

MIT
