---
type: docs
title: "Anthropic"
linkTitle: "Anthropic"
description: Anthropic conversation component 的详细信息
---

## component 格式

Dapr `conversation.yaml` component 文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: anthropic
spec:
  type: conversation.anthropic
  metadata:
  - name: key
    value: "mykey"
  - name: model
    value: claude-sonnet-4-6
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
以上示例将密钥作为纯字符串使用。建议使用 secret store 来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范 metadata 字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | Anthropic 的 API 密钥。 | `"mykey"` |
| `model` | N | 要使用的 Anthropic 大型语言模型 (LLM)。默认为 `claude-sonnet-4-6`。如果在 Dapr sidecar 上设置了 `ANTHROPIC_MODEL` 环境变量，其值将覆盖此字段。 | `claude-sonnet-4-6` |
| `maxTokens` | N | 模型在每次请求中可生成的默认最大令牌数。请求级别的 `maxTokens` 值会覆盖此默认值。未设置时，不发送上限，将使用提供方自身的默认值。 | `2048` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中提供，直到过期。 | `10m` |

## 相关链接

- [conversation API 概览]({{% ref conversation-overview.md %}})
