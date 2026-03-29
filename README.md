# Setup Typst

This action provides the following functionality for GitHub Actions users:

- **Installing** a version of [Typst] and adding it to the PATH
- **Caching** [packages] dependencies
- **Downloading** ZIP archives as packages

```yaml
- uses: typst-community/setup-typst@v5
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
      - uses: actions/checkout@v6
      - uses: typst-community/setup-typst@v5
      # 🎉 Now Typst is installed!
      - run: typst compile paper.typ paper.pdf
```

### Inputs

#### Installing Single Typst Version

- **`typst-version`:** Version range or exact version of Typst to use, using SemVer's version range syntax. Uses the latest version if unset.
- **`allow-prereleases`:** When `true`, a version range including `latest` passed to `typst-version` input will match prerelease versions.
  **`executable-name`:** Used to specify the executable file name of Typst.

```yaml
# Example 1
- uses: typst-community/setup-typst@v5
  with:
    typst-version: ^0.14.0

# Example 2
- uses: typst-community/setup-typst@v5
  with:
    typst-version: 0.14.0-rc1
    allow-prereleases: true

# Example 3
- uses: typst-community/setup-typst@v5
  with:
    executable-name: typst-latest
```

> [!TIP]
>
> - `executable-name` defaults to `typst`.
> - A Typst executable named `typst-${version}` is always kept.
> - For Windows, there is no need to include the executable file extension `.exe` in the parameters.
> - Multiple distinct `executable-name` values can be set for the same Typst version.
> - Setting the same `executable-name` (including the default `typst`) for different Typst versions is **not recommended**, as it may lead to version management confusion.

#### Installing Multiple Typst Versions

To install multiple Typst versions, you can provide the configuration map in two ways. You may either use the `typst-versions-file` input to reference an external configuration file, or use the `typst-versions-*` inputs to define the settings inline directly within your workflow file.

Both methods support the same configuration formats. Multiple input formats are supported for both methods — see the [Supported Input Formats for `typst-versions-*`](#supported-input-formats-for-typst-versions-) appendix for details.

> [!TIP]
>
> When any `typst-versions-*` input is set, `typst-version` and `executable-name` are **ignored**. The `allow-prereleases` input is used as the **default value** for all entries in the map, but can be **overridden** by `allowPrerelease` in each individual config object.

##### Option 1: External File Configuration

**`typst-versions-file`:** Used to specify a path to a configuration file mapping executable names to Typst version configurations. The format is detected automatically from the file extension.

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v5
  with:
    typst-versions-file: config.json
```

```js
// Example JSON file (config.json)
{
  "typst-latest": {"version": "latest"},
  "typst-013": {
    "version": "v0.13",
      "allowPrerelease": true
  }
}
```

##### Option 2: Inline Configuration

**`typst-versions-*`:** Used to specify a map of executable names to Typst version configurations.

```yaml
# Example 1
- uses: typst-community/setup-typst@v5
  with:
    typst-versions-json: |
      {
        "typst-latest": {"version": "latest"},
        "typst-013": {
          "version": "v0.13",
          "allowPrerelease": true
        }
      }

# Example 2
- uses: typst-community/setup-typst@v5
  with:
    typst-versions-yaml: |
      typst-latest:
        version: latest
      typst-013:
        version: v0.13
        allowPrerelease: true
```

##### Supported Input Formats for `typst-versions-*`

The `typst-versions-*` inputs accept a map of executable names to Typst version configuration objects. Each configuration object has a required `version` field and an optional `allowPrerelease` field.

The following inline content inputs and file-path input are supported:

| Input                  | Format                     | File extensions (for `-file`) |
| ---------------------- | -------------------------- | ----------------------------- |
| `typst-versions-json`  | [JSON]                     | `.json`                       |
| `typst-versions-hjson` | [HJSON]                    | `.hjson`                      |
| `typst-versions-yaml`  | [YAML]                     | `.yaml`, `.yml`               |
| `typst-versions-toml`  | [TOML]                     | `.toml`                       |
| `typst-versions-xml`   | [XML]                      | `.xml`                        |
| `typst-versions-ini`   | [INI]                      | `.ini`                        |
| `typst-versions-hcl`   | [HCL]                      | `.hcl`                        |
| `typst-versions-file`  | auto-detected by extension | all of the above              |

[JSON]: https://www.json.org/
[HJSON]: https://hjson.github.io/
[YAML]: https://yaml.org/
[TOML]: https://toml.io/
[XML]: https://www.w3.org/XML/
[INI]: https://en.wikipedia.org/wiki/INI_file
[HCL]: https://github.com/hashicorp/hcl

#### Managing Packages with Cache

**`cache-dependency-path`:** Used to specify the path to a Typst file containing lines of `import` keyword.

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v5
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
- uses: typst-community/setup-typst@v5
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

### Integration with Other Actions

#### Uploading Artifacts

If you require storing and sharing data from a workflow, you can use [artifacts].

```yaml
- uses: typst-community/setup-typst@v5
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v6
  with:
    name: paper
    path: paper.pdf
```

#### Installing Fonts with Fontist

If you require installing fonts in GitHub Actions runner, you can use [Fontist].

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v5
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

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[packages]: https://github.com/typst/packages
[_Downloading source code archives_]: https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives
[artifacts]: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow
[Fontist]: https://www.fontist.org/
[ncc]: https://github.com/vercel/ncc
