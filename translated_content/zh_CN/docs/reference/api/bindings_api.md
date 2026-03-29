---
type: docs
title: "Bindings API 参考"
linkTitle: "Bindings API"
description: "绑定 API 的详细文档"
weight: 300
---

Dapr 为应用程序提供双向绑定能力，以及与不同云/本地服务或系统交互的一致方法。
开发者可以使用 Dapr API 调用输出绑定，并让 Dapr 运行时通过输入绑定触发应用程序。

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

如果在本地自行托管，请将此文件放置在你的 `components` 文件夹中，与你的状态存储和消息队列 yml 配置放在一起。

如果在 kubernetes 上运行，请将组件应用到集群。

> **注意：** 在生产环境中，切勿将密码或机密信息放置在 Dapr 组件文件中。有关使用状态存储安全存储和检索机密信息的信息，请参阅[设置状态存储]({{% ref setup-secret-store %}})

### 绑定方向（可选）

在某些场景中，向 Dapr 提供附加信息以指示绑定组件支持的方向会很有帮助。

提供绑定 `direction` 可以帮助 Dapr 边车避免 `"wait for the app to become ready"` 状态，即无限期等待应用程序变为可用。这解耦了 Dapr 边车和应用程序之间的生命周期依赖关系。

你可以在组件的元数据中指定 `direction` 字段。该字段的有效值为：
- `"input"`
- `"output"`
- `"input, output"`

{{% alert title="注意" color="primary" %}}
强烈建议所有绑定都应包含 `direction` 属性。
{{% /alert %}}

以下是 `"direction"` 元数据字段可能有用的几个场景：

- 当应用程序（与边车分离）作为无服务器工作负载运行并缩放为零时，Dapr 边车执行的 `"wait for the app to become ready"` 检查变得毫无意义。

- 如果分离的 Dapr 边车缩放为零，应用程序在边车启动 HTTP 服务器之前就到达边车，`"wait for the app to become ready"` 会导致应用程序和边车相互等待的死锁。

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

想要使用输入绑定触发其应用程序的开发者可以监听一个 `POST` http 端点，路由名称与 `metadata.name` 相同。

启动时，Dapr 向 `metadata.name` 端点发送 `OPTIONS` 请求，如果此应用程序想要订阅该绑定，则期望返回不同于 `NOT FOUND (404)` 的状态码。

`metadata` 部分是一个开放的键/值元数据对，允许绑定定义连接属性以及组件实现独有的自定义属性。

### 示例

例如，以下是一个 Python 应用程序如何使用符合 Dapr API 规范的平台订阅来自 `Kafka` 的事件。请注意，组件中的 metadata.name 值 `kafkaevent` 如何与 Python 代码中的 POST 路由名称匹配。

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

绑定从组件 yaml 文件中发现。Dapr 在启动时调用此端点以确保应用程序可以处理此调用。如果应用程序没有该端点，Dapr 将忽略它。

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

为了传递绑定输入，会使用绑定名称作为 URL 路径向用户代码发出 POST 调用。

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

可选地，可以使用响应主体直接将输入绑定与状态存储或输出绑定绑定。

**示例：**
Dapr 将 `stateDataToStore` 存储到名为 "stateStore" 的状态存储中。
Dapr 并行将 `jsonObject` 发送到名为 "storage" 和 "queue" 的输出绑定。
如果未设置 `concurrency`，则按顺序发送（下面的示例显示这些操作是并行完成的）

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
Dapr 绑定支持各种操作，例如 `create`。

请参阅每个绑定的[不同规范]({{% ref supported-bindings %}})以查看支持的操作列表。

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

`data` 字段接受任何可 JSON 序列化的值，并充当要发送到输出绑定的负载。
`metadata` 字段是键/值对数组，允许你为每次调用设置绑定特定的元数据。
`operation` 字段告诉 Dapr 绑定它应该执行哪个操作。

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

### 常见元数据值

有一些常见的元数据属性在多个绑定组件中受支持。下面的列表说明了它们：

|属性|描述|绑定定义|可用于
|-|-|-|-|
|ttlInSeconds|以秒为单位定义消息的存活时间|如果在绑定定义中设置，将导致所有消息具有默认的存活时间。消息 ttl 会覆盖绑定定义中的任何值。|RabbitMQ, Azure Service Bus, Azure Storage Queue|
