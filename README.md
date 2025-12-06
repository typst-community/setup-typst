<p align=center>
  <b>English</b> | <a href="https://github.com/typst-community/setup-typst/blob/main/README_zh-Hans-CN.md" hreflang="zh-Hans-CN" lang="zh-Hans-CN">简体中文</a>
</p>

# Setup Typst

This action provides the following functionality for GitHub Actions users:

- **Installing** a version of [Typst] and adding it to the PATH
- **Caching** [packages] dependencies
- **Downloading** ZIP archives as packages

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
```

## Usage

### Basic Usage

```yaml
name: Render paper.pdf
on: push
jobs:
  render-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: typst-community/setup-typst@v4
      # 🎉 Now Typst is installed!
      - run: typst compile paper.typ paper.pdf
```

### Inputs

#### Specifying Typst Versions

- **`typst-version`:** Version range or exact version of Typst to use, using SemVer's version range syntax. Uses the latest version if unset.
- **`allow-prereleases`:** When `true`, a version range including `latest` passed to `typst-version` input will match prerelease versions.

```yaml
# Example 1
- uses: typst-community/setup-typst@v4
  with:
    typst-version: ^0.14.0

# Example 2
- uses: typst-community/setup-typst@v4
  with:
    typst-version: 0.14.0-rc1
    allow-prereleases: true
```

#### Specifying Typst Executable File Name

**`executable-name`:** Used to specify the executable file name of Typst.

```yaml
- uses: typst-community/setup-typst@v4
  with:
    executable-name: typst-latest
- run: typst-latest compile paper.typ paper.pdf
```

> [!TIP]
>
> - `executable-name` defaults to `typst`.
> - A Typst executable named `typst-${version}` is always kept.
> - For Windows, there is no need to include the executable file extension `.exe` in the parameters.
> - Multiple distinct `executable-name` values can be set for the same Typst version. Setting the same `executable-name` (including the default `typst`) for different Typst versions is **not recommended**, as it may lead to version management confusion.

#### Managing Packages with Cache

**`cache-dependency-path`:** Used to specify the path to a Typst file containing lines of `import` keyword.

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v4
  with:
    cache-dependency-path: requirements.typ
```

```typst
// Example Typst file (requirements.typ)
#import "@preview/example:0.1.0": *
```

#### ZIP Archive Packages Management

- **`zip-packages`:** Used to specify the path to a JSON file containing names and ZIP archive URLs of packages.
- **`cache-local-packages`:** When `true`, local packages set by `zip-packages` will be cached independently of `@preview` packages.

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v4
  with:
    zip-packages: requirements.json
    cache-local-packages: true
```

```js
// Example JSON file (requirements.json)
{
  "preview": {
    "algorithmic": "https://github.com/typst-community/typst-algorithmic/archive/refs/tags/v1.0.0.zip"
  },
  "local": {
    "glossarium": "https://github.com/typst-community/glossarium/archive/refs/tags/v0.5.7.zip"
  }
}
```

> [!TIP]
>
> - For links to download GitHub repositories, please refer to [_Downloading source code archives_].
> - The supported namespaces are only `local` and `preview`.
> - The SemVer versions of packages are read from its `typst.toml`.

#### Token

**`token`:** The token used to authenticate when fetching Typst distributions from [typst/typst]. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### Outputs

- **`typst-version`:** The installed Typst version. Useful when given a version range as input.
- **`cache-hit`:** A boolean value to indicate a cache entry was found.

### Integration with Other Actions

#### Uploading Artifacts

If you require storing and sharing data from a workflow, you can use [artifacts].

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### Installing Fonts with Fontist

If you require installing fonts in GitHub Actions runner, you can use [Fontist].

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

## Development Guide

### Prerequisites

Setup Typst uses TypeScript for development, so you'll need Node.js 20 and npm to develop the action.

### Initial Setup

You can clone the repository with the help of Git and use `npm ci` to install dependencies.

### Building

The action uses TypeScript for development and [ncc] to compile and bundle everything into a single JavaScript file for distribution.

To build the action, run `npm run build`. This command compiles the TypeScript code from `src/main.ts` and bundles it with all dependencies into the `dist/main.js` file.

You can also use `npm run lint` to run type checking and format code with `npm run format`.

### Testing

The repository uses GitHub Actions for continuous integration testing. The workflow automatically runs on pull requests and pushes to the main branch.

The CI workflow consists of two kinds of jobs:

- Build: Compiles the action and uploads artifacts
- Test: Tests the action across all platforms
  - Basic Test: Tests basic functionality
  - ZIP Packages Test: Tests ZIP package handling

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[packages]: https://github.com/typst/packages
[_Downloading source code archives_]: https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives
[artifacts]: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow
[Fontist]: https://www.fontist.org/
[ncc]: https://github.com/vercel/ncc
