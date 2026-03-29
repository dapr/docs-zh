---
type: docs
title: "DeepSeek"
linkTitle: "DeepSeek"
description: DeepSeek 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: deepseek
spec:
  type: conversation.deepseek
  metadata:
  - name: key
    value: mykey
  - name: maxTokens
    value: 2048
```

{{% alert title="Warning" color="warning" %}}
The above example uses secrets as plain strings. It is recommended to use a secret store for the secrets, as described [here]({{% ref component-secrets.md %}}).
{{% /alert %}}

## 规格元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| `key`   | Y | DeepSeek 的 API 密钥。 | `mykey` |
| `maxTokens` | N | 每次请求的最大令牌数。  | `2048` |

## 相关链接

- [Conversation API 概览]({{% ref conversation-overview.md %}})
