# Setup Typst

Setup Typst in GitHub Actions (currently only supported for Windows).

## Inputs

### `token`

The token used to authenticate when fetching Typst distributions. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### `version`

Exact version of Typst to use.

## Example usage

```yaml
- uses: yusancky/setup-typst@v0.1
  id: setup-typst
  with:
    version: '0.2.0'
- run: typst compile file.typ
```

You can also use the additional uses given in [Usage](https://github.com/typst/typst#usage) in the Typst documentation.