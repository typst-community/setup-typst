<p align=center>
  <a href="https://github.com/typst-community/setup-typst/blob/main/README.md" hreflang="en" lang="en">English</a> | <b>简体中文</b>
</p>

# Setup Typst

Setup Typst 操作为 GitHub Actions 用户提供以下功能：

- **安装**指定版本的 [Typst]
- **缓存**依赖的 [包]
- **下载** ZIP 压缩文件作为包

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

#### 安装单个 Typst 版本

- **`typst-version`:** 使用的 Typst 版本范围或确切版本，采用 SemVer 语义化版本范围语法。默认使用最新版本。
- **`allow-prereleases`:** 当设置为 `true` 时，传递给 `typst-version` 的版本范围（包含 `latest`）将匹配预发布版本。
  **`executable-name`:** 指定的 Typst 可执行文件的名称。

```yaml
# Example 1
- uses: typst-community/setup-typst@v4
  with:
    typst-version: ^0.14.0

# Example 2
- uses: typst-community/setup-typst@v4
  with:
    typst-version: 0.14.0-rc1
    allow-prereleases: true

# Example 3
- uses: typst-community/setup-typst@v4
  with:
    executable-name: typst-latest
```

> [!TIP]
>
> - `executable-name` 默认为 `typst`。
> - 一份名为 `typst-${version}` 的 Typst 可执行文件总是被保存。
> - 对于 Windows，不需要在参数中设置可执行文件后缀名 `.exe`。
> - 可以为同一版本 Typst 设置多个不同的 `executable-name`。
> - **不推荐** 对不同版本 Typst 设置相同的 `executable-name`（包括默认的 `typst`），因为这可能导致版本管理混乱。

#### 同时安装多个 Typst 版本

**`typst-versions-map`:** 用于指定一个以可执行文件名为键、Typst 版本配置为值的 JSON 映射，以同时安装多个 Typst 版本。每个值是一个包含必填 `version` 字段和可选 `allowPrerelease` 字段的对象。

> [!NOTE]
>
> 当 `typst-versions-map` 被设置时，`typst-version` 和 `executable-name` 将被**忽略**。`allow-prereleases` 输入将作为映射中所有条目的**默认值**，但可被各条目中的 `allowPrerelease` 字段**覆盖**。

```yaml
- uses: typst-community/setup-typst@v4
  with:
    typst-versions-map: |
      {
        "typst-latest": {"version": "latest"},
        "typst-013": {
          "version": "v0.13",
          "allowPrerelease": true
        }
      }
```

#### 包管理与缓存

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

#### ZIP 压缩文件作为包管理

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

> [!TIP]
>
> - 对于下载 GitHub 存储库需要的链接，请参阅[《下载源代码存档》]。
> - 仅支持将 ZIP 包下载到命名空间 `local` 或 `preview`。
> - SemVer 版本号从 `typst.toml` 读取。

#### 令牌

**`token`:** 当从 [typst/typst] 拉取版本时使用的 GitHub 令牌。当在 github.com 上运行操作时，使用默认值；当在 GitHub Enterprise Server（GHES）上运行，可以传递一个 github.com 的个人访问令牌规避速率限制问题。

### 与其它操作组合使用

#### 上传构件

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

## 开发指南

### 先决条件

Setup Typst 操作使用 TypeScript 开发，所以你需要 Nodejs.20 和 npm 来开发此操作。

### 初始化

你可以通过 Git 克隆存储卡，之后使用 `npm ci` 安装依赖项。

### 构建

此操作使用 TypeScript 开发，并使用 [ncc] 编译和打包到一个单个 JavaScript 文件中，以便于分发。

构建此操作，运行 `npm run build`。它将编译来自 `src/main.ts` 的 TypeScript 源码并将其与所有依赖项打包至 `dist/main.js`。

你也可以使用 `npm run lint` 运行类型检查，和通过 `npm run format` 格式化源码。

### 测试

此存储库使用 GitHub Actions 进行持续集成测试。工作流将对拉取请求和对主分支的推送自动运行。

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[包]: https://github.com/typst/packages
[《下载源代码存档》]: https://docs.github.com/zh/repositories/working-with-files/using-files/downloading-source-code-archives
[构件]: https://docs.github.com/zh/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow#comparing-artifacts-and-dependency-caching
[Fontist]: https://www.fontist.org/
[ncc]: https://github.com/vercel/ncc
