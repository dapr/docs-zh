---
type: docs
title: "Apache Kafka"
linkTitle: "Apache Kafka"
description: "Apache Kafka 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-apache-kafka/"
---

## 组件格式

要设置 Apache Kafka 发布订阅，请创建类型为 `pubsub.kafka` 的组件。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 是如何自动生成的。请阅读[操作指南：发布与订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建和应用发布订阅配置。

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
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "{namespace}"
  - name: consumerID # 可选。如果未提供，运行时将创建一个。
    value: "channel1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "password"
  - name: saslUsername # 如果 authType 为 `password` 则必需。
    value: "adminuser"
  - name: saslPassword # 如果 authType 为 `password` 则必需。
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
  - name: disableTls # 可选。禁用 TLS。这对生产环境不安全！！你应该阅读 `Mutual TLS` 部分，了解如何使用 TLS。
    value: "true"
  - name: consumerFetchMin # 可选。高级设置。单个请求中获取的最小消息字节数，代理会一直等待，直到至少有这么多数据可用。
    value: 1
  - name: consumerFetchDefault # 可选。高级设置。每个请求从代理获取的默认消息字节数。
    value: 2097152
  - name: channelBufferSize # 可选。高级设置。内部和外部通道中要缓冲的事件数量。
    value: 512
  - name: consumerGroupRebalanceStrategy # 可选。高级设置。用于消费者组重新平衡的策略。
    value: sticky
  - name: schemaRegistryURL # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry URL。
    value: http://localhost:8081
  - name: schemaRegistryAPIKey # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry API 密钥。
    value: XYAXXAZ
  - name: schemaRegistryAPISecret # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Secret。
    value: "ABCDEFGMEADFF"
  - name: schemaCachingEnabled # 可选。使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。
    value: true
  - name: schemaLatestVersionCacheTTL # 可选。使用 Schema Registry Avro 序列化/反序列化时。发布消息时使用最新可用 schema 的缓存 TTL。
    value: 5m
  - name: useAvroJson # 可选。启用 Avro JSON schema 进行序列化，而不是默认的标准 JSON。仅当订阅使用 valueSchemaType=Avro 时适用
    value: "true"
  - name: escapeHeaders # 可选。
    value: false

```

> 有关使用 `secretKeyRef` 的详细信息，请参阅[如何在组件中引用机密]({{% ref component-secrets.md %}})指南。

## 规格元数据字段

| 字段              | 必需 | 详细信息 | 示例 |
|--------------------|:--------:|---------|---------|
| brokers             | Y | 以逗号分隔的 Kafka 代理列表。 | `"localhost:9092,dapr-kafka.myapp.svc.cluster.local:9093"`
| consumerGroup       | N | 要监听的 Kafka 消费者组。发布到某个主题的每条记录，都会被投递给订阅该主题的每个消费者组中的一个消费者。如果提供了 `consumerGroup` 的值，则 `consumerID` 的任何值都会被忽略，取而代之的是为 `consumerID` 设置消费者组与随机唯一标识符的组合。 | `"group1"`
| consumerID       | N | 消费者 ID（消费者标签）将一个或多个消费者组织成一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息只会被组内的某一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用 ID（`appID`）的值。如果提供了 `consumerGroup` 的值，则 `consumerID` 的任何值都会被忽略，取而代之的是为 `consumerID` 设置消费者组与随机唯一标识符的组合。  | 可以设置为字符串值（如上例中的 `"channel1"`）或字符串格式的值（如 `"{podName}"` 等）。[查看组件元数据中可以使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| clientID            | N | 用户提供的字符串，会随每个请求发送到 Kafka 代理，用于日志记录、调试和审计。在 Kubernetes 模式下默认为 `"namespace.appID"`，在自托管模式下默认为 `"appID"`。 | `"my-namespace.my-dapr-app"`, `"my-dapr-app"`
| authRequired        | N | *已弃用*。启用与 Kafka 代理之间的 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 身份验证。 | `"true"`, `"false"`
| authType            | Y | 配置或禁用身份验证。支持的值：`none`、`password`、`mtls`、`oidc`、`oidc_private_key_jwt` 或 `awsiam` | `"password"`, `"none"`
| saslUsername        | N | 用于身份验证的 SASL 用户名。仅当 `authType` 设置为 `"password"` 时需要。 | `"adminuser"`
| saslPassword        | N | 用于身份验证的 SASL 密码。可以使用 `secretKeyRef` 引用[机密]({{% ref component-secrets.md %}})。仅当 `authType` 设置为 `"password"` 时需要。 | `""`, `"KeFg23!"`
| saslMechanism      | N | 你希望使用的 SASL 身份验证机制。仅当 `authType` 设置为 `"password"` 时需要。默认为 `PLAINTEXT` | `"SHA-512", "SHA-256", "PLAINTEXT"`
| initialOffset       | N | 在没有已提交偏移量时使用的初始偏移量。应为 "newest" 或 "oldest"。默认为 "newest"。 | `"oldest"`
| maxMessageBytes     | N | 单条 Kafka 消息允许的最大字节数。默认为 1024。 | `2048`
| consumeRetryInterval | N | 尝试消费主题时的重试间隔。不带后缀的数字视为毫秒。默认为 100ms。 | `200ms` |
| consumeRetryEnabled | N | 设置为 `"false"` 可禁用消费重试 | `"true"`, `"false"` |

{{% alert title="注意" color="primary" %}}
从 Dapr 1.19 开始，当消息的重试策略耗尽时（订阅者持续返回可重试错误，直到约束它的[弹性策略]({{% ref "resiliency-overview.md" %}})放弃该消息），组件会提交该消息的偏移量并继续前进，同时记录一条警告。在 1.19 之前，偏移量不会被提交，因此同一条消息会被无限次重新投递，分区无法越过它继续处理。
{{% /alert %}}
| version               | N | Kafka 集群版本。默认为 2.0.0。注意，如果你在使用带 Kafka 的 Azure EventHubs，则必须将其设置为 `1.0.0`。 | `0.10.2.0` |
| caCert | N | 证书颁发机构证书，使用 TLS 时需要。可以使用 `secretKeyRef` 引用机密。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert | N | 客户端证书，`authType` 为 `mtls` 时需要。可以使用 `secretKeyRef` 引用机密。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | N | 客户端密钥，`authType` 为 `mtls` 时需要。可以使用 `secretKeyRef` 引用机密。 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`
| skipVerify | N | 跳过 TLS 验证，不建议在生产环境中使用。默认为 `"false"` | `"true"`, `"false"` |
| disableTls | N | 禁用传输层安全（TLS）。要禁用，需要将值设置为 `"true"`。不建议在生产环境中使用。默认为 `"false"`。 | `"true"`, `"false"` |
| oidcTokenEndpoint | N | OAuth2 身份提供方访问令牌端点的完整 URL。当 `authType` 设置为 `oidc` 时需要 | "https://identity.example.com/v1/token" |
| oidcClientID | N | 在身份提供方中预先配置的 OAuth2 客户端 ID。当 `authType` 设置为 `oidc` 时需要 | `dapr-kafka` |
| oidcClientSecret | N | 在身份提供方中预先配置的 OAuth2 客户端密钥。当 `authType` 设置为 `oidc` 时需要 | `"KeFg23!"` |
| oidcScopes | N | 请求访问令牌时使用的 OAuth2/OIDC 范围列表，以逗号分隔。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时建议设置。默认为 `"openid"` | `"openid,kafka-prod"` |
| oidcClientAssertionCert | N | 用于身份验证的 OAuth2 客户端断言证书。当 `authType` 设置为 `oidc_private_key_jwt` 时需要。可以使用 `secretKeyRef` 引用机密 | `"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"` |
| oidcClientAssertionKey | N | 用于身份验证的 OAuth2 客户端断言密钥。当 `authType` 设置为 `oidc_private_key_jwt` 时需要。可以使用 `secretKeyRef` 引用机密 | `"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"` |
| oidcResource | N | 请求访问令牌时使用的 OAuth2 资源。当 `authType` 设置为 `oidc_private_key_jwt` 时建议设置。 | `"api://kafka"` |
| oidcAudience | N | 请求访问令牌时使用的 OAuth2 受众。当 `authType` 设置为 `oidc_private_key_jwt` 时建议设置。 | `"http://<idp-host>/realms/local"` |
| oidcKid | N | 请求访问令牌时使用的 OAuth2 密钥 ID（kid）。当 `authType` 设置为 `oidc_private_key_jwt` 时建议设置。 | `"1234567890"` |
| oidcExtensions | N | 包含 JSON 编码的 OAuth2/OIDC 扩展字典的字符串，请求访问令牌时一并携带 | `{"cluster":"kafka","poolid":"kafkapool"}` |
| awsRegion | N | 此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'region'。部署 Kafka 集群所在的 AWS 区域。当 `authType` 设置为 `awsiam` 时需要 | `us-west-1` |
| awsAccessKey | N  |  此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥。 | `"accessKey"`
| awsSecretKey | N  | 此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'secretKey'。与访问密钥关联的密钥。 | `"secretKey"`
| awsSessionToken | N  | 此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅在使用临时安全凭证时才需要会话令牌。 | `"sessionToken"`
| awsIamRoleArn | N  | 此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'assumeRoleArn'。有权访问 AWS Managed Streaming for Apache Kafka（MSK）的 IAM 角色。这是除 AWS 凭证之外，另一种对 MSK 进行身份验证的方式。 | `"arn:aws:iam::123456789:role/mskRole"`
| awsStsSessionName | N  | 此项为兼容既有字段而保留，将从 Dapr 1.17 起弃用。请改用 'sessionName'。承担角色时使用的会话名称。 | `"DaprDefaultSession"`
| schemaRegistryURL | N | 使用 Schema Registry Avro 序列化/反序列化时需要。Schema Registry URL。 | `http://localhost:8081` |
| schemaRegistryAPIKey | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Key。 | `XYAXXAZ` |
| schemaRegistryAPISecret | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证的 API Secret。 | `ABCDEFGMEADFF` |
| schemaCachingEnabled | N | 使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。默认为 `true` | `true` |
| schemaLatestVersionCacheTTL | N | 使用 Schema Registry Avro 序列化/反序列化时。发布消息时使用最新可用 schema 的缓存 TTL。默认为 5 分钟 | `5m` |
| useAvroJson | N | 启用 Avro JSON schema 进行序列化，而不是默认的标准 JSON。仅当订阅使用 valueSchemaType=Avro 时适用。默认为 `"false"` | `"true"` |
| clientConnectionTopicMetadataRefreshInterval | N | 客户端连接与代理刷新主题元数据的间隔，以 Go 时长格式表示。默认为 `9m`。 | `"4m"` |
| clientConnectionKeepAliveInterval | N | 客户端连接与代理保持活动状态的最长时间（以 Go 时长格式表示），超过后关闭连接。零值（默认）表示无限期保持活动。 | `"4m"` |
| consumerFetchMin | N | 单次请求中获取的最小消息字节数，代理会一直等待，直到至少有这么多数据可用。默认为 `1`，因为 `0` 会导致在没有可用消息时消费者空转。等同于 JVM 的 `fetch.min.bytes`。 | `"2"` |
| consumerFetchDefault | N | 每次请求从代理获取的默认消息字节数。默认为 `"1048576"` 字节。 | `"2097152"` |
| channelBufferSize | N | 内部和外部通道中缓冲的事件数量。这使生产者和消费者能够在用户代码运行时于后台继续处理部分消息，从而显著提升吞吐量。默认为 `256`。 | `"512"` |
| heartbeatInterval | N | 向消费者协调器发送心跳的间隔。最好设置为不超过 `sessionTimeout` 值的 1/3。默认为 "3s"。 | `"5s"` |
| sessionTimeout | N | 使用 Kafka 组管理功能时，用于检测客户端故障的超时时间。如果代理在该会话超时到期前未收到消费者的任何心跳，则会移除该消费者并触发重新平衡。默认为 "10s"。 | `"20s"` |
| consumerGroupRebalanceStrategy | N | 消费者组重新平衡所使用的策略。支持的值：`range`、`sticky`、`roundrobin`。默认为 `range` | `"sticky"` |
| escapeHeaders | N | 启用对消费者接收的消息头值进行 URL 转义。允许接收通常不能出现在 HTTP 头中的特殊字符内容。默认为 `false`。 | `true` |
| excludeHeaderMetaRegex | N | 用于排除某些键的正则表达式：消费消息时，这些键不会从消息头转换为元数据；发布消息时，也不会从元数据转换为消息头。此功能可避免对主题消费者产生意外的下游副作用。 | '"^valueSchemaType$"`
| dialTimeout | N | 等待与代理建立初始 TCP 连接的最长时间。用于限制在无法连接的集群上 `Init()` 的阻塞时长。默认为 `"30s"`（与 Sarama 的内置默认值一致）。 | `"10s"` |
| readTimeout | N | 发送请求后，等待代理响应的最长时间。默认为 `"30s"`。 | `"10s"` |
| writeTimeout | N | 等待请求发送到代理的最长时间。默认为 `"30s"`。 | `"10s"` |
| metadataTimeout | N | 每次元数据刷新操作的超时时间。为 `"0"`（默认）时，Sarama 会根据 Net 超时和重试次数计算实际超时时间。 | `"5s"` |
| producerRequiredAcks | N | 生产请求被视为成功之前所需的代理确认数。可接受的值：`"all"`（所有同步副本，持久性最高）、`"local"`（仅分区 leader）、`"none"`（不需要确认）。默认为 `"all"`。 | `"local"` |
| producerRetryMax | N | 放弃之前重试发送消息的最大次数。默认为 `5`。 | `3` |
| producerTransactionsEnabled | N | 设置为 `"true"` 时，每次发布（单条或批量）都会包装在一个[Kafka 事务](#kafka-事务与精确一次处理)中，并使用幂等生产者：中止的发布永远不会被以 `read_committed` 方式读取的消费者看到，批量发布也会变为原子操作（所有条目要么全部提交，要么全部不提交）。要求 `producerRequiredAcks: "all"`、`producerRetryMax` 不小于 1，且 Kafka 版本为 0.11 或更高。事务会使发布串行化并增加与代理的往返次数，从而降低发布吞吐量。默认为 `"false"` | `"true"`, `"false"` |
| consumerTransactionsEnabled | N | 设置为 `"true"` 时，每次投递都会在一个 Kafka 事务中处理（[精确一次的 consume-transform-produce](#精确一次的-consume-transform-produce)）：处理程序发起的、携带该投递事务令牌的发布会加入该事务，消费者偏移量会在处理程序成功时与之原子性地一同提交。会强制设置 `consumerIsolationLevel: "read_committed"`。要求设置消费者组（`consumerGroup`，或由 Dapr 为你设置的 `consumerID`）、`producerRequiredAcks: "all"`、`producerRetryMax` 不小于 1，且 Kafka 版本为 2.5 或更高（请相应设置 `version`）。默认为 `"false"` | `"true"`, `"false"` |
| transactionalIdPrefix | N | 组件在启用事务时向代理注册的 `transactional.id` 值的前缀。发布生产者默认取 `clientID`，其次取 `consumerGroup`，最后为 `"dapr"`；消费者事务默认取 `clientID`，其次为 `"dapr"`，并且必须在每个副本上解析为相同的值，参见[扩缩容与隔离](#扩缩容僵尸实例隔离与-transactionalidprefix)。 | `"my-app"` |
| consumerIsolationLevel | N | 消费者的隔离级别。`"read_uncommitted"`（默认）会投递所有记录；`"read_committed"` 会隐藏属于未结束或已中止 Kafka 事务的记录，需要 Kafka 0.11 或更高版本。当 `consumerTransactionsEnabled` 为 `"true"` 时，此级别必须为 `"read_committed"`：未设置时会自动选择该级别，而显式设置为 `"read_uncommitted"` 会导致校验失败。 | `"read_committed"` |
| transactionTimeout | N | 启用事务时向代理请求的事务超时时间，以 Go 时长格式表示。启用 `consumerTransactionsEnabled` 时，事务会在整个处理程序调用期间保持打开，因此该值必须大于最慢的预期处理程序耗时。不得超过代理的 `transaction.max.timeout.ms`（默认为 15 分钟）：代理会在生产者初始化时拒绝更大的值。启用 `producerTransactionsEnabled` 时，该生产者在组件初始化期间创建，因此组件将无法启动；仅启用 `consumerTransactionsEnabled` 时，每个分区的生产者在首次使用时才创建，因此每次投递都会失败，而不携带事务令牌的发布仍可正常工作。默认为 `"60s"` | `"90s"` |

上文的 `secretKeyRef` 引用了 [Kubernetes 机密存储]({{% ref kubernetes-secret-store.md %}})来访问 TLS 信息。访问[这里]({{% ref setup-secret-store.md %}})，了解如何配置机密存储组件。

#### 注意
在使用带 Kafka 的 Azure EventHubs 时，元数据 `version` 必须设置为 `1.0.0`。

### 身份验证

Kafka 支持多种身份验证方案，Dapr 支持其中几种：SASL 密码、mTLS、OIDC/OAuth2。随着新增的身份验证方法，`authRequired` 字段已从 v1.6 版本起被弃用，应改用 `authType` 字段。如果 `authRequired` 设置为 `true`，Dapr 会尝试根据 `saslPassword` 的值正确配置 `authType`。`authType` 的有效值为：
- `none`
- `password`
- `certificate`
- `mtls`
- `oidc`
- `oidc_private_key_jwt`
- `awsiam`

{{% alert title="注意" color="primary" %}}
`authType` 仅用于 _身份验证_。_授权_仍需在 Kafka 中配置，但 `awsiam` 例外，它还可以驱动在 AWS IAM 中配置的授权决策。
{{% /alert %}}

#### 无身份验证

将 `authType` 设置为 `none` 将禁用任何身份验证。此做法在生产环境中**不**推荐。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-noauth
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
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
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "password"
  - name: saslUsername # 如果 authType 为 `password` 则必需。
    value: "adminuser"
  - name: saslPassword # 如果 authType 为 `password` 则必需。
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

将 `authType` 设置为 `mtls` 后，将使用 x509 客户端证书（`clientCert` 字段）和密钥（`clientKey` 字段）进行身份验证。请注意，作为身份验证机制的 mTLS 与使用 TLS 对传输层进行加密是两回事。mTLS 需要 TLS 传输（即 `disableTls` 必须为 `false`），但保护传输层并不要求使用 mTLS。有关配置底层 TLS 传输的信息，请参阅[使用 TLS 通信](#使用-tls-通信)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-mtls
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
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

将 `authType` 设置为 `oidc` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供方获取不记名令牌。目前仅支持 **client_credentials** 授权类型。

将 `oidcTokenEndpoint` 配置为身份提供方访问令牌端点的完整 URL。

将 `oidcClientID` 和 `oidcClientSecret` 设置为在身份提供方中预先配置的客户端凭证。

如果在组件配置中指定了 `caCert`，该证书会追加到系统 CA 信任中，用于验证身份提供方的证书。同样，如果在组件配置中指定了 `skipVerify`，则访问身份提供方时也会跳过验证。

默认情况下，令牌请求的唯一范围是 `openid`；强烈建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka 代理进行校验。如果不使用额外范围来限定访问令牌的有效范围，被攻陷的 Kafka 代理就可能重放该令牌，以 Dapr clientID 的身份访问其他服务。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "oidc"
  - name: oidcTokenEndpoint # 如果 authType 为 `oidc` 则必需。
    value: "https://identity.example.com/v1/token"
  - name: oidcClientID      # 如果 authType 为 `oidc` 则必需。
    value: "dapr-myapp"
  - name: oidcClientSecret  # 如果 authType 为 `oidc` 则必需。
    secretKeyRef:
      name: kafka-secrets
      key: oidcClientSecret
  - name: oidcScopes        # 如果 authType 为 `oidc` 则建议设置。
    value: "openid,kafka-dev"
  - name: caCert            # 也用于验证 OIDC 提供方的证书
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

将 `authType` 设置为 `oidc_private_key_jwt` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供方获取私钥 JWT。目前仅支持 **client_credentials** 授权类型。

将 `oidcTokenEndpoint` 配置为身份提供方访问令牌端点的完整 URL。

将 `oidcClientID` 设置为客户端 ID，将 `oidcClientAssertionCert` 设置为客户端断言证书，将 `oidcClientAssertionKey` 设置为在身份提供方中预先配置的客户端断言密钥。

如果在组件配置中指定了 `caCert`，该证书会追加到系统 CA 信任中，用于验证身份提供方的证书。同样，如果在组件配置中指定了 `skipVerify`，则访问身份提供方时也会跳过验证。

默认情况下，令牌请求的唯一范围是 `openid`；强烈建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka 代理进行校验。如果不使用额外范围来限定访问令牌的有效范围，被攻陷的 Kafka 代理就可能重放该令牌，以 Dapr clientID 的身份访问其他服务。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "oidc_private_key_jwt"
  - name: oidcTokenEndpoint # 如果 authType 为 `oidc_private_key_jwt` 则必需。
    value: "https://identity.example.com/v1/token"
  - name: oidcClientID      # 如果 authType 为 `oidc_private_key_jwt` 则必需。
    value: "dapr-myapp"
  - name: oidcClientAssertionCert # 如果 authType 为 `oidc_private_key_jwt` 则必需。
    secretKeyRef:
      name: kafka-tls
      key: oidcClientAssertionCert
  - name: oidcClientAssertionKey # 如果 authType 为 `oidc_private_key_jwt` 则必需。
    secretKeyRef:
      name: kafka-tls
      key: oidcClientAssertionKey
  - name: oidcScopes        # 如果 authType 为 `oidc_private_key_jwt` 则建议设置。
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

MSK 支持使用 AWS IAM 进行身份验证。将 `authType` 设置为 `awsiam` 后，将使用 AWS SDK 生成身份验证令牌。
{{% alert title="注意" color="primary" %}}
唯一必需的元数据字段是 `region`。如果未提供 `acessKey` 和 `secretKey`，则可以使用服务账号的 AWS IAM 角色，对 Kafka 集群进行免密码身份验证。
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
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
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

默认情况下，会启用 TLS 来保护到 Kafka 的传输层。要禁用 TLS，请将 `disableTls` 设置为 `true`。启用 TLS 后，你可以使用 `skipVerify` 跳过服务器证书验证（在生产环境中**不**推荐），并使用 `caCert` 指定受信任的证书颁发机构（CA）。如果未指定 `caCert`，则使用系统 CA 信任。要配置 mTLS 身份验证，请参阅 _身份验证_ 下的相应章节。
以下是一个配置为使用传输层 TLS 的 Kafka 发布订阅组件示例：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
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

当使用单个发布订阅组件从多个主题消费时，无法保证消费者组中的消费者如何在主题分区之间分配。

例如，假设你订阅了两个主题，每个主题有 10 个分区，并且有 20 个服务副本同时从这两个主题消费。无法保证第一个主题分配到 10 个分区、第二个主题也分配到 10 个分区。相反，分区可能会被不均匀地划分，第一个主题分配到超过 10 个，其余的分配给第二个主题。

这可能导致监听第一个主题的消费者空闲，而第二个主题的消费者负载过重，反之亦然。使用 HPA 或 KEDA 等自动伸缩器时，也会出现同样的情况。

如果你遇到了这个问题，建议为每个主题配置一个单独的发布订阅组件，并为每个组件定义唯一的消费者组。这样可以确保服务的所有副本都完全分配到唯一的消费者组，而每个消费者组只对应一个特定主题。

例如，你可以使用以下配置定义两个 Dapr 组件：

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

Apache Kafka 组件支持使用批量发布订阅 API，在单次操作中发送和接收多条消息。

### 配置批量订阅

订阅主题时，你可以配置 `bulkSubscribe` 选项。有关详细信息，请参阅[订阅批量消息]({{% ref "pubsub-bulk#subscribing-messages-in-bulk" %}})。进一步了解[批量订阅 API]({{% ref pubsub-bulk.md %}})。

Apache Kafka 支持以下批量元数据选项：

| 配置 | 默认值 |
|----------|---------|
| `maxAwaitDurationMs` | `10000`（10 秒） |
| `maxMessagesCount` | `80` |

## Kafka 事务与精确一次处理

Kafka 发布订阅组件通过三项能力支持 [Kafka 事务](https://kafka.apache.org/documentation/#semantics)（Kafka 0.11 或更高版本；精确一次的 consume-transform-produce 需要 2.5 或更高版本）。这三项能力彼此独立配置，与 Kafka 自身将事务配置拆分到生产者（`transactional.id`、幂等性）和消费者（`isolation.level`）两侧的方式一致：

- **事务性发布**（`producerTransactionsEnabled`）：每次发布（包括每次批量发布）都作为一个整体提交或中止。
- **仅消费已提交数据**（`consumerIsolationLevel: "read_committed"`）：订阅者永远看不到来自未结束或已中止事务的记录。
- **精确一次的 consume-transform-produce**（`consumerTransactionsEnabled`）：每次投递都在一个 Kafka 事务中处理；处理过程中发起的发布会加入该事务，消费者偏移量则与之原子性地一同提交。

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

将 `producerTransactionsEnabled` 设置为 `"true"` 后，发布会通过幂等生产者进行，并且每次发布都包装在各自的 Kafka 事务中：

- 失败或中止的发布永远不会被以 `read_committed` 方式读取的消费者看到。
- [批量发布]({{% ref pubsub-bulk.md %}})是原子的：所有条目要么全部提交，要么全部不提交。

这要求 `producerRequiredAcks: "all"`，且 `producerRetryMax` 至少为 1（两者都是组件的默认值）。事务会使生产者上的发布串行化，并增加与代理的往返次数，从而降低发布吞吐量。因此，请只在确实需要这种保证的组件上启用它；如果同一应用还需要即发即弃的流量，请为其保留第二个非事务的 Kafka 组件。

发布生产者的 `transactional.id` 会附加一个随机的实例级后缀，因此扩容后的副本不会相互隔离（fencing）。这里的保证是每次发布的原子性；组件重启时，不会进行事务恢复或隔离。

### 仅消费已提交数据

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

将 `consumerIsolationLevel` 设置为 `"read_committed"` 后，该组件上的订阅只会收到已提交事务中的记录：属于未结束事务的记录会被代理扣留，属于已中止事务的记录则会在到达你的处理程序之前被客户端丢弃。对于事务性生产者下游的任何消费者，都应使用此设置。

### 精确一次的 consume-transform-produce

对于从 Kafka 消费、处理并再发布回 Kafka 的流水线，`consumerTransactionsEnabled` 可以在输入主题和输出主题之间提供精确一次语义。

此能力需要 **Kafka 2.5 或更高版本**，要求比另外两项能力更高：从 2.5 开始，偏移量提交才会携带消费者组的成员 ID 和代数，代理需要它们来隔离一个提交较晚的、已被撤销的组成员。组件的默认 `version` 为 `2.0.0`，因此必须显式设置 `version`，否则初始化会失败。

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
    - name: version # 消费者事务要求 2.5 或更高版本
      value: "2.5.0"
    - name: consumerTransactionsEnabled
      value: "true"
    - name: transactionalIdPrefix # 可选
      value: "my-app"
    - name: transactionTimeout # 可选；必须大于最慢的处理程序耗时
      value: "60s"
```

工作方式如下：

1. 对于每次投递，组件都会在调用你的处理程序之前打开一个 Kafka 事务，并将一个事务令牌注入消息元数据中。你的应用会以 `__txnToken` 头（HTTP）或元数据条目（gRPC）的形式收到该令牌。
1. 处理程序发起的发布**如果回传该令牌**，就会加入该投递所在的打开事务：
   - HTTP：在发布调用中以 `metadata.__txnToken` 查询参数传递该令牌。
   - gRPC：在发布请求的元数据中传递键 `__txnToken`。
   - 批量发布：在请求级元数据中传递该令牌（不支持逐条目元数据传递该令牌）。
1. 当处理程序成功时，组件提交该事务：已发布的记录与消费者偏移量原子性地一同提交。
1. 当处理程序失败时，组件中止该事务：处理程序在其中发布的记录（即携带事务令牌的记录）对 `read_committed` 消费者永远不可见，并且只要 `consumeRetryEnabled` 为 `"true"`（默认值），该消息就会被重新投递。重新投递受此组件的 `backOff*` 元数据约束，默认不限次数；如需限制，请设置 `backOffMaxRetries`。Dapr 弹性策略只约束单次处理程序调用，不约束重新投递循环。从 Dapr 1.19 开始，一旦处理程序的重试策略耗尽，组件会在事务之外自行提交偏移量，而不再无限期地重新投递该消息。

例如，一个回传令牌的 HTTP 订阅者：

```
# 投递到达时，令牌作为头传入：
#   POST /orders
#   __txnToken: <opaque token>

# 处理程序回传令牌发布其结果，然后返回成功：
curl -X POST "http://localhost:3500/v1.0/publish/kafka-pubsub/processed-orders?metadata.__txnToken=<opaque token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "42", "status": "processed"}'
```

消费者事务隐含 `read_committed` 隔离级别：未设置 `consumerIsolationLevel` 时会自动选择该级别，而显式设置为 `"read_uncommitted"` 会导致校验失败。使用[批量订阅]({{% ref pubsub-bulk.md %}})时，整批是全有或全无的：任何一条失败都会中止并重新投递整批消息。

{{% alert title="携带令牌的发布必须使用同一个组件" color="warning" %}}
事务是按组件实例跟踪的。携带令牌的发布必须通过**投递该消息的同一个 Kafka 发布订阅组件**进行：通过*不同* Kafka 组件发布携带令牌的消息会明确失败；过期的令牌（例如处理程序已经返回之后）同样会明确失败，而不会悄悄地在事务之外发布。非 Kafka 组件会忽略令牌，并在任何事务之外发布。
{{% /alert %}}

{{% alert title="不携带令牌的发布位于事务之外" color="warning" %}}
不携带令牌的发布是普通发布：它会独立于投递所在的事务提交，即使是在处理程序内部发起的也是如此。如果之后该投递被重试，这次发布会重复执行。只有携带令牌的发布才受精确一次保证覆盖。
{{% /alert %}}

#### 保证的范围

精确一次保证覆盖的是 Kafka 记录和消费者偏移量：输出发布与输入偏移量的提交或中止会一起发生。你的处理程序本身仍然是至少一次执行的：Kafka 之外的副作用（数据库写入、外部 API 调用）不属于该事务，应当具备幂等性。

#### 事务超时

使用消费者事务时，事务会在整个处理程序调用期间保持打开，因此 `transactionTimeout`（默认 `60s`）必须大于你预期中最慢的处理程序耗时；超时后，代理会中止该事务，并重试该投递。该值不得超过代理的 `transaction.max.timeout.ms`（默认为 15 分钟）：代理在生产者初始化时会拒绝更大的值，这会导致每次投递都失败（如果同时设置了 `producerTransactionsEnabled`，组件甚至无法启动）。对于慢于代理上限的处理程序，请在代理上提高 `transaction.max.timeout.ms`。

#### 扩缩容、僵尸实例隔离与 transactionalIdPrefix

使用消费者事务时，每个主题分区都以稳定的 `transactional.id` `"<prefix>-<digest>-<partition>"` 进行生产，其中 `digest` 是对消费者组、一个 NUL 字节和主题依次计算 SHA-256 后取前 8 个字节，并以小写十六进制表示。正是这种稳定性提供了僵尸实例隔离：当分区在重新平衡或崩溃后移动到另一个副本时，新副本的生产者会隔离旧实例，并且在开始重新处理之前，中止旧实例遗留的任何未结束事务。

前缀默认取 `clientID`，其次为 `"dapr"`，也可以通过 `transactionalIdPrefix` 显式设置。它必须在消费应用的**每个副本上解析为相同的值**：不要将按副本模板化的 `clientID`（如 `"{podName}"`）用作实际前缀，否则副本之间无法相互隔离。

消费者组和主题不直接写入 id，而是先做摘要，因为 `-` 在两者中都是合法字符：如果直接写入，消费者组 `a-b` 搭配主题 `c` 与消费者组 `a` 搭配主题 `b-c` 就会注册出相同的 id；两个组件共享同一 id，会在每次事务中互相隔离对方的生产者，而且不会有任何错误指明原因。前缀则原样保留，因此 `<prefix>-*` 形式的代理 ACL 模式不受影响。

要把代理上看到的 `transactional.id` 反推回消费者组和主题，请对候选值重新计算摘要：

```bash
# sha256sum 来自 coreutils；macOS 上请使用：shasum -a 256
printf '%s\0%s' "<consumerGroup>" "<topic>" | sha256sum | cut -c1-16
```

{{% alert title="绑定" color="info" %}}
消费者事务只在 Kafka **发布订阅**组件上可用。[Kafka 绑定]({{% ref kafka.md %}})支持 `producerTransactionsEnabled` 以实现事务性输出，但在初始化时会拒绝 `consumerTransactionsEnabled`：精确一次的 consume-transform-produce 要求事务令牌经由同一个组件实例回传，而绑定模型（输入绑定与输出绑定是两个独立实例）无法做到这一点。
{{% /alert %}}

## 每次调用的元数据字段

### 分区键

调用 Kafka 发布订阅时，可以通过请求 URL 中的 `metadata` 查询参数提供可选的分区键。

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

### 分区号

调用 Kafka 发布订阅时，可以通过请求 URL 中的 `metadata` 查询参数提供可选的分区号。这样可以直接指定目标 Kafka 分区，绕过 `partitionKey` 所使用的基于哈希的分区分配。

参数名为 `partitionNumber`，其值必须是非负整数，且位于主题的分区范围内（`0` 到 `partitionCount - 1`）。如果该值超出范围、为负数或不是有效整数，发布会失败并返回错误。

如果同时提供了 `partitionNumber` 和 `partitionKey`（或 `__key`），分区选择以 `partitionNumber` 为准。`partitionKey` 仍会被设置到 Kafka 消息记录中。

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

启用[消费者事务](#精确一次的-consume-transform-produce)后，发布可以携带 `__txnToken` 元数据条目，以加入其接收时所属投递的打开事务。该令牌永远不会写入发出的 Kafka 消息头。

### 消息头

所有其他元数据键值对（即不是 `partitionKey`、`__key`、`partitionNumber` 或 `__txnToken` 的条目）都会作为 Kafka 消息的消息头设置。下面的示例为消息设置了 `correlationId`。

```shell
curl -X POST http://localhost:3500/v1.0/publish/myKafka/myTopic?metadata.correlationId=myCorrelationID&metadata.partitionKey=key1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```
### 消费者端接收的 Kafka 发布订阅特殊消息头

消费消息时，特殊的消息元数据会自动作为消息头传递。它们包括：
- `__key`：消息键（如果有）
- `__topic`：消息所属的主题
- `__partition`：消息所在的分区号
- `__offset`：消息在分区中的偏移量
- `__timestamp`：消息的时间戳
- `__txnToken`：该投递的事务令牌，仅在启用[消费者事务](#精确一次的-consume-transform-produce)时存在

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

## 接收带有特殊字符的消息头

消费者应用可能需要接收包含特殊字符的消息头，而这可能导致 HTTP 协议校验错误。
HTTP 头的值必须符合规范，因此某些字符是不允许的。[了解更多协议相关信息](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2)。
在这种情况下，你可以启用 `escapeHeaders` 配置项，它会在消费者端使用 URL 转义对消息头的值进行编码。

{{% alert title="注意" color="primary" %}}
使用此设置后，接收到的消息头会经过 URL 转义，你需要进行 URL 反转义，才能得到原始值。
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
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: consumerGroup # 可选。用于输入绑定。
    value: "group1"
  - name: clientID # 可选。被 Kafka 代理用作客户端追踪 ID。
    value: "my-dapr-app-id"
  - name: authType # 必需。
    value: "none"
  - name: escapeHeaders
    value: "true"
```

## Avro Schema Registry 序列化/反序列化
你可以配置发布订阅，使其发布或消费采用 [Avro 二进制序列化](https://avro.apache.org/docs/)编码的数据，并利用 [Apache Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)（例如 [Confluent Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)、[Apicurio](https://www.apicur.io/registry/)）。

### 配置

{{% alert title="重要" color="warning" %}}
目前仅支持消息值的序列化/反序列化。由于不支持 Cloud Events，发布 Avro 消息时必须传递 `rawPayload=true` 元数据。

请注意，消费者**不应**设置 `rawPayload=true`，因为消息值会被包装进 CloudEvent 并进行 base64 编码。将 `rawPayload` 保留为默认值（即 `false`），会把经 Avro 解码后的消息以 JSON 负载的形式发送给应用。

将 `useAvroJson` 组件元数据设置为 `true` 时，入站/出站的 Avro 二进制会与 Avro JSON 编码相互转换。
当需要精确的类型映射时，这种方式可能更合适。
默认使用标准 JSON，通常更容易绑定到应用中的原生类型。
{{% /alert %}}

配置 Kafka 发布订阅组件的元数据时，你必须定义：
- Schema Registry URL
- API 密钥/密钥（如适用）

Schema 主题会按照标准命名约定，根据主题名称自动推导。例如，对于名为 `my-topic` 的主题，其 schema 主题为 `my-topic-value`。
在服务中与消息负载交互时，负载为 JSON 格式。负载会在 Dapr 组件内部透明地完成序列化/反序列化。
日期/日期时间字段必须以 [Epoch Unix 时间戳](https://en.wikipedia.org/wiki/Unix_time)等价值传递（而不是常见的 ISO 8601 格式）。例如：
- `2024-01-10T04:36:05.986Z` 应以 `1704861365986` 传递（自 1970 年 1 月 1 日以来的毫秒数）
- `2024-01-10` 应以 `19732` 传递（自 1970 年 1 月 1 日以来的天数）

### 发布 Avro 消息
为了告诉 Kafka 发布订阅组件该消息应使用 Avro 序列化，必须将 `valueSchemaType` 元数据设置为 `Avro`。

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
    # 创建带有内容类型和消息体的类型化消息
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
为了告诉 Kafka 发布订阅组件该消息应使用 Avro 反序列化，必须在订阅元数据中将 `valueSchemaType` 元数据设置为 `Avro`。

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

例如，要以 Avro 格式发布，就需要设置 `valueSchemaType=Avro` 元数据。

然而，默认情况下，这些元数据项会被转换为 Kafka 消息头并随消息一起发布。这种默认行为对于在发布者与消费者的调用链中传递追踪头非常有用。

但在某些场景下，它会带来不希望出现的副作用。
假设你使用 Dapr 消费了带有上述消息头的 Avro 消息。如果这条消息无法成功消费，并且被配置为发送到死信主题，那么在发布到死信主题时，`valueSchemaType=Avro` 会被自动带过去，这就要求为该主题配置相应的 schema。在许多场景下，最好只以 JSON 格式发布死信消息，因为无法遵守某个固定的 schema。

为避免这种行为，可以配置 kafka-pubsub 组件，使其将某些元数据键排除在消息头与元数据之间的转换之外。
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub-exclude-metadata
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers # 必需。Kafka 代理连接设置
    value: "dapr-kafka.myapp.svc.cluster.local:9092"
  - name: authType # 必需。
    value: "none"
  - name: excludeHeaderMetaRegex
    value: "^valueSchemaType$" # 可选。排除 `valueSchemaType` 不被发布为消息头，也不被转换为元数据
```

### 覆盖默认的消费者组重新平衡
在 Kafka 中，重新平衡策略决定了如何在消费者组内把分区分配给消费者。默认策略是 "range"，此外还可以使用 "roundrobin" 和 "sticky"。
- `Range`：
分区按字典顺序分配给消费者。
例如，如果有三个分区（0、1、2）和两个消费者（A、B），消费者 A 可能获得分区 0 和 1，而消费者 B 获得分区 2。
- `RoundRobin`：
分区以轮询方式分配给消费者。
沿用上面的同一示例，消费者 A 可能获得分区 0 和 2，而消费者 B 获得分区 1。
- `Sticky`：
该策略尽可能保留之前的分配结果，同时仍保持分配均衡。
如果有消费者离开或加入组，只会重新分配受影响的分区，从而把干扰降到最低。

#### 选择策略：
- `Range`：
简单易懂、易于实现，但如果分区大小差异很大，可能导致分布不均。
- `RoundRobin`：
在许多情况下能提供较好的均衡，但如果消息键分布不均，可能不是最佳选择。
- `Sticky`：
通常是首选，因为它能在重新平衡期间把干扰降到最低，尤其是在分区数量很多或消费者组频繁变动时。

## 创建 Kafka 实例

{{< tabpane text=true >}}

{{% tab "自托管" %}}
你可以使用[这个](https://github.com/wurstmeister/kafka-docker) Docker 镜像在本地运行 Kafka。
要在不使用 Docker 的情况下运行，请参阅[这里](https://kafka.apache.org/quickstart)的入门指南。
{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 上运行 Kafka，你可以使用任何 Kafka Operator，例如 [Strimzi](https://strimzi.io/quickstarts/)。
{{% /tab %}}

{{< /tabpane >}}


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md##step-1-setup-the-pubsub-component" %}})，了解如何配置发布订阅组件
- [发布订阅构建块]({{% ref pubsub %}})
