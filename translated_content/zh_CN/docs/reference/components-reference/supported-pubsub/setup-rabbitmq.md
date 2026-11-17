---
type: docs
title: "RabbitMQ"
linkTitle: "RabbitMQ"
description: "RabbitMQ pub/sub component 的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-rabbitmq/"
---

## component 格式

要设置 RabbitMQ pub/sub，请创建类型为 `pubsub.rabbitmq` 的 component。请参阅[pub/sub 代理 component 文件]({{% ref setup-pubsub.md %}})以了解如何自动生成 ConsumerID。阅读[如何：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})以了解如何创建和应用 pub/sub 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://localhost:5672"
  - name: protocol
    value: amqp  
  - name: hostname
    value: localhost 
  - name: username
    value: username
  - name: password
    value: password  
  - name: consumerID
    value: channel1
  - name: durable
    value: false
  - name: deletedWhenUnused
    value: false
  - name: autoAck
    value: false
  - name: deliveryMode
    value: 0
  - name: requeueInFailure
    value: false
  - name: prefetchCount
    value: 0
  - name: reconnectWait
    value: 0
  - name: concurrencyMode
    value: parallel
  - name: publisherConfirm
    value: false
  - name: enableDeadLetter # 可选，是否启用死信
    value: true
  - name: maxLen # 可选，队列中的最大消息数
    value: 3000
  - name: maxLenBytes # 可选，队列的最大字节长度。
    value: 10485760
  - name: exchangeKind
    value: fanout
  - name: saslExternal
    value: false
  - name: ttlInSeconds
    value: 60
  - name: clientName
    value: {podName}
  - name: heartBeat
    value: 10s
  - name: publishMessagePropertiesToMetadata
    value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例以纯文本字符串形式使用 secrets。建议按照[此处]({{% ref component-secrets.md %}})所述，使用 secret store 来管理 secrets。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情                                                                                                                                                                                                                                                                                                                                 | 示例 |
