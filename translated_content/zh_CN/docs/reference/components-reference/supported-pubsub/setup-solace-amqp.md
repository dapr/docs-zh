---
type: docs
title: "Solace-AMQP"
linkTitle: "Solace-AMQP"
description: "Solace-AMQP 发布订阅组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-solace-amqp/"
---

## 组件格式

要设置 Solace-AMQP 发布订阅，需创建类型为 `pubsub.solace.amqp` 的组件。请参阅 [发布订阅代理组件文件]({{% ref setup-pubsub.md %}}) 以了解 ConsumerID 的自动生成方式。阅读 [操作指南：发布与订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}}) 以了解如何创建并应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: solace
spec:
  type: pubsub.solace.amqp
  version: v1
  metadata:
    - name: url
      value: 'amqp://localhost:5672'
    - name: username
      value: 'default'
    - name: password
      value: 'default'
    - name: consumerID
      value: 'channel1'
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥以纯文本形式使用。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| url    | Y  | AMQP 代理的地址。可使用 `secretKeyRef` 引用密钥。 <br> 非 TLS 通信使用 **`amqp://`** URI 方案。 <br> TLS 通信使用 **`amqps://`** URI 方案。 | `"amqp://host.domain[:port]"`
| username | Y | 连接到代理的用户名。仅在未指定 anonymous 或其设置为 `false` 时必需。| `default`
| password | Y | 连接到代理的密码。仅在未指定 anonymous 或其设置为 `false` 时必需。 | `default`
| consumerID        |    N     | 消费者 ID（consumer tag）将一个或多个消费者组织成一个组。相同消费者 ID 的消费者作为单一虚拟消费者协作；例如，一条消息仅由组内的一个消费者处理一次。若未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID（`appID`）的值。 | 可设置为字符串值（如上例中的 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[查看组件元数据中可使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| anonymous | N | 在不验证凭据的情况下连接到代理。仅在代理上启用时有效。若设置为 `true`，则无需用户名和密码。 | `true`
| caCert | 使用 TLS 时必需 | 用于验证服务器 TLS 证书的 PEM 格式证书颁发机构（CA）证书。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientCert  | 使用 TLS 时必需 | PEM 格式的 TLS 客户端证书。必须与 `clientKey` 一起使用。 | `"-----BEGIN CERTIFICATE-----\n<base64-encoded DER>\n-----END CERTIFICATE-----"`
| clientKey | 使用 TLS 时必需 | PEM 格式的 TLS 客户端私钥。必须与 `clientCert` 一起使用。可使用 `secretKeyRef` 引用密钥。 | `"-----BEGIN RSA PRIVATE KEY-----\n<base64-encoded PKCS8>\n-----END RSA PRIVATE KEY-----"`

### 使用 TLS 进行通信

要配置使用 TLS 的通信：

1. 确保 Solace 代理配置为支持证书。
1. 在组件配置中提供 `caCert`、`clientCert` 和 `clientKey` 元数据。 

例如：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: solace
spec:
  type: pubsub.solace.amqp
  version: v1
  metadata:
  - name: url
    value: "amqps://host.domain[:port]"
  - name: username
    value: 'default'
  - name: password
    value: 'default'
  - name: caCert
    value: ${{ myLoadedCACert }}
  - name: clientCert
    value: ${{ myLoadedClientCert }}
  - name: clientKey
    secretKeyRef:
      name: mySolaceClientKey
      key: mySolaceClientKey
auth:
  secretStore: <SECRET_STORE_NAME>
```

> 虽然 `caCert` 和 `clientCert` 值可能不是密钥，但为方便起见，它们也可以从 Dapr 密钥存储中引用。

### 向主题和队列发布/订阅消息

默认情况下，消息通过主题进行发布和订阅。如果您希望目标是队列，请在主题前加上 `queue:` 前缀，Solace AMQP 组件将连接到队列。

## 创建 Solace 代理

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行 Solace 代理：

```bash
docker run -d -p 8080:8080 -p 55554:55555 -p 8008:8008 -p 1883:1883 -p 8000:8000 -p 5672:5672 -p 9000:9000 -p 2222:2222 --shm-size=2g --env username_admin_globalaccesslevel=admin --env username_admin_password=admin --name=solace solace/solace-pubsub-standard
```

然后，您可以使用客户端端口与服务器交互：`mqtt://localhost:5672`
{{% /tab %}}

{{% tab "SaaS" %}}
您还可以在 [Solace Cloud](https://console.solace.cloud/login/new-account?product=event-streaming) 上注册免费的 SaaS 代理。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读 [本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}}) 获取配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
