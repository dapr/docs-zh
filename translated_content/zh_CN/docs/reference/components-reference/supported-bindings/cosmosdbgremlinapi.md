---
type: docs
title: "Azure Cosmos DB (Gremlin API) 绑定规范"
linkTitle: "Azure Cosmos DB (Gremlin API)"
description: "Azure Cosmos DB (Gremlin API) 绑定组件的详细文档"
---

## 组件格式

若要设置 Azure Cosmos DB (Gremlin API) 绑定，请创建类型为 `bindings.azure.cosmosdb.gremlinapi` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.cosmosdb.gremlinapi
  version: v1
  metadata:
  - name: url
    value: "wss://******.gremlin.cosmos.azure.com:443/"
  - name: masterKey
    value: "*****"
  - name: username
    value: "*****"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥以纯文本字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:|--------|---------|---------|
| `url` | Y | 输出 | Gremlin API 的 Cosmos DB URL | `"wss://******.gremlin.cosmos.azure.com:443/"` |
| `masterKey` | Y | 输出 | Cosmos DB 账户主密钥 | `"masterKey"` |
| `username` | Y | 输出 | Cosmos DB 数据库的用户名 | `"/dbs/<database_name>/colls/<graph_name>"` |

有关更多信息，请参阅[快速入门：使用 Gremlin 的 Azure Cosmos Graph DB](https://docs.microsoft.com/azure/cosmos-db/graph/create-graph-console)。

## 绑定支持

此组件支持**输出绑定**，包含以下操作：

- `query`

## 请求负载示例

```json
{
  "data": {
    "gremlin": "g.V().count()"
    },
  "operation": "query"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
