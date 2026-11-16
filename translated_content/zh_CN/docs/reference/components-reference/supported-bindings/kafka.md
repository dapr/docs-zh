---
type: docs
title: "Kafka 绑定规范"
linkTitle: "Kafka"
description: "Kafka 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/kafka/"
---

## 组件格式

要设置 Kafka 绑定，请创建一个类型为 `bindings.kafka` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。有关使用 `secretKeyRef` 的详细信息，请参阅[如何在组件中引用机密]({{% ref component-secrets.md %}})指南。

所有组件元数据字段值都可以携带[模板化元数据值]({{% ref "component-schema.md#templated-metadata-values" %}})，这些值会在 Dapr 边车启动时解析。
例如，你可以选择使用 `{namespace}` 作为 `consumerGroup`，以便在不同的命名空间中使用相同的主题和相同的 `appId`，如[本文]({{% ref "howto-namespace.md#with-namespace-consumer-groups"%}})中所述。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-binding
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: topics # 可选。用于输入绑定。
    value: "topic1,topic2"
  - name: brokers # 必需。
    value: "localhost:9092,localhost:9093"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: publishTopic # 可选。用于输出绑定。
    value: "topic3"
  - name: authRequired # 必需。
    value: "true"
  - name: saslUsername # 当 authRequired 为 `true` 时必需。
    value: "user"
  - name: saslPassword # 当 authRequired 为 `true` 时必需。
    secretKeyRef:
      name: kafka-secrets
      key: "saslPasswordSecret"
  - name: saslMechanism
    value: "SHA-512"
  - name: initialOffset # 可选。用于输入绑定。
    value: "newest"
  - name: maxMessageBytes # 可选。
    value: "1024"
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: "2.0.0"
  - name: direction
    value: "input, output"
  - name: schemaRegistryURL # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry URL。
    value: http://localhost:8081
  - name: schemaRegistryAPIKey # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry API Key。
    value: XYAXXAZ
  - name: schemaRegistryAPISecret # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API Secret。
    value: "ABCDEFGMEADFF"
  - name: schemaCachingEnabled # 可选。使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。
    value: true
  - name: schemaLatestVersionCacheTTL # 可选。使用 Schema Registry Avro 序列化/反序列化时。使用可用最新 schema 发布消息时 schema 缓存的 TTL。
    value: 5m
  - name: escapeHeaders # 可选。
    value: false
