---
type: docs
title: "Bindings API 参考"
linkTitle: "Bindings API"
description: "binding API 的详细文档"
weight: 300
---

Dapr 为应用程序提供双向 binding 能力，并为与不同的云端或本地部署的服务及系统交互提供一致的方法。
开发者可以使用 Dapr API 调用 output binding，也可以让 Dapr runtime 通过 input binding 触发应用程序。

binding 的示例包括 `Kafka`、`Rabbit MQ`、`Azure Event Hubs`、`AWS SQS`、`GCP Storage` 等。

## Bindings 结构

Dapr binding yaml 文件具有以下结构：

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

`metadata.name` 是 binding 的名称。

如果以自托管方式在本地运行，请将此文件放置在你的 `components` 文件夹中，与你的 state store 和消息队列 yml 配置放在一起。

如果在 Kubernetes 上运行，请将 component 应用到你的集群。

> **注意：** 在生产环境中，切勿在 Dapr component 文件中放置密码或 secrets 信息。有关使用 secret store 安全存储和检索 secrets 信息的说明，请参阅[设置 secret store]({{% ref setup-secret-store %}})

### binding 方向（可选）

在某些场景中，向 Dapr 提供额外信息以指明 binding component 支持的方向会很有用。

提供 binding `direction` 可以帮助 Dapr sidecar 避开 `"wait for the app to become ready"` 状态，即无限期等待应用程序可用的状态。这会解除 Dapr sidecar 与应用程序之间的生命周期依赖关系。

你可以在 component 的 metadata 中指定 `direction` 字段。该字段的有效值为：
- `"input"`
- `"output"`
- `"input, output"`

{{% alert title="注意" color="primary" %}}
强烈建议所有 binding 都包含 `direction` 属性。
{{% /alert %}}

以下是几个 `"direction"` metadata 字段可能有帮助的场景：

- 当应用程序（与 sidecar 分离）作为无服务器工作负载运行并缩容至零时，Dapr sidecar 执行的 `"wait for the app to become ready"` 检查就变得毫无意义。

- 如果分离的 Dapr sidecar 缩容至零，且应用程序在启动 HTTP 服务器之前就访问了 sidecar，那么 `"wait for the app to become ready"` 会使应用程序与 sidecar 相互等待，陷入死锁。

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

## 通过 input binding 调用服务代码

希望使用 input binding 触发其应用程序的开发者，可以监听一个 `POST` HTTP 端点，其路由名称与 `metadata.name` 相同。

启动时，Dapr 会向 `metadata.name` 端点发送 `OPTIONS` 请求。如果该应用程序希望订阅此 binding，则应返回与 `NOT FOUND (404)` 不同的状态码。

`metadata` 部分是一个开放的键/值 metadata 对，允许 binding 定义连接属性，以及 component 实现特有的自定义属性。

### 示例

例如，下面展示了一个 Python 应用程序如何使用符合 Dapr API 规范的平台订阅来自 `Kafka` 的事件。请注意 component 中的 metadata.name 值 `kafkaevent` 如何与 Python 代码中的 POST 路由名称相匹配。

#### Kafka component

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

### binding 端点

binding 从 component yaml 文件中发现。Dapr 在启动时调用此端点，以确保应用程序能够处理该调用。如果应用程序没有此端点，Dapr 会忽略它。

#### HTTP 请求

```
OPTIONS http://localhost:<appPort>/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
404  | 应用程序不想绑定到该 binding
2xx 或 405  | 应用程序想要绑定到该 binding

#### URL 参数

参数 | 描述
--------- | -----------
appPort | 应用程序端口
name | binding 的名称

> 注意，所有 URL 参数都区分大小写。

### binding 负载

为了传递 binding 输入，会以 binding 名称作为 URL 路径，向用户代码发起 POST 调用。

#### HTTP 请求

```
POST http://localhost:<appPort>/<name>
```

#### HTTP 响应码

代码 | 描述
---- | -----------
200  | 应用程序成功处理了 input binding

#### URL 参数

参数 | 描述
--------- | -----------
appPort | 应用程序端口
name | binding 的名称

> 注意，所有 URL 参数都区分大小写。

#### HTTP 响应主体（可选）

也可以选择使用响应主体，将 input binding 直接关联到 state store 或 output binding。

**示例：**
Dapr 将 `stateDataToStore` 存储到名为 "stateStore" 的 state store 中。
Dapr 并行地将 `jsonObject` 发送到名为 "storage" 和 "queue" 的 output binding。
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

## 调用 output binding

此端点允许你调用 Dapr output binding。
Dapr binding 支持多种操作，例如 `create`。

请参阅每个 binding 的[不同规范]({{% ref supported-bindings %}})，了解支持的操作列表。

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

binding 端点接收以下 JSON 负载：

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

`data` 字段接受任何可 JSON 序列化的值，并作为要发送到 output binding 的负载。
`metadata` 字段是键/值对数组，允许你为每次调用设置特定于 binding 的 metadata。
`operation` 字段告诉 Dapr binding 应执行哪种操作。

### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
name | 要调用的 output binding 的名称

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

### gRPC 请求 metadata

通过 gRPC 调用 output binding 时，除了你显式设置的任何 metadata 外，Dapr 还会将传入的 gRPC 请求 metadata 转发到 binding 的 metadata 映射中。从 Dapr 1.19 开始，二进制 gRPC metadata（即以 `-bin` 结尾、其值不是有效 UTF-8 的键）不再被转发，因为它无法表示为字符串形式的 component metadata。

### 常见 metadata 值

有一些常见的 metadata 属性在多个 binding component 中受支持。下表列出了这些属性：

|属性|描述|binding 定义|可用于
|-|-|-|-|
|ttlInSeconds|以秒为单位定义消息的生存时间|如果在 binding 定义中设置，将使所有消息具有默认的生存时间。消息 TTL 会覆盖 binding 定义中的任何值。|RabbitMQ, Azure Service Bus, Azure Storage Queue|