|--------------------|:--------:|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| connectionString | Y* | RabbitMQ 连接字符串。与 protocol、hostname、username、password 字段互斥 | `amqp://user:pass@localhost:5672` |
| protocol | N* | RabbitMQ 协议。与 connectionString 字段互斥 | `amqp` |
| hostname | N* | RabbitMQ 主机名。与 connectionString 字段互斥 | `localhost` |
| username | N* | RabbitMQ 用户名。与 connectionString 字段互斥 | `username` |
| password | N* | RabbitMQ 密码。与 connectionString 字段互斥 | `password` |
| consumerID         | N        | 消费者 ID（消费者标签）将一个或多个消费者组织成一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息只会被组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID（`appID`）的值。 | 可以设置为字符串值（如上例中的 `"channel1"`）或字符串格式的值（如 `"{podName}"` 等）。[查看您可以在 component 元数据中使用的所有模板标签]({{% ref "component-schema.md#templated-metadata-values" %}}) |
| durable            | N        | 是否使用[持久化](https://www.rabbitmq.com/queues.html#durability)队列。默认为 `"false"` | `"true"`, `"false"` |
| deletedWhenUnused  | N        | 是否将队列配置为[自动删除](https://www.rabbitmq.com/queues.html)。默认为 `"true"` | `"true"`, `"false"` |
| autoAck  | N        | 队列消费者是否应[自动确认](https://www.rabbitmq.com/confirms.html)消息。默认为 `"false"` | `"true"`, `"false"` |
| deliveryMode  | N        | 发布消息时的持久化模式。默认为 `"0"`。RabbitMQ 将 `"2"` 视为持久化，将所有其他数字视为非持久化 | `"0"`, `"2"` |
| requeueInFailure  | N        | 在失败时发送[否定确认](https://www.rabbitmq.com/nack.html)时是否重新排队。默认为 `"false"` | `"true"`, `"false"` |
| prefetchCount  | N        | 要[预取](https://www.rabbitmq.com/consumer-prefetch.html)的消息数量。建议在生产环境中将其设置为非零值。默认为 `"0"`，表示预取所有可用消息。 | `"2"` |
| publisherConfirm  | N        | 如果启用，客户端在发布消息后会等待[发布者确认](https://www.rabbitmq.com/confirms.html#publisher-confirms)。默认为 `"false"` | `"true"`, `"false"` |
| reconnectWait  | N        | 发生连接故障后，重新连接前等待的时间（秒） | `"0"` |
| concurrencyMode | N        | `parallel` 是默认值，允许并行处理多条消息（如果配置了 `app-max-concurrency` 注解，则受其限制）。设置为 `single` 可禁用并行处理。在大多数情况下，没有必要更改此项。 | `parallel`, `single` |
| enableDeadLetter      | N        | 启用后，无法处理的消息将被转发到死信主题。默认为 `"false"` | `"true"`, `"false"` |
| maxLen      | N        | 队列及其死信队列（如果启用了死信）的最大消息数。如果同时设置了 `maxLen` 和 `maxLenBytes`，两者都会生效，先达到的限制会被强制执行。默认不限制。 | `"1000"` |
| maxLenBytes      | N        | 队列及其死信队列（如果启用了死信）的最大字节长度。如果同时设置了 `maxLen` 和 `maxLenBytes`，两者都会生效，先达到的限制会被强制执行。默认不限制。 | `"1048576"` |
| exchangeKind      | N        | RabbitMQ 交换机的类型。默认为 `"fanout"`。`"x-consistent-hash"` 需要代理上已启用 [`rabbitmq_consistent_hash_exchange`](https://github.com/rabbitmq/rabbitmq-server/tree/main/deps/rabbitmq_consistent_hash_exchange) 插件。当 `exchangeDeclareMode` 为 `"passive"` 时，由于 component 不声明交换机，代理支持的任何交换机类型都会被接受。 | `"fanout"`,`"topic"`,`"direct"`,`"headers"`,`"x-consistent-hash"` |
| exchangeDeclareMode | N      | component 获取主题所用交换机的方式。`"declare"`（默认）在交换机不存在时创建它。`"passive"` 仅断言交换机已存在，从不创建或修改它。参见[使用外部管理的拓扑](#使用外部管理的拓扑)。 | `"declare"`, `"passive"` |
| queueDeclareMode  | N        | component 获取订阅所用队列的方式。`"declare"`（默认）创建队列并将其绑定到交换机。`"passive"` 仅断言队列已存在，并将其绑定关系交由外部所有者管理。参见[使用外部管理的拓扑](#使用外部管理的拓扑)。 | `"declare"`, `"passive"` |
| saslExternal      | N        | 使用 TLS 时，是否应从附加字段（例如 CN）获取用户名。请参阅 [RabbitMQ 身份验证机制](https://www.rabbitmq.com/access-control.html#mechanisms)。默认为 `"false"`。 | `"true"`, `"false"` |
| ttlInSeconds      | N        | 在 component 级别设置消息 TTL，可被每个请求的消息级 TTL 覆盖。 | `"60"` |
| caCert | 使用 TLS 时必需 | 用于验证服务器 TLS 证书的 PEM 格式证书颁发机构（CA）证书。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"` |
| clientCert  | 使用 TLS 时必需 | PEM 格式的 TLS 客户端证书。必须与 `clientKey` 一起使用。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"` |
| clientKey | 使用 TLS 时必需  | PEM 格式的 TLS 客户端密钥。必须与 `clientCert` 一起使用。可设置为 `secretKeyRef`，以引用 secrets。 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"` |
| clientName | N | 此 RabbitMQ [客户端提供的连接名称](https://www.rabbitmq.com/connections.html#client-provided-names)是一个自定义标识符。如果设置，该标识符会出现在 RabbitMQ 服务器日志条目和管理 UI 中。可设置为 {uuid}、{podName} 或 {appID}，Dapr 运行时会将其替换为实际值。 | `"app1"`, `{uuid}`, `{podName}`, `{appID}` |
| heartBeat  | N | 定义与服务器的心跳间隔，用于检测与 RabbitMQ 服务器的 TCP 对等连接是否存活。默认为 `10s`。 | `"10s"` |
| `publishMessagePropertiesToMetadata` | N | 是否将 AMQP 消息属性（标头、消息 ID 等）发布到元数据。 | "true", "false" |

## 使用 TLS 进行通信

要配置使用 TLS 进行通信，请确保 RabbitMQ 节点已启用 TLS，并在 component 配置中提供 `caCert`、`clientCert`、`clientKey` 元数据。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: "amqps://localhost:5671"
  - name: consumerID
    value: myapp
  - name: durable
    value: false
  - name: deletedWhenUnused
    value: false
  - name: autoAck
    value: false
  - name: deliveryMode
    value: 0
  - name: requeueInFailure
    value: false
  - name: prefetchCount
    value: 0
  - name: reconnectWait
    value: 0
  - name: concurrencyMode
    value: parallel
  - name: publisherConfirm
    value: false
  - name: enableDeadLetter # 可选，是否启用死信
    value: true
  - name: maxLen # 可选，队列中的最大消息数
    value: 3000
  - name: maxLenBytes # 可选，队列的最大字节长度。
    value: 10485760
  - name: exchangeKind
    value: fanout
  - name: saslExternal
    value: false
  - name: caCert
    value: ${{ myLoadedCACert }}
  - name: clientCert
    value: ${{ myLoadedClientCert }}
  - name: clientKey
    secretKeyRef:
      name: myRabbitMQClientKey
      key: myRabbitMQClientKey
```

注意，虽然 `caCert` 和 `clientCert` 的值可能不是 secrets，但为了方便，也可以从 Dapr secret store 中引用它们。

### 启用消息传递重试

RabbitMQ pub/sub component 没有内置对重试策略的支持。这意味着 sidecar 只会向服务发送一次消息。服务返回结果后，无论消息是否被正确处理，该消息都会被标记为已消费。请注意，这是所有 Dapr pub/sub component 的共同行为，而不仅限于 RabbitMQ。
当 `autoAck` 设置为 `false` 且 `requeueInFailure` 设置为 `true` 时，Dapr 可以尝试第二次重新投递消息。

要让 Dapr 使用更复杂的重试策略，您可以将[重试 resiliency]({{% ref "retries-overview.md" %}})应用于 RabbitMQ pub/sub component。

两种重试消息的方式之间存在关键区别：

1. 当使用 `autoAck = false` 和 `requeueInFailure = true` 时，由 RabbitMQ 负责重新投递消息，_任何_ 订阅者都可能获得重新投递的消息。如果您有多个消费者实例，另一个消费者可能会获得该消息。这通常是更好的方法，因为如果存在临时性故障，不同的工作进程更有可能成功处理该消息。

2. 使用 resiliency 时，同一个 Dapr sidecar 会重试重新投递消息。因此，接收同一条消息的将是同一个 Dapr sidecar 和同一个应用程序。

## 创建 RabbitMQ 服务器

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用 Docker 在本地运行 RabbitMQ 服务器：

```bash
docker run -d --hostname my-rabbit --name some-rabbit rabbitmq:3
```

然后，您可以使用客户端端口与服务器交互：`localhost:5672`。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 RabbitMQ 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/stable/rabbitmq)：

```bash
helm install rabbitmq stable/rabbitmq
```

查看 chart 的输出，获取用户名和密码。

这会将 RabbitMQ 安装到 `default` 命名空间中。要与 RabbitMQ 交互，请使用以下命令查找服务：`kubectl get svc rabbitmq`。

例如，如果按照上面的示例安装，RabbitMQ 服务器的客户端地址为：

`rabbitmq.default.svc.cluster.local:5672`
{{% /tab %}}

{{< /tabpane >}}

## 使用主题交换机路由消息

将 `exchangeKind` 设置为 `"topic"` 即可使用主题交换机，它通常用于消息的多播路由。要使用主题交换机路由消息，必须设置以下元数据：

- **`routingKey`：**  
   具有路由键的消息会根据订阅时元数据中定义的 `routing key` 路由到一个或多个队列。

- **`queueName`：**  
   如果不设置 `queueName`，则只会创建一个队列，所有路由键都会路由到该队列。这意味着所有订阅者都会绑定到该队列，无法得到预期结果。

例如，如果应用配置了路由键 `keyA` 和 `queueName` 为 `queue-A`：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orderspubsub
spec:
  topic: B
  routes: 
    default: /B
  pubsubname: pubsub
  metadata:
    routingKey: keyA
    queueName: queue-A
```

它将接收路由键为 `keyA` 的消息，而不会接收具有其他路由键的消息。

```
// 使用路由键 `keyA` 发布消息，这些消息将被上面的示例接收。
client.PublishEvent(context.Background(), "pubsub", "B", []byte("this is a message"), dapr.PublishEventWithMetadata(map[string]string{"routingKey": "keyA"}))
// 使用路由键 `keyB` 发布消息，这些消息不会被上面的示例接收。
client.PublishEvent(context.Background(), "pubsub", "B", []byte("this is another message"), dapr.PublishEventWithMetadata(map[string]string{"routingKey": "keyB"}))
```

### 绑定多个 `routingKey`

多个路由键可以用逗号分隔。  
下面的示例绑定了三个 `routingKey`：`keyA`、`keyB` 和 `""`。注意空键的绑定方式。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orderspubsub
spec:
  topic: B
  routes: 
    default: /B
  pubsubname: pubsub
  metadata:
    routingKey: keyA,keyB,
```


有关更多信息，请参阅 [rabbitmq exchanges](https://www.rabbitmq.com/tutorials/amqp-concepts.html#exchanges)。

## 使用一致性哈希交换机实现分区有序

将 `exchangeKind` 设置为 `"x-consistent-hash"`，可以在多个消费者之间对主题进行分区，同时保证共享同一路由键的消息保持顺序。给定键的所有消息都会路由到同一个队列，因此该键的消息按序处理，而其他键则在其他队列上并行处理。

{{% alert title="注意" color="primary" %}}
此交换机类型由 [`rabbitmq_consistent_hash_exchange`](https://github.com/rabbitmq/rabbitmq-server/tree/main/deps/rabbitmq_consistent_hash_exchange) 插件提供，使用前必须在代理上启用该插件。
{{% /alert %}}

`routingKey` 元数据在发布和订阅两端的含义不同：

- **发布时**，它是分区键。交换机对其进行哈希以选择队列，因此需要彼此保持顺序的消息必须共享同一个键。
- **订阅时**，它是队列的*存储桶权重*。这是一个正整数，表示队列在哈希环上占用的存储桶数量，键空间会按各绑定队列的权重成比例划分。与主题交换机不同，一致性哈希交换机每个队列只有一个有效绑定，因此此处只接受一个值。

每个消费者绑定各自的队列，因此请为每个订阅设置不同的 `queueName`（或为每个 component 设置不同的 `consumerID`），并将 `concurrencyMode` 设置为 `single`，以保证每个分区按序处理：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pub-sub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://localhost:5672"
  - name: exchangeKind
    value: "x-consistent-hash"
  - name: concurrencyMode
    value: "single"
```

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: orderspubsub
spec:
  topic: orders
  routes:
    default: /orders
  pubsubname: order-pub-sub
  metadata:
    queueName: orders-partition-0
    routingKey: "10"
```

发布时，在 `routingKey` 元数据中设置分区键。在每个示例中，两条消息都携带相同的分区键，因此它们会被路由到同一个队列，并按发布顺序处理。

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
with DaprClient() as client:
    client.publish_event(
        pubsub_name='order-pub-sub',
        topic_name='orders',
        data='created',
        publish_metadata={'routingKey': 'tenant-42/serial-7'},
    )
    client.publish_event(
        pubsub_name='order-pub-sub',
        topic_name='orders',
        data='shipped',
        publish_metadata={'routingKey': 'tenant-42/serial-7'},
    )
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
const client = new DaprClient();

await client.pubsub.publish("order-pub-sub", "orders", "created", {
  metadata: { routingKey: "tenant-42/serial-7" },
});
await client.pubsub.publish("order-pub-sub", "orders", "shipped", {
  metadata: { routingKey: "tenant-42/serial-7" },
});
```

{{% /tab %}}

{{% tab "Go" %}}

```go
client.PublishEvent(context.Background(), "order-pub-sub", "orders", []byte("created"), dapr.PublishEventWithMetadata(map[string]string{"routingKey": "tenant-42/serial-7"}))
client.PublishEvent(context.Background(), "order-pub-sub", "orders", []byte("shipped"), dapr.PublishEventWithMetadata(map[string]string{"routingKey": "tenant-42/serial-7"}))
```

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="注意" color="primary" %}}
存储桶权重是相对值，较小的权重会使键空间的划分较为粗略。将两个队列的权重都设为 `1`，划分可能会明显不均；而将权重设为几十，则能在相同数量的队列之间更均匀地分配键。
{{% /alert %}}

## 使用外部管理的拓扑

默认情况下，component 会声明它所需的拓扑：一个以主题命名的交换机、每个订阅对应的一个队列，以及它们之间的绑定。如果您的交换机和队列是通过声明式方式管理的（例如由 [RabbitMQ Cluster Kubernetes Operator 的 Topology Operator](https://www.rabbitmq.com/kubernetes/operator/using-topology-operator#exchanges-bindings)、Terraform 或其他任何配置步骤管理），这些声明就会发生冲突。

AMQP 声明只有在*所有*属性都一致时才是幂等的。若两者不一致，RabbitMQ 会返回 `PRECONDITION_FAILED (406)`，component 将无法使用该主题。由于两端的默认值各不相同，即使在默认配置下也会出现这种情况，而并非只发生在特殊配置中。

为避免冲突，请将其中一种模式设置为 `"passive"`，使外部所有者成为唯一的事实来源：

- `exchangeDeclareMode: passive` 断言主题交换机已存在，且从不创建或修改它。
- `queueDeclareMode: passive` 断言消费者队列已存在，并将 `queue.bind` 留给外部所有者处理，因为绑定关系属于队列的所有者。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pub-sub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://localhost:5672"
  - name: exchangeDeclareMode
    value: "passive"
  - name: queueDeclareMode
    value: "passive"
```

死信处理遵循 `queueDeclareMode`，而非 `exchangeDeclareMode`。这是因为死信交换机和死信队列是在运行时根据消费者命名的，它们属于队列，而不属于外部所有者预先定义的拓扑。当 `queueDeclareMode: declare` 时，component 会照常创建它们。当 `queueDeclareMode: passive` 时，component 不会创建任何内容，`enableDeadLetter` 也不会生效，因此死信处理成为队列定义的一部分，由队列的所有者按其选择的名称进行设置。

`exchangeDeclareMode` 和 `queueDeclareMode` 相互独立，请按外部所有者实际管理的内容进行设置。一种常见组合是：交换机由外部管理，而 component 仍然声明队列。当消费者队列名称只能在运行时确定时，一致性哈希的配置就需要这种组合：

```yaml
  - name: exchangeDeclareMode
    value: "passive"
  - name: exchangeKind
    value: "x-consistent-hash"
```

{{% alert title="注意" color="primary" %}}
在 `queueDeclareMode: passive` 下，component 不会发送队列参数，因此 `maxLen`、`maxLenBytes`、`maxPriority`、`queueType` 和 `enableDeadLetter` 等设置需由声明队列的一方负责。如果 component 期望已存在的交换机或队列缺失，它会失败，并报错，指出缺失的对象以及阻止其被创建的模式。
{{% /alert %}}

## 使用优先级队列

Dapr 支持 RabbitMQ [优先级队列](https://www.rabbitmq.com/priority.html)。要为队列设置优先级，请使用 `maxPriority` 主题订阅元数据。

### 声明式优先级队列示例

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: pubsub
spec:
  topic: checkout
  routes: 
    default: /orders
  pubsubname: order-pub-sub
  metadata:
    maxPriority: 3
```

### 编程式优先级队列示例

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
      {
        'pubsubname': 'pubsub',
        'topic': 'checkout',
        'routes': {
          'default': '/orders'
        },
        'metadata': {'maxPriority': '3'}
      }
    ]
    return jsonify(subscriptions)
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json({ type: 'application/*+json' }));

const port = 3000

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "checkout",
      routes: {
        default: '/orders'
      },
      metadata: {
        maxPriority: '3'
      }
    }
  ]);
})
```

{{% /tab %}}

{{% tab "Go" %}}

```go
package main

	"encoding/json"
	"net/http"

const appPort = 3000

type subscription struct {
	PubsubName string            `json:"pubsubname"`
	Topic      string            `json:"topic"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	Routes     routes            `json:"routes"`
}

type routes struct {
	Rules   []rule `json:"rules,omitempty"`
	Default string `json:"default,omitempty"`
}

// 处理 /dapr/subscribe
func configureSubscribeHandler(w http.ResponseWriter, _ *http.Request) {
	t := []subscription{
		{
			PubsubName: "pubsub",
			Topic:      "checkout",
			Routes: routes{
				Default: "/orders",
			},
      Metadata: map[string]string{
        "maxPriority": "3"
      },
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(t)
}
```
{{% /tab %}}

{{< /tabpane >}}

### 发布消息时设置优先级

要为消息设置优先级，请在发布端点或 SDK 方法中添加发布元数据键 `maxPriority`。

{{< tabpane text=true >}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3601/v1.0/publish/order-pub-sub/orders?metadata.priority=3 -H "Content-Type: application/json" -d '{"orderId": "100"}'
```

{{% /tab %}}

{{% tab "Python" %}}

```python
with DaprClient() as client:
        result = client.publish_event(
            pubsub_name=PUBSUB_NAME,
            topic_name=TOPIC_NAME,
            data=json.dumps(orderId),
            data_content_type='application/json',
            metadata= { 'priority': '3' })
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
await client.pubsub.publish(PUBSUB_NAME, TOPIC_NAME, orderId, { 'priority': '3' });
```

{{% /tab %}}

{{% tab "Go" %}}

```go
client.PublishEvent(ctx, PUBSUB_NAME, TOPIC_NAME, []byte(strconv.Itoa(orderId)), map[string]string{"priority": "3"})
```
{{% /tab %}}

{{< /tabpane >}}

## 使用仲裁队列

默认情况下，Dapr 创建 `classic` 队列。要创建 `quorum` 队列，请将以下元数据添加到 pub/sub 的[订阅]({{% ref subscription-schema.md %}})中

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: pubsub
spec:
  topic: checkout
  routes: 
    default: /orders
  pubsubname: order-pub-sub
  metadata:
    queueType: quorum
```

## 生存时间

您可以在消息级别或 component 级别设置生存时间（TTL）值。使用 component 的 `ttlInSeconds` 字段设置默认的 component 级 TTL。 

{{% alert title="注意" color="primary" %}}
如果同时设置了 component 级和消息级 TTL，则会忽略默认的 component 级 TTL，而使用消息级 TTL。
{{% /alert %}}

## 单一活跃消费者

RabbitMQ [单一活跃消费者](https://www.rabbitmq.com/docs/consumers#single-active-consumer)设置可确保同一时间只有一个消费者处理队列中的消息，并在活跃消费者被取消或失败时切换到另一个已注册的消费者。当消息必须严格按照其到达队列的顺序被消费，且不支持多实例分布式处理时，可能需要这种方式。
当 Dapr 在队列上启用此选项时，Dapr 运行时的一个实例将成为单一活跃消费者。为允许另一个应用程序实例在故障时接管，Dapr 运行时必须[探测应用程序的健康状况]({{% ref "app-health.md" %}})，并取消订阅 pub/sub component。

{{% alert title="注意" color="primary" %}}
此模式会阻止应用程序扩展，因为只有一个实例能够处理负载。虽然这对于将 Dapr 与遗留或敏感应用程序集成可能很有意义，但如果您需要可扩展性，应考虑允许分布式处理的设计。
{{% /alert %}}


```yml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: pubsub
spec:
  topic: orders
  routes:
    default: /orders
  pubsubname: order-pub-sub
  metadata:
    singleActiveConsumer: "true"
```

## 将消息属性发布到元数据

要启用将[消息属性](https://www.rabbitmq.com/docs/publishers#message-properties)发布到元数据中，请在 component 规格中将 `publishMessagePropertiesToMetadata` 字段设置为 `"true"`。
这将在已发布消息的元数据中包含消息 ID、时间戳和标头等属性。

## 相关链接

- 相关链接部分中的 [Dapr component 的基本架构]({{% ref component-schema %}})
- 阅读本[指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解配置 pub/sub component 的说明
- [pub/sub building block]({{% ref pubsub %}})
