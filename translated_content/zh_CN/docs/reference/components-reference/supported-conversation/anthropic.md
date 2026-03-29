---
type: docs
title: "Anthropic"
linkTitle: "Anthropic"
description: Anthropic 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

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
    value: claude-3-5-sonnet-20240620
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="Warning" color="warning" %}}
以上示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | Anthropic 的 API 密钥。 | `"mykey"` |
| `model` | N | 要使用的 Anthropic LLM。默认为 `claude-3-5-sonnet-20240620`  | `claude-3-5-sonnet-20240620` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中提供，直到过期。 | `10m` |

## 相关链接

- [对话 API 概览]({{% ref conversation-overview.md %}})
