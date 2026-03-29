---
type: docs
title: "Apache Kafka"
linkTitle: "Apache Kafka"
description: "Apache Kafka 发布订阅组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-apache-kafka/"
---

## 组件格式

要设置 Apache Kafka 发布订阅，请创建类型为 `pubsub.kafka` 的组件。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 是如何自动生成的。请阅读[操作指南：发布与订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})以了解如何创建和应用发布订阅配置。

所有组件元数据字段值都可以携带[模板化元数据值]({{% ref "component-schema.md#templated-metadata-values" %}})，这些值在 Dapr 边车启动时解析。
例如，您可以选择使用 `{namespace}` 作为 `consumerGroup`，以支持在不同的命名空间中使用相同的 `appId` 和相同的主题，如[本文]({{% ref "howto-namespace.md#with-namespace-consumer-groups"%}})中所述。

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
  - name: disableTls # 可选。禁用 TLS。这对生产环境不安全！！您应该阅读 `Mutual TLS` 部分以了解如何使用 TLS。
    value: "true"
  - name: consumerFetchMin # 可选。高级设置。单个请求中获取的最小消息字节数 - 代理将等待直到至少有这么多数据可用。
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
  - name: schemaRegistryAPISecret # 可选。使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API 密钥。
    value: "ABCDEFGMEADFF"
  - name: schemaCachingEnabled # 可选。使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。
    value: true
  - name: schemaLatestVersionCacheTTL # 可选。使用 Schema Registry Avro 序列化/反序列化时。使用最新可用 schema 发布消息时的 schema 缓存 TTL。
    value: 5m
  - name: useAvroJson # 可选。启用 Avro JSON schema 进行序列化，而不是默认的 Standard JSON。仅当订阅使用 valueSchemaType=Avro 时适用
    value: "true"
  - name: escapeHeaders # 可选。
    value: false

