---
type: docs
title: "Dapr MCP 服务器"
linkTitle: "Dapr MCP 服务器"
weight: 40
description: "将 Dapr building block 以 Model Context Protocol 工具的形式提供给 AI 智能体"
aliases:
  - /zh-hans/developing-ai/mcp/mcp-server-overview/
---

{{% alert title="Alpha" color="warning" %}}
Dapr MCP 服务器处于 **alpha**。工具名称、输入参数和配置可能会在未来的版本中更改。
{{% /alert %}}

Dapr MCP 服务器（[`dapr/dapr-mcp-server`](https://github.com/dapr/dapr-mcp-server)）是一个独立的 [模型上下文协议（MCP）](https://modelcontextprotocol.io/) 服务器，使用 Go 编写，与 Dapr sidecar 运行在一起。它把 sidecar 的 building block（状态、pub/sub、binding、secrets、service invocation、Actor、分布式锁、加密和对话）转换为 MCP 工具，任何 MCP 客户端都可以调用这些工具：Claude Desktop、Cursor、Claude Code、VS Code、[Dapr Agents]({{% ref "/developing-ai/dapr-agents" %}})，或你自己的智能体。

## 与本节其他页面的区别

本节的其他页面介绍的是 Dapr runtime 如何把智能体连接到你已有的 MCP 服务器，连接方式可以是[通过 service invocation]({{% ref mcp-service-invocation.md %}})，也可以是使用 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})。Dapr MCP 服务器则反过来：它**本身就是**一个 MCP 服务器，它提供的工具则是 Dapr API。它是一个独立的二进制文件，有自己的发布周期，而不是 `daprd` 的一项功能。两者可以配合使用：你可以把 Dapr MCP 服务器作为一个 Dapr 应用运行，通过 service invocation 路径访问它；也可以像其他 MCP 服务器一样，将它声明为 `MCPServer` 资源。

## 适用场景

当你希望智能体执行以下操作时，使用 Dapr MCP 服务器：

- 通过 Dapr state store 持久化或读取数据；如果存储支持事务，还可以使用事务。
- 发布事件、调用其他 Dapr 应用或 Actor，或通过 output binding 访问外部系统。
- 使用分布式锁与其他工作进程协调。
- 读取 secrets、加密或解密数据，或通过 conversation component 把提示交给另一个大型语言模型 (LLM)。

智能体获得的是你的服务所使用的同一套 component 抽象，因此将 Redis 换成 PostgreSQL，或将 Kafka 换成 RabbitMQ，都无需修改智能体。

如果只是普通计算、一次性的文本生成，或访问本地文件与进程，则不需要 Dapr MCP 服务器。这些场景都不需要 Dapr sidecar。

## 工作原理

1. 服务器启动后，使用标准的 Dapr SDK 设置（`DAPR_GRPC_PORT`、`DAPR_GRPC_ENDPOINT`）通过 gRPC 连接到 Dapr sidecar。连接最多重试五次，之后退出。
2. 服务器读取 sidecar 的 metadata，并为每个至少加载了一个 component 的 building block 注册工具。以下三个工具始终会被注册：`get_components`、`invoke_service` 和 `invoke_actor_method`。
3. 服务器通过 **stdio**（默认方式，适用于自行启动服务器的本地客户端）或 **streamable HTTP**（使用 `--http` 参数，适用于远程和共享部署）提供 MCP 服务。身份验证、健康检查端点和 CORS 仅适用于 HTTP 传输。

工具跟随 sidecar 中已加载的 component 变化，无需重启。当[component 热重载]({{% ref "component-updates.md#hot-reloading" %}})新增某类型的第一个 component（例如第一个 pub/sub component）时，服务器会在客户端下一次列出工具或调用 `get_components` 时注册该类型的工具，并通知已连接的客户端工具列表已变更。删除某类型的最后一个 component 时，该类型的工具也会随之移除。只读取一次工具列表的客户端（许多智能体框架都是如此）需要重新连接，才能看到这些变化。

每个工具都带有 MCP 安全注解（`readOnlyHint`、`destructiveHint`、`idempotentHint`），以及告诉模型何时使用该工具的描述。服务器的指令会告诉模型先调用 `get_components`，并且绝不要编造 component 名称、键或主题。

## 安全注意事项

服务器能够执行其 Dapr sidecar 能做的任何操作，并且会把工具结果返回给模型，包括来自 `get_secret` 和 `get_bulk_secrets` 的 secret 值。请限制 sidecar 可以访问的范围：

- 只加载智能体需要的 component，并使用[component 作用域]({{% ref component-scopes.md %}})和[secret 作用域]({{% ref secrets-scopes.md %}})进一步缩小访问范围。
- 只要通过 HTTP 对本机以外的客户端提供服务，就请启用[身份验证]({{% ref dapr-mcp-server-authentication.md %}})。
- 在你的 MCP 客户端中，对标记为破坏性的工具（`delete_state`、`execute_transaction`、`invoke_service`、`invoke_actor_method`、`invoke_output_binding`、`encrypt_data`）要求人工确认。

## 后续步骤

- [入门指南]({{% ref dapr-mcp-server-getting-started.md %}})：安装、与 sidecar 一起运行，并连接客户端
- [配置参考]({{% ref dapr-mcp-server-configuration.md %}})：所有标志和环境变量
- [身份验证]({{% ref dapr-mcp-server-authentication.md %}})：OIDC、SPIFFE、Dapr Sentry 和混合模式
- [工具参考]({{% ref dapr-mcp-server-tool-reference.md %}})：每个工具、其输入及其安全属性
- [可观测性]({{% ref dapr-mcp-server-observability.md %}})：追踪、指标、日志和健康检查端点
- [Quickstarts](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server)：使用 LangGraph、Dapr Agents 和 OpenAI Agents SDK 的智能体示例，这些智能体通过 MCP 客户端或 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})使用 Dapr MCP 服务器
