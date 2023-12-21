# Setup Typst

📑 Install Typst for use in GitHub Actions

<table align=center><td>

```yml
- uses: yusancky/setup-typst@v3
- run: typst compile paper.typ paper.pdf
```

</table>

📝 Installs [Typst] for GitHub Actions \
⚡ Caches installation files

## Usage

![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)
![GitHub](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub&color=181717&logo=GitHub&logoColor=FFFFFF&label=)

```yml
name: Render paper.pdf
on: push
jobs:
  render-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: yusancky/setup-typst@v3
      # Now Typst is installed!
      - run: typst compile paper.typ paper.pdf
      - uses: actions/upload-artifact@v4
        with:
          name: paper
          path: paper.pdf
```

### Inputs

- **`typst-token`:** The GitHub token to use when pulling versions from
  [typst/typst]. By default this should cover all cases. You shouldn't have to
  touch this setting.

- **`typst-version`:** Which version of `typst` to install. This can be an exact
  version like `0.10.0` or a semver range like `0.10` or `0.x`. You can also
  specify `latest` to always use the latest version. The default is `latest`.

### Outputs

- **`typst-version`:** The version of `typst` that was installed. This will be
  something like `0.10.0` or similar.

- **`cache-hit`:** Whether or not Typst was restored from the runner's cache or
  download anew.

## Development

![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

**How do I test my changes?**

Open a Draft Pull Request and some magic GitHub Actions will run to test the
action.

[typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
