---
type: docs
title: "KubeMQ"
linkTitle: "KubeMQ"
description: "KubeMQ 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-kubemq/"
---

## 组件格式

要设置 KubeMQ 发布订阅，需创建类型为 `pubsub.kubemq` 的组件。参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解如何自动生成 ConsumerID。阅读[操作指南：发布与订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})以了解如何创建和应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubemq-pubsub
spec:
  type: pubsub.kubemq
  version: v1
  metadata:
    - name: address
      value: localhost:50000
    - name: store
      value: false
    - name: consumerID
      value: channel1
```

## 规范元数据字段

| 字段             | 必填   | 详情                                                                                                                        | 示例                                |
|-------------------|:--------:|-----------------------------------------------------------------------------------------------------------------------------|----------------------------------------|
| address           |    Y     | KubeMQ 服务器的地址                                                                                                          | `"localhost:50000"`                    |
| store             |    N     | 发布订阅类型，true：发布订阅持久化（EventsStore），false：发布订阅内存（Events）                                           | `true` 或 `false`（默认为 `false`）    |
| consumerID        |    N     | 消费者 ID（消费者标签）将一个或多个消费者组织成一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息仅由该组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时将其设置为 Dapr 应用程序 ID（`appID`）值。 | 可设置为字符串值（例如上面示例中的 `"channel1"`）或字符串格式值（例如 `"{podName}"` 等）。[查看您可在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| clientID          |    N     | 客户端 ID 连接的名称                                                                                                         | `sub-client-12345`                     |
| authToken         |    N     | 用于连接的身份验证 JWT 令牌 查看 [KubeMQ Authentication](https://docs.kubemq.io/learn/access-control/authentication)         | `ew...`                                |
| group             |    N     | 用于负载均衡的订阅者组                                                                                                       | `g1`                                   |
| disableReDelivery |    N     | 设置在来自应用程序发生错误的情况下是否应重新传递消息                                                                          | `true` 或 `false`（默认为 `false`）    |

## 创建 KubeMQ 代理

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
1. [获取 KubeMQ 密钥](https://docs.kubemq.io/getting-started/quick-start#obtain-kubemq-license-key)。
2. 等待带有您的密钥的电子邮件确认

您可以使用 Docker 运行 KubeMQ 代理：

```bash
docker run -d -p 8080:8080 -p 50000:50000 -p 9090:9090 -e KUBEMQ_TOKEN=<your-key> kubemq/kubemq
```
然后，您可以使用客户端端口与服务器交互：`localhost:50000`

{{% /tab %}}

{{% tab "Kubernetes" %}}
1. [获取 KubeMQ 密钥](https://docs.kubemq.io/getting-started/quick-start#obtain-kubemq-license-key)。
2. 等待带有您的密钥的电子邮件确认

然后运行以下 kubectl 命令：

```bash
kubectl apply -f https://deploy.kubemq.io/init
```

```bash
kubectl apply -f https://deploy.kubemq.io/key/<your-key>
```
{{% /tab %}}

{{< /tabpane >}}

## 安装 KubeMQ CLI
前往 [KubeMQ CLI](https://github.com/kubemq-io/kubemqctl/releases) 并下载最新版本的 CLI。

## 浏览 KubeMQ 仪表板

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
<!-- IGNORE_LINKS -->
打开浏览器并导航至 [http://localhost:8080](http://localhost:8080)
<!-- END_IGNORE -->
{{% /tab %}}

{{% tab "Kubernetes" %}}
安装了 KubeMQCTL 后，运行以下命令：

```bash
kubemqctl get dashboard
```
或者，安装了 kubectl 后，运行 port-forward 命令：

```bash
kubectl port-forward svc/kubemq-cluster-api -n kubemq 8080:8080
```
{{% /tab %}}

{{< /tabpane >}}


## KubeMQ 文档
访问 [KubeMQ 文档](https://docs.kubemq.io/) 以获取更多信息。


## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读本指南以获取有关配置发布订阅组件的说明[发布与订阅]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})
- [发布订阅构建块]({{% ref pubsub %}})
