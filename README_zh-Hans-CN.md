<p align=center>
  <a href="https://github.com/typst-community/setup-typst/blob/main/README.md" hreflang="en" lang="en">English</a> | <b>简体中文</b>
</p>

# Setup Typst

此操作为 GitHub Actions 用户提供以下功能：

- 安装指定版本的 Typst
- （可选）缓存依赖的 [第三方包](https://github.com/typst/packages)

<table align=center><td>

```yaml
- uses: typst-community/setup-typst@v4
- run: typst compile paper.typ paper.pdf
```

</table>

## 用法

[![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)](https://github.com/marketplace/actions/setup-typst)
[![GitHub](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub&color=181717&logo=GitHub&logoColor=FFFFFF&label=)](https://github.com/typst-community/setup-typst)

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
        with:
          cache-dependency-path: requirements.typ
      # Typst 被安装，且第三方包将被缓存！
      - run: typst compile paper.typ paper.pdf
```

### 输入

- **`typst-version`:** 使用的 Typst 版本范围或确切版本，采用 SemVer 语义化版本范围语法。默认使用最新版本。
- **`allow-prereleases`:** 当设置为 `true` 时，传递给 `typst-version` 的版本范围（包含 `latest`）将匹配预发布版本。
- **`cache-dependency-path`:** 依赖的第三方包列表文件的文件名。该文件应该是一个含有 `import` 关键字的 Typst 文件。
- **`token`:** 当从 [typst/typst] 拉取版本时使用的 GitHub 令牌。当在 github.com 上运行操作时，使用默认值；当在 GitHub Enterprise Server（GHES）上运行，可以传递一个 github.com 的个人访问令牌规避速率限制问题。

### 输出

- **`typst-version`:** 安装的 Typst 的确切版本。在输入时给定版本范围时可能有用。
- **`cache-hit`:** 一个表示是否找到 Typst 缓存的布尔值。

### 自定义组合

#### 上传到工作流工件

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

#### 使用 Fontist 拓展字体支持

如需为 GitHub Actions 运行器拓展字体库，可使用 Fontist 进行自定义字体安装。以下是使用 [fontist/setup-fontist] 添加新字体的范例：

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v4
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

## 开发

![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

**我应该如何测试我的贡献？**

开启拉取请求后，GitHub Actions 测试项将在管理员的许可后运行。

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
[fontist/setup-fontist]: https://github.com/fontist/setup-fontist
