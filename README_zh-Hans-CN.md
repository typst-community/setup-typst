<p align=center>
  <a href="https://github.com/typst-community/setup-typst/blob/main/README.md" hreflang="en" lang="en">English</a> | <b>简体中文</b>
</p>

# Setup Typst

此操作为 GitHub Actions 用户提供以下功能：
- 安装给定版本的 Typst 并将其加入 PATH
- 可选地将 [第三方包](https://github.com/typst/packages) 依赖缓存

<table align=center><td>

```yaml
- uses: typst-community/setup-typst@v3
- run: typst compile paper.typ paper.pdf
```

</table>

## 用法

![GitHub Actions](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub+Actions&color=2088FF&logo=GitHub+Actions&logoColor=FFFFFF&label=)
![GitHub](https://img.shields.io/static/v1?style=for-the-badge&message=GitHub&color=181717&logo=GitHub&logoColor=FFFFFF&label=)

### 基本用法

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
      # Typst 被安装，且第三方包将被缓存！
      - run: typst compile paper.typ paper.pdf
```

### 输入

- **`typst-token`:** 当从 [typst/typst] 拉取版本时使用的 GitHub 令牌。默认情况下，这应
  该涵盖全部情况。你通常无需修改此项。

- **`typst-version`:** 需要安装的 Typst 的版本。它可以是一个确定的版本号如 `0.10.0` 或
  语义化版本号如 `0.10` 和 `0.x`。你也可以使用 `latest` 使用最新版本的 Typst。默认值为
  `latest`。

- **`cache-dependency-path`:** 第三方包依赖列表文件的文件名。该文件应该是一个含有
  `import` 关键字的 Typst 文件。

### 输出

- **`typst-version`:** 安装的 Typst 的版本。它的格式应该类似 `0.10.0`。

- **`cache-hit`:** Typst 是否存缓存下载。

### 自定义组合

#### 上传工作流构件

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

#### 使用 Fontist 拓展字体支持

如需为 GitHub Actions 运行器拓展字体库，可使用 Fontist 进行自定义字体安装。以下是使用
[fontist/setup-fontist] 添加新字体的范例：

```yaml
- uses: fontist/setup-fontist@v2
- run: fontist install "Fira Code"
- uses: typst-community/setup-typst@v3
  with:
    cache-dependency-path: requirements.typ
- run: typst compile paper.typ paper.pdf --font-path ~/.fontist/fonts
```

## 开发

![Node.js](https://img.shields.io/static/v1?style=for-the-badge&message=Node.js&color=339933&logo=Node.js&logoColor=FFFFFF&label=)

**我应该如何测试我的贡献？**

开启一个草稿拉取请求，GitHub Actions 测试项将在被管理员的许可后运行。

[Typst]: https://typst.app/
[typst/typst]: https://github.com/typst/typst
