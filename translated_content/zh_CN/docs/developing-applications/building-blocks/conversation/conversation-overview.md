---
type: docs
title: "对话概览"
linkTitle: "概述"
weight: 1000
description: "对话 API 构建块概述"
---

{{% alert title="Alpha" color="primary" %}}
对话 API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}}) 阶段。
{{% /alert}}

Dapr 的对话 API 降低了大规模安全可靠地与大型语言模型 (LLM) 交互的复杂性。无论您是缺乏必要原生 SDK 的开发者，还是只想专注于 LLM 交互的提示工程的多语言团队，对话 API 都提供了一个一致的 API 入口点来与底层 LLM 提供商通信。

<img src="/images/conversation-overview.png" width=800 alt="展示用户应用与 Dapr LLM 组件通信流程的图表。">

除了启用关键的性能和安全功能（如[缓存]({{% ref "#caching" %}})和 [PII 清理]({{% ref "#personally-identifiable-information-pii-obfuscation" %}})），对话 API 还提供：

- **工具调用能力**：允许 LLM 与外部函数和 API 交互，实现更复杂的 AI 应用
- **OpenAI 兼容接口**：与现有 AI 工作流和工具无缝集成

您还可以将对话 API 与 Dapr 功能结合使用，例如：

- 弹性策略，包括处理重复错误的断路器、保护慢响应的超时机制，以及临时网络故障的重试
- 使用 OpenTelemetry 和 Zipkin 的可观测性，包括指标和分布式追踪
- 验证进出 LLM 请求的中间件

## 功能

以下功能是[所有支持的对话组件]({{% ref supported-conversation %}}) 开箱即用的。

### 缓存

对话 API 支持两种缓存：

- **提示缓存**：某些 LLM 提供商在本地缓存提示前缀，以加快重复提示的速度并降低成本。您可以通过 API 使用 `promptCacheRetention` 参数在每个请求中启用此功能（例如，`24h` 用于 OpenAI）。有关请求级选项，请参阅[对话 API 参考]({{% ref conversation_api.md %}})。支持情况取决于提供商。
- **响应缓存**：对话组件可以在边车中缓存完整的 LLM 响应。当您设置组件元数据字段 `responseCacheTTL`（例如 `10m`）时，Dapr 会根据请求（提示和选项）缓存响应。重复的相同请求将从缓存提供，无需调用 LLM，从而降低延迟和成本。此缓存在内存中且每个边车独立。请在您的[对话组件]({{% ref supported-conversation %}}) spec 中配置。

### 响应格式化

您可以通过在请求中传递 `responseFormat`（JSON Schema）来请求模型的结构化输出。支持 Deepseek、Google AI、Hugging Face、OpenAI 和 Anthropic。请参阅[对话 API 参考]({{% ref conversation_api.md %}})。

### 使用量指标

响应可以包含对话的令牌使用量（`promptTokens`、`completionTokens`、`totalTokens`）。请参阅 API 参考中的[响应内容]({{% ref "conversation_api.md#response-content" %}})。

### 个人身份信息 (PII) 混淆

PII 混淆功能可识别并清除对话响应中任何形式的敏感用户信息。只需在输入和输出数据上启用 PII 混淆即可保护您的隐私，清除可能被用来识别个人的敏感细节。

PII 清理器会混淆以下用户信息：
- 电话号码
- 电子邮件地址
- IP 地址
- 街道地址
- 信用卡
- 社会安全号码
- ISBN
- 媒体访问控制 (MAC) 地址
- 安全哈希算法 1 (SHA-1) 十六进制
- SHA-256 十六进制
- MD5 十六进制

### 工具调用支持

对话 API 支持高级工具调用能力，允许 LLM 与外部函数和 API 交互。这使您能够构建复杂的 AI 应用，这些应用可以：

- 根据用户请求执行自定义函数
- 与外部服务和数据库集成
- 提供动态的上下文感知响应
- 创建多步骤工作流和自动化

工具调用遵循 [OpenAI 的函数调用格式](https://platform.openai.com/docs/guides/function-calling)，便于与现有 AI 开发工作流和工具集成。

## 演示

观看在 [Diagrid 的 Dapr v1.15 庆祝活动](https://www.diagrid.io/videos/dapr-1-15-deep-dive) 上进行的演示，了解如何使用 .NET SDK 了解对话 API 的工作原理。

{{< youtube id=NTnwoDhHIcQ start=5444 >}}

## 尝试对话 API

### 快速入门和教程

想让 Dapr 对话 API 接受测试吗？通过以下快速入门和教程了解实际效果：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [对话快速入门]({{% ref conversation-quickstart %}}) | 了解如何使用对话 API 与大型语言模型 (LLM) 交互。 |

### 直接在您的应用中使用对话 API

想跳过快速入门吗？没问题。您可以直接在应用程序中试用对话构建块。在[安装 Dapr]({{% ref "getting-started/_index.md" %}}) 后，您可以开始使用对话 API，从[操作指南]({{% ref howto-conversation-layer %}})开始。

## 后续步骤

- [操作指南：使用对话 API 与 LLM 对话]({{% ref howto-conversation-layer %}})
- [对话 API 组件]({{% ref supported-conversation %}})
