---
type: docs
title: "通过 Dapr service invocation 使用 MCP"
linkTitle: "service invocation 路径"
weight: 5
description: "将 MCP 客户端和服务器作为 Dapr 应用运行，并借助 App ID 身份、访问策略、bearer middleware、mTLS 和可观测性来管控它们之间的流量"
---

Dapr 允许你将 [模型上下文协议（MCP）](https://modelcontextprotocol.io/) 的客户端和服务器作为 Dapr 应用运行，并使用你已经用于其他服务间调用的相同控制手段来管理它们之间的流量：App ID 身份、访问策略、bearer middleware、mTLS、可观测性和 resiliency。

由于 [service invocation]({{% ref service-invocation-overview.md %}}) 使用普通的 HTTP 协议，代理现有的 MCP 客户端可以指向本地的 Dapr sidecar，并通过 App ID 访问 MCP 服务器。**现成的 MCP 客户端和代理框架无需改动即可使用**，在这条路径上无需采用任何 Dapr 专用的 MCP SDK。

## 为什么使用 service invocation？

service invocation 路径复用的是你几乎肯定已经在运行的 Dapr 原语，因此 MCP 流量无需引入新的编程模型，即可获得企业级控制能力：

- **无 MCP SDK 绑定。** 任何 MCP 客户端或框架（LangGraph、官方 MCP SDK、自定义的 JSON-RPC HTTP 客户端）都可以原样通过 sidecar 驱动 MCP 服务器。采用 Dapr 只是部署阶段的变更，而不是代码变更。
- **默认启用 mTLS 的 App ID 身份。** 每一次 Dapr 到 Dapr 的调用都使用由 [Sentry]({{% ref mtls.md %}}) 签发和轮换的 SPIFFE 身份进行双向认证。MCP 服务器能看到经过验证的调用方 App ID，你无需额外叠加一层独立的身份系统。
- **粗粒度的 App ID 访问控制。** 附加到 MCP 服务器 App ID 上的 [`Configuration` `accessControl`]({{% ref mcp-access-control.md %}}) 决定哪些代理 App ID 可以访问它，并以 `deny` 作为默认动作，从而确保不可信的调用方不会意外访问到 MCP 服务器。
- **通过 OPA 实现按工具授权。** 当 App ID 层面的控制粒度不够细时，MCP 服务器入站管道上的 [OPA middleware]({{% ref mcp-access-control.md %}}) 会检查 JSON-RPC 请求体，提取工具名称（必要时还包括参数），并应用以 `(caller App ID, tool name)` 为键的 Rego 策略。这样，无需修改 SDK，现成的 MCP 客户端也能获得按工具的授权能力。
- **声明式的 OAuth 2.0 / bearer 认证。** 入站管道上的 [bearer middleware]({{% ref mcp-authentication.md %}}) 会根据颁发者的 JWKS、`iss` 和 `aud` 声明验证 JWT。出站方面，另一个 middleware 会为上游 MCP 服务器获取令牌。全部以声明式方式完成，MCP 服务器中无需任何代码。
- **内置可观测性。** service invocation 会生成按调用方和目标 App ID 切分的追踪、指标和日志，与你已用于非 MCP 流量的遥测数据完全相同。
- **resiliency。** 重试、超时和断路器通过 [`Resiliency` 资源]({{% ref policies.md %}}) 附加到 MCP 服务器的 App ID 上。MCP 调用与其他 service invocation 一样，继承 Dapr 的 resiliency。

| 不使用 Dapr service invocation | 使用 Dapr service invocation |
|---|---|
| 每个代理都内嵌一个 MCP 客户端，以及独立的身份与授权层 | 所有服务流量（包括 MCP）共用同一套身份栈 |
| 在应用中为每个服务器单独搭建 bearer 令牌的传递逻辑 | 声明式的 OAuth 2.0 / bearer middleware |
| 按工具的 RBAC 需要分叉 MCP 客户端 | OPA 读取 JSON-RPC 请求体并应用按工具的策略 |
| 需要为 MCP 流量单独附加可观测性 | 与系统其余部分相同的追踪、指标和日志 |

## 工作原理

代理和 MCP 服务器都作为 Dapr 应用运行，各自拥有独立的 App ID。MCP 客户端将请求发送到本地 sidecar，并设置 `dapr-app-id` 请求头（或使用完整的 service invocation URL）。Dapr 通过 App ID 解析目标，应用附加在 MCP 服务器 App ID 上的策略，然后转发请求。

{{< diagram mcp-service-invocation >}}

对于每一次调用，Dapr 可以：

- 通过 App ID 将请求从调用方应用路由到目标应用。
- 验证调用方的工作负载身份（使用 SPIFFE 签发凭据的 [mTLS]({{% ref mtls.md %}})）。
- 应用为目标 MCP 服务器 App ID 定义的[访问控制策略]({{% ref mcp-access-control.md %}})。
- 在入站管道上应用 HTTP middleware，例如 [OAuth 2.0 bearer 验证]({{% ref middleware-bearer.md %}})。
- 为该调用采集日志、指标和追踪。

这些功能与应用于任何其他服务间调用的方式一样，同样适用于 MCP 调用，且无需修改 MCP 客户端或服务器代码。

## Quickstart

### 步骤 1：将 MCP 服务器作为 Dapr 应用运行

一个使用 Python `mcp` 库实现的最小 MCP 服务器：

```python
# server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-mcp-server")

@mcp.tool()
def get_inventory(product_id: str) -> dict:
    """Look up inventory for a product."""
    return {"product_id": product_id, "stock": 42}

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

将其作为 Dapr 应用运行：

```bash
dapr run \
  --app-id mcp-server \
  --app-port 8000 \
  -- python server.py
```

### 步骤 2：通过 Dapr sidecar 连接代理（MCP 客户端）

代理的 MCP 客户端指向其本地 Dapr sidecar 的 service invocation 端点：

```python
# agent.py
import os
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

DAPR_HTTP_ENDPOINT = os.getenv("DAPR_HTTP_ENDPOINT", "http://localhost:3500")
MCP_URL = f"{DAPR_HTTP_ENDPOINT}/v1.0/invoke/mcp-server/method/mcp"

async def main():
    async with streamablehttp_client(url=MCP_URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("Available tools:", tools)
```

将代理作为独立的 Dapr 应用运行：

```bash
dapr run \
  --app-id my-agent \
  -- python agent.py
```

另一种方式是在 MCP 客户端传输层上设置 `dapr-app-id` 请求头，而不是使用显式的 `/v1.0/invoke/...` URL。两种形式均可使用，参见 [service invocation 概述]({{% ref service-invocation-overview.md %}}#how-to-invoke-services)。

由于两个应用运行在同一个 Dapr control plane 上，service invocation 会按 App ID 将 `my-agent` 的请求路由到 `mcp-server`。无需任何额外的网络配置。

## 应用安全控制

MCP 工具调用会经过 Dapr 的 service invocation 层，因此你可以叠加两种相互独立的安全机制：

- **OAuth 2.0 身份验证**：MCP 服务器上的 [bearer middleware]({{% ref middleware-bearer.md %}}) 会根据颁发者的 JWKS、`iss` 和 `aud` 声明验证入站 JWT。没有有效令牌的请求会在到达 MCP 服务器代码之前，被以 `401 Unauthorized` 拒绝。参见[对 MCP 服务器进行身份验证]({{% ref mcp-authentication.md %}})。
- **访问策略（ACL）**：附加到 MCP 服务器 App ID 上的 `Configuration` 资源定义了哪些代理 App ID 可以调用它，并采用默认拒绝的姿态。参见 [MCP 访问控制]({{% ref mcp-access-control.md %}})。

这些机制既可以独立使用，也可以叠加在一起实现纵深防御。使用 SPIFFE 签发的工作负载身份的 mTLS 对所有 Dapr 到 Dapr 的流量默认启用，参见 [Dapr mTLS]({{% ref mtls.md %}})。

关于完整的威胁模型框架，以及平台负责的部分与仍由你负责的部分，参见 [MCP 安全与信任态势]({{% ref mcp-security.md %}})。

## 何时使用此路径，何时使用 `MCPServer` 资源

以下情况适合使用此路径：

- 你使用现成的 MCP 客户端或代理框架（LangGraph、官方 MCP SDK 等），并希望保持该集成不变。
- App ID 级别的访问控制和 HTTP 管道 middleware 已经足够，你不需要按参数的 RBAC，也不需要观察工具结果正文的钩子。
- 你尚未使用 Dapr Workflows，或者你不希望仅为了调用 MCP 工具而引入它。

当出现以下情况时，改用 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})：

- 你需要按工具进行参数级 RBAC、审计、脱敏或响应过滤（即 `beforeCallTool` / `afterCallTool` / `beforeListTools` / `afterListTools` 钩子）。
- 你需要即使在调用中途 sidecar 重启后也能保持的持久重试。
- 你希望按工具切分可观测性数据（每个工具对应一个 workflow 名称）。

这两种路径并不互斥：你可以对大多数 MCP 流量使用 service invocation，当某个服务器的策略需要感知参数时，再将其切换到 `MCPServer` 资源。

## 相关链接

- [对 MCP 服务器进行身份验证]({{% ref mcp-authentication.md %}})
- [MCP 访问控制]({{% ref mcp-access-control.md %}})
- [MCP 安全与信任态势]({{% ref mcp-security.md %}})
- [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})
- [service invocation 概述]({{% ref service-invocation-overview.md %}})
- [Dapr mTLS]({{% ref mtls.md %}})
