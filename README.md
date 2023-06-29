# Setup Typst

A cross-OS action for installing Typst.

## Inputs

### `token`

The token used to authenticate when fetching Typst distributions. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### `version`

Exact version of Typst to use. Input `latest` if you want to use latest version of Typst.

> **Warning**
> Setup Typst v2.0 does not support Typst v0.1.0 or v0.2.0 (actually they were supported on Windows). If you want to use an old version on Linux or macOS, please use [v1](https://github.com/yusancky/setup-typst/tree/v1).

## Example usage

```yaml
- uses: yusancky/setup-typst@v2
  id: setup-typst
  with:
    version: 'v0.5.0'
- run: typst compile file.typ
```

You can also use the additional uses given in [Usage](https://github.com/typst/typst#usage) in the Typst documentation.
