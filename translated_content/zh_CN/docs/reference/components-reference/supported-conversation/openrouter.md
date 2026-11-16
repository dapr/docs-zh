---
type: docs
title: "OpenRouter"
linkTitle: "OpenRouter"
description: OpenRouter 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openrouter
spec:
  type: conversation.openrouter
  metadata:
  - name: key
    value: "mykey"
  - name: model
    value: openai/gpt-4o-mini
  - name: cacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
上述示例直接以明文字符串的形式提供机密。建议对机密使用机密存储，具体方法见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|------|:----:|------|------|
| `key` | Y | OpenRouter 的 API 密钥。可在 [openrouter.ai/keys](https://openrouter.ai/keys) 获取。 | `"sk-or-v1-..."` |
| `model` | N | 采用 `provider/model-name` 格式的模型标识符。OpenRouter 支持的任意模型均有效（例如 `openai/gpt-4o`、`anthropic/claude-3-5-sonnet`、`meta-llama/llama-3.3-70b-instruct`）。默认为 `openai/gpt-4o-mini`。也可以通过 `OPENROUTER_MODEL` 环境变量进行配置。 | `anthropic/claude-3-5-sonnet` |
| `endpoint` | N | 覆盖 OpenRouter API 的基础 URL。通过代理转发时很有用。默认为 `https://openrouter.ai/api/v1`。 | `https://openrouter.ai/api/v1` |
| `cacheTTL` | N | 内存响应缓存的生存时间。设置后，相同请求会在缓存过期前直接返回缓存的结果。使用 Go 时长格式。 | `10m` |
| `siteURL` | N | 你的应用 URL。每个请求都会以 `HTTP-Referer` 请求头的形式转发。该项为可选，但建议配置，以便 OpenRouter 对用量进行归因，并将你的应用纳入公开排行榜。 | `https://myapp.example.com` |
| `siteTitle` | N | 你的应用名称。每个请求都会以 `X-Title` 请求头的形式转发。该项为可选，但建议为 OpenRouter 的用量归因进行配置。 | `My Dapr App` |

## 相关链接

- [对话 API 概述]({{% ref conversation-overview.md %}})
- [OpenRouter 文档](https://openrouter.ai/docs)
- [OpenRouter 模型](https://openrouter.ai/models)