```

## 规范元数据字段

| 字段 | 必需 | 绑定支持 | 详细说明 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `topics` | N | 输入 | 以逗号分隔的主题字符串。 | `"mytopic1,topic2"` |
| `brokers` | Y | 输入/输出 | 以逗号分隔的 Kafka broker 字符串。 | `"localhost:9092,dapr-kafka.myapp.svc.cluster.local:9093"` |
| `clientID`            | N | 输入/输出 | 随每个请求发送到 Kafka broker 的用户自定义字符串，用于日志记录、调试和审计。 | `"my-dapr-app"` |
| `consumerGroup` | N | 输入 | 用于监听的 Kafka 消费者组。发布到某个主题的每条记录，都会被投递给订阅该主题的每个消费者组中的一个消费者。 | `"group1"` |
| `consumeRetryEnabled` | N | 输入/输出 | 设为 `"true"` 以启用消费重试。在 Kafka 绑定组件中默认为 `false`。 | `"true"`, `"false"` |
| `publishTopic` | Y | 输出 | 要发布到的主题。 | `"mytopic"` |
| `authRequired` | N | *已弃用* | 启用与 Kafka broker 之间的 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 身份验证。 | `"true"`, `"false"` |
| `authType`            | Y | 输入/输出 | 配置或禁用身份验证。支持的值：`none`、`password`、`mtls`、`oidc` 或 `oidc_private_key_jwt` | `"password"`, `"none"` |
| `saslUsername` | N | 输入/输出 | 用于身份验证的 SASL 用户名。仅当 `authRequired` 设为 `"true"` 时需要。 | `"adminuser"` |
| `saslPassword` | N | 输入/输出 | 用于身份验证的 SASL 密码。可以是 `secretKeyRef`，以使用[机密引用]({{% ref component-secrets.md %}})。仅当 `authRequired` 设为 `"true"` 时需要。 | `""`, `"KeFg23!"` |
| `saslMechanism` | N | 输入/输出 | 要使用的 SASL 身份验证机制。仅当 `authtype` 设为 `"password"` 时需要。若未提供，则默认为 `PLAINTEXT`，这可能会导致某些服务（例如 Amazon Managed Service for Kafka）无法正常工作。 | `"SHA-512", "SHA-256", "PLAINTEXT"` |
| `initialOffset`   | N | 输入 | 若之前没有已提交的偏移量，则使用的初始偏移量。应为 "newest" 或 "oldest"。默认为 "newest"。 | `"oldest"` |
| `maxMessageBytes` | N | 输入/输出 | 单条 Kafka 消息允许的最大字节数。默认为 1024。 | `"2048"` |
| `oidcTokenEndpoint` | N | 输入/输出 | OAuth2 身份提供方访问令牌端点的完整 URL。当 `authType` 设为 `oidc` 或 `oidc_private_key_jwt` 时必需 | "https://identity.example.com/v1/token" |
| `oidcClientID` | N | 输入/输出 | 在身份提供方中预先配置的 OAuth2 客户端 ID。当 `authType` 设为 `oidc` 或 `oidc_private_key_jwt` 时必需 | `"dapr-kafka"` |
| `oidcClientSecret` | N | 输入/输出 | 在身份提供方中预先配置的 OAuth2 客户端密钥：当 `authType` 设为 `oidc` 时必需 | `"KeFg23!"` |
| `oidcScopes` | N | 输入/输出 | 请求访问令牌时使用的、以逗号分隔的 OAuth2/OIDC 范围列表。当 `authType` 设为 `oidc` 或 `oidc_private_key_jwt` 时推荐设置。默认为 `"openid"` | `"openid,kafka-prod"` |
| `oidcClientAssertionCert` | N | 输入/输出 | 用于身份验证的 OAuth2 客户端断言证书。当 `authType` 设为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"` |
| `oidcClientAssertionKey` | N | 输入/输出 | 用于身份验证的 OAuth2 客户端断言密钥。当 `authType` 设为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"` |
| `oidcResource` | N | 输入/输出 | 请求访问令牌时使用的 OAuth2 资源。当 `authType` 设为 `oidc_private_key_jwt` 时推荐设置。 | `"api://kafka"` |
| `oidcAudience` | N | 输入/输出 | 请求访问令牌时使用的 OAuth2 受众。当 `authType` 设为 `oidc_private_key_jwt` 时推荐设置。 | `"http://<idp-host>/realms/local"` |
| `oidcKid` | N | 输入/输出 | 请求访问令牌时使用的 OAuth2 密钥 ID（kid）。当 `authType` 设为 `oidc_private_key_jwt` 时推荐设置。 | `"1234567890"` |
| `version` | N | 输入/输出 | Kafka 集群版本。默认为 2.0.0。注意，对于 EventHubs with Kafka，此项必须设为 `1.0.0`。 | `"1.0.0"` |
| `direction` | N | 输入/输出 | 绑定的方向。 | `"input"`, `"output"`, `"input, output"` |
| `oidcExtensions` | N | 输入/输出 | 包含 JSON 编码字典的字符串，表示请求访问令牌时使用的 OAuth2/OIDC 扩展 | `{"cluster":"kafka","poolid":"kafkapool"}` |
| `schemaRegistryURL` | N | 使用 Schema Registry Avro 序列化/反序列化时必需。Schema Registry URL。 | `http://localhost:8081` |
| `schemaRegistryAPIKey` | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API Key。 | `XYAXXAZ` |
| `schemaRegistryAPISecret` | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API Secret。 | `ABCDEFGMEADFF` |
| `schemaCachingEnabled` | N | 使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。默认为 `true` | `true` |
| `schemaLatestVersionCacheTTL` | N | 使用 Schema Registry Avro 序列化/反序列化时。使用可用的最新 schema 发布消息时，schema 缓存的 TTL。默认为 5 分钟 | `5m` |
| `clientConnectionTopicMetadataRefreshInterval` | N | 输入/输出 | 客户端连接与 broker 之间刷新主题元数据的间隔，以 Go duration 表示。默认为 `9m`。 | `"4m"` |
| `clientConnectionKeepAliveInterval` | N | 输入/输出 | 客户端连接与 broker 保持存活的最长时间（以 Go duration 表示），超过后关闭连接。零值（默认）表示无限期保持连接。 | `"4m"` |
| `consumerFetchDefault` | N | 输入/输出 | 每次请求从 broker 获取的默认消息字节数。默认为 `"1048576"` 字节。 | `"2097152"` |
| `heartbeatInterval` | N | 输入 | 向消费者协调器发送心跳的间隔。该值至多应设为 `sessionTimeout` 值的 1/3。默认为 `"3s"`。 | `"5s"` |
| `sessionTimeout` | N | 输入 | 使用 Kafka 组管理功能时，用于检测客户端故障的超时时间。如果 broker 在此会话超时到期前没有收到消费者的任何心跳，该消费者会被移除，并触发重新平衡。默认为 `"10s"`。 | `"20s"` |
| `escapeHeaders` | N | 输入 | 启用对消费者接收的消息标头值进行 URL 转义。允许接收 HTTP 标头中通常不允许的特殊字符内容。默认为 `false`。 | `true` |
| `dialTimeout` | N | 输入/输出 | 等待与 broker 建立初始 TCP 连接的最长时间。它限制了在无法连接的集群上 `Init()` 的阻塞时长。默认为 `"30s"`。 | `"10s"` |
| `readTimeout` | N | 输入/输出 | 等待 broker 响应的最长时间。默认为 `"30s"`。 | `"10s"` |
| `writeTimeout` | N | 输入/输出 | 等待请求发送到 broker 的最长时间。默认为 `"30s"`。 | `"10s"` |
| `metadataTimeout` | N | 输入/输出 | 元数据刷新操作的单次请求超时。为 `"0"`（默认）时，Sarama 会根据 Net 超时与重试次数计算实际超时。 | `"5s"` |
| `producerRequiredAcks` | N | 输出 | 生产请求被视为成功前所需的 broker 确认数。可接受的值：`"all"`（所有同步副本，持久性最高）、`"local"`（仅分区 leader）、`"none"`（不需要确认）。默认为 `"all"`。 | `"local"` |
| `producerRetryMax` | N | 输出 | 放弃之前重试发送消息的最大次数。默认为 `5`。 | `3` |
| `producerTransactionsEnabled` | N | 输出 | 设为 `"true"` 时，每次发布都会包装在使用幂等生产者的 Kafka 事务中：中止的发布对使用 `read_committed` 读取的消费者永远不可见。需要 `producerRequiredAcks: "all"`、`producerRetryMax` >= 1 以及 Kafka 0.11 或更高版本。事务会使发布串行执行并增加 broker 往返，从而降低发布吞吐量。默认为 `"false"` | `"true"`, `"false"` |
| `transactionalIdPrefix` | N | 输出 | 当 `producerTransactionsEnabled` 为 `"true"` 时，生产者 `transactional.id` 的前缀。会追加每个实例各自随机的后缀，使扩容后的副本永远不会互相使对方的事务失效。默认依次取 `clientID`、`consumerGroup`，最后为 `"dapr"`。 | `"my-app"` |
| `transactionTimeout` | N | 输出 | 当 `producerTransactionsEnabled` 为 `"true"` 时，向 broker 请求的事务超时时间，以 Go duration 表示。不得超过 broker 的 `transaction.max.timeout.ms`（默认为 15 分钟）：broker 在生产者初始化时会拒绝更大的值；而该生产者是在组件初始化时构建的，因此组件会启动失败。默认为 `"60s"` | `"90s"` |
| `consumerIsolationLevel` | N | 输入 | 消费者的隔离级别。`"read_uncommitted"`（默认）会投递所有记录；`"read_committed"` 会隐藏属于未提交或已中止 Kafka 事务的记录，且需要 Kafka 0.11 或更高版本。 | `"read_committed"` |

