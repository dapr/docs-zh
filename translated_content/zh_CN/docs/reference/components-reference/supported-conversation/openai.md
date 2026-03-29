---
type: docs
title: "OpenAI"
linkTitle: "OpenAI"
description: OpenAI 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

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
上述示例将密钥以纯文本字符串的形式使用。建议使用密钥存储来管理密钥，具体描述请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | OpenAI 的 API 密钥。 | `mykey` |
| `model` | N | 要使用的 OpenAI 大语言模型。默认为 `gpt-4-turbo`。  | `gpt-4-turbo` |
| `endpoint` | N | 与 OpenAI API 兼容的自定义 API 端点 URL。如果未指定，则使用默认的 OpenAI API 端点。当 `apiType` 设置为 `azure` 时必填。 | `https://api.openai.com/v1`、`https://example.openai.azure.com/` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中提供服务，直到过期。 | `10m` |
| `apiType` | N | 指定 API 提供商类型。当使用不遵循默认 OpenAI API 端点约定的提供商时必填。 | `azure` |
| `apiVersion`| N | 要使用的 API 版本。当 `apiType` 设置为 `azure` 时必填。 | `2025-04-01-preview` |

## Azure OpenAI 配置

要配置 OpenAI 组件以连接到 Azure OpenAI，你需要设置以下元数据字段，这些字段对于 Azure 的 API 格式是必需的。

### Azure OpenAI 的必填字段

连接到 Azure OpenAI 时，以下字段是**必填**的：

- `apiType`：必须设置为 `azure` 以启用 Azure OpenAI 兼容性
- `endpoint`：你的 Azure OpenAI 资源端点 URL（例如，`https://your-resource.openai.azure.com/`）
- `apiVersion`：你的 Azure OpenAI 部署的 API 版本（例如，`2025-01-01-preview`）
- `key`：你的 Azure OpenAI API 密钥

从以下网址获取你的配置值：https://ai.azure.com/

### Azure OpenAI 组件示例

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
使用 Azure OpenAI 时，`endpoint` 和 `apiVersion` 都是必填字段。当 `apiType` 设置为 `azure` 时，如果缺少任一字段，组件将返回错误。
{{% /alert %}}

## 相关链接

- [对话 API 概述]({{% ref conversation-overview.md %}})
- [Azure AI Foundry 模型 API 生命周期中的 Azure OpenAI](https://learn.microsoft.com/azure/ai-foundry/openai/api-version-lifecycle)
