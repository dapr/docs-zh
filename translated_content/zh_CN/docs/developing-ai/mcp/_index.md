---
type: docs
title: "MCP"
linkTitle: "MCP"
weight: 25
description: "Dapr 帮助开发者运行安全、可靠且持久的 Model Context Protocol (MCP) 服务器集成"
---

Dapr 借助其[服务调用 API]({{% ref service-invocation-overview.md %}})支持 MCP。开箱即用的 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 客户端和智能体框架（LangGraph、官方 MCP SDK、自定义 HTTP 客户端）指向本地 Dapr 边车，并通过 App ID 访问 MCP 服务器。Dapr 使用与其他任何服务间调用相同的控制措施来管理这些流量：App ID 身份、访问策略、HTTP 中间件、mTLS、可观测性以及弹性策略。

## 工作原理

智能体与 MCP 服务器都作为 Dapr 应用运行，各自拥有独立的 App ID。MCP 客户端将请求发送到其本地边车，并设置 `dapr-app-id` 请求头（或使用完整的服务调用 URL）。Dapr 按 App ID 解析目标，应用为 MCP 服务器的 App ID 定义的策略，然后转发请求。

对于每次调用，Dapr 可以：

- **路由请求**：按 App ID 将请求从调用方应用转发到目标应用。
- **验证调用方的工作负载身份**：使用基于 SPIFFE 签发凭据的 [mTLS]({{% ref mtls.md %}})。默认开启。
- **应用访问控制策略**：为目标 MCP 服务器的 App ID 定义的策略，包括粗粒度的 App ID 准入控制，以及通过 [OPA]({{% ref mcp-access-control.md %}}) 实现的逐工具授权。
- **应用 HTTP 中间件**：作用于入站管道，例如 [OAuth 2.0 Bearer 校验]({{% ref middleware-bearer.md %}})。
- **采集可观测性数据**：记录调用的日志、指标和追踪，并按调用方和目标 App ID 切分。

开箱即用的 MCP 客户端无需修改即可工作，这条路径下无需引入 Dapr 专用的 MCP SDK。

## 开始使用

- **[通过 Dapr 服务调用使用 MCP]({{% ref mcp-service-invocation.md %}})**：快速入门与架构
- **[认证 MCP 服务器]({{% ref mcp-authentication.md %}})**：OAuth 2.0 与 Bearer 中间件
- **[MCP 访问控制]({{% ref mcp-access-control.md %}})**：`Configuration` 的 `accessControl` 与 MCP 的 OPA
- **[MCP 安全态势]({{% ref mcp-security.md %}})**：威胁模型与纵深防御说明

## 安全概览

| 层级 | 控制内容 | 参考 |
|---|---|---|
| **mTLS + SPIFFE 身份** | 每一次 Dapr 到 Dapr 的调用都使用 Sentry 签发并自动轮换的身份进行双向认证。默认开启。 | [Dapr mTLS]({{% ref mtls.md %}}) |
| **`Configuration` `accessControl`** | 哪些调用方 App ID 可以访问哪些 MCP 服务器。支持默认拒绝。 | [MCP 访问控制]({{% ref mcp-access-control.md %}}) |
| **HTTP 中间件（Bearer / OAuth2）** | 在 `appHttpPipeline` 上进行入站 JWT 校验；在 `httpPipeline` 上进行出站令牌获取。 | [认证 MCP 服务器]({{% ref mcp-authentication.md %}}) |
| **OPA 逐工具策略** | 感知参数与工具的授权，检查 MCP JSON-RPC 请求体。 | [MCP 访问控制]({{% ref mcp-access-control.md %}}) |

关于威胁模型框架、默认安全态势以及哪些部分仍由你负责，请参阅 [MCP 安全态势]({{% ref mcp-security.md %}})。

## 为智能体提供 Dapr 工具：Dapr MCP 服务器

本页介绍的路径用于将智能体连接到你已经运行的 MCP 服务器。[Dapr MCP 服务器]({{% ref dapr-mcp-server %}})是一个独立的 MCP 服务器，与 Dapr 边车一同运行，并将 Dapr 的构建块（状态、pub/sub、binding、secrets、服务调用、Actor、锁、加密和对话）以 MCP 工具的形式对外提供。当你希望智能体从任意 MCP 客户端直接调用 Dapr API 时，请使用它。[Dapr MCP 服务器的 quickstarts](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server) 展示了它与 LangGraph、Dapr Agents 和 OpenAI Agents SDK 的配合方式。

## 替代方案：`MCPServer` 资源（以工作流为中心的路径）

使用 Dapr 集成 MCP 还有第二种方式，即 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})。这条路径将 MCP 集成变为部署阶段的事情：你以 YAML 资源的形式声明每个 MCP 服务器，Dapr 会发现工具、管理连接，并为每个工具注册一个内置的持久工作流。调用工具就变成了“启动一个工作流”。

采用这条路径需要权衡以下取舍：

- **需要 [Dapr 工作流]({{% ref workflow-overview %}}) 客户端。** 你必须通过 Dapr 工作流 SDK 调用 MCP 工具，而不能使用现有的 MCP 客户端。
- **开箱即用的 MCP 客户端和智能体框架无法与这条路径配合使用。** 如果你使用 LangGraph、标准的 MCP Python SDK 或任何其他原生支持 MCP 协议的框架，就无法使用这些防护措施。你需要通过工作流 SDK 调用工具，并放弃框架自带的 MCP 集成。
- **扩展性方面的考量。** 每次工具调用都会派生一个子工作流，并写入工作流 state store。如果你的智能体本身已经是一个工作流（例如 `DurableAgent`），那么每次工具调用都会变成一个子工作流。
- **目前仅支持工作流客户端。** 驱动由 `MCPServer` 支撑的工具调用需要 Dapr 工作流客户端；在当前版本中，开箱即用的 MCP 客户端无法驱动这些流程。

在以下情况下，请使用 `MCPServer` 资源：

- 你需要**逐工具的参数级 RBAC、审计或脱敏钩子**（`beforeCallTool` / `afterCallTool` / `beforeListTools` / `afterListTools`）。
- 你需要**持久重试**，即在边车重启导致调用中断后仍能恢复（由 Dapr 工作流与调度器提醒提供支持）。
- 你需要**逐工具的可观测性切分**：每个工具对应一个工作流名称，因此追踪、指标和审计日志开箱即可按工具切分。
- 你的应用已在其余执行模型中使用 Dapr 工作流。
- 你接受开箱即用的 MCP 客户端和智能体框架无法用于这些调用。

请参阅 [`MCPServer` 资源页面]({{% ref mcp-server-resource.md %}})，了解它与服务调用路径的完整对比以及分步指南。
