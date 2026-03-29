---
type: docs
title: "Pulsar"
linkTitle: "Pulsar"
description: "Pulsar 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-pulsar/"
---

## 组件格式

要设置 Apache Pulsar 发布订阅，需创建一个类型为 `pubsub.pulsar` 的组件。请参阅 [发布订阅代理组件文件]({{% ref setup-pubsub.md %}}) 以了解 ConsumerID 是如何自动生成的。阅读 [操作指南：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}}) 以了解如何创建和应用发布订阅配置。

关于 Apache Pulsar 的更多信息，[请阅读官方文档](https://pulsar.apache.org/docs/en/concepts-overview/)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pulsar-pubsub
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: enableTLS
    value: "false"
  - name: tenant
    value: "public"
  - name: token
    value: "eyJrZXlJZCI6InB1bHNhci1wajU0cXd3ZHB6NGIiLCJhbGciOiJIUzI1NiJ9.eyJzd"
  - name: consumerID
    value: "channel1"
  - name: namespace
    value: "default"
  - name: persistent
    value: "true"
  - name: disableBatching
    value: "false"
  - name: receiverQueueSize
    value: "1000"
  - name: <topic-name>.jsonschema # 为配置的主题设置 json schema 验证
    value: |
      {
        "type": "record",
        "name": "Example",
        "namespace": "test",
        "fields": [
          {"name": "ID","type": "int"},
          {"name": "Name","type": "string"}
        ]
      }
  - name: <topic-name>.avroschema # 为配置的主题设置 avro schema 验证
    value: |
      {
        "type": "record",
        "name": "Example",
        "namespace": "test",
        "fields": [
          {"name": "ID","type": "int"},
          {"name": "Name","type": "string"}
        ]
      }
```

{{% alert title="Warning" color="warning" %}}
上面的示例将密钥作为纯字符串使用。建议使用 [密钥存储来管理密钥]({{% ref component-secrets.md %}})。此组件支持将 `token` 参数和任何其他敏感参数及数据存储为 Kubernetes Secrets。
{{% /alert %}}


## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| host               | Y  | Pulsar broker 的地址。默认为 `"localhost:6650"` | `"localhost:6650"` OR `"http://pulsar-pj54qwwdpz4b-pulsar.ap-sg.public.pulsar.com:8080"`|
| enableTLS          | N  | 启用 TLS。  默认值：`"false"` | `"true"`, `"false"` |
| tenant             | N  | 实例内的主题租户。租户对于 Pulsar 中的多租户至关重要，并跨集群分布。  默认值：`"public"` | `"public"` |
| consumerID         | N  | 用于设置订阅名称或消费者 ID。  | 可以设置为字符串值（如上面示例中的 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[查看您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| namespace          | N  | 主题的管理单元，充当相关主题的分组机制。  默认值：`"default"` | `"default"`
| persistent         | N  | Pulsar 支持两种主题：[持久化](https://pulsar.apache.org/docs/en/concepts-architecture-overview#persistent-storage)和[非持久化](https://pulsar.apache.org/docs/en/concepts-messaging/#non-persistent-topics)。对于持久化主题，所有消息都会持久化保存在磁盘上（如果 broker 不是独立的，消息会持久化保存在多个磁盘上），而非持久化主题的数据则不会持久化到存储磁盘。 | `"true"`, `"false"`
| disableBatching | N | 禁用批处理。启用批处理时，默认批处理延迟设置为 10 毫秒，默认批处理大小为 1000 条消息，设置 `disableBatching: true` 将使生产者单独发送消息。 默认值：`"false"` | `"true"`, `"false"`|
| receiverQueueSize | N | 设置消费者接收队列的大小。控制在 Dapr 显式调用读取消息之前，消费者可以累积多少消息。 默认值：`"1000"` | `"1000"` |
| batchingMaxPublishDelay | N | batchingMaxPublishDelay 设置发送消息将被批处理的时间段（如果启用了批处理消息）。如果设置为非零值，消息将被排队，直到达到此时间间隔或 batchingMaxMessages（见下文）或 batchingMaxSize（见下文）。有两种有效格式，一种是带单位后缀的分数格式，另一种是作为毫秒处理的纯数字格式。有效的时间单位为 "ns"、"us"（或 "µs"）、"ms"、"s"、"m"、"h"。 默认值：`"10ms"` | `"10ms"`, `"10"`|
| batchingMaxMessages | N | batchingMaxMessages 设置批处理中允许的最大消息数。如果设置为大于 1 的值，消息将被排队，直到达到此阈值或 batchingMaxSize（见下文）已达到或批处理间隔已过去。 默认值：`"1000"` | `"1000"`|
| batchingMaxSize | N | batchingMaxSize 设置批处理中允许的最大字节数。如果设置为大于 1 的值，消息将被排队，直到达到此阈值或 batchingMaxMessages（见上文）已达到或批处理间隔已过去。 默认值：`"128KB"` | `"131072"`|
| <topic-name>.jsonschema          | N  | 为配置的主题强制执行 JSON schema 验证。 | |
| <topic-name>.avroschema          | N  | 为配置的主题强制执行 Avro schema 验证。 | |
| publicKey          | N  | 用于发布者和消费者加密的公钥。值可以是以下两种选项之一：本地 PEM 证书的文件路径，或证书数据字符串值  | |
| privateKey          | N  | 用于消费者加密的私钥。值可以是以下两种选项之一：本地 PEM 证书的文件路径，或证书数据字符串值  | |
| keys          | N  | 包含 [Pulsar 会话密钥](https://pulsar.apache.org/docs/3.0.x/security-encryption/#how-it-works-in-pulsar)名称的逗号分隔字符串。与 `publicKey` 结合使用，用于发布者加密 | |
| processMode | N | 启用一次处理多条消息。 默认值：`"async"` | `"async"`, `"sync"`|
| subscribeType | N | Pulsar 支持四种[订阅类型](https://pulsar.apache.org/docs/3.0.x/concepts-messaging/#subscription-types)。 默认值：`"shared"` | `"shared"`, `"exclusive"`, `"failover"`, `"key_shared"`|
| subscribeInitialPosition | N | 订阅位置是开始消费时光标设置的初始位置。 默认值：`"latest"` | `"latest"`, `"earliest"` |
| subscribeMode | N | 订阅模式指示光标持久化，持久化订阅保留消息并持久化当前位置。 默认值：`"durable"` | `"durable"`, `"non_durable"` |
| partitionKey | N | 设置用于路由策略的消息键。 默认值：`""` | |
| `maxConcurrentHandlers` | N  | 定义并发消息处理程序的最大数量。 默认值：`100` | `10`
| replicateSubscriptionState | N | 启用跨地域复制的 Pulsar 集群的订阅状态复制。 默认值：`"false"` | `"true"`, `"false"` |

### 使用 Token 进行身份验证

要使用静态 [JWT token](https://pulsar.apache.org/docs/en/security-jwt) 向 pulsar 进行身份验证，您可以使用以下元数据字段：

| Field  | Required | Details | Example |
|--------|:--------:|---------|---------|
| token | N | 用于身份验证的令牌。 | [如何创建 Pulsar token](https://pulsar.apache.org/docs/en/security-jwt/#generate-tokens)|

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: token
    secretKeyRef:
      name: pulsar
      key:  token
```

### 使用 OIDC 进行身份验证

自 `v3.0` 起，[Pulsar 支持 OIDC 身份验证](https://pulsar.apache.org/docs/3.0.x/security-openid-connect/)。
要启用 OIDC 身份验证，您需要向组件规范提供以下 OAuth2 参数。
OAuth2 身份验证不能与 token 身份验证结合使用。
建议您使用密钥引用来存储客户端密钥。
pulsar OAuth2 身份验证器并不专门符合 OIDC，因此您有责任确保字段符合要求。例如，颁发者 URL 必须使用 `https` 协议，请求的范围包括 `openid` 等。
如果省略 `oauth2TokenCAPEM` 字段，则在使用 `https` 连接到 OAuth2 颁发者时将使用系统的证书池。


**注意：** 元数据值会覆盖文件值。

| Field  | Required | Details | Example |
|--------|:--------:|---------|---------|
| oauth2CredentialsFile | N | 包含 `client_id`、`client_secret`、`issuer_url` 的 JSON 文件。使用此项 **或** 下面的单独字段。 | `"/path/to/credentials.json"` |
| oauth2TokenURL | N | 从中请求 OIDC client_credentials 令牌的 URL。如果不使用 `oauth2CredentialsFile` 则必需。 | `"https://oauth.example.com/token"` |
| oauth2ClientID | N | OIDC 客户端 ID。如果不使用 `oauth2CredentialsFile` 则必需。 | `"my-client-id"` |
| oauth2ClientSecret | N | OIDC 客户端密钥。如果使用 `oauth2ClientID`（而非 `oauth2ClientSecretPath`）则需要。 | `"my-client-secret"` |
| oauth2ClientSecretPath | N | 包含客户端密钥的纯文本文件。需要 `oauth2ClientID` 和 `oauth2TokenURL`。 | `"/path/to/client_secret.txt"` |
| oauth2TokenCAPEM | N | 用于连接到 OAuth2 颁发者的 CA PEM 证书束。如果未定义，将使用系统的证书池。 | `"---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"` |
| oauth2Audiences | N | 请求的受众的逗号分隔列表。不能为空。 | `"my-audience-1,my-audience-2"` |
| oauth2Scopes | N | 请求的范围的逗号分隔列表。不能为空。 | `"openid,profile,email"` |

#### 直接使用元数据字段

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: oauth2TokenURL
    value: https://oauth.example.com/o/oauth2/token
  - name: oauth2TokenCAPEM
    value: "---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"
  - name: oauth2ClientID
    value: my-client-id
  - name: oauth2ClientSecret
    secretKeyRef:
      name: pulsar-oauth2
      key:  my-client-secret
  - name: oauth2Audiences
    value: "my.pulsar.example.com,another.pulsar.example.com"
  - name: oauth2Scopes
    value: "openid,profile,email"
  - name: oauth2ClientSecretPath
    value: "/path/to/oauth2/client_secret.json"
```

#### 使用 JSON 凭据文件

您可以将凭据存储为具有以下格式的 JSON 文件：

```json
{
  "client_id": "my-client-id",
  "client_secret": "my-client-secret",
  "issuer_url": "https://oauth.example.com/o/oauth2/token"
}
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: oauth2CredentialsFile
    value: "/path/to/oauth2/credentials.json"
  - name: oauth2TokenCAPEM
    value: "---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"
  - name: oauth2Audiences
    value: "my.pulsar.example.com,another.pulsar.example.com"
  - name: oauth2Scopes
    value: "openid,profile,email"
```

#### 使用纯文本密钥文件

您可以将客户端密钥仅存储在纯文本文件中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: oauth2TokenURL
    value: https://oauth.example.com/o/oauth2/token
  - name: oauth2ClientID
    value: my-client-id
  - name: oauth2ClientSecretPath
    value: "/path/to/oauth2/client_secret.txt"
  - name: oauth2TokenCAPEM
    value: "---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"
  - name: oauth2Audiences
    value: "my.pulsar.example.com,another.pulsar.example.com"
  - name: oauth2Scopes
    value: "openid,profile,email"
```

#### 使用 JSON 凭据文件

您可以将凭据存储为具有以下格式的 JSON 文件：

```json
{
  "client_id": "my-client-id",
  "client_secret": "my-client-secret",
  "issuer_url": "https://oauth.example.com/o/oauth2/token"
}
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: oauth2CredentialsFile
    value: "/path/to/oauth2/credentials.json"
  - name: oauth2TokenCAPEM
    value: "---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"
  - name: oauth2Audiences
    value: "my.pulsar.example.com,another.pulsar.example.com"
  - name: oauth2Scopes
    value: "openid,profile,email"
```

#### 使用纯文本密钥文件

您可以将客户端密钥仅存储在纯文本文件中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "pulsar.example.com:6650"
  - name: oauth2TokenURL
    value: https://oauth.example.com/o/oauth2/token
  - name: oauth2ClientID
    value: my-client-id
  - name: oauth2ClientSecretPath
    value: "/path/to/oauth2/client_secret.txt"
  - name: oauth2TokenCAPEM
    value: "---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"
  - name: oauth2Audiences
    value: "my.pulsar.example.com,another.pulsar.example.com"
  - name: oauth2Scopes
    value: "openid,profile,email"
```

### 启用消息传递重试

Pulsar 发布订阅组件没有内置对重试策略的支持。这意味着边车仅向服务发送一次消息，并且在发生故障时不会重试。要使 Dapr 使用更复杂的重试策略，您可以将 [重试弹性策略]({{% ref "retries-overview.md" %}}) 应用于 Pulsar 发布订阅组件。请注意，将是同一个 Dapr 边车向同一应用实例重新传递消息，而不是其他实例。

### 延迟队列

调用 Pulsar 发布订阅时，可以通过在请求 url 中使用 `metadata` 查询参数来提供可选的延迟队列。

这些可选参数名称是 `metadata.deliverAt` 或 `metadata.deliverAfter`：

- `deliverAt`：延迟消息在指定时间传递（RFC3339 格式）；例如，`"2021-09-01T10:00:00Z"`
- `deliverAfter`：延迟消息在指定时间量后传递；例如，`"4h5m3s"`

示例：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myPulsar/myTopic?metadata.deliverAt='2021-09-01T10:00:00Z' \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

或

```shell
curl -X POST http://localhost:3500/v1.0/publish/myPulsar/myTopic?metadata.deliverAfter='4h5m3s' \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

### 启用消息压缩

消息压缩可以减小消息大小，代价是在发布期间稍微增加 CPU 使用率。压缩在生产者级别应用。

| Compression Type | Description |
|------------------|-------------|
| `none` | 无压缩（默认） |
| `lz4` | LZ4 压缩 - 快速压缩/解压 |
| `zlib` | ZLib 压缩 - 平衡的压缩比 |
| `zstd` | ZSTD 压缩 - 高压缩比 |

| Compression Level | Description |
|-------------------|-------------|
| `default` | 所选类型的默认压缩级别 |
| `faster` | 优先考虑速度而非压缩比 |
| `better` | 优先考虑压缩比而非速度 |

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: compressionType
    value: lz4
  - name: compressionLevel
    value: faster
```

> **注意：** 元数据键 `compressionType` 和 `compressionLevel` 区分大小写，必须完全按照所示方式指定。压缩在发布消息时应用；消费者无论设置如何都会自动解压。

### 端到端加密

Dapr 支持设置公钥和私钥对以启用 Pulsar 的[端到端加密功能](https://pulsar.apache.org/docs/3.0.x/security-encryption/)。

#### 从文件证书启用发布者加密

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: publicKey
    value: ./public.key
  - name: keys
    value: myapp.key
```

#### 从文件证书启用消费者加密

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: publicKey
    value: ./public.key
  - name: privateKey
    value: ./private.key
```

#### 从值启用发布者加密

> 注意：建议[从密钥引用公钥]({{% ref component-secrets.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: publicKey
    value:  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1KDAM4L8RtJ+nLaXBrBh\nzVpvTemsKVZoAct8A+ShepOHT9lgHOCGLFGWNla6K6j+b3AV/P/fAAhwj82vwTDd\nruXSflvSdmYeFAw3Ypphc1A5oM53wSRWhg63potBNWqdDzj8ApYgqjpmjYSQdL5/\na3golb36GYFrY0MLFTv7wZ87pmMIPsOgGIcPbCHker2fRZ34WXYLb1hkeUpwx4eK\njpwcg35gccvR6o/UhbKAuc60V1J9Wof2sNgtlRaQej45wnpjWYzZrIyk5qUbn0Qi\nCdpIrXvYtANq0Id6gP8zJvUEdPIgNuYxEmVCl9jI+8eGI6peD0qIt8U80hf9axhJ\n3QIDAQAB\n-----END PUBLIC KEY-----\n"
  - name: keys
    value: myapp.key
```

#### 从值启用消费者加密

> 注意：建议[从密钥引用公钥和私钥]({{% ref component-secrets.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.pulsar
  version: v1
  metadata:
  - name: host
    value: "localhost:6650"
  - name: publicKey
    value: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1KDAM4L8RtJ+nLaXBrBh\nzVpvTemsKVZoAct8A+ShepOHT9lgHOCGLFGWNla6K6j+b3AV/P/fAAhwj82vwTDd\nruXSflvSdmYeFAw3Ypphc1A5oM53wSRWhg63potBNWqdDzj8ApYgqjpmjYSQdL5/\na3golb36GYFrY0MLFTv7wZ87pmMIPsOgGIcPbCHker2fRZ34WXYLb1hkeUpwx4eK\njpwcg35gccvR6o/UhbKAuc60V1J9Wof2sNgtlRaQej45wnpjWYzZrIyk5qUbn0Qi\nCdpIrXvYtANq0Id6gP8zJvUEdPIgNuYxEmVCl9jI+8eGI6peD0qIt8U80hf9axhJ\n3QIDAQAB\n-----END PUBLIC KEY-----\n"
  - name: privateKey
    value: "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1KDAM4L8RtJ+nLaXBrBhzVpvTemsKVZoAct8A+ShepOHT9lg\nHOCGLFGWNla6K6j+b3AV/P/fAAhwj82vwTDdruXSflvSdmYeFAw3Ypphc1A5oM53\nwSRWhg63potBNWqdDzj8ApYgqjpmjYSQdL5/a3golb36GYFrY0MLFTv7wZ87pmMI\nPsOgGIcPbCHker2fRZ34WXYLb1hkeUpwx4eKjpwcg35gccvR6o/UhbKAuc60V1J9\nWof2sNgtlRaQej45wnpjWYzZrIyk5qUbn0QiCdpIrXvYtANq0Id6gP8zJvUEdPIg\nNuYxEmVCl9jI+8eGI6peD0qIt8U80hf9axhJ3QIDAQABAoIBAQCKuHnM4ac/eXM7\nQPDVX1vfgyHc3hgBPCtNCHnXfGFRvFBqavKGxIElBvGOcBS0CWQ+Rg1Ca5kMx3TQ\njSweSYhH5A7pe3Sa5FK5V6MGxJvRhMSkQi/lJZUBjzaIBJA9jln7pXzdHx8ekE16\nBMPONr6g2dr4nuI9o67xKrtfViwRDGaG6eh7jIMlEqMMc6WqyhvI67rlVDSTHFKX\njlMcozJ3IT8BtTzKg2Tpy7ReVuJEpehum8yn1ZVdAnotBDJxI07DC1cbOP4M2fHM\ngfgPYWmchauZuTeTFu4hrlY5jg0/WLs6by8r/81+vX3QTNvejX9UdTHMSIfQdX82\nAfkCKUVhAoGBAOvGv+YXeTlPRcYC642x5iOyLQm+BiSX4jKtnyJiTU2s/qvvKkIu\nxAOk3OtniT9NaUAHEZE9tI71dDN6IgTLQlAcPCzkVh6Sc5eG0MObqOO7WOMCWBkI\nlaAKKBbd6cGDJkwGCJKnx0pxC9f8R4dw3fmXWgWAr8ENiekMuvjSfjZ5AoGBAObd\ns2L5uiUPTtpyh8WZ7rEvrun3djBhzi+d7rgxEGdditeiLQGKyZbDPMSMBuus/5wH\nwfi0xUq50RtYDbzQQdC3T/C20oHmZbjWK5mDaLRVzWS89YG/NT2Q8eZLBstKqxkx\ngoT77zoUDfRy+CWs1xvXzgxagD5Yg8/OrCuXOqWFAoGAPIw3r6ELknoXEvihASxU\nS4pwInZYIYGXpygLG8teyrnIVOMAWSqlT8JAsXtPNaBtjPHDwyazfZrvEmEk51JD\nX0tA8M5ah1NYt+r5JaKNxp3P/8wUT6lyszyoeubWJsnFRfSusuq/NRC+1+KDg/aq\nKnSBu7QGbm9JoT2RrmBv5RECgYBRn8Lj1I1muvHTNDkiuRj2VniOSirkUkA2/6y+\nPMKi+SS0tqcY63v4rNCYYTW1L7Yz8V44U5mJoQb4lvpMbolGhPljjxAAU3hVkItb\nvGVRlSCIZHKczADD4rJUDOS7DYxO3P1bjUN4kkyYx+lKUMDBHFzCa2D6Kgt4dobS\n5qYajQKBgQC7u7MFPkkEMqNqNGu5erytQkBq1v1Ipmf9rCi3iIj4XJLopxMgw0fx\n6jwcwNInl72KzoUBLnGQ9PKGVeBcgEgdI+a+tq+1TJo6Ta+hZSx+4AYiKY18eRKG\neNuER9NOcSVJ7Eqkcw4viCGyYDm2vgNV9HJ0VlAo3RDh8x5spEN+mg==\n-----END RSA PRIVATE KEY-----\n"
```

### 分区键

调用 Pulsar 发布订阅时，可以通过在请求 url 中使用 `metadata` 查询参数来提供可选的分区键。

参数名称是 `partitionKey`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myPlusar/myTopic?metadata.partitionKey=key1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

### 消息头

所有其他元数据键/值对（不是 `partitionKey`）都将在 Pulsar 消息中设置为头。例如，为消息设置 `correlationId`：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myPlusar/myTopic?metadata.correlationId=myCorrelationID&metadata.partitionKey=key1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

## 顺序保证

要确保为订阅特定键的每个消费者按顺序到达消息，必须满足三个条件。

1. `subscribeType` 应设置为 `key_shared`。
2. 必须设置 `partitionKey`。
3. `processMode` 应设置为 `sync`。

## 创建 Pulsar 实例

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

```
docker run -it \
  -p 6650:6650 \
  -p 8080:8080 \
  --mount source=pulsardata,target=/pulsar/data \
  --mount source=pulsarconf,target=/pulsar/conf \
  apachepulsar/pulsar:2.5.1 \
  bin/pulsar standalone

```

{{% /tab %}}

{{% tab "Kubernetes" %}}
请参阅以下 [Helm chart](https://pulsar.apache.org/docs/helm-overview) 文档。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本 schema]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})以获取有关配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
