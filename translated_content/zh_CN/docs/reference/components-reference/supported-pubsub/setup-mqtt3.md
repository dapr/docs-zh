---
type: docs
title: "MQTT3"
linkTitle: "MQTT3"
description: "MQTT3 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-mqtt3/"
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-mqtt/"
---

## 组件格式

要设置 MQTT3 发布订阅，请创建类型为 `pubsub.mqtt3` 的组件。请参阅 [发布订阅代理组件文件]({{% ref setup-pubsub.md %}}) 以了解 ConsumerID 是如何自动生成的。阅读 [操作指南：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}}) 了解如何创建和应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
    - name: url
      value: "tcp://[username][:password]@host.domain[:port]"
    # Optional
    - name: retain
      value: "false"
    - name: cleanSession
      value: "false"
    - name: qos
      value: "1"
    - name: consumerID
      value: "channel1"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `url`    | Y  | MQTT 代理的地址。可以是 `secretKeyRef` 以使用密钥引用。<br> 对于非 TLS 通信，使用 **`tcp://`** URI 协议。<br> 对于 TLS 通信，使用 **`ssl://`** URI 协议。 | `"tcp://[username][:password]@host.domain[:port]"`
| `consumerID` | N | 用于连接到 MQTT 代理的客户端 ID。默认为 Dapr 应用 ID。 | 可以设置为字符串值（例如上面示例中的 `"channel1"`）或字符串格式值（例如 `"{podName}"` 等）。[查看您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| `retain` | N  | 定义消息是否由代理保存为指定主题的最后一个已知良好值。默认为 `"false"`。 | `"true"`, `"false"`
| `cleanSession` | N | 如果为 `"true"`，则设置到 MQTT 代理的连接消息中的 `clean_session` 标志（[更多信息](http://www.steves-internet-guide.com/mqtt-clean-sessions-example/)）。默认为 `"false"`。 | `"true"`, `"false"`
| `caCert` | 使用 TLS 时必填 | 用于验证服务器 TLS 证书的 PEM 格式证书颁发机构 (CA) 证书。 | 参见下面的示例
| `clientCert`  | 使用 TLS 时必填 | PEM 格式的 TLS 客户端证书。必须与 `clientKey` 一起使用。 | 参见下面的示例
| `clientKey` | 使用 TLS 时必填 | PEM 格式的 TLS 客户端密钥。必须与 `clientCert` 一起使用。可以是 `secretKeyRef` 以使用密钥引用。 | 参见下面的示例
| `qos`    | N  | 指示消息的服务质量级别 (QoS)（[更多信息](https://www.hivemq.com/blog/mqtt-essentials-part-6-mqtt-quality-of-service-levels/)）。默认为 `1`。 |`0`, `1`, `2`

### 使用 TLS 进行通信

要配置使用 TLS 的通信，请确保 MQTT 代理（例如 emqx）配置为支持证书，并在组件配置中提供 `caCert`、`clientCert`、`clientKey` 元数据。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
    - name: url
      value: "ssl://host.domain[:port]"
  # TLS configuration
    - name: caCert
      value: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
    - name: clientCert
      value: |
        -----BEGIN CERTIFICATE-----
        ...
        -----END CERTIFICATE-----
    - name: clientKey
      secretKeyRef:
        name: myMqttClientKey
        key: myMqttClientKey
    # Optional
    - name: retain
      value: "false"
    - name: cleanSession
      value: "false"
    - name: qos
      value: 1
```

请注意，虽然 `caCert` 和 `clientCert` 值可能不是密钥，但为了方便起见，也可以从 Dapr 密钥存储中引用它们。

### 消费共享主题

在消费共享主题时，每个消费者必须具有唯一的标识符。默认情况下，应用 ID 用于唯一标识每个消费者和发布者。在自托管模式下，为每个 `dapr run` 调用使用不同的应用 ID 就足以使它们从同一个共享主题消费。然而，在 Kubernetes 上，应用 Pod 的多个实例将共享同一个应用 ID，从而阻止所有实例消费同一个主题。为了克服这一点，请使用 `{uuid}` 标签（这将在每个实例启动时为其生成一个随机生成的值）或 `{podName}`（这将使用 Kubernetes 上的 Pod 名称）配置组件的 `consumerID` 元数据。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
    - name: consumerID
      value: "{uuid}"
    - name: cleanSession
      value: "true"
    - name: url
      value: "tcp://admin:public@localhost:1883"
    - name: qos
      value: 1
    - name: retain
      value: "false"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储。
{{% /alert %}}

请注意，在这种情况下，消费者 ID 的值在每次 Dapr 重启时都是随机的，因此您还应该将 `cleanSession` 设置为 `"true"`。

建议将 [StatefulSets]({{% ref "howto-subscribe-statefulset.md" %}}) 与共享订阅一起使用。

## 创建 MQTT3 代理

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker [在本地运行 MQTT 代理（如 emqx）](https://hub.docker.com/_/emqx)：

```bash
docker run -d -p 1883:1883 --name mqtt emqx:latest
```

然后您可以使用客户端端口与服务器交互：`tcp://localhost:1883`
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用以下 yaml 在 kubernetes 中运行 MQTT3 代理：

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
          image: emqx:latest
          imagePullPolicy: IfNotPresent
          ports:
            - name: default
              containerPort: 1883
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
```

然后您可以使用客户端端口与服务器交互：`tcp://mqtt-broker.default.svc.cluster.local:1883`
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})了解配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
