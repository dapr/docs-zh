---
type: docs
title: "Pulsar"
linkTitle: "Pulsar"
description: "Pulsar 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-pulsar/"
---

## 组件格式

要设置 Apache Pulsar pub/sub，需创建一个类型为 `pubsub.pulsar` 的组件。请参阅 [pub/sub broker 组件文件]({{% ref setup-pubsub.md %}}) 以了解 ConsumerID 是如何自动生成的。阅读 [操作指南：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}}) 以了解如何创建和应用 pub/sub 配置。

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
  - name: processMode
    value: "async"
  - name: maxConcurrentHandlers
    value: "100"
  - name: <topic-name>.jsonschema # 为配置的 topic 设置 json schema 验证
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
  - name: <topic-name>.avroschema # 为配置的 topic 设置 avro schema 验证
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
上面的示例将 secrets 以纯字符串形式使用。建议使用 [secret store 来管理 secrets]({{% ref component-secrets.md %}})。此组件支持将 `token` 参数和任何其他敏感参数及数据存储为 Kubernetes Secrets。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| host               | Y  | Pulsar broker 的地址。默认为 `"localhost:6650"` | `"localhost:6650"` OR `"http://pulsar-pj54qwwdpz4b-pulsar.ap-sg.public.pulsar.com:8080"`|
| listenerName       | N  | 选择客户端通过 broker 的哪个 [advertised listeners](https://pulsar.apache.org/docs/3.0.x/concepts-multiple-advertised-listeners/) 进行连接，适用于 broker 暴露多个网络端点的情况（例如内部地址与外部地址分开）。该值是单个监听器**名称**，必须与 broker 运维人员在其 `advertisedListeners` 配置中定义的名称一致；它**不是** `<name>:pulsar://<host>:<port>` 形式的地址映射，后者配置在 broker 上，而不是在 Dapr 中。监听器名称由运维人员选择，`internal` 和 `external` 是常见约定，而非固定取值。默认值：`""`（不发送监听器名称，使用 broker 的默认监听器，因此行为保持不变）。 | `"external"` |
| enableTLS          | N  | 设置为 `"true"` 时验证 broker 的证书。仅设置此项不会自动切换为 TLS 连接。要真正通过 TLS 连接，请在 `host` 中使用 TLS 协议（例如 `pulsar+ssl://broker:6651`）。若不设置，`host` 默认使用明文 `pulsar://`。broker 也必须配置 TLS。默认值：`"false"` | `"true"`, `"false"` |
| tenant             | N  | 实例内的 topic 租户。租户对于 Pulsar 中的多租户至关重要，并跨集群分布。  默认值：`"public"` | `"public"` |
| consumerID         | N  | 用于设置订阅名称或消费者 ID。  | 可以设置为字符串值（如上面示例中的 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[查看您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| namespace          | N  | topic 的管理单元，充当相关 topics 的分组机制。  默认值：`"default"` | `"default"`
| persistent         | N  | Pulsar 支持两种 topics：[持久化](https://pulsar.apache.org/docs/en/concepts-architecture-overview#persistent-storage)和[非持久化](https://pulsar.apache.org/docs/en/concepts-messaging/#non-persistent-topics)。对于持久化 topics，所有消息都会持久保存在磁盘上（如果 broker 不是独立部署的，消息会持久保存在多块磁盘上）；而非持久化 topics 的数据不会写入存储磁盘。
| disableBatching | N | 禁用批处理。启用批处理时，默认批处理延迟为 10 毫秒，默认批处理大小为 1000 条消息；设置 `disableBatching: true` 会使生产者逐条发送消息。默认值：`"false"` | `"true"`, `"false"`|
| receiverQueueSize | N | 设置消费者接收队列的大小。控制在 Dapr 显式调用读取消息之前，消费者最多可以累积多少条消息。默认值：`"1000"` | `"1000"` |
| redeliveryDelay | N | 对于未被应用确认的消息，在重新投递之前的延迟。默认值：`"30s"` | `"30s"`, `"200ms"` |
| redeliveryDelay | N | 对于未被应用确认的消息，在重新投递之前的延迟。默认值：`"30s"` | `"30s"`, `"200ms"` |
| batchingMaxPublishDelay | N | batchingMaxPublishDelay 设置启用批处理消息时，发送的消息被批处理的时间窗口。如果设置为非零值，消息会被排队，直到该时间间隔到达、达到 batchingMaxMessages（见下文）或 batchingMaxSize（见下文）为止。有两种有效格式：一种是带单位后缀的小数格式，另一种是按毫秒处理的纯数字格式。有效的时间单位为 "ns"、"us"（或 "µs"）、"ms"、"s"、"m"、"h"。默认值：`"10ms"` | `"10ms"`, `"10"`|
| batchingMaxMessages | N | batchingMaxMessages 设置批次中允许的最大消息数。如果设置为大于 1 的值，消息会被排队，直到达到此阈值、达到 batchingMaxSize（见下文）或批处理间隔到期为止。默认值：`"1000"` | `"1000"`|
| batchingMaxSize | N | batchingMaxSize 设置批次中允许的最大字节数。如果设置为大于 1 的值，消息会被排队，直到达到此阈值、达到 batchingMaxMessages（见上文）或批处理间隔到期为止。默认值：`"128KB"` | `"131072"`|
| compressionType | N | 设置生产者发送消息时使用的压缩类型。默认值：`"none"` | `"none"`, `"lz4"`, `"zlib"`, `"zstd"` |
| compressionLevel | N | 设置启用 `compressionType` 时使用的压缩级别。默认值：`"default"` | `"default"`, `"faster"`, `"better"` |
| <topic-name>.jsonschema          | N  | 为配置的 topic 强制执行 JSON schema 验证。启用 CloudEvents 包装（默认）时，注册到 Pulsar Schema Registry 的 schema 是一个 CloudEvents 信封 JSON schema，其中将所提供的 schema 作为 `data` 字段。请参阅 [使用 Cloudevents 发布和订阅消息]({{% ref pubsub-cloudevents.md %}})| |
| <topic-name>.avroschema          | N  | 为配置的 topic 强制执行 Avro schema 验证。启用 CloudEvents 包装（默认）时，注册到 Pulsar Schema Registry 的 schema 是一个 CloudEvents 信封 Avro schema，其中将所提供的 schema 作为 `data` 字段。请参阅 [使用 Cloudevents 发布和订阅消息]({{% ref pubsub-cloudevents.md %}}) | |
| <topic-name>.rawschema          | N  | 设置为 `"true"` 时，将原始消息 schema（Avro 或 JSON）直接注册到 Pulsar Schema Registry，而不是包装在 CloudEvents 信封中。此项仅用于专门接收原始负载的 topics。调用方还必须设置发布者请求元数据 `rawPayload=true`。请参阅 [不使用 CloudEvents 发布和订阅消息]({{% ref pubsub-raw.md %}})。默认值：`"false"` | `"true"`, `"false"` |
| compressionType | N | 设置生产者发送消息时使用的压缩类型。默认值：`"none"` | `"none"`, `"lz4"`, `"zlib"`, `"zstd"` |
| compressionLevel | N | 设置启用 `compressionType` 时使用的压缩级别。默认值：`"default"` | `"default"`, `"faster"`, `"better"` |
| <topic-name>.rawschema          | N  | 将提供的 Avro 或 JSON schema 按原样注册，而不是包装在 CloudEvents 信封 schema 中。默认值：`"false"` | `"true"`, `"false"` |
| publicKey          | N  | 用于发布者和消费者加密的公钥。取值可以是以下两种之一：本地 PEM 证书的文件路径，或证书数据字符串值  |
| privateKey          | N  | 用于消费者加密的私钥。取值可以是以下两种之一：本地 PEM 证书的文件路径，或证书数据字符串值  |
| keys          | N  | 包含 [Pulsar 会话密钥](https://pulsar.apache.org/docs/3.0.x/security-encryption/#how-it-works-in-pulsar)名称的逗号分隔字符串。与 `publicKey` 结合使用，用于发布者加密 |
| processMode | N | 控制消息是逐条处理（`sync`）还是并发处理（`async`）。可以在组件级别设置，也可以通过订阅请求元数据为每个订阅单独覆盖。默认值：`"async"` | `"async"`, `"sync"`|
| subscribeType | N | Pulsar 支持四种[订阅类型](https://pulsar.apache.org/docs/3.0.x/concepts-messaging/#subscription-types)。默认值：`"shared"` | `"shared"`, `"exclusive"`, `"failover"`, `"key_shared"`|
| subscribeInitialPosition | N | 订阅位置是开始消费时游标设置的初始位置。默认值：`"latest"` | `"latest"`, `"earliest"` |
| subscribeMode | N | 订阅模式表示游标的持久化方式，持久订阅会保留消息并持久化当前位置。默认值：`"durable"` | `"durable"`, `"non_durable"` |
| topicsPattern | N | 用于在配置的 `tenant` 和 `namespace` 范围内订阅所有名称匹配该正则表达式的 topics，而不是单个显式 topic。设置后，它优先于订阅中指定的 topic，Pulsar 会随时间自动发现新匹配的 topics（参见 `autoDiscoveryPeriod`）。可以在组件级别设置（适用于所有订阅），也可以通过订阅请求元数据为每个订阅单独覆盖。参见[使用模式订阅多个 topics](#使用模式订阅多个-topics)。默认值：`""` | `"orders-.*"`, `"event-.+-v2"` |
| autoDiscoveryPeriod | N | 设置了 `topicsPattern` 时，控制 Pulsar 多久重新评估一次该模式，以发现新建（或删除）的匹配 topics。组件默认值为 `"0"`，即使用 Pulsar 客户端自身的默认间隔（当前为 1 分钟）。仅当设置了 `topicsPattern` 时才有效果。可以通过订阅请求元数据为每个订阅单独覆盖。默认值：`"0"` | `"30s"`, `"5m"` |
| partitionKey | N | 设置用于 Routing 策略的消息键。默认值：`""` | |
| `maxConcurrentHandlers` | N  | 定义 `async` 处理模式下并发消息 handlers 的最大数量。一个固定大小的工作进程池会并发处理消息。当所有工作进程都忙碌时，会施加背压。值为 `0` 时回退到默认值。默认值：`100` | `10`
| replicateSubscriptionState | N | 启用跨地域复制的 Pulsar 集群之间的订阅状态复制。默认值：`"false"` | `"true"`, `"false"` |

### 使用 Token 进行身份验证

要使用静态 [JWT token](https://pulsar.apache.org/docs/en/security-jwt) 向 Pulsar 进行身份验证，可以使用以下元数据字段：

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
要启用 OIDC 身份验证，需要在组件规范中提供以下 OAuth2 参数。
OAuth2 身份验证不能与 token 身份验证结合使用。
建议对 client secret 使用 secret 引用。
Pulsar OAuth2 身份验证器并不专门符合 OIDC，因此您需要自行确保各字段符合要求。例如，颁发者 URL 必须使用 `https` 协议，请求的作用域需包含 `openid` 等。
如果省略 `oauth2TokenCAPEM` 字段，则在使用 `https` 连接 OAuth2 颁发者时，将使用系统的证书池。


**注意：** 元数据值会覆盖文件中的值。

| Field  | Required | Details | Example |
|--------|:--------:|---------|---------|
| oauth2CredentialsFile | N | 包含 `client_id`、`client_secret`、`issuer_url` 的 JSON 文件。使用此项 **或** 下面的单独字段。 | `"/path/to/credentials.json"` |
| oauth2TokenURL | N | 从中请求 OIDC client_credentials 令牌的 URL。如果不使用 `oauth2CredentialsFile` 则必需。 | `"https://oauth.example.com/token"` |
| oauth2ClientID | N | OIDC 客户端 ID。如果不使用 `oauth2CredentialsFile` 则必需。 | `"my-client-id"` |
| oauth2ClientSecret | N | OIDC client secret。如果使用 `oauth2ClientID`（而非 `oauth2ClientSecretPath`）则需要。 | `"my-client-secret"` |
| oauth2ClientSecretPath | N | 包含 client secret 的纯文本文件。需要 `oauth2ClientID` 和 `oauth2TokenURL`。 | `"/path/to/client_secret.txt"` |
| oauth2TokenCAPEM | N | 用于连接 OAuth2 颁发者的 CA PEM 证书包。如果未定义，将使用系统的证书池。 | `"---BEGIN CERTIFICATE---\n...\n---END CERTIFICATE---"` |
| oauth2Audiences | N | 请求的受众的逗号分隔列表。不能为空。 | `"my-audience-1,my-audience-2"` |
| oauth2Scopes | N | 请求的作用域的逗号分隔列表。不能为空。 | `"openid,profile,email"` |

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

您可以将凭据存储在具有以下格式的 JSON 文件中：

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

#### 使用纯文本 secret 文件

您可以仅将 client secret 存储在纯文本文件中：

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

您可以将凭据存储在具有以下格式的 JSON 文件中：

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

#### 使用纯文本 secret 文件

您可以仅将 client secret 存储在纯文本文件中：

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

### 使用 JSON/Avro schema 验证

Dapr 允许您使用 `<topic-name>.avroschema` 和 `<topic-name>.jsonschema` 元数据属性对 Avro 和 JSON 消息 schema 执行 schema 验证。在启用 CloudEvents（[默认]({{% ref pubsub-cloudevents.md %}})）的情况下使用此功能时，Dapr 会在将 schema 注册到 Pulsar Schema Registry 之前，自动将其包装在 CloudEvents 信封中。在与[原始消息]({{% ref pubsub-raw.md %}})一起使用此功能时，Dapr 会将您的原始消息 schema 注册到 Pulsar Schema Registry。

对于 Avro schema，信封遵循 [CloudEvents Avro 格式规范](https://github.com/cloudevents/spec/blob/main/cloudevents/bindings/avro-format.md)；对于 JSON schema，信封遵循 [CloudEvents JSON 格式规范](https://github.com/cloudevents/spec/blob/main/cloudevents/formats/json-format.md)。这确保了注册的 Pulsar schema 与已发布消息的实际传输格式一致。

下表总结了其行为（同时适用于 `.avroschema` 和 `.jsonschema`）：

| | CloudEvents 包装（默认） | 原始消息 |
|---|---|---|
| **未配置 schema 验证** | Dapr 将消息包装在 CloudEvents 信封（JSON）中，消息以原始字节形式作为 `data` 字段发送。不向 Pulsar 注册 schema。 | Dapr 直接以原始字节发送消息，不进行 schema 验证，也不包装 CloudEvents 信封。 |
| **使用 `<topic-name>.rawschema=false` 进行 schema 验证** | Dapr 将消息包装在 CloudEvents 信封中。发布者注册 CloudEvents 信封 schema（JSON 或 Avro），并按 CloudEvents 编解码器进行验证。 | 以错误拒绝。发布者的 schema 是 CloudEvents 信封，因此原始负载无法通过验证。 |
| **使用 `<topic-name>.rawschema=true` 进行 schema 验证** | 以错误拒绝。发布者向 Pulsar 注册的是原始负载，但 Dapr 会将其包装在 CloudEvents 信封中，因此验证失败。 | 发布者向 Pulsar 注册原始数据，并按内层编解码器进行验证。 |

{{% alert title="Important" color="warning" %}}
由于 Dapr 默认会将消息包装在 CloudEvents 信封中，因此切勿在会接收 CloudEvent 包装消息的 topic 上使用 `<topic-name>.rawschema=true`。`<topic-name>.rawschema=true` 元数据属性只能与发布者的 `rawPayload=true` 设置一起使用，并且仅用于专用 topic，以确保注册的内层数据 schema 始终与实际传输格式一致。有关如何使用 `rawPayload=true`，请阅读[不使用 CloudEvents 发布和订阅消息]({{% ref pubsub-raw.md %}})。
{{% /alert %}}

由于 Pulsar 对每个 topic 只强制执行一个 schema，因此原始消息无法使用 CloudEvents 信封 schema 发送到该 topic。若要同时处理 CloudEvent 包装的负载和原始负载，请使用不同的 topics。

#### 使用 CloudEvents 进行 schema 验证

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
  # CloudEvent 包装的 topic（默认行为）— Avro 示例
  - name: orders.avroschema
    value: '{"type":"record","name":"Order","fields":[{"name":"ID","type":"int"},{"name":"Name","type":"string"}]}'
```

向 CloudEvent 包装的 topic 发布带有 `rawPayload=true` 的消息时，会返回以下错误：
> `rawPayload=true is not compatible with schema topics using CloudEvents envelope; use a separate topic for raw payloads`

#### 使用原始消息进行 schema 验证

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
  # 仅原始负载的 topic（跳过 CloudEvent 包装）— Avro 示例
  - name: orders-raw.avroschema
    value: '{"type":"record","name":"Order","fields":[{"name":"ID","type":"int"},{"name":"Name","type":"string"}]}'
  - name: orders-raw.rawschema
    value: "true"
  # 仅原始负载的 topic — JSON schema 示例
  - name: events-raw.jsonschema
    value: '{"type":"object","properties":{"id":{"type":"integer"},"name":{"type":"string"}},"required":["id","name"]}'
  - name: events-raw.rawschema
    value: "true"
```



### 使用模式订阅多个 topics

默认情况下，一个 Dapr 订阅只对应一个显式的 Pulsar topic。改为设置 `topicsPattern` 元数据字段后，单个消费者会订阅配置的 `tenant` 和 `namespace` 范围内**所有名称匹配某个正则表达式的 topic**。当 topics 是动态创建的，或服务需要消费一族相关 topics（例如每个租户一个 topic）而无需逐个声明时，这一方式非常有用。

设置 `topicsPattern` 后：

- 它优先于订阅中显式指定的 topic。
- 该模式是正则表达式（而非 shell 风格的通配符），并在解析后的 `persistent`/`non-persistent` 的 `tenant`/`namespace` 作用域内与本地 topic 名进行匹配。例如，在默认的 `public` tenant 和 `default` namespace 下，`orders-.*` 可以匹配 `persistent://public/default/orders-eu`、`persistent://public/default/orders-us` 等。
- Pulsar 会定期重新评估该模式，并**自动发现新建（或删除）的匹配 topics**。使用 `autoDiscoveryPeriod` 可以控制评估的频率；值为 `"0"` 时使用 Pulsar 客户端的默认间隔。
- 每条消息投递给应用时，都会标记为其到达的**具体 topic**，而非该模式。因此，Routing 和 observability 看到的都是真实的 topic 名称。

{{% alert title="Note" color="primary" %}}
按 topic 进行的 schema 验证（`<topic-name>.avroschema` / `<topic-name>.jsonschema`）不适用于模式订阅，因为匹配的 topics 集合无法事先得知。模式匹配的作用域限定在单个 `tenant`/`namespace` 内，这与 Pulsar 自身的[模式订阅](https://pulsar.apache.org/docs/3.0.x/client-libraries-go/#use-regular-expressions)行为一致。
{{% /alert %}}

以下示例订阅所有以 `orders-` 开头的 topics，并每 30 秒检查一次是否有新的匹配 topics：

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
  - name: tenant
    value: "public"
  - name: namespace
    value: "default"
  - name: topicsPattern
    value: "orders-.*"
  - name: autoDiscoveryPeriod
    value: "30s"
```

`topicsPattern` 和 `autoDiscoveryPeriod` 也可以通过订阅请求元数据为每个订阅单独设置，其值会覆盖该订阅的组件级配置。

### 启用消息传递重试

Pulsar pub/sub 组件不内置对重试策略的支持。这意味着 sidecar 只会向服务发送一次消息，失败时不会重试。若要让 Dapr 使用更复杂的 retry policies，可以将 [重试 resiliency 策略]({{% ref "retries-overview.md" %}}) 应用到 Pulsar pub/sub 组件上。该 retry policy 会叠加在 Pulsar 消息代理上 `sendTimeoutMs` 的设置之上（默认为 [30 秒](https://pulsar.apache.org/reference/#/4.2.x/client/client-configuration-producer?id=sendtimeoutms)）。请注意，负责将消息重新传递的始终是同一个 Dapr sidecar，并且是投递给同一个应用实例，而不会投递给其他实例。

### 延迟队列

调用 Pulsar pub/sub 时，可以通过在请求 URL 中使用 `metadata` 查询参数来提供可选的延迟队列。

这些可选参数名称为 `metadata.deliverAt` 或 `metadata.deliverAfter`：

- `deliverAt`：将消息延迟到指定时间投递（RFC3339 格式）；例如 `"2021-09-01T10:00:00Z"`
- `deliverAfter`：将消息延迟指定时长后投递；例如 `"4h5m3s"`

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

消息压缩可以减小消息体积，但发布时会略微增加 CPU 开销。压缩在生产者级别应用。

| Compression Type | Description |
|------------------|-------------|
| `none` | 无压缩（默认） |
| `lz4` | LZ4 压缩 - 快速压缩/解压 |
| `zlib` | ZLib 压缩 - 平衡的压缩比 |
| `zstd` | ZSTD 压缩 - 高压缩比 |

| Compression Level | Description |
|-------------------|-------------|
| `default` | 所选类型的默认压缩级别 |
| `faster` | 优先速度而非压缩比 |
| `better` | 优先压缩比而非速度 |

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

> **注意：** 元数据键 `compressionType` 和 `compressionLevel` 区分大小写，必须严格按照所示写法指定。压缩在发布消息时应用；无论如何设置，消费者都会自动解压。

### E2E 加密

Dapr 支持设置公钥和私钥对，以启用 Pulsar 的[端到端加密功能](https://pulsar.apache.org/docs/3.0.x/security-encryption/)。

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

> 注意：建议[从 secret 引用公钥]({{% ref component-secrets.md %}})。

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

> 注意：建议[从 secret 引用公钥和私钥]({{% ref component-secrets.md %}})。

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

调用 Pulsar pub/sub 时，可以通过在请求 URL 中使用 `metadata` 查询参数来提供可选的分区键。

参数名称为 `partitionKey`。

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

所有其他元数据键值对（`partitionKey` 除外）都会被设置为 Pulsar 消息中的头部。例如，为消息设置 `correlationId`：

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

要确保订阅某个特定键的每个消费者都按顺序收到消息，必须满足以下三个条件。

1. `subscribeType` 应设置为 `key_shared`。
2. 必须设置 `partitionKey`。
3. `processMode` 应设置为 `sync`。

## 创建 Pulsar 实例

{{< tabpane text=true >}}

{{% tab "自托管" %}}

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

- [Dapr component 的基本 schema]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解如何配置 pub/sub 组件
- [Pub/Sub building block]({{% ref pubsub %}})
