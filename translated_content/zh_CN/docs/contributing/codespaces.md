---
type: docs
title: "使用 GitHub Codespaces 进行贡献"
linkTitle: "GitHub Codespaces"
weight: 60
description: "如何使用 GitHub Codespaces 为 Dapr 项目做贡献"
aliases:
  - "/zh-hans/contributing/codespaces/"
  - "/zh-hans/developing-applications/ides/codespaces/"
---

[GitHub Codespaces](https://github.com/features/codespaces) 是开始为 Dapr 仓库做贡献的最简单方式。只需一次点击，你就可以在浏览器中获得一个具备所有先决条件的环境。

## 功能特点

- **点击即运行**：获得一个专用的沙盒环境，所有必需的框架和软件包都已准备就绪。
- **按使用量计费**：只为在 Codespaces 中开发所花费的时间付费。当不使用时，环境会自动关闭。
- **可移植**：可以在浏览器中运行，也可以在 Visual Studio Code 中运行，或通过 SSH 连接。

## 在 Codespace 中打开 Dapr 仓库

要在 Codespace 中打开 Dapr 仓库，请从仓库主页选择 "Code"，然后选择 "Open with Codespaces"：

<img src="/images/codespaces-create.png" alt="创建 Dapr Codespace 的截图" width="300">

如果你还没有 fork 该仓库，创建 Codespace 时也会为你创建一个 fork，并在 Codespace 中使用它。

## 支持的仓库

- [dapr/dapr](https://github.com/dapr/dapr)
- [dapr/components-contrib](https://github.com/dapr/components-contrib)
- [dapr/cli](https://github.com/dapr/cli)
- [dapr/docs](https://github.com/dapr/docs)
- [dapr/python-sdk](https://github.com/dapr/python-sdk)

## 在 Codespace 中开发 Dapr 组件

开发新的 Dapr 组件需要同时使用 [dapr/components-contrib](https://github.com/dapr/components-contrib) 和 [dapr/dapr](https://github.com/dapr/dapr) 两个仓库。建议将这两个文件夹并排放在 `/workspaces` 目录中。

### 如果你从 `dapr/dapr` 创建了 Codespace

如果你的 Codespace 是从 `dapr/dapr` 仓库或其 fork 启动的，你需要在 `/workspaces/components-contrib` 中克隆 `dapr/components-contrib` 仓库（或你的 fork）。

首先，确保你已经通过 GitHub CLI 进行了身份验证：

```sh
# 运行此命令并按照提示操作
# 大多数用户应接受默认选项
gh auth login
```

克隆仓库：

```sh
# 如果你想使用你的 dapr/components-contrib fork，请将其替换为你的 fork（例如 "yourusername/components-contrib"）
# 执行此操作前请确保你已经 fork 了仓库
REPO=dapr/components-contrib
cd /workspaces
gh repo clone "$REPO" /workspaces/components-contrib
```

然后，将文件夹添加到当前工作区：

```sh
code -a /workspaces/components-contrib
```

### 如果你从 `dapr/components-contrib` 创建了 Codespace

如果你的 Codespace 是从 `dapr/components-contrib` 仓库或其 fork 启动的，你需要在 `/workspaces/dapr` 中克隆 `dapr/dapr` 仓库（或你的 fork）。

首先，确保你已经通过 GitHub CLI 进行了身份验证：

```sh
# 运行此命令并按照提示操作
# 大多数用户应接受默认选项
gh auth login
```

克隆仓库：

```sh
# 如果你想使用你的 dapr/dapr fork，请将其替换为你的 fork（例如 "yourusername/dapr"）
# 执行此操作前请确保你已经 fork 了仓库
REPO=dapr/dapr
cd /workspaces
gh repo clone "$REPO" /workspaces/dapr
```

然后，将文件夹添加到当前工作区：

```sh
code -a /workspaces/dapr
```


## 相关链接
<!-- IGNORE_LINKS -->
- [GitHub 文档](https://docs.github.com/codespaces/overview)
<!-- END_IGNORE -->
