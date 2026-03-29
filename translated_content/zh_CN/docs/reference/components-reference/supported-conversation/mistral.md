---
type: docs
title: "Mistral"
linkTitle: "Mistral"
description: Mistral 对话组件的详细信息
---

## 组件格式

Dapr 的 `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mistral
spec:
  type: conversation.mistral
  metadata:
  - name: key
    value: mykey
  - name: model
    value: open-mistral-7b
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="Warning" color="warning" %}}
上述示例使用纯文本字符串表示密钥。建议使用密钥存储来管理密钥，具体方法请参考[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必需 | 说明 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | Mistral 的 API 密钥。 | `mykey` |
| `model` | N | 要使用的 Mistral LLM。默认为 `open-mistral-7b`。  | `open-mistral-7b` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中返回，直到过期。 | `10m` |

## 相关链接

- [对话 API 概述]({{% ref conversation-overview.md %}})
