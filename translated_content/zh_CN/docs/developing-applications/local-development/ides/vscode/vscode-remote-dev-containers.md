---
type: docs
title: "使用 Dev Containers 开发 Dapr 应用程序"
linkTitle: "Dev Containers"
weight: 30000
description:  "如何使用 Dapr 设置容器化开发环境"
---

{{% alert title="弃用通知" color="primary" %}}
该扩展此前由 Microsoft 支持，但现已弃用。该扩展仍将在 Visual Studio Code marketplace 中提供，但将不再接收更新或支持。

{{% /alert %}}

Visual Studio Code [Dev Containers 扩展](https://code.visualstudio.com/docs/remote/containers)允许您使用独立的 Docker 容器作为完整的开发环境，而无需在本地文件系统中安装任何额外的软件包、库或工具。

Dapr 为 C# 和 JavaScript/TypeScript 提供了预构建的 Dev Containers；您可以选择适合您需求的容器，即可获得现成的开发环境。请注意，这些预构建的容器会自动更新到最新的 Dapr 版本。

我们还发布了一个 Dev Container 功能，可在任何 Dev Container 中安装 Dapr CLI。

## 设置开发环境

### 前置条件

- [Docker Desktop](https://docs.docker.com/desktop/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [VS Code Remote Development extension pack](https://aka.ms/vscode-remote/download/extension)

### 使用 Dev Container 功能添加 Dapr CLI

您可以使用 [Dev Container 功能](https://containers.dev/features) 在任何 Dev Container 中安装 Dapr CLI。

为此，请编辑您的 `devcontainer.json` 并在 `"features"` 部分添加两个对象：

```json
"features": {
    // 安装 Dapr CLI
    "ghcr.io/dapr/cli/dapr-cli:0": {},
    // 启用 Docker（通过 Docker-in-Docker）
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    // 或者，使用 Docker-outside-of-Docker（使用主机上的 Docker）
    //"ghcr.io/devcontainers/features/docker-outside-of-docker:1": {},
}
```

保存 JSON 文件并（重新）构建承载您的开发环境的容器后，您将拥有 Dapr CLI（和 Docker）可用，并且可以通过在容器中运行以下命令来安装 Dapr：

```sh
dapr init
```

#### 示例：为 Dapr 创建 Java Dev Container

这是一个基于[官方 Java 17 Dev Container 镜像](https://github.com/devcontainers/images/tree/main/src/java)创建用于开发使用 Dapr 的 Java 应用程序的 Dev Container 示例。

将此内容放在项目中的 `.devcontainer/devcontainer.json` 文件中：

```json
// 有关格式详细信息，请参阅 https://aka.ms/devcontainer.json。有关配置选项，请参阅
// README at: https://github.com/devcontainers/templates/tree/main/src/java
{
	"name": "Java",
	// 或使用 Dockerfile 或 Docker Compose 文件。更多信息：https://containers.dev/guide/dockerfile
	"image": "mcr.microsoft.com/devcontainers/java:0-17",

	"features": {
		"ghcr.io/devcontainers/features/java:1": {
			"version": "none",
			"installMaven": "false",
			"installGradle": "false"
		},
        // 安装 Dapr CLI
        "ghcr.io/dapr/cli/dapr-cli:0": {},
        // 启用 Docker（通过 Docker-in-Docker）
        "ghcr.io/devcontainers/features/docker-in-docker:2": {},
        // 或者，使用 Docker-outside-of-Docker（使用主机上的 Docker）
        //"ghcr.io/devcontainers/features/docker-outside-of-docker:1": {},
	}

	// 使用 'forwardPorts' 使容器内的端口列表在本地可用。
	// "forwardPorts": [],

	// 使用 'postCreateCommand' 在容器创建后运行命令。
	// "postCreateCommand": "java -version",

	// 配置特定于工具的属性。
	// "customizations": {},

	// 取消注释以 root 用户身份连接。更多信息：https://aka.ms/dev-containers-non-root。
	// "remoteUser": "root"
}
```

然后，使用 VS Code 命令面板（`CTRL + SHIFT + P` 或 Mac 上的 `CMD + SHIFT + P`），选择 `Dev Containers: Rebuild and Reopen in Container`。

### 使用预构建的 Dev Container（C# 和 JavaScript/TypeScript）

1. 在 VS Code 中打开您的应用程序工作区
2. 在命令面板中（`CTRL + SHIFT + P` 或 Mac 上的 `CMD + SHIFT + P`）键入并选择 `Dev Containers: Add Development Container Configuration Files...`
    <br /><img src="/images/vscode-remotecontainers-addcontainer.png" alt="添加远程容器的屏幕截图" width="700">
3. 键入 `dapr` 以过滤列表到可用的 Dapr 远程容器，并选择与您的应用程序匹配的语言容器。请注意，您可能需要选择 `Show All Definitions...`
    <br /><img src="/images/vscode-remotecontainers-daprcontainers.png" alt="添加 Dapr 容器的屏幕截图" width="700">
4. 按照提示在容器中重新打开您的工作区。
    <br /><img src="/images/vscode-remotecontainers-reopen.png" alt="在开发容器中重新打开应用程序的屏幕截图" width="700">

#### 示例

观看此[视频](https://www.youtube.com/watch?v=D2dO4aGpHcg&t=120)，了解如何将 Dapr Dev Containers 与您的应用程序一起使用。

{{< youtube id=D2dO4aGpHcg start=120 >}}
