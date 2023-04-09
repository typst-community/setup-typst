# Setup Typst

Setup Typst in GitHub Actions

## Inputs

### `token`

The token used to authenticate when fetching Typst distributions. When running this action on github.com, the default value is sufficient. When running on GHES, you can pass a personal access token for github.com if you are experiencing rate limiting.

### `version`

Exact version of Typst to use. Uses the latest if unset.

## Outputs

### `path`

The absolute path to the Typst executable.

## Example usage

```yaml
- uses: yusancky/setup-typst@v0.0.1
  id: setup-typst
  with:
    version: '0.1.0'
- run: ${{ steps.setup-typst.outputs.path }} compile file.typ
```

You can also use the additional uses given in [Usage](https://github.com/typst/typst#usage) in the Typst documentation.
