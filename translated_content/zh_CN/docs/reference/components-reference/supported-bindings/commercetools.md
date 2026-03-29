---
type: docs
title: "commercetools GraphQL 绑定规范"
linkTitle: "commercetools GraphQL"
description: "commercetools GraphQL 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/commercetools/"
---

## 组件格式

要设置 commercetools GraphQL 绑定，需创建一个类型为 `bindings.commercetools` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.commercetools
  version: v1
  metadata:
  - name: region # 必填。
    value: "region"
  - name: provider # 必填。
    value: "gcp"
  - name: projectKey # 必填。
    value: "<project-key>"
  - name: clientID # 必填。
    value: "*****************"
  - name: clientSecret # 必填。
    value: "*****************"
  - name: scopes # 必填。
    value: "<project-scopes>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥以纯文本字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的说明，使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `region` | Y | 输出 | commercetools 项目的区域 | `"europe-west1"` |
| `provider` | Y | 输出 | 云提供商，可以是 gcp 或 aws | `"gcp"`, `"aws"` |
| `projectKey` | Y | 输出 | commercetools 项目的项目键 |  |
| `clientID` | Y | 输出 | 项目的 commercetools 客户端 ID |  |
| `clientSecret` | Y | 输出 | 项目的 commercetools 客户端密钥 |  |
| `scopes` | Y | 输出 | 项目的 commercetools 作用域 | `"manage_project:project-key"` |

更多信息请参阅 [commercetools - 创建 API 客户端](https://docs.commercetools.com/getting-started/create-api-client#create-an-api-client)和 [commercetools - 区域](https://docs.commercetools.com/api/general-concepts#regions)。

## 绑定支持

此组件支持**输出绑定**，包含以下操作：

- `create`

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作方法：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作方法：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
- [示例应用](https://github.com/dapr/samples/tree/master/commercetools-graphql-sample)，利用 commercetools 绑定并提供 GraphQL 查询示例
