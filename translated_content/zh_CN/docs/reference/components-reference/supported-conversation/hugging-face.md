---
type: docs
title: "Huggingface"
linkTitle: "Huggingface"
description: Huggingface 会话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huggingface
spec:
  type: conversation.huggingface
  metadata:
  - name: key
    value: mykey
  - name: model
    value: meta-llama/Meta-Llama-3-8B
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | Huggingface 的 API 密钥。 | `mykey` |
| `model` | N | 要使用的 Huggingface LLM。默认为 `meta-llama/Meta-Llama-3-8B`。  | `meta-llama/Meta-Llama-3-8B` |
| `responseCacheTTL` | N | 内存响应缓存的生存时间。设置后，相同的请求将从缓存中提供，直到过期。 | `10m` |

## 相关链接

- [会话 API 概述]({{% ref conversation-overview.md %}})
