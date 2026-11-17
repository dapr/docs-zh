---
type: docs
title: "Dapr MCP 服务器入门指南"
linkTitle: "入门指南"
weight: 10
description: "安装 Dapr MCP 服务器，使用 Dapr 边车运行它，并通过 stdio 或 Streamable HTTP 连接 MCP 客户端"
aliases:
  - /zh-hans/developing-ai/mcp/mcp-server-getting-started/
  - /zh-hans/developing-ai/mcp/mcp-server-integrations/
---

本指南将安装 Dapr MCP 服务器，让它与一个带有两个内存中组件的 Dapr 边车一起运行，并将 MCP 客户端连接到该服务器。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})，并以[自托管模式初始化 Dapr]({{% ref install-dapr-selfhost.md %}})
- 一个 MCP 客户端，例如 Claude Desktop、Cursor 或 Claude Code

## 步骤 1：安装服务器

请选择以下任一方式。

{{< tabpane text=true >}}

{{% tab header="发布版二进制文件" %}}

每个 [GitHub 发布版](https://github.com/dapr/dapr-mcp-server/releases)为每个平台发布一个二进制文件，名称为 `dapr-mcp-server-<os>-<arch>`，并附带 `checksums.txt` 文件。可用的构建版本包括 `linux-amd64`、`linux-arm64`、`darwin-amd64`、`darwin-arm64` 和 `windows-amd64`（带 `.exe` 后缀）。

{{< tabpane text=true >}}

{{% tab "Linux" %}}

下载二进制文件，使用 `checksums.txt` 进行校验，并将其移动到你的 `PATH` 中。在 Arm 架构上，请使用 `linux-arm64`。

```bash
curl -LO https://github.com/dapr/dapr-mcp-server/releases/latest/download/dapr-mcp-server-linux-amd64
curl -LO https://github.com/dapr/dapr-mcp-server/releases/latest/download/checksums.txt
sha256sum --ignore-missing -c checksums.txt
chmod +x dapr-mcp-server-linux-amd64
sudo mv dapr-mcp-server-linux-amd64 /usr/local/bin/dapr-mcp-server
```

{{% /tab %}}

{{% tab "macOS" %}}

下载二进制文件，使用 `checksums.txt` 进行校验，并将其移动到你的 `PATH` 中。在 Intel Mac 上，请使用 `darwin-amd64`。

```bash
curl -LO https://github.com/dapr/dapr-mcp-server/releases/latest/download/dapr-mcp-server-darwin-arm64
curl -LO https://github.com/dapr/dapr-mcp-server/releases/latest/download/checksums.txt
shasum -a 256 --ignore-missing -c checksums.txt
chmod +x dapr-mcp-server-darwin-arm64
sudo mv dapr-mcp-server-darwin-arm64 /usr/local/bin/dapr-mcp-server
```

{{% /tab %}}

{{% tab "Windows" %}}

在 PowerShell 中，将二进制文件下载到 `$Env:LOCALAPPDATA\dapr-mcp-server`，使用 `checksums.txt` 进行校验，并将该文件夹添加到你的用户 `PATH` 中：

```powershell
$base = "https://github.com/dapr/dapr-mcp-server/releases/latest/download"
$dir = "$Env:LOCALAPPDATA\dapr-mcp-server"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest "$base/dapr-mcp-server-windows-amd64.exe" -OutFile "$dir\dapr-mcp-server.exe"
Invoke-WebRequest "$base/checksums.txt" -OutFile "$dir\checksums.txt"
$expected = ((Select-String -Path "$dir\checksums.txt" -Pattern "dapr-mcp-server-windows-amd64.exe").Line -split "\s+")[0]
$actual = (Get-FileHash "$dir\dapr-mcp-server.exe" -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $expected) { throw "Checksum mismatch for dapr-mcp-server.exe" }
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ";") -notcontains $dir) {
    [Environment]::SetEnvironmentVariable("Path", (($userPath, $dir) | Where-Object { $_ }) -join ";", "User")
}
```

打开一个新的终端，使更新后的 `PATH` 生效。

{{% /tab %}}

{{< /tabpane >}}

{{% /tab %}}

{{% tab header="Go" %}}

需要 Go 1.26.6 或更高版本。

```bash
go install github.com/dapr/dapr-mcp-server/cmd/dapr-mcp-server@latest
```

使用这种方式构建的二进制文件会将版本报告为 `dev`，因为版本号只有在发布构建时才会写入。

{{% /tab %}}

{{% tab header="容器镜像" %}}

多架构镜像（`linux/amd64`、`linux/arm64`）发布到 GitHub Container Registry，并以发布版本号作为标签。稳定版发布还会更新 `latest`。

```bash
docker pull ghcr.io/dapr/dapr-mcp-server:latest
```

该镜像以非 root 用户运行，默认使用 `--http 0.0.0.0:8080` 在 8080 端口上监听，并包含 `HEALTHCHECK`。有关如何将其与边车搭配使用，请参阅[在 Kubernetes 上运行](#在-kubernetes-上运行)。

{{% /tab %}}

{{< /tabpane >}}

检查安装结果：

```bash
dapr-mcp-server --version
```

## 步骤 2：定义组件

服务器只会为已加载组件的构建块注册工具。创建一个 `components` 文件夹，其中包含一个内存 state store 和一个 pub/sub broker：

```bash
mkdir -p components
```

`components/statestore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
```

`components/pubsub.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
```

有了这两个组件，服务器会注册三个核心工具，以及状态和 pub/sub 工具。添加其他类型的组件（`bindings.*`、`secretstores.*`、`lock.*`、`crypto.*`、`conversation.*`）即可暴露其工具。完整的对应关系请参阅[工具参考]({{% ref dapr-mcp-server-tool-reference.md %}})。

## 步骤 3：运行并连接

### 通过 stdio（Claude Desktop、Cursor）

使用 stdio 时，MCP 客户端会自行启动服务器进程。请先单独运行边车，并指定一个固定的 gRPC 端口：

```bash
dapr run --app-id dapr-mcp-server --dapr-grpc-port 50001 --resources-path ./components
```

保持其运行，然后让客户端指向该二进制文件。请使用绝对路径，因为客户端并不总是能继承你 shell 的 `PATH`。在 Windows 上，应填写 `dapr-mcp-server.exe` 的完整路径，并且在 JSON 中每个反斜杠都要重复一次（例如 `C:\\Users\\<you>\\AppData\\Local\\dapr-mcp-server\\dapr-mcp-server.exe`）。

{{< tabpane text=true >}}

{{% tab header="Claude Desktop" %}}

编辑 `claude_desktop_config.json`（在 macOS 上为 `~/Library/Application Support/Claude/claude_desktop_config.json`；在 Windows 上为 `%APPDATA%\Claude\claude_desktop_config.json`），然后重启 Claude Desktop：

```json
{
  "mcpServers": {
    "dapr": {
      "command": "/usr/local/bin/dapr-mcp-server",
      "env": {
        "DAPR_GRPC_PORT": "50001"
      }
    }
  }
}
```

{{% /tab %}}

{{% tab header="Cursor" %}}

将服务器添加到 `~/.cursor/mcp.json`，或项目中的 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "dapr": {
      "command": "/usr/local/bin/dapr-mcp-server",
      "env": {
        "DAPR_GRPC_PORT": "50001"
      }
    }
  }
}
```

{{% /tab %}}

{{% tab header="Claude Code" %}}

```bash
claude mcp add dapr --env DAPR_GRPC_PORT=50001 -- /usr/local/bin/dapr-mcp-server
```

{{% /tab %}}

{{< /tabpane >}}

让助手列出你的 Dapr 组件。它会调用 `get_components`，并报告 `statestore` 和 `pubsub`。之后可以试试“将键 `greeting` 以值 `hello` 保存到 state store”，再试试“把它读回来”。

服务器将日志以 JSON 格式写入 stderr，因此日志绝不会与 stdout 上的 MCP 消息混在一起。大多数客户端会在其 MCP 日志视图中显示 stderr。

### 通过 Streamable HTTP

传入 `--http` 并指定监听地址，即可通过 Streamable HTTP 提供 MCP 服务。这里 `dapr run` 会同时启动边车和服务器，并为服务器设置 `DAPR_GRPC_PORT`：

```bash
dapr run --app-id dapr-mcp-server --resources-path ./components -- dapr-mcp-server --http localhost:8080
```

MCP 端点为 `http://localhost:8080/`。检查服务器是否已启动，并能否访问其边车：