#### 注意
使用 Azure EventHubs with Kafka 时，元数据 `version` 必须设为 `1.0.0`。

{{% alert title="消费者事务仅适用于 pubsub" color="info" %}}
Kafka 绑定不支持 `consumerTransactionsEnabled`，将其设为 `"true"` 会在初始化时失败。精确一次的"消费-转换-生产"要求交付的事务令牌通过同一个组件实例回传，而绑定模型（输入绑定与输出绑定是各自独立的实例）无法提供这一点。请改用 [Kafka 发布订阅组件]({{% ref setup-apache-kafka.md %}})。
{{% /alert %}}

## 绑定支持

此组件同时支持**输入和输出**绑定接口。

此组件支持以下操作的**输出绑定**：

- `create`

## 身份验证

Kafka 支持多种身份验证方案，Dapr 支持其中几种：SASL 密码、mTLS、OIDC/OAuth2。[了解 Kafka 绑定与 Kafka 发布订阅组件共用的 Kafka 身份验证方法]({{% ref "setup-apache-kafka.md#authentication" %}})。

## 指定分区键

调用 Kafka 绑定时，可以通过请求正文中的 `metadata` 部分提供可选的分区键。

字段名为 `partitionKey`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myKafka \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "partitionKey": "key1"
        },
        "operation": "create"
      }'
```

### 响应

成功时返回 HTTP 204（No Content）和空正文。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
