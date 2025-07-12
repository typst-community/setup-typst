<p align=center>
  <a href="https://github.com/typst-community/setup-typst/blob/main/README.md" hreflang="en" lang="en">English</a> | <b>简体中文</b>
</p>

# Setup Typst

此操作为 GitHub Actions 用户提供以下功能：

- **安装**指定版本的 Typst
- **缓存**依赖的 [包]
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

- **`zip-packages`:** 指向一个含包名称及其对应 ZIP 压缩文件 URL 的 JSON 文件。
- **`cache-local-packages`:** 当设置为 `true` 时，在 `zip-packages` 中设定的 `local` 包将被缓存（缓存独立于 `@preview` 包）。

```yaml
# Example workflow YAML file
- uses: typst-community/setup-typst@v4
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

> [!NOTE]
> - 对于下载 GitHub 存储库需要的链接，请参阅[《下载源代码存档》]。
> - 仅支持将 ZIP 包下载到命名空间 `local` 或 `preview`。SemVer 版本号从 `typst.toml` 读取。

#### 令牌

**`token`:** 当从 [typst/typst] 拉取版本时使用的 GitHub 令牌。当在 github.com 上运行操作时，使用默认值；当在 GitHub Enterprise Server（GHES）上运行，可以传递一个 github.com 的个人访问令牌规避速率限制问题。

### 输出

- **`typst-version`:** 安装的 Typst 的确切版本。在输入时给定版本范围时可能有用。
- **`cache-hit`:** 一个表示是否找到 Typst 缓存的布尔值。

### 自定义组合

#### 上传到工作流构件

如果需要从工作流存储和共享数据，可以使用 [构件]。

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
- uses: actions/upload-artifact@v4
  with:
    name: paper
    path: paper.pdf
```

#### 使用 Fontist 安装字体

如果需要在 GitHub Actions 运行器中安装字体，可以使用 [Fontist]。

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[包]: https://github.com/typst/packages
[《下载源代码存档》]: https://docs.github.com/zh/repositories/working-with-files/using-files/downloading-source-code-archives
[构件]: https://docs.github.com/zh/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow#comparing-artifacts-and-dependency-caching
[Fontist]: https://www.fontist.org/
