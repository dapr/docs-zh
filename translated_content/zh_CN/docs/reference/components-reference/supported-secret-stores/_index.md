---
type: docs
title: "机密存储组件规格"
linkTitle: "机密存储"
weight: 9000
description: 与 Dapr 对接的受支持的机密存储
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/"
no_list: true
---

下表列出了 Dapr 机密管理构建块支持的机密存储。[了解如何为 Dapr 机密管理设置不同的机密存储。]({{% ref setup-secret-store.md %}})

{{< partial "components/description.html" >}}

{{< partial "components/secret-stores.html" >}}

## 每个密钥的多键值

上方表格中的**每个密钥多键值**列表示该机密存储能否从单个密钥中返回多个键值对。

当机密存储支持每个密钥多键值（✅）时，获取密钥会返回一个 JSON 对象，其字段为该密钥中存储的键。响应中不包含密钥名称。例如，从 Kubernetes 机密存储中获取 `db-secret` 密钥会返回：

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

当机密存储不支持每个密钥多键值（空白方框）时，该机密存储采用名称/值语义：获取密钥会返回一个 JSON 对象，它只有一个字段，字段名为密钥名称，值为密钥的值。例如，获取同一个 `db-secret` 密钥会返回：

```json
{
  "db-secret": "value1"
}
```

部分机密存储允许通过组件元数据字段在这两种行为之间选择，例如 [AWS Secrets Manager]({{% ref aws-secret-manager.md %}}) 的 `multipleKeyValuesPerSecret`、[本地文件机密存储]({{% ref file-secret-store.md %}}) 的 `multiValued`，以及 [HashiCorp Vault]({{% ref hashicorp-vault.md %}}) 的 `vaultValueType`。有关响应格式的更多详细信息，请参阅[机密 API 参考]({{% ref "secrets_api.md#response-body" %}})。
