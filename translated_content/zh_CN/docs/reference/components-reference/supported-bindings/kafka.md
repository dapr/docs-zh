---
type: docs
title: "Kafka 绑定规范"
linkTitle: "Kafka"
description: "Kafka 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/kafka/"
---

## 组件格式

要设置 Kafka 绑定，请创建一个类型为 `bindings.kafka` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。有关使用 `secretKeyRef` 的详细信息，请参阅[如何在组件中引用密钥]({{% ref component-secrets.md %}})指南。

所有组件元数据字段值都可以携带[模板化元数据值]({{% ref "component-schema.md#templated-metadata-values" %}})，这些值在 Dapr 边车启动时解析。
例如，您可以选择使用 `{namespace}` 作为 `consumerGroup`，以便在不同的命名空间中使用相同的主题和相同的 `appId`，如[本文]({{% ref "howto-namespace.md#with-namespace-consumer-groups"%}})中所述。

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

| 字段              | 必需 | 绑定支持 |  详细说明 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `topics` | N | 输入 | 以逗号分隔的主题字符串。 | `"mytopic1,topic2"` |
| `brokers` | Y | 输入/输出 | 以逗号分隔的 Kafka broker 字符串。 | `"localhost:9092,dapr-kafka.myapp.svc.cluster.local:9093"` |
| `clientID`            | N | 输入/输出 | 用户提供的字符串，随每个请求发送到 Kafka broker，用于日志记录、调试和审计目的。 | `"my-dapr-app"` |
| `consumerGroup` | N | 输入 | 用于监听的 Kafka 消费者组。发布到主题的每条记录都会传递给订阅该主题的每个消费者组中的一个消费者。 | `"group1"` |
| `consumeRetryEnabled` | N | 输入/输出 | 通过设置为 `"true"` 来启用消费重试。在 Kafka 绑定组件中默认为 `false`。 | `"true"`, `"false"` |
| `publishTopic` | Y | 输出 | 要发布到的主题。 | `"mytopic"` |
| `authRequired` | N | *已弃用* | 使用 Kafka broker 启用 [SASL](https://en.wikipedia.org/wiki/Simple_Authentication_and_Security_Layer) 身份验证。 | `"true"`, `"false"` |
| `authType`            | Y | 输入/输出 | 配置或禁用身份验证。支持的值：`none`、`password`、`mtls`、`oidc` 或 `oidc_private_key_jwt` | `"password"`, `"none"` |
| `saslUsername` | N | 输入/输出 | 用于身份验证的 SASL 用户名。仅当 `authRequired` 设置为 `"true"` 时才需要。 | `"adminuser"` |
| `saslPassword` | N | 输入/输出 | 用于身份验证的 SASL 密码。可以是 `secretKeyRef` 以使用[密钥引用]({{% ref component-secrets.md %}})。仅当 `authRequired` 设置为 `"true"` 时才需要。 | `""`, `"KeFg23!"` |
| `saslMechanism` | N | 输入/输出 | 您想使用的 SASL 身份验证机制。仅当 `authtype` 设置为 `"password"` 时才需要。如果未提供，默认为 `PLAINTEXT`，这可能会导致某些服务（如 Amazon Managed Service for Kafka）中断。 | `"SHA-512", "SHA-256", "PLAINTEXT"` |
| `initialOffset`   | N | 输入 | 如果之前未提交偏移量，则使用的初始偏移量。应为 "newest" 或 "oldest"。默认为 "newest"。 | `"oldest"` |
| `maxMessageBytes` | N | 输入/输出 | 单个 Kafka 消息允许的最大字节数。默认为 1024。 | `"2048"` |
| `oidcTokenEndpoint` | N | 输入/输出 | OAuth2 身份提供者访问令牌端点的完整 URL。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时必需 | "https://identity.example.com/v1/token" |
| `oidcClientID` | N | 输入/输出 | 在身份提供者中预配的 OAuth2 客户端 ID。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时必需 | `"dapr-kafka"` |
| `oidcClientSecret` | N | 输入/输出 | 在身份提供者中预配的 OAuth2 客户端密钥：当 `authType` 设置为 `oidc` 时必需 | `"KeFg23!"` |
| `oidcScopes` | N | 输入/输出 | 使用访问令牌请求的以逗号分隔的 OAuth2/OIDC 范围列表。当 `authType` 设置为 `oidc` 或 `oidc_private_key_jwt` 时建议使用。默认为 `"openid"` | `"openid,kafka-prod"` |
| `oidcClientAssertionCert` | N | 输入/输出 | 用于身份验证的 OAuth2 客户端断言证书。当 `authType` 设置为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"` |
| `oidcClientAssertionKey` | N | 输入/输出 | 用于身份验证的 OAuth2 客户端断言密钥。当 `authType` 设置为 `oidc_private_key_jwt` 时必需。可以是 `secretKeyRef` 以使用密钥引用 | `"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"` |
| `oidcResource` | N | 输入/输出 | 使用访问令牌请求的 OAuth2 资源。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"api://kafka"` |
| `oidcAudience` | N | 输入/输出 | 使用访问令牌请求的 OAuth2 受众。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"http://<idp-host>/realms/local"` |
| `oidcKid` | N | 输入/输出 | 使用访问令牌请求的 OAuth2 密钥 ID (kid)。当 `authType` 设置为 `oidc_private_key_jwt` 时建议使用。 | `"1234567890"` |
| `version` | N | 输入/输出 | Kafka 集群版本。默认为 2.0.0。请注意，对于 EventHubs with Kafka，此值必须强制设置为 `1.0.0`。 | `"1.0.0"` |
| `direction` | N | 输入/输出 | 绑定的方向。 | `"input"`, `"output"`, `"input, output"` |
| `oidcExtensions` | N | 输入/输出 | 包含 JSON 编码字典的字符串，表示使用访问令牌请求的 OAuth2/OIDC 扩展 | `{"cluster":"kafka","poolid":"kafkapool"}` |
| `schemaRegistryURL` | N | 使用 Schema Registry Avro 序列化/反序列化时必需。Schema Registry URL。 | `http://localhost:8081` |
| `schemaRegistryAPIKey` | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API Key。 | `XYAXXAZ` |
| `schemaRegistryAPISecret` | N | 使用 Schema Registry Avro 序列化/反序列化时。Schema Registry 凭证 API Secret。 | `ABCDEFGMEADFF` |
| `schemaCachingEnabled` | N | 使用 Schema Registry Avro 序列化/反序列化时。启用 schema 缓存。默认为 `true` | `true` |
| `schemaLatestVersionCacheTTL` | N | 使用 Schema Registry Avro 序列化/反序列化时。使用可用最新 schema 发布消息时 schema 缓存的 TTL。默认为 5 分钟 | `5m` |
| `clientConnectionTopicMetadataRefreshInterval` | N | 输入/输出 | 客户端连接的主题元数据与 broker 刷新的时间间隔，以 Go duration 格式表示。默认为 `9m`。 | `"4m"` |
| `clientConnectionKeepAliveInterval` | N | 输入/输出 | 客户端连接在与 broker 保持连接的最大时间，以 Go duration 格式表示，之后将关闭连接。零值（默认）表示无限期保持连接。 | `"4m"` |
| `consumerFetchDefault` | N | 输入/输出 | 在每个请求中从 broker 获取的默认消息字节数。默认为 `"1048576"` 字节。 | `"2097152"` |
| `heartbeatInterval` | N | 输入 | 向消费者协调器发送心跳的间隔。该值最多应设置为 `sessionTimeout` 值的 1/3。默认为 `"3s"`。 | `"5s"` |
| `sessionTimeout` | N | 输入 | 使用 Kafka 的组管理功能时用于检测客户端故障的超时时间。如果 broker 在此会话超时到期前未能收到来自消费者的任何心跳，则消费者将被移除并启动重新平衡。默认为 `"10s"`。 | `"20s"` |
| `escapeHeaders` | N | 输入 | 启用消费者接收的消息标头值的 URL 转义。允许接收通常在 HTTP 标题中不允许的特殊字符内容。默认为 `false`。 | `true` |

#### 注意
使用 Azure EventHubs with Kafka 时，元数据 `version` 必须设置为 `1.0.0`。

## 绑定支持

此组件同时支持**输入和输出**绑定接口。

此组件支持以下操作的**输出绑定**：

- `create`

## 身份验证

Kafka 支持多种身份验证方案，Dapr 支持其中几种：SASL 密码、mTLS、OIDC/OAuth2。[了解有关 Kafka 绑定和 Kafka 发布订阅组件的 Kafka 身份验证方法的更多信息]({{% ref "setup-apache-kafka.md#authentication" %}})。

## 指定分区键

调用 Kafka 绑定时，可以通过在请求正文中使用 `metadata` 部分来提供可选的分区键。

字段名称为 `partitionKey`。

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

如果成功，将返回 HTTP 204（无内容）和空正文。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
