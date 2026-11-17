---
type: docs
title: "对话概览"
linkTitle: "概述"
weight: 1000
description: "conversation API building block 概述"
---

{{% alert title="Alpha" color="primary" %}}
conversation API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}}) 阶段。
{{% /alert %}}

Dapr 的 conversation API 降低了大规模安全、可靠地与大型语言模型 (LLM) 交互的复杂度。无论你是缺少必要原生 SDK 的开发者，还是只想专注于 LLM 交互中提示词部分的多语言团队，conversation API 都提供了一个统一的 API 入口，用于与底层 LLM 提供商通信。 

{{< diagram name="conversation-overview" width="75" >}}

除了启用关键的性能和安全功能（如[缓存]({{% ref "#缓存" %}})和 [PII 清理]({{% ref "#个人身份信息-pii-混淆" %}})），conversation API 还提供：

- **工具调用能力**：允许 LLM 与外部函数和 API 交互，实现更复杂的 AI 应用
- **OpenAI 兼容接口**：与现有 AI workflow 和工具无缝集成

你还可以将 conversation API 与 Dapr 功能结合使用，例如：

- resiliency 策略，包括用于处理重复错误的断路器、用于防范慢响应的超时机制，以及应对临时网络故障的重试
- 借助 OpenTelemetry 和 Zipkin 实现 observability，包括指标和分布式追踪
- middleware，用于对进出 LLM 的请求进行身份验证

## 功能

以下功能对[所有受支持的 conversation component]({{% ref supported-conversation %}})开箱即用。

### 缓存

conversation API 支持两种缓存：

- **提示缓存**：某些 LLM 提供商会在其服务端缓存提示词前缀，以加快重复提示的速度并降低成本。你可以在每个请求中通过 API 使用 `promptCacheRetention` 参数启用此功能（例如，OpenAI 的取值为 `24h`）。有关请求级选项，请参阅 [conversation API 参考]({{% ref conversation_api.md %}})。支持情况取决于提供商。
- **响应缓存**：conversation component 可以在 sidecar 中缓存完整的 LLM 响应。当你设置 component 的 metadata 字段 `responseCacheTTL`（例如 `10m`）时，Dapr 会根据请求（提示词和选项）缓存响应。重复的相同请求将直接从缓存返回，无需调用 LLM，从而降低延迟和成本。此缓存位于内存中，且每个 sidecar 各自独立。请在你的 [conversation component]({{% ref supported-conversation %}}) 的 spec 中进行配置。

### 响应格式化

你可以在请求中传递 `responseFormat`（JSON Schema），要求模型生成结构化输出。Deepseek、Google AI、Hugging Face、OpenAI 和 Anthropic 支持此功能。请参阅 [conversation API 参考]({{% ref conversation_api.md %}})。

### 使用指标

响应中可以包含对话的 token 用量（`promptTokens`、`completionTokens`、`totalTokens`）。请参阅 API 参考中的 [响应内容]({{% ref "conversation_api.md#response-content" %}})。

### 个人身份信息 (PII) 混淆

PII 混淆功能可识别并移除对话响应中任何形式的敏感用户信息。只需在输入和输出数据上启用 PII 混淆，即可保护隐私，清除可能被用来识别个人身份的敏感细节。 

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

conversation API 支持高级工具调用能力，允许 LLM 与外部函数和 API 交互。借助它，你可以构建复杂的 AI 应用，这些应用可以：

- 根据用户请求执行自定义函数
- 与外部服务和数据库集成
- 提供动态的、感知上下文的响应
- 创建多步骤 workflow 和自动化

工具调用遵循 [OpenAI 的函数调用格式](https://platform.openai.com/docs/guides/function-calling)，便于与现有 AI 开发 workflow 和工具集成。

## 演示

观看 [Diagrid 的 Dapr v1.15 庆祝活动](https://www.diagrid.io/videos/dapr-1-15-deep-dive)上的演示，了解 conversation API 如何借助 .NET SDK 工作。

{{< youtube id=NTnwoDhHIcQ start=5444 >}}

## 尝试 conversation API

### Quickstart 和教程

想试试 Dapr conversation API 的效果吗？通过以下 Quickstart 和教程，看看它的实际运行效果：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [对话 Quickstart]({{% ref conversation-quickstart %}}) | 了解如何使用 conversation API 与大型语言模型 (LLMs) 交互。 |

### 直接在你的应用中使用 conversation API

想跳过 Quickstart 吗？没问题。你可以直接在应用程序中试用 conversation building block。在[安装 Dapr]({{% ref "getting-started/_index.md" %}})之后，你可以从[操作指南]({{% ref howto-conversation-layer %}})开始使用 conversation API。

## 后续步骤

- [操作指南：使用 conversation API 与 LLM 对话]({{% ref howto-conversation-layer %}})
- [conversation API component]({{% ref supported-conversation %}})
