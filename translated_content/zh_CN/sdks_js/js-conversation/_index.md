---
type: docs
title: "Dapr 对话 JavaScript SDK"
linkTitle: "对话"
weight: 100000
description: 使用 Dapr JavaScript SDK 与大型语言模型对话
---

使用 `DaprClient.conversation` 通过 Dapr conversation component 向大型语言模型发送消息。JavaScript SDK 通过 HTTP 和 gRPC 支持 Conversation Alpha2 API，包括消息历史、函数工具调用、结构化输出、PII 清理、提示词缓存保留以及令牌用量统计。

这些指南面向 **`@dapr/dapr` 3.19.0 或更高版本**。底层的 [conversation API]({{% ref conversation_api.md %}}) 处于 alpha。基本的 Alpha2 请求需要 Dapr 运行时 **1.16 或更高版本**；部分选项需要更新的运行时，并且取决于所选 component 和模型的支持。

| 指南 | 描述 |
| ----- | ----------- |
| [操作指南：与大型语言模型 (LLM) 对话]({{% ref js-conversation-howto.md %}}) | 安装包、配置 component 并发送第一个请求。 |
| [对话客户端用法]({{% ref js-conversation-client-usage.md %}}) | 配置客户端，处理消息与响应，并使用高级请求选项。 |
| [操作指南：调用工具]({{% ref js-conversation-tools-howto.md %}}) | 定义函数、校验模型生成的参数，并将工具结果返回给模型。 |
