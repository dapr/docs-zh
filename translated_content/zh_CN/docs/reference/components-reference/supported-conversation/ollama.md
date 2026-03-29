---
type: docs
title: "Ollama"
linkTitle: "Ollama"
description: Ollama 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ollama
spec:
  type: conversation.ollama
  metadata:
  - name: model
    value: llama3.2:latest
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
上面的示例使用明文字符串作为密钥。建议按照[此处]({{< ref component-secrets.md >}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规格元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| `model` | N | 要使用的 Ollama LLM。默认为 `llama3.2:latest`。  | `phi4:latest` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中提供，直到它们过期。 | `10m` |

### OpenAI 兼容性

Ollama 与 [OpenAI 的 API](https://ollama.com/blog/openai-compatibility) 兼容。你可以通过以下更改使用 OpenAI 组件与 Ollama 模型配合使用：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ollama-openai
spec:
  type: conversation.openai # 使用 openai 组件类型
  metadata:
  - name: key
    value: 'ollama' # 任何非空字符串
  - name: model
    value: gpt-oss:20b  # 一个 ollama 模型（https://ollama.com/search），在这种情况下是 openai 开源模型。参见 https://ollama.com/library/gpt-oss
  - name: endpoint
    value: 'http://localhost:11434/v1' # ollama 端点
```

## 相关链接

- [对话 API 概述]({{< ref conversation-overview.md >}})