```

> 有关使用 `secretKeyRef` 的详细信息，请参阅[如何在组件中引用密钥]({{% ref component-secrets.md %}})指南。

## 规格元数据字段

| 字段              | 必需 | 详细信息 | 示例 |
|--------------------|:--------:|---------|---------|
| brokers             | Y | 以逗号分隔的 Kafka 代理列表。 | `"localhost:9092,dapr-kafka.myapp.svc.cluster.local:9093"`
| consumerGroup       | N | 要监听的 Kafka 消费者组。发布到主题的每条记录都会传递给订阅该主题的每个消费者组中的一个消费者。如果提供了 `consumerGroup` 的值，任何 `consumerID` 的值都将被忽略 - 取而代之的是，将设置消费者组和随机唯一标识符的组合作为 `consumerID`。 | `"group1"`
| consumerID       | N | 消费者 ID（消费者标签）将一个或多个消费者组织成一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，消息只由组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID（`appID`）值。如果提供了 `consumerGroup` 的值，任何 `consumerID` 的值都将被忽略 - 取而代之的是，将设置消费者组和随机唯一标识符的组合作为 `consumerID`。  | 可以设置为字符串值（如上例中的 `"channel1"`）或字符串格式的值（如 `"{podName}"` 等）。[查看您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| clientID            | N | 用户提供的字符串，随每个请求发送到 Kafka 代理，用于日志记录、调试和审计目的。默认为 Kubernetes 模式的 `"namespace.appID"` 或自托管模式的 `"appID"`。 | `"my-namespace.my-dapr-app"`, `"my-dapr-app"`
| authRequired        | N | *已弃用* 使用 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 与 Kafka 代理进行身份验证。 | `"true"`, `"false"`
| authType            | Y | 配置或禁用身份验证。支持的值：`none`、`password`、`mtls`、`oidc`、`oidc_private_key_jwt` 或 `awsiam` | `"password"`, `"none"`
| saslUsername        | N | 用于身份验证的 SASL 用户名。仅当 `authType` 设置为 `"password"` 时才需要。 | `"adminuser"`
| saslPassword        | N | 用于身份验证的 SASL 密码。可以是 `secretKeyRef` 以使用[密钥引用]({{% ref component-secrets.md %}})。仅当 `authType` 设置为 `"password"` 时才需要。 | `""`, `"KeFg23!"`
| saslMechanism      | N | 您希望使用的 SASL 身份验证机制。仅当 `authType` 设置为 `"password"` 时才需要。默认为 `PLAINTEXT` | `"SHA-512", "SHA-256", "PLAINTEXT"`
| initialOffset       | N | 如果之前未提交偏移量，则使用的初始偏移量。应该是 "newest" 或 "oldest"。默认为 "newest"。 | `"oldest"`
| maxMessageBytes     | N | 单个 Kafka 消息允许的最大字节大小。默认为 1024。 | `2048`
| consumeRetryInterval | N | 尝试使用主题时重试之间的间隔。将没有后缀的数字视为毫秒。默认为 100ms。 | `200ms` |
| consumeRetryEnabled | N | 通过设置 `"false"` 来禁用消费重试 | `"true"`, `"false"` |
| version               | N | Kafka 集群版本。默认为 2.0.0。请注意，如果您使用的是 Azure EventHubs with Kafka，则必须将其设置为 `1.0.0`。 | `0.10.2.0` |
| caCert | N | 证书颁发机构证书，使用 TLS 所需。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert | N | 客户端证书，`authType` `mtls` 所需。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | N | 客户端密钥，`authType` `mtls` 所需。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`
| skipVerify | N | 跳过 TLS 验证，不建议在生产环境中使用。默认为 `"false"` | `"true"`, `"false"` |
| disableTls | N | 禁用传输安全性的 TLS。要禁用，您需要将值设置为 `"true"`。不建议在生产环境中使用。默认为 `"false"`。 | `"true"`, `"false"` |
| oidcTokenEndpoint | N | OAuth2 身份提供者访问令牌端点的完整 URL。当 `authType` 设置为 `oidc` 时需要 | "https://identity.example.com/v1/token" |
| oidcClientID | N | 在身份提供者中配置的 OAuth2 客户端 ID。当 `authType` 设置为 `oidc` 时需要 | `dapr-kafka` |
| oidcClientSecret | N | 在身份提供者中配置的 OAuth2 客户端密钥。当 `authType` 设置为 `oidc` 时需要 | `"KeFg23!"` |
| oidcScopes | N | 使用访问令牌请求的 OAuth2/OIDC 范围的逗号分隔列表。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时建议使用。默认为 `"openid"` | `"openid,kafka-prod"` |
| oidcClientAssertionCert | N | 用于身份验证的 OAuth2 客户端断言证书。当 `authType` 设置为 `oidc_private_key_jwt` 时需要。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"` |
| oidcClientAssertionKey | N | 用于身份验证的 OAuth2 客户端断言密钥。当 `authType` 设置为 `oidc_private_key_jwt` 时需要。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"` |
| oidcResource | N | 使用访问令牌请求的 OAuth2 资源。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"api://kafka"` |
| oidcAudience | N | 使用访问令牌请求的 OAuth2 受众。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"http://<idp-host>/realms/local"` |
| oidcKid | N | 使用访问令牌请求的 OAuth2 密钥 ID（kid）。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"1234567890"` |
| oidcExtensions | N | 包含使用访问令牌请求的 OAuth2/OIDC 扩展的 JSON 编码字典的字符串 | `{"cluster":"kafka","poolid":"kafkapool"}` |
| awsRegion | N | 这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'region'。部署 Kafka 集群的 AWS 区域。当 `authType` 设置为 `awsiam` 时需要 | `us-west-1` |
| awsAccessKey | N  |  这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥。 | `"accessKey"`
| awsSecretKey | N  | 这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'secretKey'。与访问密钥关联的密钥。 | `"secretKey"`
| awsSessionToken | N  | 这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅当您使用临时安全凭证时才需要会话令牌。 | `"sessionToken"`
| awsIamRoleArn | N  | 这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'assumeRoleArn'。有权访问 AWS Managed Streaming for Apache Kafka (MSK) 的 IAM 角色。这是使用 AWS 凭证对 MSK 进行身份验证的另一种选择。 | `"arn:aws:iam::123456789:role/mskRole"`
| awsStsSessionName | N  | 这保持与现有字段的向后兼容性。它将从 Dapr 1.17 开始弃用。请改用 'sessionName'。表示承担角色的会话名称。 | `"DaprDefaultSession"`
| schemaRegistryURL | N | 使用 Schema Registry Avro 序列化/反序列化时需要。Schema Registry URL。 | `http://localhost:8081` |
| schemaRegistryAPIKey | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API 密钥。 | `XYAXXAZ` |
| schemaRegistryAPISecret | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API 密钥。 | `ABCDEFGMEADFF` |
| schemaCachingEnabled | N | 使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。默认为 `true` | `true` |
| schemaLatestVersionCacheTTL | N | 使用 Schema Registry Avro 序列化/反序列化时。使用最新可用 schema 发布消息时的 schema 缓存 TTL。默认为 5 分钟 | `5m` |
| useAvroJson | N | 启用 Avro JSON schema 进行序列化，而不是默认的 Standard JSON。仅当订阅使用 valueSchemaType=Avro 时适用。默认为 `"false"` | `"true"` |
| clientConnectionTopicMetadataRefreshInterval | N | 客户端连接的主题元数据与代理刷新的间隔，以 Go 持续时间表示。默认为 `9m`。 | `"4m"` |
| clientConnectionKeepAliveInterval | N | 客户端连接在与代理保持活动状态的最大时间（以 Go 持续时间表示），然后关闭连接。零值（默认）表示无限期保持活动。 | `"4m"` |
| consumerFetchMin | N | 单个请求中获取的最小消息字节数 - 代理将等待直到至少有这么多数据可用。默认为 `1`，因为 `0` 会导致在没有可用消息时消费者空转。等效于 JVM 的 `fetch.min.bytes`。 | `"2"` |
| consumerFetchDefault | N | 每个请求从代理获取的默认消息字节数。默认为 `"1048576"` 字节。 | `"2097152"` |
| channelBufferSize | N | 在内部和外部通道中缓冲的事件数量。这允许生产者和消费者在用户代码工作时在后台继续处理某些消息，从而大大提高吞吐量。默认为 `256`。 | `"512"` |
| heartbeatInterval | N | 向消费者协调器发送心跳之间的间隔。该值最多应设置为 `sessionTimeout` 值的 1/3。默认为 "3s"。 | `"5s"` |
| sessionTimeout | N | 使用 Kafka 的组管理功能时用于检测客户端故障的超时时间。如果代理在此会话超时到期前未能收到消费者的任何心跳，则消费者将被移除并启动重新平衡。默认为 "10s"。 | `"20s"` |
| consumerGroupRebalanceStrategy | N | 用于消费者组重新平衡的策略。支持的值：`range`、`sticky`、`roundrobin`。默认为 `range` | `"sticky"` |
| escapeHeaders | N | 启用消费者接收的消息头值的 URL 转义。允许接收通常在 HTTP 头中不允许的特殊字符的内容。默认为 `false`。 | `true` |
| excludeHeaderMetaRegex | N | 一个正则表达式，用于在消费消息时排除将某些键从头转换为元数据，以及在发布消息时从元数据转换为头。此功能避免了主题消费者的意外下游副作用。 | '"^valueSchemaType$"'

