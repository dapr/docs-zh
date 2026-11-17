---
type: docs
title: "OpenAI"
linkTitle: "OpenAI"
description: OpenAI conversation component 的详细信息
---

## component 格式

Dapr `conversation.yaml` component 文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai
spec:
  type: conversation.openai
  metadata:
  - name: key
    value: mykey
  - name: model
    value: gpt-4-turbo
  - name: endpoint
    value: 'https://api.openai.com/v1'
  - name: responseCacheTTL
    value: 10m
  # - name: apiType # Optional
  #   value: 'azure'
  # - name: apiVersion # Optional
  #   value: '2025-01-01-preview'
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥以纯文本字符串的形式使用。建议使用 secret store 来管理密钥，具体描述请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范 metadata 字段

| 字段 | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key` | Y | OpenAI 的 API 密钥。 | `mykey` |
| `model` | N | 要使用的 OpenAI 大型语言模型 (LLM)。默认为 `gpt-5-nano`，或在设置了 `OPENAI_MODEL` 环境变量时使用该变量的值。 | `gpt-4-turbo` |
| `maxTokens` | N | 每个请求中模型可生成的 token 数量上限的默认值。请求级别的 `maxTokens` 值会覆盖此默认值。未设置时，不发送上限，由提供商自身的默认值决定。 | `2048` |
| `useLegacyMaxTokensField` | N | 将 token 上限作为 `max_tokens` 发送，而不是 `max_completion_tokens`。当 `endpoint` 指向不识别 `max_completion_tokens` 的 OpenAI 兼容服务时请设置此项，否则上限将被忽略。默认为 `false`。 | `true` |
| `endpoint` | N | 与 OpenAI API 兼容的服务的自定义 API 端点 URL。如果未指定，则使用默认的 OpenAI API 端点。当 `apiType` 设置为 `azure` 时必填。 | `https://api.openai.com/v1`、`https://example.openai.azure.com/` |
| `responseCacheTTL` | N | 内存响应缓存的存活时间（TTL）。设置后，相同的请求会从缓存中返回，直到缓存过期。 | `10m` |
| `apiType` | N | 指定 API 提供商类型。使用不遵循默认 OpenAI API 端点约定的提供商时必填。 | `azure` |
| `apiVersion` | N | 要使用的 API 版本。当 `apiType` 设置为 `azure` 时必填。 | `2025-04-01-preview` |
| `useResponsesAPI` | N | 将请求发送到 OpenAI Responses API（`/v1/responses`），而不是 Chat Completions API。当推理模型在 Chat Completions 上拒绝工具时，可设置此项以在这些模型上使用函数工具。请求以 `store: false` 发送，因此 OpenAI 不保留任何对话状态。当 `apiType` 设置为 `azure` 时不受支持：component 将初始化失败。默认为 `false`。 | `true` |

## Azure OpenAI 配置

要配置 OpenAI component 以连接到 Azure OpenAI，你需要设置以下 metadata 字段，这些字段对于 Azure 的 API 格式是必需的。

### Azure OpenAI 的必填字段

连接到 Azure OpenAI 时，以下字段是**必填**的：

- `apiType`：必须设置为 `azure` 以启用 Azure OpenAI 兼容性
- `endpoint`：你的 Azure OpenAI 资源端点 URL（例如，`https://your-resource.openai.azure.com/`）
- `apiVersion`：你的 Azure OpenAI 部署的 API 版本（例如，`2025-01-01-preview`）
- `key`：你的 Azure OpenAI API 密钥

从以下网址获取你的配置值：https://ai.azure.com/

### Azure OpenAI component 示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-openai
spec:
  type: conversation.openai
  metadata:
  - name: key
    value: "your-azure-openai-api-key"
  - name: model
    value: "gpt-4.1-nano"  # Default: gpt-4.1-nano
  - name: endpoint
    value: "https://your-resource.openai.azure.com/"
  - name: apiType
    value: "azure"
  - name: apiVersion
    value: "2025-01-01-preview"
```


{{% alert title="Note" color="primary" %}}
使用 Azure OpenAI 时，`endpoint` 和 `apiVersion` 都是必填字段。当 `apiType` 设置为 `azure` 时，如果缺少任一字段，component 将返回错误。
{{% /alert %}}

## 相关链接

- [conversation API 概述]({{% ref conversation-overview.md %}})
- [Azure AI Foundry 模型 API 生命周期中的 Azure OpenAI](https://learn.microsoft.com/azure/ai-foundry/openai/api-version-lifecycle)
