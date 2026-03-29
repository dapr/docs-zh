---
type: docs
title: "GraphQL 绑定规范"
linkTitle: "GraphQL"
description: "GraphQL 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/graphql/"
---

## 组件格式

要设置 GraphQL 绑定，请创建一个类型为 `bindings.graphql` 的组件。有关如何创建和应用绑定配置的说明，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。为了将普通配置设置（例如 endpoint）与 headers 分开，在 header 名称上使用 "header:" 作为前缀。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: example.bindings.graphql
spec:
  type: bindings.graphql
  version: v1
  metadata:
    - name: endpoint
      value: "http://localhost:8080/v1/graphql"
    - name: header:x-hasura-access-key
      value: "adminkey"
    - name: header:Cache-Control
      value: "no-cache"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Binding support |  Details | Example |
|--------------------|:--------:|------------|-----|---------|
| `endpoint` | Y | Output | GraphQL 端点字符串 更多详细信息请参阅[此处](#url-format) | `"http://localhost:4000/graphql/graphql"` |
| `header:[HEADERKEY]` | N | Output | GraphQL header。在 `name` 中指定 header 键，在 `value` 中指定 header 值。 | `"no-cache"`（见上文） |
| `variable:[VARIABLEKEY]` | N | Output | GraphQL 查询变量。在 `name` 中指定变量名，在 `value` 中指定变量值。 | `"123"`（见下文） |

### 端点和 Header 格式

GraphQL 绑定内部使用 [GraphQL client](https://github.com/machinebox/graphql)。

## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `query`
- `mutation`

### query

`query` 操作用于 `query` 语句，它返回元数据以及以行值数组形式的数据。

**请求**

```golang
in := &dapr.InvokeBindingRequest{
Name:      "example.bindings.graphql",
Operation: "query",
Metadata: map[string]string{ "query": `query { users { name } }`},
}
```

要使用需要[查询变量](https://graphql.org/learn/queries/#variables)的 `query`，请向 `metadata` 映射添加一个键值对，其中对应于查询变量的每个键都是以 `variable:` 为前缀的变量名称

```golang
in := &dapr.InvokeBindingRequest{
Name: "example.bindings.graphql",
Operation: "query",
Metadata: map[string]string{ 
  "query": `query HeroNameAndFriends($episode: string!) { hero(episode: $episode) { name } }`,
  "variable:episode": "JEDI",
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作方法：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作方法：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
