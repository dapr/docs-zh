---
type: docs
title: "AWS SQS 绑定规范"
linkTitle: "AWS SQS"
description: "AWS SQS 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/sqs/"
---

## 组件格式

要设置 AWS SQS 绑定，请创建一个类型为 `bindings.aws.sqs` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})了解与身份验证相关的属性信息

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
  - name: queueName
    value: "items"
  - name: region
    value: "us-west-2"
  - name: endpoint
    value: "sqs.us-west-2.amazonaws.com"    
  - name: accessKey
    value: "*****************"
  - name: secretKey
    value: "*****************"
  - name: sessionToken
    value: "*****************"
  - name: direction 
    value: "input, output"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥以纯文本字符串形式展示。建议按照[此处说明]({{% ref component-secrets.md %}})使用密钥存储来管理敏感信息。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `queueName` | 是 | 输入/输出 | SQS 队列名称 | `"myqueue"` |
| `region`             | 是        | 输入/输出 |  特定的 AWS 区域  | `"us-east-1"`                     |
| `endpoint`           | 否        | 输出       | 特定的 AWS 端点 | `"sqs.us-east-1.amazonaws.com"`   |
| `accessKey`          | 是        | 输入/输出 | 用于访问此资源的 AWS 访问密钥                    | `"key"`                |
| `secretKey`          | 是        | 输入/输出 | 用于访问此资源的 AWS 秘密访问密钥             | `"secretAccessKey"`    |
| `sessionToken`       | 否        | 输入/输出 | 要使用的 AWS 会话令牌         | `"sessionToken"`       |
| `direction`          | 否        | 输入/输出 | 绑定的方向                                  | `"input"`, `"output"`, `"input, output"`                                                                         |

{{% alert title="Important" color="warning" %}}
当在 EKS（AWS Kubernetes）上使用 Dapr 边车（daprd）与应用程序一起运行时，如果您使用的节点/Pod 已附加定义了访问 AWS 资源的 IAM 策略，则**不得**在所使用的组件规范定义中提供 AWS 访问密钥、秘密密钥和令牌。  
{{% /alert %}}

## 绑定支持

该组件同时支持**输入和输出**绑定接口。

该组件支持以下操作的**输出绑定**：

- `create`


## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
