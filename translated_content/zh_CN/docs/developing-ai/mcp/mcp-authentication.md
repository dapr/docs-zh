---
type: docs
title: "对 MCP 服务器进行身份验证"
linkTitle: "快速入门"
weight: 20
description: "如何启用 MCP 客户端和服务器端身份验证"
---

## 概述

[MCP 规范](https://modelcontextprotocol.io/specification/) 并不强制要求 MCP 客户端与服务器之间的任何形式的身份验证。安全模型由用户自行规划和实施。这给开发者带来了维护负担，并使 MCP 服务器面临各种攻击面。

虽然 MCP 服务器缺少身份标识，但 OAuth2 是一个成熟的标准，可用于正确地对 MCP 客户端进行身份验证以访问 MCP 服务器。

在以下场景中，OAuth2 变得尤为重要：

* 多租户
* 远程
* 云托管
* 连接到机密系统
* 代表用户执行特权操作
* 暴露需要权限控制的工具

Dapr 通过使用 [中间件]({{% ref "middleware" %}}) 组件，支持 MCP 客户端与服务器之间的 OAuth2 身份验证。

## 身份验证类型

Dapr 为 MCP 服务器的生产级部署支持两种关键身份验证机制——客户端和服务器端。

### 客户端身份验证

客户端发起 OAuth2 以获取访问令牌，并在连接到 MCP 服务器时包含该令牌。
这证明了用户的身份和权限，对于远程、敏感或多租户 MCP 服务器是必需的。
它确保服务器可以信任调用方以及客户端允许使用的范围。

### 服务器端身份验证

服务器验证客户端的令牌，或者在令牌缺失或不足时触发 OAuth2 登录或范围升级。
这对于云托管或共享 MCP 服务器、租户感知系统以及需要用户特定授权的集成是必需的。
它强制执行访问控制，隔离用户，并保护特权工具和数据。

## 如何启用客户端身份验证

### 将 MCP 服务器定义为 HTTPEndpoint

Dapr 允许开发者和运维人员将远程 HTTP 服务建模为可使用 Dapr [服务调用 API]({{% ref "service-invocation-overview" %}}) 管理和调用的资源。
创建此 `HTTPEndpoint` 资源来表示 MCP 服务器：

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: "mcp-server"
spec:
  baseUrl: https://my-mcp-server:443
  headers:
  - name: "Accept"
    value: "text/event-stream"
```

### 定义 OAuth2 中间件和配置组件

以下中间件组件定义了与 OAuth2 提供程序的连接：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<client-id>"
  - name: clientSecret
    value: "<client-secret>"
  - name: authURL
    value: "<authorization-url>"
  - name: tokenURL
    value: "<token-url>"
  - name: scopes
    value: "<comma-separated scopes>"
```

接下来，创建配置资源，告诉 Dapr 使用 OAuth2 中间件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: auth
spec:
  tracing:
    samplingRate: "1"
  httpPipeline:
    handlers:
    - name: oauth2 # 在此引用 oauth 组件
      type: middleware.http.oauth2    
```

{{% alert title="注意" color="primary" %}} 
访问[此链接]({{% ref "component-secrets.md" %}})以了解如何向 Dapr 组件提供密钥
{{% /alert %}}

### 使用 MCP 客户端调用 MCP 服务器

将以下代码复制到名为 `mcpclient.py` 的文件中：

```python
import asyncio
from mcp import ClientSession
from mcp.transport.http import HttpClientTransport

async def main():
    # Dapr 进程的默认地址。在生产环境中使用环境变量
    server_url = "http://localhost:3500/"

    # 创建带有标头的 HTTP/SSE 传输，以针对上面定义的 HTTPEndpoint
    transport = HttpClientTransport(
        url=server_url,
        headers={
          "dapr-app-id": "mcp-server",
        }
        event_headers={
            "Accept": "text/event-stream",
        },
    )

    # 创建绑定到传输的 MCP 会话
    async with ClientSession(transport) as session:
        await session.initialize()

        tools = await session.call("tools/list")
        print("Server Tools:", tools)

        await session.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```

### 使用 Dapr 运行 MCP 客户端

将上面的 YAML 文件放入 `components` 目录并运行 Dapr：

```bash
dapr run --app-id mcpclient --resources-path ./components --dapr-http-port 3500 --config ./config.yaml -- python mcpclient.py
```

MCP 客户端使 Dapr 在连接到 MCP 服务器之前启动 OAuth2 流水线。

## 如何启用服务器端身份验证

### 定义 OAuth2 中间件和配置组件

定义一个与客户端示例相同的中间件组件。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<client-id>"
  - name: clientSecret
    value: "<client-secret>"
  - name: authURL
    value: "<authorization-url>"
  - name: tokenURL
    value: "<token-url>"
  - name: scopes
    value: "<comma-separated scopes>"
```

接下来，创建配置组件，修改 `appHttpPipeline` 字段。这告诉 Dapr 对传入的调用应用中间件。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: auth
spec:
  tracing:
    samplingRate: "1"
  appHttpPipeline:
    handlers:
    - name: oauth2 # 在此引用 oauth 组件
      type: middleware.http.oauth2    
```

### 使用 Dapr 运行 MCP 服务器

将上面的 YAML 文件放入 `components` 目录并运行 Dapr：

```bash
dapr run --app-id mcpserver --resources-path ./components --dapr-http-port 3500 --config ./config.yaml -- python mcpserver.py
```

当 MCP 服务器的请求到达时，Dapr 将启动 OAuth2 流水线。
