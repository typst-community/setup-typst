# Setup Typst

This action provides the following functionality for GitHub Actions users:
- Installing a version of Typst and adding it to the PATH
- Optionally caching [packages](https://github.com/typst/packages) dependencies

<table align=center><td>

```yaml
- uses: typst-community/setup-typst@v3
- run: typst compile paper.typ paper.pdf
```

</table>

## Usage

![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)
![GitHub](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub&color=181717&logo=GitHub&logoColor=FFFFFF&label=)

### Basic usage

```yaml
name: Render paper.pdf
on: push
jobs:
  render-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: typst-community/setup-typst@v3
        with:
          cache-dependency-path: requirements.typ
      # Now Typst is installed and packages will be cached!
      - run: typst compile paper.typ paper.pdf
```

### Inputs

- **`typst-token`:** The GitHub token to use when pulling versions from
  [typst/typst]. By default this should cover all cases. You shouldn't have to
  touch this setting.
- **`typst-version`:** The version of Typst to install. This can be an exact
  version like `0.10.0` or a semver range like `0.10` or `0.x`. You can also
  specify `latest` to always use the latest version. The default is `latest`.
- **`cache-dependency-path`:** Used to specify the path to dependency file.
  Supports a Typst file with lines of `import` keyword.

### Outputs

- **`typst-version`:** The version of Typst that was installed. This will be
  something like `0.10.0` or similar.
- **`cache-hit`:** Whether or not Typst was restored from the runner's cache or
  download anew.

### Custom combinations

#### Uploading workflow artifact

```yaml
- uses: typst-community/setup-typst@v3
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### Expanding font support with Fontist

If your tasks require extending beyond the set of fonts in GitHub Actions runner,
you can employ the Fontist to facilitate custom font installations. Here's an
example showcasing how to use [fontist/setup-fontist] to add new fonts:

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v3
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

## Development

![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

**How do I test my changes?**

Open a draft Pull Request and some magic GitHub Actions will run to test the
action.

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
