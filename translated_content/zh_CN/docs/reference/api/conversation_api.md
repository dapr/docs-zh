---
type: docs
title: "Conversation API 参考"
linkTitle: "Conversation API"
description: "Conversation API 的详细文档"
weight: 500
---

{{% alert title="Alpha" color="primary" %}}
Conversation API 目前处于 [alpha]({{% ref "certification-lifecycle.md#certification-levels" %}}) 阶段。
{{% /alert %}}

Dapr 提供了一个与大型语言模型（LLM）交互的 API，并通过提示缓存、PII 数据混淆和工具调用等功能实现关键的性能和安全特性。

工具调用遵循 OpenAI 的函数调用格式，便于与现有的 AI 开发工作流和工具集成。

## Converse

此端点允许您使用 Alpha2 版本的 API 与 LLM 进行对话，该版本提供了增强的工具调用支持，并与 OpenAI 的接口保持一致。

```
POST http://localhost:<daprPort>/v1.0-alpha2/conversation/<llm-name>/converse
```

### URL 参数

| 参数 | 描述 |
| --------- | ----------- |
| `llm-name` | LLM 组件的名称。[查看所有可用的对话组件列表。]({{% ref supported-conversation %}})

### 请求体

| 字段 | 描述 |
| --------- | ----------- |
| `contextId` | 现有聊天的 ID（类似 ChatGPT）。可选 |
| `inputs` | 对话的输入。支持同时传入多个输入。必填 |
| `parameters` | 所有自定义字段的参数。可选 |
| `metadata` | 传递给对话组件的元数据。可选 |
| `scrubPii` | 布尔值，用于启用对从 LLM 返回的敏感信息进行混淆。可选 |
| `temperature` | 浮点值，用于控制模型的温度。用于优化一致性（0）或创造性（1）。可选 |
| `tools` | 工具注册了 LLM 在对话期间可以使用的工具。可选 |
| `toolChoice` | 控制模型调用哪个工具（如果有）。值：`auto`、`required` 或特定工具名称。如果存在工具，默认为 `auto`。可选 |
| `responseFormat` | 使用 JSON Schema 对象描述的结构化输出。当您需要类型化的结构化输出时使用。由 Deepseek、Google AI、Hugging Face、OpenAI 和 Anthropic 组件支持。可选 |
| `promptCacheRetention` | 提示缓存的保留时长。设置后，启用扩展的提示缓存，使缓存的前缀保持更长时间。在 OpenAI 上，支持最长 24 小时。参见 [OpenAI 提示缓存](https://platform.openai.com/docs/guides/prompt-caching#prompt-cache-retention)。可选 |

#### 输入体

| 字段 | 描述 |
| --------- | ----------- |
| `messages` | 对话消息数组。必填 |
| `scrubPii` | 布尔值，用于启用对内容字段中存在的敏感信息进行混淆。可选 |

#### 消息类型

API 支持不同的消息类型：

| 类型 | 描述 |
| ---- | ----------- |
| `ofDeveloper` | 开发者角色消息，带有可选的名称和内容 |
| `ofSystem` | 系统角色消息，带有可选的名称和内容 |
| `ofUser` | 用户角色消息，带有可选的名称和内容 |
| `ofAssistant` | 助手角色消息，带有可选的名称、内容和工具调用 |
| `ofTool` | 工具角色消息，带有工具 ID、名称和内容 |


#### 工具调用

可以使用 `tools` 字段定义工具，其中包含函数定义：

| 字段 | 描述 |
| --------- | ----------- |
| `function.name` | 要调用的函数名称。必填 |
| `function.description` | 函数功能的描述。可选 |
| `function.parameters` | 描述函数参数的 JSON Schema 对象。可选 |


#### 工具选择选项

`toolChoice` 是一个可选参数，用于控制模型如何使用可用工具：

- **`auto`**: 模型可以在生成消息或调用一个或多个工具之间选择（存在工具时的默认值）
- **`required`**: 要求调用一个或多个函数
- **`{tool_name}`**: 强制模型按名称调用特定工具


#### 元数据
`metadata` 字段作为一种动态配置机制，允许您在每次请求的基础上将额外的配置和身份验证信息传递给对话组件。此元数据会覆盖组件 YAML 配置文件中配置的相应字段，从而在不修改静态组件定义的情况下实现动态配置。

**常见元数据字段：**

| 字段 | 描述 | 示例 |
| ----- | ----------- | ------- |
| `api_key` | 用于与 LLM 服务进行身份验证的 API 密钥 | `"sk-1234567890abcdef"` |
| `model` | 特定模型标识符 | `"gpt-4-turbo"`, `"claude-3-sonnet"` |
| `version` | API 版本或服务版本 | `"1.0"`, `"2023-12-01"` |
| `endpoint` | 服务的自定义端点 URL | `"https://api.custom-llm.com/v1"` |

{{% alert title="注意" color="primary" %}}
支持的确切元数据字段取决于具体的对话组件实现。有关支持的元数据字段的完整列表，请参阅组件文档。
{{% /alert %}}

除了在请求体中传递元数据外，您还可以将元数据作为 URL 查询参数传递，而无需修改请求负载。格式如下：

- **前缀**：所有元数据参数必须以 `metadata.` 为前缀
- **格式**：`?metadata.<field_name>=<value>`
- **多个参数**：使用 `&` 分隔（例如 `?metadata.api_key=sk-123&metadata.model=gpt-4`）

模型覆盖示例：
```bash
POST http://localhost:3500/v1.0-alpha2/conversation/openai/converse?metadata.model=sk-gpt-4-turbo
```

URL 元数据参数与请求体元数据合并，如果存在冲突，URL 参数优先，并且两者都会覆盖 YAML 文件中的组件配置。

### 请求内容示例

#### 基本对话

```json
curl -X POST http://localhost:3500/v1.0-alpha2/conversation/openai/converse \
  -H "Content-Type: application/json" \
  -d '{
        "inputs": [
          {
            "messages": [
              {
                "ofUser": {
                  "content": [
                    {
                      "text": "What is Dapr?"
                    }
                  ]
                }
              }
            ]
          }
        ],
        "parameters": {},
        "metadata": {}
      }'
```

#### 带工具调用的对话

```json
curl -X POST http://localhost:3500/v1.0-alpha2/conversation/openai/converse \
  -H "Content-Type: application/json" \
  -d '{
        "inputs": [
          {
            "messages": [
              {
                "ofUser": {
                  "content": [
                    {
                      "text": "What is the weather like in San Francisco in celsius?"
                    }
                  ]
                }
              }
            ],
            "scrubPii": false
          }
        ],
        "parameters": {
          "max_tokens": {
            "@type": "type.googleapis.com/google.protobuf.Int64Value",
            "value": "100"
          },
          "model": {
            "@type": "type.googleapis.com/google.protobuf.StringValue",
            "value": "claude-3-5-sonnet-20240620"
          }
        },
        "metadata": {
          "api_key": "test-key",
          "version": "1.0"
        },
        "scrubPii": false,
        "temperature": 0.7,
        "tools": [
          {
            "function": {
              "name": "get_weather",
              "description": "Get the current weather for a location",
              "parameters": {
                "type": "object",
                "properties": {
                  "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                  },
                  "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "The temperature unit to use"
                  }
                },
                "required": ["location"]
              }
            }
          }
        ],
        "toolChoice": "auto"
      }'
```

### HTTP 响应代码

代码 | 描述
---- | -----------
`202`  | 已接受
`400`  | 请求格式错误
`500`  | 请求格式正确，Dapr 代码或底层组件出错

### 弹性和超时

对话组件调用使用 Dapr 的[弹性策略]({{% ref "resiliency-overview.md" %}})。您可以在 `targets/components/<component-name>/outbound` 下按组件名称定位对话组件，并附加超时、重试和断路器策略。

- **超时**：超时应用于请求上下文。该上下文会传递给对话组件（进而传递给边车中的 LLM 提供商）。如果 LLM 在配置的持续时间内未响应，上下文将被取消，请求将以错误终止。设置一个考虑典型 LLM 响应时间的超时。
- **重试和断路器**：这些适用于整个 Converse 调用。重试会在失败时重新运行整个对话调用（例如，超时或网络错误后）。断路器在打开时会跳过调用组件并立即返回错误。这些不会作为配置传递给 LLM。

### 响应内容

`outputs` 中的每一项可以包含：

| 字段 | 描述 |
| ----- | ----------- |
| `choices` | 完成选项。 |
| `model` | 用于对话的模型。可选 |
| `usage` | 请求的 token 使用指标。可选 |

#### 使用指标

当存在时，`usage` 包含：

| 字段 | 描述 |
| ----- | ----------- |
| `promptTokens` | 提示中的 token 数量。 |
| `completionTokens` | 生成的完成中的 token 数量。 |
| `totalTokens` | 使用的总 token 数（提示 + 完成）。 |
| `promptTokensDetails` | 可选。可以包含 `audioTokens`（提示中的音频输入 token）和 `cachedTokens`（从提示缓存中提供的 token）。 |
| `completionTokensDetails` | 可选。可以包含 `reasoningTokens`、`acceptedPredictionTokens`、`rejectedPredictionTokens`、`audioTokens`。 |

#### 基本对话响应

```json
{
  "outputs": [
    {
      "choices": [
        {
          "finishReason": "stop",
          "message": {
            "content": "Distributed application runtime, open-source."
          }
        }
      ],
      "model": "gpt-4o",
      "usage": {
        "promptTokens": 12,
        "completionTokens": 8,
        "totalTokens": 20,
        "promptTokensDetails": {
          "audioTokens": 0,
          "cachedTokens": 0
        },
        "completionTokensDetails": {
          "acceptedPredictionTokens": 0,
          "audioTokens": 0,
          "reasoningTokens": 0,
          "rejectedPredictionTokens": 0
        }
      }
    }
  ]
}
```

#### 工具调用响应

```json
{
  "outputs": [
    {
      "choices": [
        {
          "finishReason": "tool_calls",
          "message": {
            "toolCalls": [
              {
                "id": "call_Uwa41pG0UqGA2zp0Fec0KwOq",
                "function": {
                  "name": "get_weather",
                  "arguments": "{\"location\":\"San Francisco, CA\",\"unit\":\"celsius\"}"
                }
              }
            ]
          }
        }
      ],
      "model": "gpt-4o",
      "usage": {
        "promptTokens": 25,
        "completionTokens": 18,
        "totalTokens": 43,
        "promptTokensDetails": {
          "audioTokens": 0,
          "cachedTokens": 0
        },
        "completionTokensDetails": {
          "acceptedPredictionTokens": 0,
          "audioTokens": 0,
          "reasoningTokens": 0,
          "rejectedPredictionTokens": 0
        }
      }
    }
  ]
}
```


## 旧版 Alpha1 API

之前的 Alpha1 版本 API 为了向后兼容仍然受到支持，但已被弃用。对于新的实现，请使用上面描述的 Alpha2 版本。

```
POST http://localhost:<daprPort>/v1.0-alpha2/conversation/<llm-name>/converse
```

## 后续步骤

- [Conversation API 概述]({{% ref conversation-overview.md %}})
- [支持的对话组件]({{% ref supported-conversation %}})
