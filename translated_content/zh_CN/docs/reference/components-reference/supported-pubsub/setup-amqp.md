---
type: docs
title: "AMQP 1.0"
linkTitle: "AMQP 1.0"
description: "AMQP 1.0 pub/sub component 的详细文档，可与 Apache ActiveMQ Artemis 和 Solace PubSub+ 等 broker 配合使用"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-solace-amqp/"
  - "/zh-hans/reference/components-reference/supported-pubsub/setup-solace-amqp/"
---

该 component 使用 AMQP 1.0 协议。已在 [Apache ActiveMQ Artemis](https://activemq.apache.org/components/artemis/) 和 [Solace PubSub+](https://solace.com/products/event-broker/software/) 上验证。

{{% alert title="AMQP 1.0，而非 AMQP 0-9-1" color="primary" %}}
AMQP 1.0 和 AMQP 0-9-1 是不同的协议。对于 RabbitMQ，请改用 [RabbitMQ component]({{% ref setup-rabbitmq.md %}})，它使用 AMQP 0-9-1 协议。
{{% /alert %}}

## component 格式

要设置 AMQP pub/sub，请创建类型为 `pubsub.amqp` 的 component。请参阅 [pub/sub broker component 文件]({{% ref setup-pubsub.md %}})，了解 ConsumerID 是如何自动生成的。阅读 [如何：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建和应用 pub/sub 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: amqp-pubsub
spec:
  type: pubsub.amqp
  version: v1
  metadata:
    - name: url
      value: 'amqp://localhost:5672'
    - name: username
      value: 'default'
    - name: password
      value: 'default'
```

{{% alert title="警告" color="warning" %}}
上述示例将 secrets 以明文字符串的形式使用。建议按[此处]({{% ref component-secrets.md %}})所述，为 secrets 使用 secret store。
{{% /alert %}}

## 规格 metadata 字段

| 字段 | 必需 | 详细信息 | 示例 |
|--------------------|:--------:|---------|---------|
| url    | Y  | AMQP broker 的地址。可以是 `secretKeyRef`，以使用 secrets 引用。 <br> 非 TLS 通信请使用 **`amqp://`** URI 方案。 <br> TLS 通信请使用 **`amqps://`** URI 方案。 | `"amqp://host.domain[:port]"`
| username | N | 连接 broker 所用的用户名。除非 `anonymous` 为 `true`，否则为必填项。 | `default`
| password | N | 连接 broker 所用的密码。除非 `anonymous` 为 `true`，否则为必填项。 | `default`
| anonymous | N | 跳过 SASL 用户名/密码身份验证（SASL ANONYMOUS）。与 `clientCert` 和 `clientKey` 配合，在 `amqps://` 上即可仅通过客户端证书进行身份验证（双向 TLS）。broker 上必须允许此方式。 | `true`
| caCert | N | 用于验证服务器 TLS 证书的 PEM 格式证书颁发机构（CA）证书。仅当 broker 证书不是由公共信任的 CA 签发时才需要。需要 `amqps://` 方案。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert  | N | 用于双向 TLS 的 PEM 格式 TLS 客户端证书。必须与 `clientKey` 一起使用，并且需要 `amqps://` 方案。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | N | 用于双向 TLS 的 PEM 格式 TLS 客户端密钥。必须与 `clientCert` 一起使用，并且需要 `amqps://` 方案。可以是 `secretKeyRef`，以使用 secrets 引用。 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`
| topicAddressPrefix | N | 添加到 topic AMQP 地址前的前缀，用于不带前缀的 topic 名以及名为 `topic:<name>` 的 topic。默认无前缀，即按名称寻址 topic。参见[topic 与队列的寻址](#topic-与队列的寻址)。 | `multicast://`
| queueAddressPrefix | N | 添加到队列 AMQP 地址前的前缀，用于名为 `queue:<name>` 的 topic。默认无前缀，即按名称寻址队列。参见[topic 与队列的寻址](#topic-与队列的寻址)。 | `anycast://`
| containerID | N | 承载命名订阅的连接所使用的 AMQP 容器 ID。broker 通过容器 ID 和订阅名称来识别命名订阅。默认值为 Dapr 为每个 pub/sub component 分配的消费者 ID，即应用 ID；如果 component 设置了 `consumerID`，则使用该值（参见 [pub/sub broker component 文件]({{% ref setup-pubsub.md %}})）。因此，默认情况下，应用的所有副本共享同一个容器 ID。请勿将 `containerID` 或 `consumerID` 设置为按副本区分的值，例如 `{podName}` 或 `{uuid}` 的[标记]({{% ref component-schema.md %}})：否则每个副本都会获得各自的订阅，并各自收到每条消息的一份副本。参见[命名、持久与共享订阅](#命名持久与共享订阅)。 | `orders-service`
| durableMessages | N | 将每条已发布的消息标记为持久化，使 broker 在重启后仍保留该消息。除非显式指定，否则 AMQP 1.0 消息不是持久化的。默认值为 `false`。 | `true`
| applicationPropertiesFromMetadata | N | 将每个发布请求的 metadata 复制到消息中，以便 broker 端过滤器据此进行匹配。默认值为 `false`。参见[按消息属性过滤](#按消息属性过滤)。 | `true`
| backOffPolicy | N | broker 连接断开后，重新打开订阅时各次尝试之间使用的 retry policy。可选 `constant` 或 `exponential`。默认值为 `constant`。 | `"constant"`
| backOffDuration | N | 当 `backOffPolicy` 为 `constant` 时，重新打开订阅各次尝试之间的延迟。默认值为 `5s`。只要订阅存在，component 就会一直重试，因此该值设置的是重试节奏，而非上限。 | `1s`
| backOffInitialInterval | N | 当 `backOffPolicy` 为 `exponential` 时，首次尝试之间的延迟。默认值为 `500ms`。 | `100ms`
| backOffMaxInterval | N | 当 `backOffPolicy` 为 `exponential` 时，各次尝试之间的最长延迟。默认值为 `60s`。 | `30s`

### 使用 TLS 进行通信

要配置使用 TLS 的通信：

1. 确保 broker 已配置为支持证书。对于 ActiveMQ Artemis 的双向 TLS，请在 acceptor 上设置 `sslEnabled=true;needClientAuth=true`，以便拒绝没有可信证书的客户端。
1. 在 component 配置中提供 `caCert`、`clientCert` 和 `clientKey` metadata。

例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: amqp-pubsub
spec:
  type: pubsub.amqp
  version: v1
  metadata:
  - name: url
    value: "amqps://host.domain[:port]"
  - name: username
    value: 'default'
  - name: password
    value: 'default'
  - name: caCert
    value: ${{ myLoadedCACert }}
  - name: clientCert
    value: ${{ myLoadedClientCert }}
  - name: clientKey
    secretKeyRef:
      name: myAmqpClientKey
      key: myAmqpClientKey
auth:
  secretStore: <SECRET_STORE_NAME>
```

> 虽然 `caCert` 和 `clientCert` 的值可能并非 secrets，但为方便起见，也可以从 Dapr secret store 中引用它们。

要仅通过客户端证书进行身份验证（双向 TLS），请将 `anonymous` 设置为 `true`，并省略 `username` 和 `password`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: amqp-pubsub
spec:
  type: pubsub.amqp
  version: v1
  metadata:
  - name: url
    value: "amqps://host.domain[:port]"
  - name: anonymous
    value: "true"
  - name: caCert
    value: ${{ myLoadedCACert }}
  - name: clientCert
    value: ${{ myLoadedClientCert }}
  - name: clientKey
    secretKeyRef:
      name: myAmqpClientKey
      key: myAmqpClientKey
auth:
  secretStore: <SECRET_STORE_NAME>
```

在 Dapr 1.19 之前，`anonymous` 在 `amqps://` 上会被忽略，并且始终使用 SASL PLAIN。

## topic 与队列的寻址

该 component 会将 Dapr topic 名转换为 AMQP 地址。`topicAddressPrefix` 和 `queueAddressPrefix` 控制这一转换，二者默认均不添加前缀。因此，开箱即用时，AMQP 地址就是 Dapr topic 名本身，不作任何改变：

| Dapr topic 名 | 使用默认前缀时的 AMQP 地址 |
|-----------------|------------------------------------------|
| `orders` | `orders` |
| `topic:orders` | `orders` |
| `queue:orders` | `orders` |

{{% alert title="在配置前缀之前，`queue:` 不起作用" color="warning" %}}
Dapr topic 名可以带有 `queue:` 或 `topic:` 方案。该方案决定应用两个前缀中的哪一个，它本身并不能选择路由类型。

在未配置前缀的情况下，`queue:orders` 与 `orders` 会解析为同一地址，因此方案不产生任何效果，路由类型由 broker 为该地址解析得出。

要让 `queue:` 选择队列，请将两个前缀都设置为 broker 所使用的值。参见[使用 namespace 区分目标的 broker](#使用-namespace-区分目标的-broker)。
{{% /alert %}}

已以某个已配置前缀开头的 topic 名，将原样用作 AMQP 地址。

## 使用 namespace 区分目标的 broker

部分 broker 通过地址上的前缀来选择路由类型。请将 `topicAddressPrefix` 和 `queueAddressPrefix` 设置为该 broker 所使用的前缀，此后 `queue:` 和 `topic:` 方案即可选择路由类型。

### Apache ActiveMQ Artemis

Artemis 的 acceptor 接受 `anycastPrefix` 和 `multicastPrefix` 设置。如果 acceptor 配置为 `anycastPrefix=anycast://;multicastPrefix=multicast://`，请让 component 的配置与之保持一致。请使用 acceptor 中定义的任何前缀；`queue://` 和 `topic://` 也很常见：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: artemis
spec:
  type: pubsub.amqp
  version: v1
  metadata:
    - name: url
      value: 'amqp://localhost:5672'
    - name: username
      value: 'artemis'
    - name: password
      value: 'artemis'
    - name: topicAddressPrefix
      value: 'multicast://'
    - name: queueAddressPrefix
      value: 'anycast://'
```

此时，名为 `orders` 的 Dapr topic 将被寻址为 `multicast://orders`，而 `queue:orders` 则被寻址为 `anycast://orders`。

如果没有这些前缀，路由类型改由 broker 决定，即通过匹配地址设置中的 `default-address-routing-type` 决定。

#### 从 broker 管理的队列中消费

Artemis 接受完全限定的队列名 `<address>::<queue>`。订阅该名称即可从 `broker.xml` 中定义的队列消费，其持久性与过滤器均在该文件中配置：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: billing
spec:
  pubsubname: artemis
  topic: "orders::billing"
  routes:
    default: /billing
```

应用的每个副本都从同一队列消费，关闭订阅也绝不会删除该队列。请在应用启动前创建队列：Artemis 自动创建的队列会受 `auto-delete-queues` 约束。

此示例使用默认的地址前缀，即空前缀。如果设置了 `topicAddressPrefix`，component 会将其加在 topic 名之前，因此链路会建立在 `<prefix>orders::billing` 上。

### Solace PubSub+

Solace 以 `topic://<name>` 寻址 topic，以 `queue://<name>` 寻址队列：

```yaml
    - name: topicAddressPrefix
      value: 'topic://'
    - name: queueAddressPrefix
      value: 'queue://'
```

{{% alert title="与非 Dapr 客户端互通" color="primary" %}}
前缀会为地址划分 namespace。使用 `topic://orders` 的 Dapr 发布者，与订阅 `orders` 的非 Dapr 客户端位于两个不同的地址上，二者永远不会交换消息。请确保同一目标上的所有客户端都使用相同的地址。
{{% /alert %}}

## 命名、持久与共享订阅

{{% alert title="Dapr 1.19 或更高版本" color="primary" %}}
`subscriptionName`、`durable`、`shared` 和 `selector` 订阅键，以及 `containerID`、`durableMessages` 和 `applicationPropertiesFromMetadata` component 键，需要 Dapr 1.19 或更高版本。
{{% /alert %}}

默认情况下，每个订阅都使用 broker 的默认设置进行连接。在多播地址上，这通常是临时订阅：应用的每个副本都会获得每条消息各自的一份副本，并且应用停机期间发布的消息会丢失。

订阅可以在其自身的 metadata 中设置下列键。它们使用标准的 AMQP 1.0 机制，因此适用于任何支持持久订阅、`shared` 能力和 JMS 选择器过滤器的 broker。已在 ActiveMQ Artemis 上验证。关于 Artemis 如何应用这些键，请参见 [ActiveMQ Artemis 上的命名订阅](#activemq-artemis-上的命名订阅)；关于其他 broker，请参见[其他 broker](#其他-broker)。

| 字段 | 详细信息 | 示例 |
|-------|---------|---------|
| subscriptionName | 订阅名称，作为 AMQP 链路名发送。与 `containerID` 一起在 broker 上标识该订阅。`durable` 和 `shared` 需要此项。不得包含 `\|`，且在同一 component 的订阅之间必须唯一。不允许用于队列（`queue:<name>`），因为队列没有可命名的订阅。 | `billing`
| durable | 要求 broker 在没有消费者连接时保留该订阅及其持有的消息。component 发送的是永不过期的持久源。默认值为 `false`。 | `true`
| shared | 请求共享订阅，使用 `shared` 源能力。使用相同 `subscriptionName` 的每个副本共同消费同一订阅，使每条消息只被一个副本接收。默认值为 `false`。 | `true`
| selector | JMS 选择器，以 `apache.org:selector-filter:string` 过滤器的形式发送，由 broker 应用于该订阅。不匹配的消息永远不会进入该订阅。如果 broker 在附加时未包含该过滤器，订阅将失败。可以在不设置 `subscriptionName` 的情况下设置。 | `eventType = 'invoice'`
| allowSelectorChange | 允许 broker 在更改选择器时重新创建持久订阅，并丢弃其当前持有的消息。设置为 `false`（默认值）时，broker 拒绝重新创建订阅并返回错误。 | `true`

例如：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: billing
spec:
  pubsubname: artemis
  topic: orders
  routes:
    default: /billing
  metadata:
    subscriptionName: billing
    durable: "true"
    shared: "true"
    selector: "eventType = 'invoice'"
```

应用的每个副本都从名为 `billing` 的同一个持久订阅中消费，该订阅只保存与选择器匹配的消息。

无论使用哪种 broker，都请牢记以下几点：

- **副本。** 当应用有多个副本时，请设置 `shared`。对于非共享的持久订阅，broker 可能只允许一个消费者连接。
- **同一 topic 上的多个订阅。** 对于每个 pub/sub component 和 topic，Dapr 只保留一个声明式或 programmatic subscription。若要在同一 topic 上保存多个命名订阅，请为每个订阅定义一个 component，如[下面的示例](#同一-topic-上的多个订阅)所示，或使用 [streaming subscription]({{% ref "subscription-methods.md#streaming-subscriptions" %}})。
- **更改选择器。** broker 可能会将更改后的选择器视为新订阅，并丢弃旧订阅所持有的消息。在没有消费者连接时，此过程不会报错，也不会有任何报告。当有消费者连接时（例如在滚动升级期间），broker 会拒绝更改后的选择器并记录错误，除非设置了 `allowSelectorChange`；设置后，component 会持续重试，broker 则会在旧消费者断开后重新创建订阅。如果未设置 `allowSelectorChange` 且错误已被记录，则没有任何副本消费该订阅，并且使用新选择器重启会丢弃其中的消息。必须恢复原选择器才能继续消费。若要更改选择器，请更新 `subscriptionName`，并在旧订阅排空后将其删除。
- **删除订阅。** 即使从应用中移除了订阅，Dapr 也绝不会删除持久订阅。请在 broker 上将其删除。
- **broker 重启。** 持久订阅只保留持久化的消息。请在发布 component 上设置 `durableMessages`，或从其他客户端发布持久化消息。JMS 客户端默认发布持久化消息。
- **权限。** broker 用户需要具备创建持久订阅和从中消费的权限。使用 `anonymous: "true"` 时没有用户名：请将权限授予 broker 为该连接映射的角色，例如客户端证书所对应的角色。
- **连接。** 每个命名订阅都使用各自独立的连接，使容器 ID 保持不变，并且停止订阅时绝不会删除它。

### 同一 topic 上的多个订阅

Dapr 为每个 pub/sub component 和 topic 映射一个声明式或 programmatic subscription。因此，要在 topic `orders` 上设置两个各自带有选择器的命名订阅，需要在同一 broker 上配置两个 Dapr component：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: billing
spec:
  type: pubsub.amqp
  version: v1
  metadata:
    - name: url
      value: 'amqp://localhost:5672'
    - name: username
      value: 'artemis'
    - name: password
      value: 'artemis'
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: audit
spec:
  type: pubsub.amqp
  version: v1
  metadata:
    - name: url
      value: 'amqp://localhost:5672'
    - name: username
      value: 'artemis'
    - name: password
      value: 'artemis'
```

随后，每个 component 分别由一个订阅引用：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: billing
spec:
  pubsubname: billing
  topic: orders
  routes:
    default: /billing
  metadata:
    subscriptionName: billing
    durable: "true"
    shared: "true"
    selector: "eventType = 'invoice'"
---
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: audit
spec:
  pubsubname: audit
  topic: orders
  routes:
    default: /audit
  metadata:
    subscriptionName: audit
    durable: "true"
    shared: "true"
    selector: "eventType = 'login'"
```

两个 component 使用相同的容器 ID（默认为应用 ID），并通过订阅名称将两个订阅区分开。

### ActiveMQ Artemis 上的命名订阅

在 ActiveMQ Artemis 上，这些键的行为如下：

- **队列名称。** Artemis 将命名订阅的队列命名为 `<containerID>.<subscriptionName>`。例如，应用 ID 为 `orders-service` 时，上文的 `billing` 订阅即为地址 `orders` 上的持久队列 `orders-service.billing`，并以选择器作为其过滤器。
- **不设置这些键时。** 每个订阅都会获得一个名称自动生成的临时队列，订阅断开时 Artemis 会将其删除。
- **副本。** 非共享的持久队列只接受一个消费者，Artemis 会拒绝其他消费者。
- **更改选择器。** 每当消费者连接时，Artemis 都会比较选择器。如果选择器已更改且没有消费者连接，Artemis 会重新创建队列并丢弃其中的消息，且不作任何报告。如果有消费者连接，Artemis 会以 `Unable to recreate subscription, consumers already exist` 拒绝新的消费者；除非设置了 `allowSelectorChange`，否则订阅会以错误结束。拒绝之后，没有任何副本消费该队列，并且使用新选择器重启会丢弃其中的消息。请撤销选择器的更改，或使用新的 `subscriptionName` 以继续消费。
- **删除订阅。** 例如在 Artemis 控制台中删除该队列。
- **选择器。** 选择器按名称读取应用属性，将 AMQP 的 subject 作为 `JMSType`，并读取 `AMQPriority` 和 `AMQDurable` 等头字段。在这些选择器中，Artemis 不会转换 `JMSPriority` 等 JMS 头名称。Dapr 复制的应用属性都是字符串，因此若要将其与数字进行比较，请在选择器前加上 `convert_string_expressions:` 前缀，例如 `convert_string_expressions:priority > 5`。
- **权限。** 该角色需要对该地址具有 `createDurableQueue` 和 `consume` 权限。

若要改为从 Artemis 管理的队列中消费，请参见[从 broker 管理的队列中消费](#从-broker-管理的队列中消费)。

### 其他 broker

这些键尚未在其他 broker 上验证，包括 Solace PubSub+。不支持 `shared` 能力的 broker 可能会拒绝第二个副本，或者为其提供每条消息的一份副本。如果 broker 忽略选择器过滤器，component 会使该订阅失败，因为 broker 没有返回该过滤器。

## 按消息属性过滤

broker 端过滤器（例如选择器）会根据消息属性进行匹配。默认情况下，Dapr 发布的消息不携带应用属性。在发布 component 上将 `applicationPropertiesFromMetadata` 设置为 `true`，即可将每个发布请求的 metadata 复制到消息中：

- `subject` 键设置 AMQP subject。
- 其他每个键都会成为一个值为字符串的应用属性。
- `ttlInSeconds`、`rawPayload` 和 `cloudevent.*` 键不会被复制。

这些都是标准的 AMQP 1.0 消息属性，因此任何 broker 或客户端都可以读取。选择器语法取决于 broker。关于 ActiveMQ Artemis，请参见 [ActiveMQ Artemis 上的命名订阅](#activemq-artemis-上的命名订阅)。

该映射只朝一个方向工作：component 不会将收到的消息的应用属性传递给应用。

例如，以下发布请求会到达上文的 `billing` 订阅：

```bash
curl -X POST "http://localhost:3500/v1.0/publish/artemis/orders?metadata.eventType=invoice" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "100"}'
```

## 订阅者返回错误时

handler 返回错误的消息，会以 `modified` 状态及 `delivery-failed` 返回给 broker。broker 会重新传递该消息并计入此次尝试，因此 broker 自身的 `redelivery-delay` 和 `max-delivery-attempts` 设置会生效，始终失败的消息最终会到达死信地址。

重新传递的节奏和尝试次数上限是 broker 设置，而非 component 设置。在 ActiveMQ Artemis 中，它们位于 `address-settings` 中；请确保在该处配置了死信地址和 `max-delivery-attempts`。

## 从 `pubsub.solace.amqp` 迁移

{{% alert title="兼容性名称" color="primary" %}}
`pubsub.solace.amqp` 是此 component 的早期名称。该名称仍保持注册，现有的该类型 component 继续使用其 `topic://` 和 `queue://` 默认值。新建 component 请使用 `pubsub.amqp`。
{{% /alert %}}

`pubsub.amqp` 默认不应用任何地址前缀，而 `pubsub.solace.amqp` 则应用 Solace 约定。若要迁移 Solace component 且不改变其使用的地址，请更改类型，并显式设置两个前缀：

```yaml
spec:
  type: pubsub.amqp          # 原为 pubsub.solace.amqp
  version: v1
  metadata:
    - name: topicAddressPrefix
      value: 'topic://'
    - name: queueAddressPrefix
      value: 'queue://'
```

component 中的其他内容保持不变。

## 创建 broker

{{< tabpane text=true >}}

{{% tab "ActiveMQ Artemis" %}}
使用 Docker [在本地运行 Artemis broker](https://hub.docker.com/r/apache/activemq-artemis)：

```bash
docker run -d -p 5672:5672 -p 8161:8161 --env ARTEMIS_USER=artemis --env ARTEMIS_PASSWORD=artemis --name artemis apache/activemq-artemis:latest
```

AMQP acceptor 监听 `amqp://localhost:5672`，Web 控制台位于 `http://localhost:8161`。
{{% /tab %}}

{{% tab "Solace，自托管" %}}
使用 Docker [在本地运行 Solace broker](https://hub.docker.com/r/solace/solace-pubsub-standard)：

```bash
docker run -d -p 8080:8080 -p 55554:55555 -p 8008:8008 -p 1883:1883 -p 8000:8000 -p 5672:5672 -p 9000:9000 -p 2222:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard
```

随后，你可以通过客户端端口 `amqp://localhost:5672` 与服务器交互。
{{% /tab %}}

{{% tab "Solace，SaaS" %}}
你也可以在 [Solace Cloud](https://console.solace.cloud/login/new-account?product=event-streaming) 上注册免费的 SaaS broker。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr component 的基本结构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解如何配置 pub/sub component
- [pub/sub building block]({{% ref pubsub %}})
