---
type: docs
title: "Apache RocketMQ binding 规范"
linkTitle: "RocketMQ"
description: "Apache RocketMQ binding 组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/rocketmq/"
---


## 组件格式

要设置 Apache RocketMQ binding，请创建一个类型为 `bindings.rocketmq` 的组件。  
有关如何创建和应用 binding 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.rocketmq
  version: v1
  metadata:
    - name: accessProto
      value: "tcp"
    - name: nameServer
      value: "localhost:9876"
    - name: endpoint
      value: "http://localhost:8080"
    - name: topics
      value: "topic1,topic2"
    - name: consumerGroup
      value: "my-consumer-group"
    # 可选
    - name: consumerBatchSize
      value: "10"
    - name: consumerThreadNums
      value: "4"
    - name: retries
      value: "3"
    - name: instanceId
      value: "my-instance"
````

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。
建议按照[此处]({{% ref component-secrets.md %}})的描述使用 secret store 来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段                  | 必填 | Binding 支持 | 详情                                                                 | 示例                        |
| -------------------- | :------: | --------------- | --------------------------------------------------------------------- | ------------------------------ |
| `topics`             |     Y    | Input/Output    | 用于发布或订阅的以逗号分隔的主题列表。                                | `"topic1,topic2"`              |
| `nameServer`         |     N    | Input/Output    | RocketMQ name server 地址。                                           | `"localhost:9876"`             |
| `endpoint`           |     N    | Input/Output    | RocketMQ 端点（用于 `http` 协议）。                                    | `"http://localhost:8080"`      |
| `accessProto`        |     N    | Input/Output    | 用于连接 RocketMQ 的 SDK 协议。                                        | `"tcp"`, `"tcp-cgo"`, `"http"` |
| `consumerGroup`      |     N    | Input/Output    | RocketMQ 订阅者的消费者组名称。                                        | `"my-consumer-group"`          |
| `consumerBatchSize`  |     N    | Input           | 消费消息的批次大小。                                                   | `"10"`                         |
| `consumerThreadNums` |     N    | Input           | 消费者线程数量（用于 `tcp-cgo` 协议）。                                 | `"4"`                          |
| `instanceId`         |     N    | Input/Output    | RocketMQ 命名空间实例 ID。                                              | `"my-instance"`                |
| `nameServerDomain`   |     N    | Input/Output    | RocketMQ name server 的域名。                                           | `"rocketmq.example.com"`       |
| `retries`            |     N    | Input/Output    | 连接到 RocketMQ broker 的重试次数。                                     | `"3"`                          |
| `accessKey`          |     N   | Input/Output    | 用于身份验证的访问密钥。如果启用了访问控制，则为必填项。                    | `"access-key"`                 |
| `secretKey`          |     N   | Input/Output    | 用于身份验证的密钥。如果启用了访问控制，则为必填项。                        | `"secret-key"`                 |

> **注意**：`accessKey` 和 `secretKey` 可以存储在 Dapr secret store 中，而不是存储在 YAML 文件中，以提高安全性。

### 使用访问密钥进行身份验证

要使用访问密钥身份验证，请在配置中包含以下元数据字段：

```yaml
- name: accessKey
  secretKeyRef:
    name: rocketmq-secrets
    key: accessKey
- name: secretKey
  secretKeyRef:
    name: rocketmq-secrets
    key: secretKey
```

这允许从 secret store 安全地获取凭据。

## Binding 支持

此组件同时支持**输入和输出** binding 接口。

此组件支持以下操作的**输出 binding**：

* `create`：发布新消息
* `read`：从 RocketMQ 主题消费消息

## 按请求设置主题

您可以按请求覆盖组件元数据中的主题：

```json
{
  "operation": "create",
  "metadata": {
    "topics": "dynamicTopic"
  },
  "data": "This is a test message for RocketMQ!"
}
```

## 重试行为

使用 `retries` 元数据字段指定 Dapr 在失败前应尝试连接 RocketMQ 的次数：

```yaml
- name: retries
  value: "5"
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作方法：使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作方法：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
