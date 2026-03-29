---
type: docs
title: "MQTT"
linkTitle: "MQTT"
description: "MQTT 发布订阅组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-mqtt/"
---

## 组件格式

要设置 MQTT 发布订阅，请创建类型为 `pubsub.mqtt` 的组件。请参阅 [发布订阅代理组件文件]({{% ref setup-pubsub.md %}}) 以了解如何自动生成 ConsumerID。阅读 [操作指南：发布和订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}}) 了解如何创建和应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt
  version: v1
  metadata:
  - name: url
    value: "tcp://[username][:password]@host.domain[:port]"
  - name: qos
    value: 1
  - name: retain
    value: "false"
  - name: cleanSession
    value: "false"
  - name: consumerID
    value: "channel1"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| url    | 是  | MQTT 代理的地址。可以是 `secretKeyRef` 以使用密钥引用。 <br> 对于非 TLS 通信，使用 **`tcp://`** URI 方案。 <br> 对于 TLS 通信，使用 **`ssl://`** URI 方案。 | `"tcp://[username][:password]@host.domain[:port]"`
| consumerID | 否 | 用于连接到 MQTT 代理的客户端 ID（用于消费者连接）。默认为 Dapr 应用 ID。<br>注意：如果未设置 `producerID`，则会在此值后追加 `-consumer` 作为消费者连接的 ID | 可以设置为字符串值（如上例中的 `"channel1"`）或字符串格式的值（如 `"{podName}"` 等）。[请参阅您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| producerID | 否 | 用于连接到 MQTT 代理的客户端 ID（用于生产者连接）。默认为 `{consumerID}-producer`。 | `"myMqttProducerApp"`
| qos    | 否  | 指示消息的服务质量级别（QoS）（[更多信息](https://www.hivemq.com/blog/mqtt-essentials-part-6-mqtt-quality-of-service-levels/)）。默认为 `1`。 |`0`、`1`、`2`
| retain | 否  | 定义代理是否将消息保存为指定主题的最后一个已知良好值。默认为 `"false"`。  | `"true"`、`"false"`
| cleanSession | 否 | 如果为 `"true"`，则在发送到 MQTT 代理的连接消息中设置 `clean_session` 标志（[更多信息](http://www.steves-internet-guide.com/mqtt-clean-sessions-example/)）。默认为 `"false"`。  | `"true"`、`"false"`
| caCert | 使用 TLS 时必填 | 用于验证服务器 TLS 证书的 PEM 格式证书颁发机构（CA）证书。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert  | 使用 TLS 时必填 | PEM 格式的 TLS 客户端证书。必须与 `clientKey` 一起使用。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | 使用 TLS 时必填 | PEM 格式的 TLS 客户端密钥。必须与 `clientCert` 一起使用。可以是 `secretKeyRef` 以使用密钥引用。 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`

### 启用消息传递重试

MQTT 发布订阅组件没有内置重试策略支持。这意味着边车只会向服务发送一次消息。如果服务将消息标记为未处理，消息将不会被确认回代理。只有当代理重新发送消息时，才会重试。

要使 Dapr 使用更复杂的重试策略，您可以将[重试弹性策略]({{% ref "retries-overview.md" %}})应用于 MQTT 发布订阅组件。

这两种重试方式之间存在关键区别：

1. 未确认消息的重新传递完全依赖于代理。Dapr 不保证这一点。某些代理如 [emqx](https://www.emqx.io/)、[vernemq](https://vernemq.com/) 等支持它，但这不是 [MQTT3 规范](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718103) 的一部分。

2. 使用[重试弹性策略]({{% ref "retries-overview.md" %}})会使同一个 Dapr 边车重试重新传递消息。因此是同一个 Dapr 边车和同一个应用程序接收同一条消息。

### 使用 TLS 进行通信

要配置使用 TLS 进行通信，请确保 MQTT 代理（例如 mosquitto）配置为支持证书，并在组件配置中提供 `caCert`、`clientCert`、`clientKey` 元数据。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt
  version: v1
  metadata:
  - name: url
    value: "ssl://host.domain[:port]"
  - name: qos
    value: 1
  - name: retain
    value: "false"
  - name: cleanSession
    value: "false"
  - name: caCert
    value: ${{ myLoadedCACert }}
  - name: clientCert
    value: ${{ myLoadedClientCert }}
  - name: clientKey
    secretKeyRef:
      name: myMqttClientKey
      key: myMqttClientKey
auth:
  secretStore: <SECRET_STORE_NAME>
```

请注意，虽然 `caCert` 和 `clientCert` 值可能不是密钥，但为了方便起见，也可以从 Dapr 密钥存储中引用它们。

### 消费共享主题

在消费共享主题时，每个消费者必须具有唯一标识符。默认情况下，应用程序 ID 用于唯一标识每个消费者和发布者。在自托管模式下，每次调用 `dapr run` 时使用不同的应用程序 ID 足以让它们从同一个共享主题消费。然而，在 Kubernetes 上，应用程序 pod 的多个实例将共享同一个应用程序 ID，从而阻止所有实例消费同一个主题。为了克服这一点，请使用 `{uuid}` 标签配置组件的 `consumerID` 元数据，这将在启动时为每个实例分配一个随机生成的 `consumerID` 值。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt
  version: v1
  metadata:
    - name: consumerID
      value: "{uuid}"
    - name: url
      value: "tcp://admin:public@localhost:1883"
    - name: qos
      value: 1
    - name: retain
      value: "false"
    - name: cleanSession
      value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

请注意，在这种情况下，每次 Dapr 重启时消费者 ID 的值都是随机的，因此我们也将 `cleanSession` 设置为 true。

## 创建 MQTT 代理

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用 Docker [在本地运行 MQTT 代理](https://hub.docker.com/_/eclipse-mosquitto)：

```bash
docker run -d -p 1883:1883 -p 9001:9001 --name mqtt eclipse-mosquitto:1.6
```

然后您可以使用客户端端口与服务器交互：`mqtt://localhost:1883`
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用以下 yaml 在 kubernetes 中运行 MQTT 代理：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mqtt-broker
  labels:
    app-name: mqtt-broker
spec:
  replicas: 1
  selector:
    matchLabels:
      app-name: mqtt-broker
  template:
    metadata:
      labels:
        app-name: mqtt-broker
    spec:
      containers:
        - name: mqtt
          image: eclipse-mosquitto:1.6
          imagePullPolicy: IfNotPresent
          ports:
            - name: default
              containerPort: 1883
              protocol: TCP
            - name: websocket
              containerPort: 9001
              protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: mqtt-broker
  labels:
    app-name: mqtt-broker
spec:
  type: ClusterIP
  selector:
    app-name: mqtt-broker
  ports:
    - port: 1883
      targetPort: default
      name: default
      protocol: TCP
    - port: 9001
      targetPort: websocket
      name: websocket
      protocol: TCP
```

然后您可以使用客户端端口与服务器交互：`tcp://mqtt-broker.default.svc.cluster.local:1883`
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本模式]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})了解配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
