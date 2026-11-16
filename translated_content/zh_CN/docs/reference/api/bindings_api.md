---
type: docs
title: "Bindings API 参考"
linkTitle: "Bindings API"
description: "绑定 API 的详细文档"
weight: 300
---

Dapr 为应用程序提供双向绑定能力，并为与不同的云服务或本地服务及系统交互提供一致的方法。
开发者可以使用 Dapr API 调用输出绑定，也可以让 Dapr 运行时通过输入绑定触发应用程序。

绑定的示例包括 `Kafka`、`Rabbit MQ`、`Azure Event Hubs`、`AWS SQS`、`GCP Storage` 等。

## Bindings 结构

Dapr Binding yaml 文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
  namespace: <NAMESPACE>
spec:
  type: bindings.<TYPE>
  version: v1
  metadata:
  - name: <NAME>
    value: <VALUE>
```

`metadata.name` 是绑定的名称。

如果以自托管方式在本地运行，请将此文件放置在你的 `components` 文件夹中，与你的状态存储和消息队列 yml 配置放在一起。

如果在 Kubernetes 上运行，请将组件应用到集群。

> **注意：** 在生产环境中，切勿在 Dapr 组件文件中放置密码或机密信息。有关使用机密存储安全存储和检索机密信息的说明，请参阅[设置机密存储]({{% ref setup-secret-store %}})

### 绑定方向（可选）

在某些场景中，为 Dapr 提供额外信息以指示绑定组件支持的方向会很有用。

提供绑定 `direction` 可以帮助 Dapr 边车避免 `"wait for the app to become ready"` 状态，即无限期等待应用程序变为可用。这将 Dapr 边车与应用程序之间的生命周期依赖关系解耦。

你可以在组件的元数据中指定 `direction` 字段。该字段的有效值为：
- `"input"`
- `"output"`
- `"input, output"`

{{% alert title="注意" color="primary" %}}
强烈建议所有绑定都包含 `direction` 属性。
{{% /alert %}}

以下是几个 `"direction"` 元数据字段可能有帮助的场景：

- 当应用程序（与边车分离）作为无服务器工作负载运行并缩放为零时，Dapr 边车执行的 `"wait for the app to become ready"` 检查变得毫无意义。

- 如果分离的 Dapr 边车缩放为零，且应用程序在启动 HTTP 服务器之前就访问了边车，那么 `"wait for the app to become ready"` 会使应用程序与边车相互等待，陷入死锁。

### 示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafkaevent
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "http://localhost:5050"
  - name: topics
    value: "someTopic"
  - name: publishTopic
    value: "someTopic2"
  - name: consumerGroup
    value: "group1"
  - name: "direction"
    value: "input, output"
```

## 通过输入绑定调用服务代码

想要使用输入绑定触发其应用程序的开发者，可以监听一个 `POST` HTTP 端点，其路由名称与 `metadata.name` 相同。

启动时，Dapr 会向 `metadata.name` 端点发送 `OPTIONS` 请求。如果此应用程序希望订阅该绑定，它应返回不同于 `NOT FOUND (404)` 的状态码。

`metadata` 部分是一个开放的键/值元数据对，允许绑定定义连接属性以及组件实现特有的自定义属性。

### 示例

例如，下面是一个 Python 应用程序如何使用符合 Dapr API 规范的平台订阅来自 `Kafka` 的事件。请注意，组件中的 metadata.name 值 `kafkaevent` 如何与 Python 代码中的 POST 路由名称相匹配。

#### Kafka 组件

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafkaevent
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "http://localhost:5050"
  - name: topics
    value: "someTopic"
  - name: publishTopic
    value: "someTopic2"
  - name: consumerGroup
    value: "group1"
```

#### Python 代码

```python
from flask import Flask
app = Flask(__name__)

@app.route("/kafkaevent", methods=['POST'])
def incoming():
    print("Hello from Kafka!", flush=True)

    return "Kafka Event Processed!"
```

### 绑定端点

绑定从组件 yaml 文件中发现。Dapr 在启动时调用此端点，以确保应用程序能够处理该调用。如果应用程序没有此端点，Dapr 会忽略它。

#### HTTP 请求

```
OPTIONS http://localhost:<appPort>/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
404  | 应用程序不想绑定到该绑定
2xx 或 405  | 应用程序想要绑定到该绑定

#### URL 参数

参数 | 描述
--------- | -----------
appPort | 应用程序端口
name | 绑定的名称

> 注意，所有 URL 参数都区分大小写。

### 绑定负载

为了传递绑定输入，会使用绑定名称作为 URL 路径，向用户代码发起 POST 调用。

#### HTTP 请求

```
POST http://localhost:<appPort>/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 应用程序成功处理了输入绑定

#### URL 参数

参数 | 描述
--------- | -----------
appPort | 应用程序端口
name | 绑定的名称

> 注意，所有 URL 参数都区分大小写。

#### HTTP 响应主体（可选）

可选地，可以使用响应主体，将输入绑定直接与状态存储或输出绑定关联起来。

**示例：**
Dapr 将 `stateDataToStore` 存储到名为 "stateStore" 的状态存储中。
Dapr 并行将 `jsonObject` 发送到名为 "storage" 和 "queue" 的输出绑定。
如果未设置 `concurrency`，则按顺序发送（下面的示例展示了这些操作是并行完成的）

```json
{
    "storeName": "stateStore",
    "state": stateDataToStore,

    "to": ['storage', 'queue'],
    "concurrency": "parallel",
    "data": jsonObject,
}
```

## 调用输出绑定

此端点允许你调用 Dapr 输出绑定。
Dapr 绑定支持多种操作，例如 `create`。

请参阅每个绑定的[不同规范]({{% ref supported-bindings %}})，了解支持的操作列表。

### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/bindings/<name>
```

### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
204  | 空响应
400  | 格式错误的请求
500  | 请求失败

### 负载

绑定端点接收以下 JSON 负载：

```json
{
  "data": "",
  "metadata": {
    "": ""
  },
  "operation": ""
}
```

> 注意，所有 URL 参数都区分大小写。

`data` 字段接受任何可 JSON 序列化的值，并作为要发送到输出绑定的负载。
`metadata` 字段是键/值对数组，允许你为每次调用设置特定于绑定的元数据。
`operation` 字段告诉 Dapr 绑定应执行哪种操作。

### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
name | 要调用的输出绑定的名称

> 注意，所有 URL 参数都区分大小写。

### 示例

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myKafka \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "key": "redis-key-1"
        },
        "operation": "create"
      }'
```

### gRPC 请求元数据

通过 gRPC 调用输出绑定时，Dapr 除了转发你显式设置的任何元数据，还会将传入的 gRPC 请求元数据转发到绑定的元数据映射中。从 Dapr 1.19 开始，二进制 gRPC 元数据（即以 `-bin` 结尾、其值不是有效 UTF-8 的键）不再被转发，因为它无法表示为字符串组件元数据。

### 常见元数据值

有一些常见的元数据属性在多个绑定组件中受支持。下面的列表说明了它们：

|属性|描述|绑定定义|可用于
|-|-|-|-|
|ttlInSeconds|以秒为单位定义消息的存活时间|如果在绑定定义中设置，将导致所有消息具有默认的存活时间。消息 TTL 会覆盖绑定定义中的任何值。|RabbitMQ, Azure Service Bus, Azure Storage Queue|
