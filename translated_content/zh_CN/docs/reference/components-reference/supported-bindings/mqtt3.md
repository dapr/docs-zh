---
type: docs
title: "MQTT3 binding 规范"
linkTitle: "MQTT3"
description: "MQTT3 binding 组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/mqtt3/"
  - "/operations/components/setup-bindings/supported-bindings/mqtt/"
---

## 组件格式

要设置 MQTT3 binding，请创建一个类型为 `bindings.mqtt3` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
    - name: url
      value: "tcp://[username][:password]@host.domain[:port]"
    - name: topic
      value: "mytopic"
    - name: consumerID
      value: "myapp"
    # 可选
    - name: retain
      value: "false"
    - name: cleanSession
      value: "false"
    - name: backOffMaxRetries
      value: "0"
    - name: direction
      value: "input, output"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体描述请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | Binding 支持 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|---------|
| `url`    | Y  | Input/Output | MQTT broker 的地址。可以是 `secretKeyRef` 以使用密钥引用。 <br> 对于非 TLS 通信，使用 **`tcp://`** URI scheme。 <br> 对于 TLS 通信，使用 **`ssl://`** URI scheme。 | `"tcp://[username][:password]@host.domain[:port]"`
| `topic`  | Y | Input/Output | 要监听或发送事件的主题。 | `"mytopic"` |
| `consumerID` | Y | Input/Output | 用于连接到 MQTT broker 的客户端 ID。 | `"myMqttClientApp"`
| `retain` | N  | Input/Output | 定义消息是否由 broker 保存为指定主题的最后一个已知良好值。默认为 `"false"`。  | `"true"`, `"false"`
| `cleanSession` | N | Input/Output | 如果为 `"true"`，则在向 MQTT broker 发送的连接消息中设置 `clean_session` 标志。默认为 `"false"`。  | `"true"`, `"false"`
| `caCert` | 使用 TLS 时必填 | Input/Output | PEM 格式的证书颁发机构（CA）证书，用于验证服务器 TLS 证书。 | 见下方示例
| `clientCert`  | 使用 TLS 时必填 | Input/Output | PEM 格式的 TLS 客户端证书。必须与 `clientKey` 一起使用。 | 见下方示例
| `clientKey` | 使用 TLS 时必填 | Input/Output | PEM 格式的 TLS 客户端密钥。必须与 `clientCert` 一起使用。可以是 `secretKeyRef` 以使用密钥引用。 | 见下方示例
| `backOffMaxRetries` | N | Input | 在返回错误之前处理消息的最大重试次数。默认为 `"0"`，表示不进行重试。可以指定 `"-1"` 表示消息应无限重试，直到成功处理或应用程序关闭。组件将在重试之间等待 5 秒。 | `"3"`
| `direction` | N | Input/Output | binding 的方向 | `"input"`, `"output"`, `"input, output"`

### 使用 TLS 进行通信

要配置使用 TLS 的通信，请确保 MQTT broker（例如 emqx）配置为支持证书，并在组件配置中提供 `caCert`、`clientCert`、`clientKey` 元数据。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-binding
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
    - name: url
      value: "ssl://host.domain[:port]"
    - name: topic
      value: "topic1"
    - name: consumerID
      value: "myapp"
    # TLS 配置
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
    # 可选
    - name: retain
      value: "false"
    - name: cleanSession
      value: "false"
    - name: backoffMaxRetries
      value: "0"
```

> 请注意，虽然 `caCert` 和 `clientCert` 值可能不是密钥，但为了方便，它们也可以从 Dapr 密钥存储中引用。

### 消费共享主题

当消费共享主题时，每个消费者必须具有唯一标识符。如果运行应用程序的多个实例，您可以使用 `{uuid}` 标记配置组件的 `consumerID` 元数据，这将在启动时为每个实例提供随机生成的 `consumerID` 值。例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-binding
  namespace: default
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: consumerID
    value: "{uuid}"
  - name: url
    value: "tcp://admin:public@localhost:1883"
  - name: topic
    value: "topic1"
  - name: retain
    value: "false"
  - name: cleanSession
    value: "true"
  - name: backoffMaxRetries
    value: "0"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体描述请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

> 在这种情况下，每次 Dapr 重启时消费者 ID 的值都是随机的，因此您还应该将 `cleanSession` 设置为 `"true"`。

## Binding 支持

此组件同时支持 **输入和输出** binding 接口。

此组件支持以下操作的 **输出 binding**：

- `create`：发布新消息

## 按请求设置主题

您可以在每次请求时覆盖组件元数据中的主题：

```json
{
  "operation": "create",
  "metadata": {
    "topic": "myTopic"
  },
  "data": "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"
}
```

## 按请求设置 retain 属性

您可以在每次请求时覆盖组件元数据中的 retain 属性：

```json
{
  "operation": "create",
  "metadata": {
    "retain": "true"
  },
  "data": "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [如何操作：使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
