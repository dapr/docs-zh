---
type: docs
title: "Dapr AI .NET SDK"
linkTitle: "AI"
weight: 100000
description: "Dapr AI 构建块在 .NET 中的概述"
---

`Dapr.AI` 提供了一个专用客户端，用于从 .NET 应用程序与 Dapr 的 AI 工作负载进行交互。目前，Dapr 提供对话 API 来与大语言模型交互，而 `DaprConversationClient` 是发送提示词、配置响应格式、管理提示词缓存保留以及读取 token 用量统计信息的入口。

如果你已经在使用 `Microsoft.Extensions.AI` 生态，`Dapr.AI.Microsoft.Extensions` 包基于 Dapr 对话构建块实现了 `IChatClient`，因此你可以将 Dapr 用作任何兼容 `IChatClient` 的代码的后端，包括工具调用和函数调用。

{{% alert title="运行时要求" color="primary" %}}
Dapr 对话构建块需要 Dapr 运行时 v1.16.0 或更高版本。响应格式、提示词缓存保留和 token 用量统计需要 Dapr 运行时 v1.17.0 或更高版本。
{{% /alert %}}

## 核心概念

- [操作指南：在 .NET SDK 中创建和使用 Dapr AI 对话]({{< ref dotnet-ai-conversation-howto.md >}})：安装包，通过依赖注入注册 `DaprConversationClient` 或手动构建它，并尝试示例。
- [DaprConversationClient 用法]({{< ref dotnet-ai-conversation-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、依赖注入重载、发送对话请求、JSON Schema 响应格式、提示词缓存保留以及 token 用量统计。
- [操作指南：在 Dapr .NET 对话 SDK 中使用 Microsoft AI 扩展]({{< ref dotnet-ai-extensions-howto.md >}})：将 `DaprChatClient` 注册为 `IChatClient`，发送聊天消息，使用工具调用和函数调用，并处理错误。

## 后续步骤

- [操作指南：在 .NET SDK 中创建和使用 Dapr AI 对话]({{< ref dotnet-ai-conversation-howto.md >}})
- [DaprConversationClient 用法]({{< ref dotnet-ai-conversation-usage.md >}})
- [在 Dapr .NET 对话 SDK 中使用 Microsoft AI 扩展]({{< ref dotnet-ai-extensions-howto.md >}})
