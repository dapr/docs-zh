---
type: docs
title: "GoogleAI"
linkTitle: "GoogleAI"
description: GoogleAI 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: googleai
spec:
  type: conversation.googleai
  metadata:
  - name: key
    value: mykey
  - name: model
    value: gemini-1.5-flash
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
以上示例将密钥以纯字符串形式使用。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{< ref component-secrets.md >}})。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | GoogleAI 的 API 密钥。 | `mykey` |
| `model` | N | 要使用的 GoogleAI 大语言模型。默认为 `gemini-1.5-flash`。  | `gemini-2.0-flash` |
| `responseCacheTTL` | N | 内存响应缓存的有效期。设置后，相同的请求将从缓存中提供响应，直到过期。 | `10m` |

## 相关链接

- [对话 API 概述]({{< ref conversation-overview.md >}})
