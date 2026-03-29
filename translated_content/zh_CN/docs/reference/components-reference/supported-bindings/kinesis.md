---
type: docs
title: "AWS Kinesis 绑定规范"
linkTitle: "AWS Kinesis"
description: "AWS Kinesis 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/kinesis/"
---
## 组件格式

要设置 AWS Kinesis 绑定，请创建一个类型为 `bindings.aws.kinesis` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

有关如何设置 AWS Kinesis 数据流的说明，请参阅[此](https://aws.amazon.com/kinesis/data-streams/getting-started/)
有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.aws.kinesis
  version: v1
  metadata:
  - name: streamName
    value: "KINESIS_STREAM_NAME" # Kinesis 流名称
  - name: consumerName
    value: "KINESIS_CONSUMER_NAME" # Kinesis 消费者名称
  - name: mode
    value: "shared" # shared - 共享吞吐量 或 extended - 扩展/增强扇出
  - name: region
    value: "AWS_REGION" # 替换
  - name: accessKey
    value: "AWS_ACCESS_KEY" # 替换
  - name: secretKey
    value: "AWS_SECRET_KEY" # 替换
  - name: sessionToken
    value: "*****************"
  - name: direction
    value: "input, output"
  - name: endpoint
    value: "http://localhost:4566" # 可选：自定义端点（例如用于 LocalStack）  
```
{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `mode` | N | 输入| Kinesis 流模式。`shared`- 共享吞吐量，`extended` - 扩展/增强扇出方法。更多细节请见[这里](https://docs.aws.amazon.com/streams/latest/dev/building-consumers.html)。默认为 `"shared"` | `"shared"`, `"extended"` |
| `streamName` | Y | 输入/输出 | AWS Kinesis 流名称 | `"stream"` |
| `consumerName` | Y | 输入 |  AWS Kinesis 消费者名称 | `"myconsumer"` |
| `region`             | Y        | 输出 |  AWS Kinesis 实例部署的特定 AWS 区域 | `"us-east-1"`       |
| `accessKey`          | Y        | 输出 | 用于访问此资源的 AWS 访问密钥                              | `"key"`             |
| `secretKey`          | Y        | 输出 | 用于访问此资源的 AWS 秘密访问密钥                       | `"secretAccessKey"` |
| `sessionToken`       | N        | 输出 | 要使用的 AWS 会话令牌                                            | `"sessionToken"`    |
| `direction`       | N        | 输入/输出 | 绑定的方向                                            | `"input"`, `"output"`, `"input, output"`    |
| `endpoint`        | N        | 输入 | Kinesis 和 DynamoDB 的自定义端点（例如启用 AWS LocalStack 支持） | `"http://localhost:4566"` |


{{% alert title="重要" color="warning" %}}
在 EKS (AWS Kubernetes) 上与应用程序一起运行 Dapr 边车 (daprd) 时，如果您使用的节点/Pod 已附加到定义访问 AWS 资源的 IAM 策略，则**不得**在您使用的组件规范定义中提供 AWS 访问密钥、秘密密钥和令牌。  
{{% /alert %}}

## 绑定支持

此组件支持**输入和输出**绑定接口。

此组件支持以下操作的**输出绑定**：

- `create`
## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何-To：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [如何-To：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