{{< tabpane text=true >}}

{{% tab "Linux/macOS" %}}

```bash
curl http://localhost:8080/readyz
```

{{% /tab %}}

{{% tab "Windows" %}}

```powershell
Invoke-RestMethod http://localhost:8080/readyz
```

{{% /tab %}}

{{< /tabpane >}}

返回 `200` 且包含 `"status":"healthy"` 表示已就绪。返回 `503` 表示无法访问边车；PowerShell 会将其报告为错误。

连接支持 Streamable HTTP 的客户端：

{{< tabpane text=true >}}

{{% tab header="Cursor" %}}

```json
{
  "mcpServers": {
    "dapr": {
      "url": "http://localhost:8080/"
    }
  }
}
```

{{% /tab %}}

{{% tab header="Claude Code" %}}

```bash
claude mcp add --transport http dapr http://localhost:8080/
```

{{% /tab %}}

{{% tab header="Python MCP SDK" %}}

```python
import asyncio

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


async def main():
    async with streamablehttp_client("http://localhost:8080/") as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print([tool.name for tool in tools.tools])
            result = await session.call_tool("get_components", {})
            print(result.structuredContent)


asyncio.run(main())
```

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="除非启用身份验证，否则绑定到 localhost" color="warning" %}}
未设置 `AUTH_MODE` 时，任何能访问 HTTP 端口的人都可以调用所有工具。本地使用时请监听 `localhost`；在网络上暴露服务器之前，请先启用[身份验证]({{% ref dapr-mcp-server-authentication.md %}})。
{{% /alert %}}

