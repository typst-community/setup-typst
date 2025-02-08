<p align=center>
  <b>English</b> | <a href="https://github.com/typst-community/setup-typst/blob/main/README_zh-Hans-CN.md" hreflang="zh-Hans-CN" lang="zh-Hans-CN">简体中文</a>
</p>

# Setup Typst

This action provides the following functionality for GitHub Actions users:

- Installing a version of Typst and adding it to the PATH
- Optionally caching [packages](https://github.com/typst/packages) dependencies

<table align=center><td>

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
```

</table>

## Usage

[![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)](https://github.com/marketplace/actions/setup-typst)
[![GitHub](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub&color=181717&logo=GitHub&logoColor=FFFFFF&label=)](https://github.com/typst-community/setup-typst)

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
        with:
          cache-dependency-path: requirements.typ
      # Now Typst is installed and packages will be cached!
      - run: typst compile paper.typ paper.pdf
```

### Inputs

- **`typst-version`:** Version range or exact version of Typst to use, using SemVer's version range syntax. Uses the latest version if unset.
- **`allow-prereleases`:** When `true`, a version range including `latest` passed to `typst-version` input will match prerelease versions.
- **`cache-dependency-path`:** Used to specify the path to dependency file. Supports a Typst file with lines of `import` keyword.
- **`token`:** The token used to authenticate when fetching Typst distributions from [typst/typst]. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### Outputs

- **`typst-version`:** The installed Typst version. Useful when given a version range as input.
- **`cache-hit`:** A boolean value to indicate a cache entry was found.

### Custom combinations

#### Uploading workflow artifact

```yaml
- uses: typst-community/setup-typst@v4
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### Expanding font support with Fontist

If your tasks require extending beyond the set of fonts in GitHub Actions runner, you can employ the Fontist to facilitate custom font installations. Here's an example showcasing how to use [fontist/setup-fontist] to add new fonts:

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

## Development

![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

**How do I test my changes?**

Open a Pull Request and some magic GitHub Actions will run to test the action.

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[fontist/setup-fontist]: https://github.com/fontist/setup-fontist