上述的 `secretKeyRef` 引用了 [kubernetes secrets store]({{% ref kubernetes-secret-store.md %}}) 来访问 tls 信息。访问[这里]({{% ref setup-secret-store.md %}})以了解更多有关如何配置密钥存储组件的信息。

#### 注意
当使用 Azure EventHubs with Kafka 时，元数据 `version` 必须设置为 `1.0.0`。

### 身份验证

Kafka 支持多种身份验证方案，Dapr 支持其中几种：SASL 密码、mTLS、OIDC/OAuth2。随着新增的身份验证方法，`authRequired` 字段已从 v1.6 版本开始弃用，而应使用 `authType` 字段。如果 `authRequired` 设置为 `true`，Dapr 将尝试根据 `saslPassword` 的值正确配置 `authType`。`authType` 的有效值为：
- `none`
- `password`
- `certificate`
- `mtls`
- `oidc`
- `oidc_private_key_jwt`
- `awsiam`

{{% alert title="注意" color="primary" %}}
`authType` 仅用于身份验证。授权仍在 Kafka 中配置，但 `awsiam` 除外，它还可以驱动在 AWS IAM 中配置的授权决策。
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

将 `authType` 设置为 `mtls` 使用 x509 客户端证书（`clientCert` 字段）和密钥（`clientKey` 字段）进行身份验证。请注意，mTLS 作为一种身份验证机制与使用 TLS 通过加密保护传输层是不同的。mTLS 需要 TLS 传输（意味着 `disableTls` 必须为 `false`），但保护传输层不需要使用 mTLS。有关配置底层 TLS 传输的信息，请参阅[使用 TLS 通信](#communication-using-tls)。

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

将 `authType` 设置为 `oidc` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供者指定不记名令牌。目前，仅支持 **client_credentials** 授权。

将 `oidcTokenEndpoint` 配置为身份提供者访问令牌端点的完整 URL。

将 `oidcClientID` 和 `oidcClientSecret` 设置为在身份提供者中配置的客户端凭证。

如果在组件配置中指定了 `caCert`，该证书将附加到系统 CA 信任中以验证身份提供者证书。同样，如果在组件配置中指定了 `skipVerify`，则在访问身份提供者时也将跳过验证。

默认情况下，为令牌请求的唯一范围是 `openid`；强烈建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka 代理进行验证。如果不使用其他范围来缩小访问令牌的有效性，受损的 Kafka 代理可能会重放令牌以 Dapr clientID 的身份访问其他服务。

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
  - name: oidcScopes        # 如果 authType 为 `oidc` 则建议使用。
    value: "openid,kafka-dev"
  - name: caCert            # 也应用于验证 OIDC 提供者证书
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

将 `authType` 设置为 `oidc_private_key_jwt` 可通过 **OAUTHBEARER** 机制启用 SASL 身份验证。这支持从外部 OAuth2 或 [OIDC](https://en.wikipedia.org/wiki/OpenID) 身份提供者指定私钥 JWT。目前，仅支持 **client_credentials** 授权。

将 `oidcTokenEndpoint` 配置为身份提供者访问令牌端点的完整 URL。

将 `oidcClientID` 设置为客户端 ID，`oidcClientAssertionCert` 设置为客户端断言证书，`oidcClientAssertionKey` 设置为在身份提供者中配置的客户端断言密钥。

如果在组件配置中指定了 `caCert`，该证书将附加到系统 CA 信任中以验证身份提供者证书。同样，如果在组件配置中指定了 `skipVerify`，则在访问身份提供者时也将跳过验证。

默认情况下，为令牌请求的唯一范围是 `openid`；强烈建议通过 `oidcScopes` 以逗号分隔的列表指定其他范围，并由 Kafka 代理进行验证。如果不使用其他范围来缩小访问令牌的有效性，受损的 Kafka 代理可能会重放令牌以 Dapr clientID 的身份访问其他服务。

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
  - name: oidcScopes        # 如果 authType 为 `oidc_private_key_jwt` 则建议使用。
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

支持使用 AWS IAM 与 MSK 进行身份验证。将 `authType` 设置为 `awsiam` 使用 AWS SDK 生成身份验证令牌进行身份验证。
{{% alert title="注意" color="primary" %}}
唯一必需的元数据字段是 `region`。如果未提供 `accessKey` 和 `secretKey`，您可以使用 AWS IAM 服务账户角色对 Kafka 集群进行无密码身份验证。
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

默认情况下，启用 TLS 以保护到 Kafka 的传输层。要禁用 TLS，请将 `disableTls` 设置为 `true`。启用 TLS 后，您可以使用 `skipVerify` 禁用验证（在生产环境中*不*推荐）并使用 `caCert` 指定受信任的 TLS 证书颁发机构（CA）来控制服务器证书验证。如果未指定 `caCert`，将使用系统 CA 信任。要配置 mTLS 身份验证，请参阅_身份验证_下的部分。
以下是配置为使用传输层 TLS 的 Kafka 发布订阅组件的示例：

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

当使用单个发布/订阅组件从多个主题消费时，无法保证消费者组中的消费者如何在主题分区之间进行平衡。

例如，假设您订阅了两个主题，每个主题有 10 个分区，并且您有 20 个服务副本从这两个主题消费。无法保证 10 个会被分配给第一个主题，10 个会被分配给第二个主题。相反，分区可能会不均匀地划分，第一个主题分配超过 10 个，其余的分配给第二个主题。

这可能导致监听第一个主题的消费者空闲，而第二个主题的消费者过度扩展，反之亦然。当使用自动伸缩器（如 HPA 或 KEDA）时，也会观察到相同的行为。

如果您遇到此特定问题，建议您为主题配置单个发布/订阅组件，并为每个组件唯一定义消费者组。这可以确保您的服务的所有副本都完全分配给唯一的消费者组，其中每个消费者组针对一个特定主题。

例如，您可以使用以下配置定义两个 Dapr 组件：

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

Apache Kafka 组件支持使用批量发布/订阅 API 在单个操作中发送和接收多条消息。

### 配置批量订阅

订阅主题时，您可以配置 `bulkSubscribe` 选项。有关更多详细信息，请参阅[批量订阅消息]({{% ref "pubsub-bulk#subscribing-messages-in-bulk" %}})。了解更多有关[批量订阅 API]({{% ref pubsub-bulk.md %}})的信息。

Apache Kafka 支持以下批量元数据选项：

| 配置 | 默认值 |
|----------|---------|
| `maxAwaitDurationMs` | `10000` (10s) |
| `maxMessagesCount` | `80` |

## 每次调用的元数据字段

### 分区键

调用 Kafka 发布/订阅时，可以通过在请求 URL 中使用 `metadata` 查询参数来提供可选的分区键。

参数名称可以是 `partitionKey` 或 `__key`

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

### 消息头

所有其他元数据键/值对（不是 `partitionKey` 或 `__key`）都作为 Kafka 消息的头设置。以下是设置消息的 `correlationId` 的示例。

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

消费消息时，特殊消息元数据会作为头自动传递。这些包括：
- `__key`：消息键（如果有）
- `__topic`：消息的主题
- `__partition`：消息的分区号
- `__offset`：消息在分区中的偏移量
- `__timestamp`：消息的时间戳

您可以在消费者端点中按如下方式访问它们：
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

消费者应用程序可能需要接收包含特殊字符的消息头，这可能导致 HTTP 协议验证错误。
HTTP 头值必须遵循规范，因此不允许某些字符。[了解更多有关协议的信息](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2)。
在这种情况下，您可以启用 `escapeHeaders` 配置设置，该设置使用 URL 转义在消费者端对头值进行编码。

{{% alert title="注意" color="primary" %}}
使用此设置时，接收到的消息头是 URL 转义的，您需要 URL "un-escape"（转义）它以获取原始值。
{{% /alert %}}

将 `escapeHeaders` 设置为 `true` 以进行 URL 转义。

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
您可以配置发布/订阅以使用 [Avro 二进制序列化](https://avro.apache.org/docs/)发布或消费编码的数据，利用 [Apache Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)（例如，[Confluent Schema Registry](https://developer.confluent.io/courses/apache-kafka/schema-registry/)、[Apicurio](https://www.apicur.io/registry/)）。

### 配置

{{% alert title="重要" color="warning" %}}
目前，仅支持消息值序列化/反序列化。由于不支持 Cloud Events，因此在发布 Avro 消息时必须传递 `rawPayload=true` 元数据。

请注意，消费者不应设置 `rawPayload=true`，因为消息值将被包装到 CloudEvent 中并进行 base64 编码。将 `rawPayload` 保留为默认值（即 `false`）会将 Avro 解码的消息作为 JSON 负载发送到应用程序。

当将 `useAvroJson` 组件元数据设置为 `true` 时，入站/出站 Avro 二进制会被转换为/从 Avro JSON 编码。
当需要准确的类型映射时，这可能更可取。
默认是标准 JSON，通常更容易绑定到应用程序中的本机类型。
{{% /alert %}}

配置 Kafka 发布/订阅组件元数据时，您必须定义：
- Schema registry URL
- API 密钥/密钥（如果适用）

Schema 主题使用标准命名约定从主题名称自动派生。例如，对于名为 `my-topic` 的主题，schema 主题将是 `my-topic-value`。
在服务内与消息负载交互时，它采用 JSON 格式。负载在 Dapr 组件内透明地序列化/反序列化。
日期/日期时间字段必须作为其 [Epoch Unix 时间戳](https://en.wikipedia.org/wiki/Unix_time)等效值传递（而不是典型的 Iso8601）。例如：
- `2024-01-10T04:36:05.986Z` 应作为 `1704861365986` 传递（自 1970 年 1 月 1 日以来的毫秒数）
- `2024-01-10` 应作为 `19732` 传递（自 1970 年 1 月 1 日以来的天数）

### 发布 Avro 消息
为了向 Kafka 发布/订阅组件指示消息应使用 Avro 序列化，必须将 `valueSchemaType` 元数据设置为 `Avro`。

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
    # Create a typed message with content type and body
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='my-topic',
        data=json.dumps(req_data),
        publish_metadata={'rawPayload': 'true', 'valueSchemaType': 'Avro'}
    )
    # Print the request
    print(req_data, flush=True)
```
{{% /tab %}}

{{< /tabpane >}}


### 订阅 Avro 主题
为了向 Kafka 发布/订阅组件指示消息应使用 Avro 反序列化，必须在订阅元数据中将 `valueSchemaType` 元数据设置为 `Avro`。

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
Dapr 允许通过设置自定义发布元数据来自定义发布行为。

例如，要以 avro 格式发布，需要设置 `valueSchemaType=Avro` 元数据。

然而，默认情况下，这些元数据项会被转换为 Kafka 头并随消息一起发布。这种默认行为对于在发布者/消费者链中转发追踪头非常有用。

但在某些情况下，它会产生不必要的副作用。
假设您使用 Dapr 使用上述头消费 Avro 消息。如果此消息无法成功消费并配置为发送到死信主题，则在发布到死信主题时会自动转发 `valueSchemaType=Avro`，需要设置与此主题关联的 schema。在许多情况下，最好仅以 JSON 格式发布死信消息，因为无法遵守确定的 schema。

要避免此行为，可以配置 kafka-pubsub 组件以排除某些元数据键被转换为/从头。
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
  - name: excludeMetaHeaderRegex
    value: "^valueSchemaType$" # 可选。排除 `valueSchemaType` 头被发布到头并转换为元数据
```

### 覆盖默认消费者组重新平衡
在 Kafka 中，重新平衡策略确定如何在消费者组内将分区分配给消费者。默认策略是 "range"，但也可以使用 "roundrobin" 和 "sticky"。
- `Range`：
分区根据其字典顺序分配给消费者。
如果您有三个分区（0、1、2）和两个消费者（A、B），消费者 A 可能会获得分区 0 和 1，而消费者 B 获得分区 2。
- `RoundRobin`：
分区以循环方式分配给消费者。
在上面的相同示例中，消费者 A 可能会获得分区 0 和 2，而消费者 B 获得分区 1。
- `Sticky`：
此策略旨在尽可能保留以前的分配，同时仍保持平衡的分配。
如果消费者离开或加入组，只会重新分配受影响的分区，从而最大限度地减少中断。

#### 选择策略：
- `Range`：
简单易懂且易于实现，但如果分区大小差异很大，可能会导致分布不均匀。
- `RoundRobin`：
在许多情况下提供了良好的平衡，但如果消息键分布不均匀，可能不是最佳选择。
- `Sticky`：
通常首选，因为它能够在重新平衡期间最大限度地减少中断，尤其是在处理大量分区或频繁的消费者组更改时。

## 创建 Kafka 实例

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用[这个](https://github.com/wurstmeister/kafka-docker) Docker 镜像在本地运行 Kafka。
要在不使用 Docker 的情况下运行，请参阅[这里](https://kafka.apache.org/quickstart)的入门指南。
{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 上运行 Kafka，您可以使用任何 Kafka 运算符，例如 [Strimzi](https://strimzi.io/quickstarts/)。
{{% /tab %}}

{{< /tabpane >}}


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md##step-1-setup-the-pubsub-component" %}})以获取有关配置发布/订阅组件的说明
- [发布/订阅构建块]({{% ref pubsub %}})
