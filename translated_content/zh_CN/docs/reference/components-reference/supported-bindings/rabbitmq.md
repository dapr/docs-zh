---
type: docs
title: "RabbitMQ 绑定规范"
linkTitle: "RabbitMQ"
description: "RabbitMQ 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/rabbitmq/"
---

## 组件格式

要设置 RabbitMQ 绑定，需创建一个类型为 `bindings.rabbitmq` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.rabbitmq
  version: v1
  metadata:
  - name: queueName
    value: "queue1"
  - name: host
    value: "amqp://[username][:password]@host.domain[:port]"
  - name: durable
    value: "true"
  - name: deleteWhenUnused
    value: "false"
  - name: ttlInSeconds
    value: "60"
  - name: prefetchCount
    value: "0"
  - name: exclusive
    value: "false"
  - name: maxPriority
    value: "5"
  - name: contentType
    value: "text/plain"
  - name: reconnectWaitInSeconds
    value: "5"
  - name: externalSasl
    value: "false"
  - name: caCert
    value: "null"
  - name: clientCert
    value: "null"
  - name: clientKey
    value: "null"
  - name: direction 
    value: "input, output"
```

{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，具体操作请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

> 当发布新的 RabbitMQ 消息时，关联元数据中的所有值都会被添加到消息的标头值中。

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `queueName` | Y | Input/Output |  RabbitMQ 队列名称 | `"myqueue"` |
| `host` | Y | Input/Output | RabbitMQ 主机地址 | `"amqp://[username][:password]@host.domain[:port]"` 或使用 TLS：`"amqps://[username][:password]@host.domain[:port]"` |
| `durable` | N | Output | 告诉 RabbitMQ 将消息持久化到存储。默认值为 `"false"` | `"true"`, `"false"` |
| `deleteWhenUnused` | N | Input/Output | 启用或禁用自动删除。默认值为 `"false"` | `"true"`, `"false"` |
| `ttlInSeconds` | N | Output | 在 RabbitMQ 队列级别设置[默认消息存活时间](https://www.rabbitmq.com/ttl.html)。如果省略此参数，消息将不会过期，会一直存在于队列中直到被处理。另请参阅[此处](#specifying-a-ttl-per-message)  | `60` |
| `prefetchCount` | N | Input | 设置[通道预取设置（QoS）](https://www.rabbitmq.com/confirms.html#channel-qos-prefetch)。如果省略此参数，QoS 会将值设置为 0，表示无限制 | `0` |
| `exclusive` | N | Input/Output | 确定主题是否为独占主题。默认值为 `"false"` | `"true"`, `"false"` |
| `maxPriority`| N | Input/Output | 用于设置[优先级队列](https://www.rabbitmq.com/priority.html)的参数。如果省略此参数，队列将创建为常规队列而非优先级队列。值范围为 1 到 255。另请参阅[此处](#specifying-a-priority-per-message) | `"1"`, `"10"` |
| `contentType` | N | Input/Output | 消息的内容类型。默认值为 "text/plain"。 | `"text/plain"`, `"application/cloudevent+json"` 等 |
| `reconnectWaitInSeconds` | N | Input/Output | 表示客户端在断开连接后尝试重新连接到服务器之前应等待的持续时间（秒）。默认值为 `"5"`。 | `"5"`, `"10"` |
| `externalSasl` | N | Input/Output | 使用 TLS 时，是否应从额外字段（如 CN）获取用户名。请参阅 [RabbitMQ 身份验证机制](https://www.rabbitmq.com/access-control.html#mechanisms)。默认值为 `"false"`。 | `"true"`, `"false"` |
| `caCert` | N | Input/Output | 用于 TLS 连接的 CA 证书。默认值为 `null`。 | `"-----BEGIN CERTIFICATE-----\nMI..."` |
| `clientCert` | N | Input/Output | 用于 TLS 连接的客户端证书。默认值为 `null`。 | `"-----BEGIN CERTIFICATE-----\nMI..."` |
| `clientKey` | N | Input/Output | 用于 TLS 连接的客户端密钥。默认值为 `null`。 | `"-----BEGIN PRIVATE KEY-----\nMI..."` |
| `direction` | N | Input/Output | 绑定的方向。 | `"input"`, `"output"`, `"input, output"` |

## 绑定支持

此组件同时支持**输入和输出**绑定接口。

此组件支持**输出绑定**，具有以下操作：

- `create`

## 为每条消息指定 TTL

存活时间可以在队列级别（如上所示）或消息级别定义。在消息级别定义的值会覆盖队列级别设置的任何值。

要在消息级别设置存活时间，请在绑定调用期间使用请求体中的 `metadata` 部分。

字段名称为 `ttlInSeconds`。

示例：

{{< tabpane text=true >}}
{{% tab "Windows" %}}
```shell
curl -X POST http://localhost:3500/v1.0/bindings/myRabbitMQ \
  -H "Content-Type: application/json" \
  -d "{
        \"data\": {
          \"message\": \"Hi\"
        },
        \"metadata\": {
          \"ttlInSeconds\": "60"
        },
        \"operation\": \"create\"
      }"
```
{{% /tab %}}

{{% tab "Linux" %}}
```bash
curl -X POST http://localhost:3500/v1.0/bindings/myRabbitMQ \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "ttlInSeconds": "60"
        },
        "operation": "create"
      }'
```
{{% /tab %}}
{{< /tabpane >}}


## 为每条消息指定优先级

优先级可以在消息级别定义。如果设置了 `maxPriority` 参数，高优先级消息将优先于其他低优先级消息。

要在消息级别设置优先级，请在绑定调用期间使用请求体中的 `metadata` 部分。

字段名称为 `priority`。

示例：

{{< tabpane text=true >}}
{{% tab "Windows" %}}
```shell
curl -X POST http://localhost:3500/v1.0/bindings/myRabbitMQ \
  -H "Content-Type: application/json" \
  -d "{
        \"data\": {
          \"message\": \"Hi\"
        },
        \"metadata\": {
          "priority": \"5\"
        },
        \"operation\": \"create\"
      }"
```
{{% /tab %}}

{{% tab "Linux" %}}
```shell
curl -X POST http://localhost:3500/v1.0/bindings/myRabbitMQ \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "priority": "5"
        },
        "operation": "create"
      }'
```
{{% /tab %}}
{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
