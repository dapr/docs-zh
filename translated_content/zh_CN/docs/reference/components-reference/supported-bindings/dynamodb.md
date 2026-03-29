---
type: docs
title: "AWS DynamoDB 绑定规范"
linkTitle: "AWS DynamoDB"
description: "AWS DynamoDB 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/dynamodb/"
---

## 组件格式

要设置 AWS DynamoDB 绑定，请创建类型为 `bindings.aws.dynamodb` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "items"
  - name: region
    value: "us-west-2"
  - name: accessKey
    value: "*****************"
  - name: secretKey
    value: "*****************"
  - name: sessionToken
    value: "*****************"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `table` | Y | Output | DynamoDB 表名 | `"items"` |
| `region`             | Y        | Output |  AWS DynamoDB 实例部署所在的特定 AWS 区域 | `"us-east-1"`       |
| `accessKey`          | Y        | Output | 用于访问此资源的 AWS 访问密钥                              | `"key"`             |
| `secretKey`          | Y        | Output | 用于访问此资源的 AWS 秘密访问密钥                       | `"secretAccessKey"` |
| `sessionToken`       | N        | Output | 要使用的 AWS 会话令牌                                            | `"sessionToken"`    |

{{% alert title="Important" color="warning" %}}
当在 EKS (AWS Kubernetes) 上与您的应用程序一起运行 Dapr 边车 (daprd) 时，如果您使用的节点/pod 已经附加了定义对 AWS 资源访问权限的 IAM 策略，则**不得**在您使用的组件规范定义中提供 AWS 访问密钥、秘密密钥和令牌。
{{% /alert %}}


## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `create`

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作方法：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作方法：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
