<p align=center>
  <a href="https://github.com/typst-community/setup-typst/blob/main/README.md" hreflang="en" lang="en">English</a> | <b>简体中文</b>
</p>

# Setup Typst

此操作为 GitHub Actions 用户提供以下功能：

- **安装**指定版本的 Typst
- **缓存**依赖的[包](https://github.com/typst/packages)
- **下载** ZIP 压缩文件作为本地包

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
```

## 用法

### 基本用法

```yaml
name: Render paper.pdf
on: push
jobs:
  render-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: typst-community/setup-typst@v4
      # 🎉 Typst 被安装！
      - run: typst compile paper.typ paper.pdf
```

### 输入

#### Typst 版本控制

- **`typst-version`:** 使用的 Typst 版本范围或确切版本，采用 SemVer 语义化版本范围语法。默认使用最新版本。
- **`allow-prereleases`:** 当设置为 `true` 时，传递给 `typst-version` 的版本范围（包含 `latest`）将匹配预发布版本。

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

#### 包缓存

**`cache-dependency-path`:** 指向一个含有 `import` 关键字的 Typst 文件。

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

#### ZIP 压缩文件作为包下载

**`local-packages`:** 指向一个在 `local` 键下有包名称与对应 ZIP 压缩文件 URL 的 JSON 文件。

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v4
  with:
    local-packages: packages.json
```

```js
// Example JSON file (packages.js)
{
  "local": {
    "glossarium": "https://github.com/typst-community/glossarium/archive/refs/tags/v0.5.4.zip",
    "touying": "https://github.com/touying-typ/touying/archive/refs/tags/0.6.1.zip"
  }
}
```

#### 令牌

**`token`:** 当从 [typst/typst] 拉取版本时使用的 GitHub 令牌。当在 github.com 上运行操作时，使用默认值；当在 GitHub Enterprise Server（GHES）上运行，可以传递一个 github.com 的个人访问令牌规避速率限制问题。

### 输出

- **`typst-version`:** 安装的 Typst 的确切版本。在输入时给定版本范围时可能有用。
- **`cache-hit`:** 一个表示是否找到 Typst 缓存的布尔值。

### 自定义组合

#### 上传到工作流工件

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### 使用 Fontist 拓展字体支持

如需为 GitHub Actions 运行器拓展字体库，可使用 Fontist 进行自定义字体安装。以下是使用 [fontist/setup-fontist] 添加新字体的范例：

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[fontist/setup-fontist]: https://github.com/fontist/setup-fontist
