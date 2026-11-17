---
type: docs
title: "对 MCP 服务器进行身份验证"
linkTitle: "对 MCP 服务器进行身份验证"
weight: 10
description: "如何启用 MCP 客户端和服务器端身份验证"
---

## 概述

[MCP 规范](https://modelcontextprotocol.io/specification/) 并不强制要求 MCP 客户端与服务器之间的任何形式的身份验证。安全模型由用户自行规划和实施。这给开发者带来了维护负担，并使 MCP 服务器面临各种攻击面。

虽然 MCP 服务器缺少身份标识，但 OAuth2 是一个成熟的标准，可用于正确地对 MCP 客户端进行身份验证，以访问 MCP 服务器。

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
它确保服务器能够信任调用方的身份，以及客户端被允许使用的作用域。

### 服务器端身份验证

服务器验证客户端的令牌，或者在令牌缺失或不足时触发 OAuth2 登录或作用域升级。
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
piVersion: dapr.io/v1alpha1
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
访问[此链接]({{% ref "component-secrets.md" %}})，了解如何向 Dapr 组件提供 secrets。
{{% /alert %}}

### 使用 MCP 客户端调用 MCP 服务器

将以下代码复制到名为 `mcpclient.py` 的文件中：

```python
import asyncio
from mcp import ClientSession
from mcp.transport.http import HttpClientTransport

async def main():
    # Dapr 进程的默认地址。在生产环境中请使用环境变量
    server_url = "http://localhost:3500/"

    # 创建带有标头的 HTTP/SSE 传输，以指向上面定义的 HTTPEndpoint
    transport = HttpClientTransport(
        url=server_url,
        headers={
          "dapr-app-id": "mcp-server",
        }
        event_headers={
            "Accept": "text/event-stream",
        },
    )

    # 创建绑定到该传输的 MCP 会话
    async with ClientSession(transport) as session:
        await session.initialize()

        tools = await session.call("tools/list")
        print("Server Tools:", tools))

        await session.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```

### 使用 Dapr 运行 MCP 客户端

将上面的 YAML 文件放入 `components` 目录并运行 Dapr：

```bash
dapr run --app-id mcpclient --resources-path ./components --dapr-http-port 3500 --config ./config.yaml -- python mcpclient.py
```

MCP 客户端会使 Dapr 在连接到 MCP 服务器之前启动 OAuth2 流水线。  

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

接下来，创建配置组件，并修改 `appHttpPipeline` 字段。这告诉 Dapr 对传入的调用应用该中间件。

```yaml
piVersion: dapr.io/v1alpha1
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
dapr run --app-id mcpclient --resources-path ./components --dapr-http-port 3500 --config ./config.yaml -- python mcpserver.py
```

当 MCP 服务器的请求到达时，Dapr 将启动 OAuth2 流水线。

### 替代方案：使用 bearer 中间件进行入站 JWT 验证

要求 MCP 服务器的每个入站请求都携带有效的 OAuth 2.0 令牌，且无需在服务器端驱动 OAuth2 流程，请将 [`middleware.http.bearer`]({{% ref middleware-bearer.md %}}) 挂载到 MCP 服务器的 `appHttpPipeline` 上。该中间件会根据 JWKS 端点验证令牌的签名、颁发者（issuer）和受众（audience），并在请求到达服务器代码之前拒绝缺失或无效令牌的请求（`401 Unauthorized`）。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearer-validator
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://auth.example.com/.well-known/jwks.json"
  - name: audience
    value: "mcp-server"
  - name: issuer
    value: "https://auth.example.com"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: bearer-server
spec:
  appHttpPipeline:
    handlers:
    - name: bearer-validator
      type: middleware.http.bearer
```

将 bearer 验证与[基于 App-ID 的访问控制]({{% ref mcp-access-control.md %}})结合使用，以实现纵深防御：`accessControl` 决定*哪些调用方*可以访问服务器；bearer 验证则要求它们出示有效且已签名的令牌。

## 另请参阅

- [MCP 访问控制]({{% ref mcp-access-control.md %}}) —— 在服务调用边界处基于 App-ID 的授权。
- [MCP 安全态势]({{% ref mcp-security.md %}}) —— 威胁模型与纵深防御的整体说明。
- [Bearer 中间件参考]({{% ref middleware-bearer.md %}})。
- [OAuth2 中间件参考]({{% ref middleware-oauth2.md %}})。