## 在 Kubernetes 上运行

在 Kubernetes 上，运行注入了 Dapr 边车的容器镜像。注入器会在服务器容器中设置 `DAPR_GRPC_PORT`，因此无需额外配置即可找到边车。将探针指向服务器的健康检查端点：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dapr-mcp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dapr-mcp-server
  template:
    metadata:
      labels:
        app: dapr-mcp-server
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "dapr-mcp-server"
    spec:
      containers:
        - name: dapr-mcp-server
          image: ghcr.io/dapr/dapr-mcp-server:latest
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /startupz
              port: 8080
            failureThreshold: 30
            periodSeconds: 2
          livenessProbe:
            httpGet:
              path: /livez
              port: 8080
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: dapr-mcp-server
spec:
  selector:
    app: dapr-mcp-server
  ports:
    - port: 8080
      targetPort: 8080
```

{{% alert title="部署前启用身份验证" color="warning" %}}
该 Service 会使服务器可被集群中的任何 Pod 访问，而且如果未设置 `AUTH_MODE`，任何调用方都可以使用所有工具。请启用[身份验证]({{% ref dapr-mcp-server-authentication.md %}})，或使用 Kubernetes `NetworkPolicy` 限制哪些 Pod 可以访问服务器。
{{% /alert %}}

将身份验证和遥测设置作为 `env` 条目添加到容器中；请参阅[配置参考]({{% ref dapr-mcp-server-configuration.md %}})。

Streamable HTTP 会话保存在服务器的内存中。如果运行多个副本，请在负责转发流量的任何组件上配置会话亲和性，以确保每个客户端始终访问同一个副本。

## 后续步骤

- 试试 [Dapr MCP 服务器 quickstarts](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server)，它们分别在 LangGraph、Dapr Agents 和 OpenAI Agents SDK 中运行同一个代理，既可以通过 MCP 客户端运行，也可以通过 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})运行。
- 浏览[工具参考]({{% ref dapr-mcp-server-tool-reference.md %}})，了解每个工具的作用，以及启用它的组件类型。
- 使用[身份验证]({{% ref dapr-mcp-server-authentication.md %}})保护 HTTP 传输。
- 使用[可观测性]({{% ref dapr-mcp-server-observability.md %}})，将追踪、指标和日志发送到后端。
