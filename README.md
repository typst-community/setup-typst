# Setup Typst


<table align=center><td>

```yml
- uses: typst-community/setup-typst@v3
- run: typst compile paper.typ paper.pdf
```

</table>

## Usage

```yml
name: Render paper.pdf
on: push
jobs:
  render-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: typst-community/setup-typst@v3
      - run: typst compile paper.typ paper.pdf
      - uses: actions/upload-artifact@v4
        with:
          name: paper
          path: paper.pdf
```