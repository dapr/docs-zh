---
type: docs
title: "Apache Kafka"
linkTitle: "Apache Kafka"
description: "Apache Kafka 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-apache-kafka/"
---

## 组件格式

要设置 Apache Kafka 发布订阅，请创建类型为 `pubsub.kafka` 的组件。请参阅[发布订阅 broker 组件文件]({{% ref setup-pubsub.md %}})，了解 ConsumerID 是如何自动生成的。请阅读[操作指南：发布与订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建并应用发布订阅配置。

所有组件元数据字段值都可以携带[模板化元数据值]({{% ref "component-schema.md#templated-metadata-values" %}})，这些值会在 Dapr 边车启动时解析。
例如，你可以选择使用 `{namespace}` 作为 `consumerGroup`，以便在不同的命名空间中使用相同的 `appId` 和相同的主题，具体见[本文]({{% ref "howto-namespace.md#with-namespace-consumer-groups"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "{namespace}"
  - name: consumerID # 可选。如果未提供，运行时将自动创建一个。
    value: "channel1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "password"
  - name: saslUsername # 如果 authType 为 `password`，则必需。
    value: "adminuser"
  - name: saslPassword # 如果 authType 为 `password`，则必需。
    secretKeyRef:
      name: kafka-secrets
      key: saslPasswordSecret
  - name: saslMechanism
    value: "SHA-512"
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 2.0.0
  - name: disableTls # 可选。禁用 TLS。这对生产环境不安全！！请阅读 `Mutual TLS` 部分，了解如何使用 TLS。
    value: "true"
  - name: consumerFetchMin # 可选。高级设置。单个请求中获取的最小消息字节数——broker 会等待，直到至少有这么多字节可用。
    value: 1
  - name: consumerFetchDefault # 可选。高级设置。每个请求从 broker 获取的默认消息字节数。
    value: 2097152
  - name: channelBufferSize # 可选。高级设置。内部和外部通道中缓冲的事件数量。
    value: 512
  - name: consumerGroupRebalanceStrategy # 可选。高级设置。用于消费者组重新平衡的策略。
    value: sticky
  - name: schemaRegistryURL # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 的 URL。
    value: http://localhost:8081
  - name: schemaRegistryAPIKey # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry API 密钥。
    value: XYAXXAZ
  - name: schemaRegistryAPISecret # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Secret。
    value: "ABCDEFGMEADFF"
  - name: schemaCachingEnabled # 可选。使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。
    value: true
  - name: schemaLatestVersionCacheTTL # 可选。使用 Schema Registry Avro 序列化/反序列化时。使用最新可用 schema 发布消息时，schema 缓存的 TTL。
    value: 5m
  - name: useAvroJson # 可选。启用 Avro JSON schema 进行序列化，而非默认的 Standard JSON。仅在订阅使用 valueSchemaType=Avro 时适用。
    value: "true"
  - name: escapeHeaders # 可选。
    value: false

```

> 有关使用 `secretKeyRef` 的详细信息，请参阅[如何在组件中引用机密]({{% ref component-secrets.md %}})指南。

## 规格元数据字段

| 字段              | 必需 | 详细信息 | 示例 |
|--------------------|:--------:|---------|---------|
| brokers             | Y | 以逗号分隔的 Kafka brokers 列表。 | `"localhost:9092,dapr-kafka.myapp.svc.cluster.local:9093"`
| consumerGroup       | N | 要监听的 Kafka 消费者组。发布到主题的每条记录都会被传递给订阅该主题的每个消费者组中的一个消费者。如果提供了 `consumerGroup` 的值，则会忽略 `consumerID` 的任何值——取而代之的是，为 `consumerID` 设置消费者组与随机唯一标识符的组合。 | `"group1"`
| consumerID       | N | 消费者 ID（消费者标签）将一个或多个消费者组织成一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，消息只会被组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用 ID（`appID`）的值。如果提供了 `consumerGroup` 的值，则会忽略 `consumerID` 的任何值——取而代之的是，为 `consumerID` 设置消费者组与随机唯一标识符的组合。  | 可以设置为字符串值（如上例中的 `"channel1"`）或字符串格式的值（如 `"{podName}"` 等）。[查看组件元数据中可用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| clientID            | N | 用户提供的字符串，随每个请求发送到 Kafka brokers，用于日志记录、调试和审计。默认值：Kubernetes 模式下为 `"namespace.appID"`，自托管模式下为 `"appID"`。 | `"my-namespace.my-dapr-app"`, `"my-dapr-app"`
| authRequired        | N | *已弃用* 通过 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 与 Kafka brokers 启用身份验证。 | `"true"`, `"false"`
| authType            | Y | 配置或禁用身份验证。支持的值：`none`、`password`、`mtls`、`oidc`、`oidc_private_key_jwt` 或 `awsiam` | `"password"`, `"none"`
| saslUsername        | N | 用于身份验证的 SASL 用户名。仅当 `authType` 设置为 `"password"` 时才需要。 | `"adminuser"`
| saslPassword        | N | 用于身份验证的 SASL 密码。可以是 `secretKeyRef`，以使用[机密引用]({{% ref component-secrets.md %}})。仅当 `authType 设置为 `"password"`. | `""`, `"KeFg23!"`
| saslMechanism      | N | 你希望使用的 SASL 身份验证机制。仅当 `authType` 设置为 `"password"` 时才需要。默认为 `PLAINTEXT` | `"SHA-512", "SHA-256", "PLAINTEXT"`
| initialOffset       | N | 如果之前未提交偏移量，则使用的初始偏移量。应为 "newest" 或 "oldest"。默认为 "newest"。 | `"oldest"`
| maxMessageBytes     | N | 单个 Kafka 消息允许的最大字节数。默认为 1024。 | `2048`
| consumeRetryInterval | N | 尝试消费主题时的重试间隔。没有后缀的数字视为毫秒。默认为 100ms。 | `200ms` |
| consumeRetryEnabled | N | 通过设置 `"false"` 禁用消费重试 | `"true"`, `"false"` |

{{% alert title="注意" color="primary" %}}
从 Dapr 1.19 开始，当消息的重试策略耗尽时（订阅者持续返回可重试错误，直到约束它的[弹性策略]({{% ref "resiliency-overview.md" %}})放弃该消息），组件会提交该消息的偏移量并继续前进，同时记录一条警告。在 1.19 之前，偏移量不会被提交，因此同一条消息会被无限次重新投递，分区无法越过它继续处理。
{{% /alert %}}
| version               | N | Kafka 集群版本。默认为 2.0.0。请注意，如果你使用的是 Azure EventHubs with Kafka，则必须将其设置为 `1.0.0`。 | `0.10.2.0` |
| caCert | N | 证书颁发机构证书，使用 TLS 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert | N | 客户端证书，`authType` 为 `mtls` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | N | 客户端密钥，`authType` 为 `mtls` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`
| skipVerify | N | 跳过 TLS 验证，不建议在生产环境中使用。默认为 `"false"` | `"true"`, `"false"` |
| disableTls | N | 禁用传输安全性的 TLS。要禁用，需要将值设置为 `"true"`。不建议在生产环境中使用。默认为 `"false"`。 | `"true"`, `"false"` |
| oidcTokenEndpoint | N | OAuth2 身份提供方访问令牌端点的完整 URL。当 `authType` 设置为 `oidc` 时必需 | "https://identity.example.com/v1/token" |
| oidcClientID | N | 在身份提供方中配置的 OAuth2 客户端 ID。当 `authType` 设置为 `oidc` 时必需 | `dapr-kafka` |
| oidcClientSecret | N | 在身份提供方中配置的 OAuth2 客户端密钥：当 `authType` 设置为 `oidc` 时必需 | `"KeFg23!"` |
| oidcScopes | N | 使用访问令牌请求的 OAuth2/OIDC 范围列表，以逗号分隔。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时建议使用。默认为 `"openid"` | `"openid,kafka-prod"` |
| oidcClientAssertionCert | N | 用于身份验证的 OAuth2 客户端断言证书。当 `authType` 设置为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"` |
| oidcClientAssertionKey | N | 用于身份验证的 OAuth2 客户端断言密钥。当 `authType` 设置为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef`，以使用机密引用 | `"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"` |
| oidcResource | N | 使用访问令牌请求的 OAuth2 资源。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"api://kafka"` |
| oidcAudience | N | 使用访问令牌请求的 OAuth2 受众。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"http://<idp-host>/realms/local"` |
| oidcKid | N | 使用访问令牌请求的 OAuth2 密钥 ID（kid）。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"1234567890"` |
| oidcExtensions | N | 包含使用访问令牌请求的 OAuth2/OIDC 扩展的 JSON 编码字典的字符串 | `{"cluster":"kafka","poolid":"kafkapool"}` |
| awsRegion | N | 此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'region'。部署 Kafka 集群的 AWS 区域。当 `authType` 设置为 `awsiam` 时必需 | `us-west-1` |
| awsAccessKey | N  |  此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥。 | `"accessKey"`
| awsSecretKey | N  | 此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'secretKey'。与访问密钥关联的密钥。 | `"secretKey"`
| awsSessionToken | N  | 此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅当你使用临时安全凭证时才需要会话令牌。 | `"sessionToken"`
| awsIamRoleArn | N  | 此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'assumeRoleArn'。有权访问 AWS Managed Streaming for Apache Kafka (MSK) 的 IAM 角色。这是除 AWS 凭证之外，另一种对 MSK 进行身份验证的方式。 | `"arn:aws:iam::123456789:role/mskRole"`
| awsStsSessionName | N  | 此字段为兼容现有字段而保留。将在 Dapr 1.17 起弃用。请改用 'sessionName'。表示承担角色时的会话名称。 | `"DaprDefaultSession"`
| schemaRegistryURL | N | 使用 Schema Registry Avro 序列化/反序列化时必需。Schema Registry 的 URL。 | `http://localhost:8081` |
| schemaRegistryAPIKey | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Key。 | `XYAXXAZ` |
| schemaRegistryAPISecret | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Secret。 | `ABCDEFGMEADFF` |
| schemaCachingEnabled | N | 使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。默认为 `true` | `true` |
| schemaLatestVersionCacheTTL | N | 使用 Schema Registry Avro 序列化/反序列化时。使用最新可用 schema 发布消息时，schema 缓存的 TTL。默认为 5 分钟 | `5m` |
| useAvroJson | N | 启用 Avro JSON schema 进行序列化，而非默认的 Standard JSON。仅在订阅使用 valueSchemaType=Avro 时适用。默认为 `"false"` | `"true"` |
| clientConnectionTopicMetadataRefreshInterval | N | 客户端连接的主题元数据与 broker 刷新的间隔，以 Go 时长格式表示。默认为 `9m`。 | `"4m"` |
| clientConnectionKeepAliveInterval | N | 客户端连接与 broker 保持活动的最长时间（以 Go 时长格式表示），超时后关闭连接。零值（默认）表示无限期保持活动。 | `"4m"` |
| consumerFetchMin | N | 单个请求中获取的最小消息字节数——broker 会等待，直到至少有这么多字节可用。默认为 `1`，因为 `0` 会导致在没有可用消息时消费者空转。等同于 JVM 的 `fetch.min.bytes`。 | `"2"` |
| consumerFetchDefault | N | 每个请求从 broker 获取的默认消息字节数。默认为 `"1048576"` 字节。 | `"2097152"` |
| channelBufferSize | N | 在内部和外部通道中缓冲的事件数量。这使生产者和消费者能够在用户代码运行时于后台继续处理部分消息，从而大幅提高吞吐量。默认为 `256`。 | `"512"` |
| heartbeatInterval | N | 向消费者协调器发送心跳的间隔。该值最多应设置为 `sessionTimeout` 值的 1/3。默认为 "3s"。 | `"5s"` |
| sessionTimeout | N | 使用 Kafka 的组管理功能时，用于检测客户端故障的超时时间。如果在该会话超时到期前，broker 没有收到消费者的任何心跳，则会移除该消费者并触发重新平衡。默认为 "10s"。 | `"20s"` |
| consumerGroupRebalanceStrategy | N | 用于消费者组重新平衡的策略。支持的值：`range`、`sticky`、`roundrobin`。默认为 `range` | `"sticky"` |
| escapeHeaders | N | 启用对消费者接收的消息头值进行 URL 转义。允许接收通常不允许出现在 HTTP 头中的特殊字符内容。默认为 `false`。 | `true` |
| excludeHeaderMetaRegex | N | 一个正则表达式，用于在消费消息时，将某些键排除在从消息头转换为元数据的范围之外，并在发布消息时排除从元数据转换为消息头的情况。此功能可避免对主题消费者产生意外的下游副作用。 | '"^valueSchemaType$"`
| dialTimeout | N | 等待与 broker 建立初始 TCP 连接的最长时间。限制在不可达的集群上 `Init()` 的阻塞时长。默认为 `"30s"`（与 Sarama 内置默认值一致）。 | `"10s"` |
| readTimeout | N | 发送请求后，等待 broker 响应的最长时间。默认为 `"30s"`. | `"10s"` |
| writeTimeout | N | 等待请求成功传输到 broker 的最长时间。默认为 `"30s"`. | `"10s"` |
| metadataTimeout | N | 元数据刷新操作的单次请求超时时间。当为 `"0"`（默认）时，Sarama 会根据 Net 超时和重试次数计算有效超时时间。 | `"5s"` |
| producerRequiredAcks | N | broker 在认为生产请求成功之前所需的确认数。可接受的值：`"all"`（所有同步副本，持久性最高）、`"local"`（仅分区 leader）、`"none"`（不确认）。默认为 `"all"`. | `"local"` |
| producerRetryMax | N | 放弃前重试发送消息的最大次数。默认为 `5`. | `3` |
| producerTransactionsEnabled | N | 设置为 `"true"` 时，每次发布（单条或批量）都会包装在幂等生产者上的[Kafka 事务](#kafka-事务与精确一次处理)中：被中止的发布对使用 `read_committed` 的消费者不可见，批量发布具有原子性（所有条目要么全部提交，要么全部不提交）。要求 `producerRequiredAcks: "all"`, `producerRetryMax` >= 1 且 Kafka 0.11 或更高版本。事务会串行化发布操作并增加 broker 往返次数，从而降低发布吞吐量。默认为 `"false"` | `"true"`, `"false"` |
| consumerTransactionsEnabled | N | 设置为 `"true"`，每次投递都会在 Kafka 事务（[精确一次消费-转换-生产](#精确一次消费-转换-生产)）中处理：处理程序发出的、携带该投递事务令牌的发布会加入该事务，消费者偏移量会在处理程序成功时与之原子性地一起提交。会强制 `consumerIsolationLevel: "read_committed"`。需要消费者组（`consumerGroup`，或由 Dapr 为你设置的 `consumerID`）以及 `producerRequiredAcks: "all"`, `producerRetryMax` >= 1，且需要 Kafka 2.5 或更高版本（请相应设置 `version`）。默认为 `"false"` | `"true"`, `"false"` |
| transactionalIdPrefix | N | 启用事务时，该组件向 broker 注册的 `transactional.id` 值的前缀。对于发布生产者，默认为 `clientID`，然后是 `consumerGroup`，再然后是 `"dapr"`；对于消费者事务，默认为 `clientID`，然后是 `"dapr"`，并且必须在消费应用的每个副本上解析为相同的值。参见[扩缩容与隔离](#扩缩容僵尸隔离与-transactionalidprefix)。 | `"my-app"` |
| consumerIsolationLevel | N | 消费者的隔离级别。`"read_uncommitted"`（默认）会投递所有记录；`"read_committed"` 会隐藏属于未结束或已中止 Kafka 事务的记录，并且需要 Kafka 0.11 或更高版本。当 `consumerTransactionsEnabled` 为 `"true"` 时，级别必须为 `"read_committed"`：保持此字段未设置会自动选择该级别，而显式设置为 `"read_uncommitted"` 会导致验证失败。 | `"read_committed"` |
| transactionTimeout | N | 启用事务时，向 broker 请求的事务超时时间，以 Go 时长格式表示。启用 `consumerTransactionsEnabled` 时，事务会在整个处理程序调用期间保持打开，因此该值必须大于最慢的预期处理程序耗时。不得超过 broker 的 `transaction.max.timeout.ms`（默认为 15 分钟）：当生产者初始化时，broker 会拒绝更大的值。启用 `producerTransactionsEnabled` 时，该生产者会在组件初始化期间创建，因此组件将无法启动；仅启用 `consumerTransactionsEnabled` 时，每个分区的生产者会在首次使用时创建，因此每次投递都会失败，而不携带事务令牌的发布仍可正常工作。默认为 `"60s"` | `"90s"` |

上面的 `secretKeyRef` 引用了 [Kubernetes 机密存储]({{% ref kubernetes-secret-store.md %}})来访问 TLS 信息。访问[此处]({{% ref setup-secret-store.md %}})，了解如何配置机密存储组件。

#### 注意
使用 Azure EventHubs with Kafka 时，元数据 `version` 必须设置为 `1.0.0`。

### 身份验证

Kafka 支持多种身份验证方案，Dapr 支持其中几种：SASL 密码、mTLS、OIDC/OAuth2。随着新增的身份验证方法，`authRequired` 字段已从 v1.6 版本起弃用，应改用 `authType` 字段。如果将 `authRequired` 设置为 `true`，Dapr 将尝试根据 `saslPassword` 的值正确配置 `authType`。`authType` 的有效值为：
- `none`
- `password`
- `certificate`
- `mtls`
- `oidc`
- `oidc_private_key_jwt`
- `awsiam`

{{% alert title="注意" color="primary" %}}
`authType` 仅用于_身份验证_。_授权_仍在 Kafka 中配置，但 `awsiam` 除外，它还可以驱动在 AWS IAM 中配置的授权决策。
{{% /alert %}}

#### 无身份验证

将 `authType` 设置为 `none` 将禁用任何身份验证。这在生产环境中**不**推荐。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-noauth
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "none"
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
  - name: disableTls
    value: "true"
```

#### SASL 密码

将 `authType` 设置为 `password` 可启用 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 身份验证。这需要设置 `saslUsername` 和 `saslPassword` 字段。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-sasl
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "password"
  - name: saslUsername # 如果 authType 为 `password`，则必需。
    value: "adminuser"
  - name: saslPassword # 如果 authType 为 `password`，则必需。
    secretKeyRef:
      name: kafka-secrets
      key: saslPasswordSecret
  - name: saslMechanism
    value: "SHA-512"
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
  - name: caCert
    secretKeyRef:
      name: kafka-tls
      key: caCert
```

#### 双向 TLS

将 `authType` 设置为 `mtls` 时，将使用 x509 客户端证书（`clientCert` 字段）和密钥（`clientKey` 字段）进行身份验证。请注意，作为身份验证机制的 mTLS 与通过加密使用 TLS 保护传输层是不同的。mTLS 需要 TLS 传输（即 `disableTls` 必须为 `false`），但保护传输层并不要求使用 mTLS。有关配置底层 TLS 传输的信息，请参阅[使用 TLS 通信](#使用-tls-通信)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-mtls
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "mtls"
  - name: caCert
    secretKeyRef:
      name: kafka-tls
      key: caCert
  - name: clientCert
    secretKeyRef:
      name: kafka-tls
      key: clientCert
  - name: clientKey
    secretKeyRef:
      name: kafka-tls
      key: clientKey
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
```

#### OAuth2 或 OpenID Connect

将 `authType` 设置为 `oidc` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供方指定 Bearer 令牌。目前仅支持 **client_credentials** 授权类型。

将 `oidcTokenEndpoint` 配置为身份提供方访问令牌端点的完整 URL。

将 `oidcClientID` 和 `oidcClientSecret` 设置为在身份提供方中配置的客户端凭据。

如果在组件配置中指定了 `caCert`，则该证书会追加到系统 CA 信任列表中，用于验证身份提供方的证书。同样，如果在组件配置中指定了 `skipVerify`，则在访问身份提供方时也会跳过验证。

默认情况下，为令牌请求的唯一范围是 `openid`；**强烈**建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka broker 进行验证。如果不使用其他范围来缩小访问令牌的有效期，被攻破的 Kafka broker 可能会重放该令牌，以 Dapr clientID 的身份访问其他服务。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "oidc"
  - name: oidcTokenEndpoint # 如果 authType 为 `oidc`，则必需。
    value: "https://identity.example.com/v1/token"
  - name: oidcClientID      # 如果 authType 为 `oidc`，则必需。
    value: "dapr-myapp"
  - name: oidcClientSecret  # 如果 authType 为 `oidc`，则必需。
    secretKeyRef:
      name: kafka-secrets
      key: oidcClientSecret
  - name: oidcScopes        # 如果 authType 为 `oidc`，则建议使用。
    value: "openid,kafka-dev"
  - name: caCert            # 同时应用于验证 OIDC 提供方证书
    secretKeyRef:
      name: kafka-tls
      key: caCert
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
```

#### OAuth2 私钥 JWT

将 `authType` 设置为 `oidc_private_key_jwt` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供方指定私钥 JWT。目前仅支持 **client_credentials** 授权类型。

将 `oidcTokenEndpoint` 配置为身份提供方访问令牌端点的完整 URL。

将 `oidcClientID` 设置为客户端 ID，将 `oidcClientAssertionCert` 设置为客户端断言证书，将 `oidcClientAssertionKey` 设置为在身份提供方中配置的客户端断言密钥。

如果在组件配置中指定了 `caCert`，则该证书会追加到系统 CA 信任列表中，用于验证身份提供方的证书。同样，如果在组件配置中指定了 `skipVerify`，则在访问身份提供方时也会跳过验证。

默认情况下，为令牌请求的唯一范围是 `openid`；**强烈**建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka broker 进行验证。如果不使用其他范围来缩小访问令牌的有效期，被攻破的 Kafka broker 可能会重放该令牌，以 Dapr clientID 的身份访问其他服务。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "oidc_private_key_jwt"
  - name: oidcTokenEndpoint # 如果 authType 为 `oidc_private_key_jwt`，则必需。
    value: "https://identity.example.com/v1/token"
  - name: oidcClientID      # 如果 authType 为 `oidc_private_key_jwt`，则必需。
    value: "dapr-myapp"
  - name: oidcClientAssertionCert # 如果 authType 为 `oidc_private_key_jwt`，则必需。
    secretKeyRef:
      name: kafka-tls
      key: oidcClientAssertionCert
  - name: oidcClientAssertionKey # 如果 authType 为 `oidc_private_key_jwt`，则必需。
    secretKeyRef:
      name: kafka-tls
      key: oidcClientAssertionKey
  - name: oidcScopes        # 如果 authType 为 `oidc_private_key_jwt`，则建议使用。
    value: "openid,kafka-dev"
  - name: oidcResource # 可选。
    value: "api://kafka"
  - name: oidcAudience # 可选。
    value: "http://<idp-host>/realms/local"
  - name: oidcKid # 可选。
    value: "1234567890"
  - name: caCert # 可选。
    secretKeyRef:
      name: kafka-tls
      key: caCert
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
```

#### AWS IAM

MSK 支持使用 AWS IAM 进行身份验证。将 `authType` 设置为 `awsiam` 时，将使用 AWS SDK 生成身份验证令牌。
{{% alert title="注意" color="primary" %}}
唯一必需的元数据字段是 `region`。如果未提供 `acessKey` 和 `secretKey`，则可以使用适用于服务账号的 AWS IAM 角色，对 Kafka 集群进行免密码身份验证。
{{% /alert %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-awsiam
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "awsiam"
  - name: region # 必需。
    value: "us-west-1"
  - name: accessKey # 可选。
    value: <AWS_ACCESS_KEY>
  - name: secretKey # 可选。
    value: <AWS_SECRET_KEY>
  - name: sessionToken # 可选。
    value: <AWS_SESSION_KEY>
  - name: assumeRoleArn # 可选。
    value: "arn:aws:iam::123456789:role/mskRole"
  - name: sessionName # 可选。
    value: "DaprDefaultSession"
```

### 使用 TLS 通信

默认情况下，会启用 TLS 来保护与 Kafka 之间的传输层。要禁用 TLS，请将 `disableTls` 设置为 `true`。启用 TLS 后，你可以使用 `skipVerify` 控制服务器证书验证（在生产环境中**不**推荐禁用验证），并使用 `caCert` 指定受信任的 TLS 证书颁发机构（CA）。如果未指定 `caCert`，将使用系统 CA 信任。要同时配置 mTLS 身份验证，请参阅 _身份验证_ 下的相应部分。以下示例展示了配置为使用传输层 TLS 的 Kafka 发布订阅组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "certificate"
  - name: consumeRetryInterval # 可选。
    value: 200ms
  - name: heartbeatInterval # 可选。
    value: 5s
  - name: sessionTimeout # 可选。
    value: 15s
  - name: version # 可选。
    value: 0.10.2.0
  - name: maxMessageBytes # 可选。
    value: 1024
  - name: caCert # 证书颁发机构证书。
    secretKeyRef:
      name: kafka-tls
      key: caCert
auth:
  secretStore: <SECRET_STORE_NAME>
```

## 从多个主题消费

使用单个发布订阅组件从多个主题消费时，无法保证消费者组中的消费者在各主题分区之间如何均衡分配。

例如，假设你订阅了两个主题，每个主题有 10 个分区，并且有 20 个服务副本从这两个主题消费。无法保证其中 10 个会分配给第一个主题、10 个分配给第二个主题。相反，分区可能被不均匀地划分，第一个主题可能分配到 10 个以上，其余分配给第二个主题。

这可能导致监听第一个主题的消费者处于空闲状态，而第二个主题的消费者负载过重，反之亦然。在使用 HPA 或 KEDA 等自动伸缩器时，也会出现同样的行为。

如果遇到此问题，建议为每个主题分别配置一个发布订阅组件，并为每个组件定义唯一的消费者组。这样可以保证服务的所有副本都完全分配到唯一的消费者组中，且每个消费者组只针对一个特定主题。

例如，你可以按以下配置定义两个 Dapr 组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-topic-one
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: consumerGroup
    value: "{appID}-topic-one"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-topic-two
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: consumerGroup
    value: "{appID}-topic-two"
```

## 发送和接收多条消息

Apache Kafka 组件支持通过批量发布订阅 API，在单次操作中发送和接收多条消息。

### 配置批量订阅

订阅主题时，可以配置 `bulkSubscribe` 选项。更多详情请参阅[批量订阅消息]({{% ref "pubsub-bulk#subscribing-messages-in-bulk" %}})。进一步了解[批量订阅 API]({{% ref pubsub-bulk.md %}})。

Apache Kafka 支持以下批量元数据选项：

| 配置项 | 默认值 |
|----------|---------|
| `maxAwaitDurationMs` | `10000`（10 秒） |
| `maxMessagesCount` | `80` |

## Kafka 事务与精确一次处理

Kafka pubsub 组件支持 [Kafka 事务](https://kafka.apache.org/documentation/#semantics)（Kafka 0.11 或更高版本；消费-转换-生产需要 2.5 或更高版本），通过三种能力实现。这三种能力可以独立配置，与 Kafka 本身将事务配置拆分到生产者（`transactional.id`、幂等性）和消费者（`isolation.level`）的方式保持一致：

- **事务性发布**（`producerTransactionsEnabled`）：每次发布（包括每次批量发布）作为一个整体提交或中止。
- **仅消费已提交的消息**（`consumerIsolationLevel: "read_committed"`）：订阅者永远不会看到来自未完成或已中止事务的记录。
- **精确一次的消费-转换-生产**（`consumerTransactionsEnabled`）：每次投递都在一个 Kafka 事务中处理；处理程序在处理过程中发起的发布会加入该事务，消费者偏移量与之原子地一起提交。

### 事务性发布

```yaml
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "mykafka:9092"
    - name: authType
      value: "none"
    - name: producerTransactionsEnabled
      value: "true"
    - name: transactionalIdPrefix # 可选
      value: "my-app"
```

将 `producerTransactionsEnabled` 设置为 `"true"` 后，发布将通过幂等生产者进行，每次发布都包装在各自的 Kafka 事务中：

- 失败或中止的发布永远不会对使用 `read_committed` 读取的消费者可见。
- [批量发布]({{% ref pubsub-bulk.md %}})是原子的：所有条目要么全部提交，要么全部不提交。

这需要 `producerRequiredAcks: "all"`，且 `producerRetryMax` 至少为 1（两者均为组件默认值）。事务会使生产者上的发布串行化，并增加 broker 往返次数，从而降低发布吞吐量。请仅在确实需要该保证的发布组件上启用此功能；如果同一应用还需要即发即忘的流量，请保留第二个非事务性的 Kafka 组件。

发布生产者的 `transactional.id` 会附加一个随机的每实例后缀，因此扩缩容后的副本永远不会相互隔离。该保证仅限于每次发布的原子性；组件重启后不会进行事务恢复或隔离。

### 仅消费已提交的消息

```yaml
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "mykafka:9092"
    - name: authType
      value: "none"
    - name: consumerGroup
      value: "my-group"
    - name: consumerIsolationLevel
      value: "read_committed"
```

使用 `consumerIsolationLevel: "read_committed"` 时，此组件上的订阅只会接收来自已提交事务的记录；属于未完成事务的记录会被 broker 扣留，来自已中止事务的记录则会在到达处理程序之前被客户端丢弃。请在任何位于事务性生产者下游的消费者上使用此设置。

### 精确一次消费-转换-生产

对于从 Kafka 消费、处理并再发布回 Kafka 的管道，`consumerTransactionsEnabled` 可在输入主题与输出主题之间提供精确一次语义。

此功能需要 **Kafka 2.5 或更高版本**，门槛高于其他两项：只有从 2.5 开始，偏移量提交才会携带消费者组的成员 ID 和代数，broker 需要借助它们来隔离迟到提交的已撤销组成员。组件的默认 `version` 为 `2.0.0`，因此必须显式设置 `version`，否则初始化会失败。

```yaml
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "mykafka:9092"
    - name: authType
      value: "none"
    - name: consumerGroup
      value: "my-group"
    - name: version # 消费者事务需要 2.5 或更高版本
      value: "2.5.0"
    - name: consumerTransactionsEnabled
      value: "true"
    - name: transactionalIdPrefix # 可选
      value: "my-app"
    - name: transactionTimeout # 可选；必须超过最慢的处理程序
      value: "60s"
```

工作原理如下：

1. 对于每次投递，组件会在调用处理程序之前打开一个 Kafka 事务，并将事务令牌注入消息元数据中，你的应用会以 `__txnToken` 标头（HTTP）或元数据条目（gRPC）的形式接收它。
1. 处理程序发起的发布**必须回显该令牌**，才能加入投递所属的未完成事务：
   - HTTP：在发布调用中，将令牌作为 `metadata.__txnToken` 查询参数传递。
   - gRPC：在发布请求元数据中，传递键为 `__txnToken` 的条目。
   - 批量发布：在请求级元数据中传递令牌（不支持为令牌设置每条目元数据）。
1. 当处理程序成功时，组件提交事务：已发布的记录与消费者偏移量原子地一起提交。
1. 当处理程序失败时，组件中止事务：处理程序在其中发布的记录（即带有事务令牌的记录）对 `read_committed` 消费者永远不可见；当 `consumeRetryEnabled` 为 `"true"`（默认值）时，消息会被重新传递。重新传递由本组件的 `backOff*` 元数据控制，默认无上限；设置 `backOffMaxRetries` 可对其加以限制。Dapr 弹性策略约束的是单次处理程序调用，而非重新传递循环。从 Dapr 1.19 开始，一旦处理程序的重试策略耗尽，组件会自行提交偏移量（在已中止的事务之外），而不再无限期地重新传递该消息。

例如，一个回显令牌的 HTTP 订阅者：

```
# 投递到达时，令牌作为标头携带：
#   POST /orders
#   __txnToken: <opaque token>

# 处理程序发布其结果并回显令牌，然后返回成功：
curl -X POST "http://localhost:3500/v1.0/publish/kafka-pubsub/processed-orders?metadata.__txnToken=<opaque token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "42", "status": "processed"}'
```

使用消费者事务时隐含 `read_committed` 隔离级别：未设置 `consumerIsolationLevel` 时会自动选择该级别，而显式设置为 `"read_uncommitted"` 会导致验证失败。使用[批量订阅]({{% ref pubsub-bulk.md %}})时，批次是全有或全无的：任一条目失败都会中止并重新传递整个批次。

{{% alert title="携带令牌的发布必须使用同一组件" color="warning" %}}
事务按组件实例进行跟踪。携带令牌的发布必须通过**投递该消息的同一个 Kafka pubsub 组件**进行：通过*其他* Kafka 组件的携带令牌发布会直接报错；过期的令牌（例如在处理程序返回之后）同样会直接报错，而不会悄悄地将消息发布到事务之外。非 Kafka 组件会完全忽略令牌，从而将消息发布到任何事务之外。
{{% /alert %}}

{{% alert title="不携带令牌的发布保持在事务之外" color="warning" %}}
不携带令牌的发布是普通发布：即使是在处理程序内部发起的，它也会独立于投递所属的事务提交。如果该投递之后被重试，此发布会重复执行。只有携带令牌的发布才受精确一次保证的覆盖。
{{% /alert %}}

#### 保证的作用域

精确一次保证覆盖 Kafka 记录和消费者偏移量：输出发布与输入偏移量提交要么一起提交，要么一起中止。你的处理程序本身仍以至少一次（at-least-once）的方式运行——非 Kafka 的副作用（数据库写入、外部 API 调用）不在该事务之内，因此应当是幂等的。

#### 事务超时

使用消费者事务时，事务会在整个处理程序调用期间保持打开，因此 `transactionTimeout`（默认 `60s`）必须大于你预期的最慢处理程序的耗时。超时后，broker 会中止该事务，并重新传递该消息。该值不得超过 broker 的 `transaction.max.timeout.ms`（默认 15 分钟）：broker 会在生产者初始化时拒绝更大的值，这会导致每次投递都失败（如果同时设置了 `producerTransactionsEnabled`，组件甚至无法启动）。对于慢于 broker 上限的处理程序，请在 broker 上提高 `transaction.max.timeout.ms`。

#### 扩缩容、僵尸隔离与 transactionalIdPrefix

使用消费者事务时，每个主题分区都使用稳定的 `transactional.id` `"<prefix>-<digest>-<partition>"` 进行生产，其中 `digest` 是对消费者组、一个 NUL 字节和主题依次计算 SHA-256 后取前 8 个字节，并以小写十六进制表示。正是这种稳定性提供了僵尸隔离（zombie fencing）：当某个分区在重平衡或崩溃后转移到另一个副本时，新副本的生产者会隔离旧实例，并且在开始重新处理之前，旧实例遗留的所有未完成事务都会被中止。

前缀默认为 `clientID`，若未设置则为 `"dapr"`，也可以通过 `transactionalIdPrefix` 显式设置。它必须在消费应用的**每个副本上解析为相同的值**——不要将每个副本模板化的 `clientID`（例如 `"{podName}"`）用作有效前缀，否则副本之间将无法相互隔离。

之所以对消费者组和主题取摘要，而不是直接写入 id，是因为 `-` 在两者中都是合法字符：如果直接写出，消费者组 `a-b`（主题 `c`）与消费者组 `a`（主题 `b-c`）将注册相同的 id，而两个共享同一 id 的组件会在每次事务中相互隔离对方的生产者，且不会有任何错误指明原因。前缀按原样保留，因此 `<prefix>-*` 形式的 broker ACL 模式不受影响。

要将你在 broker 上看到的 `transactional.id` 映射回消费者组和主题，请为候选值重新计算摘要：

```bash
# sha256sum 来自 coreutils；在 macOS 上请使用：shasum -a 256
printf '%s\0%s' "<consumerGroup>" "<topic>" | sha256sum | cut -c1-16
```

{{% alert title="绑定" color="info" %}}
消费者事务仅在 Kafka **pubsub** 组件上可用。[Kafka 绑定]({{% ref kafka.md %}})支持用于事务性输出的 `producerTransactionsEnabled`，但在初始化时会拒绝 `consumerTransactionsEnabled`：精确一次的消费-转换-生产要求事务令牌通过同一个组件实例回显，而绑定模型（输入绑定和输出绑定是独立的实例）无法提供这一点。
{{% /alert %}}

## 每次调用的元数据字段

### 分区键

调用 Kafka pub/sub 时，可以通过请求 URL 中的 `metadata` 查询参数提供可选的分区键。

参数名可以是 `partitionKey` 或 `__key`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myKafka/myTopic?metadata.partitionKey=key1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

### 分区编号

调用 Kafka pub/sub 时，可以通过请求 URL 中的 `metadata` 查询参数提供可选的分区编号。这使你可以直接指定目标 Kafka 分区，绕过 `partitionKey` 所使用的基于哈希的分区分配。

参数名为 `partitionNumber`，其值必须是非负整数，并且位于该主题的分区范围（`0` 到 `partitionCount - 1`）之内。如果该值超出范围、为负数或不是有效整数，发布将失败并返回错误。

如果同时提供了 `partitionNumber` 和 `partitionKey`（或 `__key`），则选择分区时以 `partitionNumber` 为准。`partitionKey` 仍会被设置在 Kafka 消息记录上。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myKafka/myTopic?metadata.partitionNumber=3 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

### 事务令牌

启用[消费者事务](#精确一次消费-转换-生产)后，发布可以携带 `__txnToken` 元数据条目，以加入其所接收的那次投递的未完成事务。该令牌永远不会写入发出的 Kafka 消息标头。

### 消息标头

所有其他元数据键值对（即不是 `partitionKey`、`__key`、`partitionNumber` 或 `__txnToken` 的键值对）都会被设置为 Kafka 消息中的标头。下面是一个为消息设置 `correlationId` 的示例。

```shell
curl -X POST http://localhost:3500/v1.0/publish/myKafka/myTopic?metadata.correlationId=myCorrelationID&metadata.partitionKey=key1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

### 消费端接收的 Kafka Pubsub 特殊消息标头

消费消息时，特殊的消息元数据会自动作为标头传递。它们包括：

- `__key`：消息键（如果有）
- `__topic`：消息所属的主题
- `__partition`：消息所在的分区编号
- `__offset`：消息在分区中的偏移量
- `__timestamp`：消息的时间戳
- `__txnToken`：投递的事务令牌，仅在启用[消费者事务](#精确一次消费-转换-生产)时存在

你可以在消费者端点中按如下方式访问它们：
{{< tabpane text=true >}}

{{% tab "Python (FastAPI)" %}}

```python
from fastapi import APIRouter, Body, Response, status
import json
import sys

app = FastAPI()

router = APIRouter()


@router.get('/dapr/subscribe')
def subscribe():
    subscriptions = [{'pubsubname': 'pubsub',
                      'topic': 'my-topic',
                      'route': 'my_topic_subscriber',
                      }]
    return subscriptions

@router.post('/my_topic_subscriber')
def my_topic_subscriber(
      key: Annotated[str, Header(alias="__key")],
      offset: Annotated[int, Header(alias="__offset")],
      event_data=Body()):
    print(f"key={key} - offset={offset} - data={event_data}", flush=True)
      return Response(status_code=status.HTTP_200_OK)

app.include_router(router)

```

{{% /tab %}}

{{< /tabpane >}}

## 接收带有特殊字符的消息标头

消费者应用可能需要接收包含特殊字符的消息标头，而这可能导致 HTTP 协议验证错误。
HTTP 标头值必须符合规范，因此某些字符是不允许的。[进一步了解相关协议](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2)。
在这种情况下，你可以启用 `escapeHeaders` 配置项，它会在消费者端使用 URL 转义对标头值进行编码。

{{% alert title="注意" color="primary" %}}
使用此设置时，接收到的消息标头会被 URL 转义，你需要进行 URL “反转义”才能获取原始值。
{{% /alert %}}

将 `escapeHeaders` 设置为 `true` 以启用 URL 转义。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-escape-headers
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka brokers 用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "none"
  - name: escapeHeaders
    value: "true"
```

## Avro Schema Registry 序列化/反序列化

你可以配置 pub/sub，以发布或消费使用 [Avro 二进制序列化](https://avro.apache.org/docs/) 编码的数据，并利用 [Apache Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)（例如 [Confluent Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)、[Apicurio](https://www.apicur.io/registry/)）。

### 配置

{{% alert title="重要" color="warning" %}}
目前仅支持消息值（value）的序列化/反序列化。由于不支持 CloudEvent，发布 Avro 消息时必须传递 `rawPayload=true` 元数据。

请注意，消费者**不**应设置 `rawPayload=true`，因为消息值会被包装到 CloudEvent 中并进行 base64 编码。保留 `rawPayload` 的默认值（即 `false`）时，经 Avro 解码的消息会以 JSON 负载的形式发送给应用。

将 `useAvroJson` 组件元数据设置为 `true` 时，入站和出站的 Avro 二进制会分别转换为 Avro JSON 编码，或从 Avro JSON 编码转换而来。当需要精确的类型映射时，这种方式可能更可取。默认使用标准 JSON，通常更容易绑定到应用中的原生类型。
{{% /alert %}}

配置 Kafka pub/sub 组件元数据时，必须定义：
- Schema Registry 的 URL
- API key/secret（如适用）

Schema 主体（subject）会根据主题名称，按照标准命名约定自动派生。例如，对于名为 `my-topic` 的主题，Schema 主体将为 `my-topic-value`。
在服务中与消息负载交互时，负载为 JSON 格式。负载由 Dapr 组件透明地进行序列化和反序列化。
日期/日期时间字段必须以其 [Epoch Unix 时间戳](https://en.wikipedia.org/wiki/Unix_time)的等价形式传递（而非常见的 Iso8601 格式）。例如：
- `2024-01-10T04:36:05.986Z` 应以 `1704861365986` 传递（自 1970 年 1 月 1 日起的毫秒数）
- `2024-01-10` 应以 `19732` 传递（自 1970 年 1 月 1 日起的天数）

### 发布 Avro 消息

要告知 Kafka pub/sub 组件消息应使用 Avro 序列化，必须将 `valueSchemaType` 元数据设置为 `Avro`。

{{< tabpane text=true >}}

{{% tab "curl" %}}
```bash
curl -X "POST" http://localhost:3500/v1.0/publish/pubsub/my-topic?metadata.rawPayload=true&metadata.valueSchemaType=Avro -H "Content-Type: application/json" -d '{"order_number": "345", "created_date": 1704861365986}'
```
{{% /tab %}}

{{% tab "Python SDK" %}}
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    req_data = {
        'order_number': '345',
        'created_date': 1704861365986
    }
    # 创建带有内容类型和正文的类型化消息
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='my-topic',
        data=json.dumps(req_data),
        publish_metadata={'rawPayload': 'true', 'valueSchemaType': 'Avro'}
    )
    # 打印请求
    print(req_data, flush=True)
```
{{% /tab %}}

{{< /tabpane >}}


### 订阅 Avro 主题

要告知 Kafka pub/sub 组件应使用 Avro 反序列化消息，必须在订阅元数据中将 `valueSchemaType` 元数据设置为 `Avro`。

{{< tabpane text=true >}}

{{% tab "Python (FastAPI)" %}}

```python
from fastapi import APIRouter, Body, Response, status
import json
import sys

app = FastAPI()

router = APIRouter()


@router.get('/dapr/subscribe')
def subscribe():
    subscriptions = [{'pubsubname': 'pubsub',
                      'topic': 'my-topic',
                      'route': 'my_topic_subscriber',
                      'metadata': {
                          'valueSchemaType': 'Avro',
                      } }]
    return subscriptions

@router.post('/my_topic_subscriber')
def my_topic_subscriber(event_data=Body()):
    print(event_data, flush=True)
      return Response(status_code=status.HTTP_200_OK)

app.include_router(router)

```
{{% /tab %}}
{{< /tabpane >}}

### 发布需要自定义元数据的消息时避免下游副作用

Dapr 允许通过设置自定义发布元数据来定制发布行为。

例如，要以 Avro 格式发布，需要设置 `valueSchemaType=Avro` 元数据。

但是，默认情况下，这些元数据项会被转换为 Kafka 标头并与消息一同发布。这一默认行为非常有用，例如可以在一连串的发布者和消费者之间转发追踪标头。

然而，在某些场景下，这会产生不必要的副作用。
假设你使用 Dapr 消费上述带有标头的 Avro 消息。如果该消息无法成功消费，并被配置为发送到死信主题，那么在发布到死信主题时，`valueSchemaType=Avro` 会被自动继承，从而要求为该主题配置相关联的 Schema。在许多场景中，更可取的做法是仅以 JSON 格式发布死信消息，因为无法遵循既定的 Schema。

要避免此行为，可以配置 kafka-pubsub 组件，将某些元数据键排除在与标头的相互转换之外。
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-exclude-metadata
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka broker 连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: authType # 必需。
    value: "none"
  - name: excludeHeaderMetaRegex
    value: "^valueSchemaType$" # 可选。将 valueSchemaType 标头排除在发布到标头以及转换为元数据之外
```

### 覆盖默认消费者组重平衡策略

在 Kafka 中，重平衡策略决定分区如何分配给消费者组内的消费者。默认策略为“range”，但“roundrobin”和“sticky”也可用。
- `Range`：
分区根据其字典顺序分配给消费者。假设有三个分区（0、1、2）和两个消费者（A、B），消费者 A 可能获得分区 0 和 1，而消费者 B 获得分区 2。
- `RoundRobin`：
分区以轮询方式分配给消费者。沿用上面的例子，消费者 A 可能获得分区 0 和 2，而消费者 B 获得分区 1。
- `Sticky`：
此策略旨在尽可能保留先前的分配结果，同时仍保持均衡分布。如果有消费者离开或加入消费者组，只有受影响的分区会被重新分配，从而将干扰降到最低。

#### 选择策略：
- `Range`：
简单易懂且易于实现，但如果分区大小差异显著，可能导致分布不均。
- `RoundRobin`：
在许多情况下可提供较好的均衡，但如果消息键分布不均，则可能不是最优选择。
- `Sticky`：
通常更受青睐，因为它能在重平衡期间将干扰降到最低，尤其是在分区数量众多或消费者组频繁变更的情况下。

## 创建 Kafka 实例

{{< tabpane text=true >}}

{{% tab "自托管" %}}
你可以使用[此 Docker 镜像](https://github.com/wurstmeister/kafka-docker)在本地运行 Kafka。
如需在不使用 Docker 的情况下运行，请参阅[此处](https://kafka.apache.org/quickstart)的入门指南。
{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 上运行 Kafka，你可以使用任何 Kafka Operator，例如 [Strimzi](https://strimzi.io/quickstarts/)。
{{% /tab %}}

{{< /tabpane >}}


## 相关链接
- [Dapr 组件的基础 Schema]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md##step-1-setup-the-pubsub-component" %}})，了解配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
