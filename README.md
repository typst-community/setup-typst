<p align=center>
  <b>English</b> | <a href="https://github.com/typst-community/setup-typst/blob/main/README_zh-Hans-CN.md" hreflang="zh-Hans-CN" lang="zh-Hans-CN">简体中文</a>
</p>

# Setup Typst

This action provides the following functionality for GitHub Actions users:

- **Installing** a version of Typst and adding it to the PATH
- **Caching** [packages] dependencies
- **Downloading** ZIP archives as local packages

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
```

## Usage

### Basic usage

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

#### Typst version control

- **`typst-version`:** Version range or exact version of Typst to use, using SemVer's version range syntax. Uses the latest version if unset.
- **`allow-prereleases`:** When `true`, a version range including `latest` passed to `typst-version` input will match prerelease versions.

```yaml
# Example 1
- uses: typst-community/setup-typst@v4
  with:
    typst-version: ^0.13.0

# Example 2
- uses: typst-community/setup-typst@v4
  with:
    typst-version: 0.13.0-rc1
    allow-prereleases: true
```

#### Packages cache

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

#### ZIP archive packages download

**`local-packages`:** Used to specify the path to a JSON file containing names and ZIP archive URLs of packages as local packages under the `local` key.

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v4
  with:
    local-packages: packages.json
```

```js
// Example JSON file (packages.json)
{
  "local": {
    "glossarium": "https://github.com/typst-community/glossarium/archive/refs/tags/v0.5.4.zip",
    "touying": "https://github.com/touying-typ/touying/archive/refs/tags/0.6.1.zip"
  }
}
```

> [!TIP]
> - For links to download GitHub repositories, please refer to [_Downloading source code archives_].
> - The namespace for local packages is `local`. The SemVer versions of local packages are read from its `typst.toml`.
> - Local Packages set by `local-packages` will all be cached independently of `@preview` packages.

#### Token

**`token`:** The token used to authenticate when fetching Typst distributions from [typst/typst]. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### Outputs

- **`typst-version`:** The installed Typst version. Useful when given a version range as input.
- **`cache-hit`:** A boolean value to indicate a cache entry was found.

### Custom combinations

#### Uploading workflow artifact

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### Expanding font support with Fontist

If your tasks require extending beyond the set of fonts in GitHub Actions runner, you can employ the Fontist to facilitate custom font installations. Here's an example showcasing how to use [`fontist/setup-fontist`] to add new fonts:

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[packages]: https://github.com/typst/packages
[_Downloading source code archives_]: https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives
[`fontist/setup-fontist`]: https://github.com/fontist/setup-fontist