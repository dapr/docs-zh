---
type: docs
title: "JetStream"
linkTitle: "JetStream"
description: "NATS JetStream 组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-jetstream/"
---

## 组件格式

要设置 JetStream 发布订阅，请创建类型为 `pubsub.jetstream` 的组件。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 是如何自动生成的。阅读[如何：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})以了解如何创建和应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jetstream-pubsub
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://localhost:4222"
  - name: jwt # 可选。用于去中心化 JWT 认证。
    value: "eyJhbGciOiJ...6yJV_adQssw5c"
  - name: seedKey # 可选。用于去中心化 JWT 认证。
    value: "SUACS34K232O...5Z3POU7BNIL4Y"
  - name: tls_client_cert # 可选。用于 TLS 客户端认证。
    value: "/path/to/tls.crt"
  - name: tls_client_key # 可选。用于 TLS 客户端认证。
    value: "/path/to/tls.key"
  - name: token # 可选。用于基于 Token 的认证。
    value: "my-token"
  - name: name
    value: "my-conn-name"
  - name: streamName
    value: "my-stream"
  - name: durableName 
    value: "my-durable-subscription"
  - name: queueGroupName
    value: "my-queue-group"
  - name: startSequence
    value: 1
  - name: startTime # Unix 格式
    value: 1630349391
  - name: flowControl
    value: false
  - name: ackWait
    value: 10s
  - name: maxDeliver
    value: 5
  - name: backOff
    value: "50ms, 1s, 10s"
  - name: maxAckPending
    value: 5000
  - name: replicas
    value: 1
  - name: memoryStorage
    value: false
  - name: rateLimit
    value: 1024
  - name: heartbeat
    value: 15s
  - name: ackPolicy
    value: explicit
  - name: deliverPolicy
    value: all
  - name: domain
    value: hub
  - name: apiPrefix
    value: PREFIX
```

## 规范元数据字段

| 字段             | 必填 | 详情                                       | 示例                              |
| --------------- | :------: | ------------------------------------------ | -------------------------------- |
| natsURL         |    Y     | NATS 服务器地址 URL                        | `"nats://localhost:4222"`        |
| jwt             |    N     | NATS 去中心化认证 JWT                      | `"eyJhbGciOiJ...6yJV_adQssw5c"`  |
| seedKey         |    N     | NATS 去中心化认证 Seed Key                 | `"SUACS34K232O...5Z3POU7BNIL4Y"` |
| tls_client_cert |    N     | NATS TLS 客户端认证证书                    | `"/path/to/tls.crt"`             |
| tls_client_key  |    N     | NATS TLS 客户端认证密钥                    | `"/path/to/tls.key"`             |
| token           |    N     | [NATS 基于 Token 的认证]                   | `"my-token"`                     |
| name            |    N     | NATS 连接名称                              | `"my-conn-name"`                 |
| streamName      |    N     | 要绑定的 JetStream Stream 名称             | `"my-stream"`                    |
| durableName     |    N     | [Durable name]                             | `"my-durable"`                   |
| queueGroupName  |    N     | 队列组名称                                 | `"my-queue"`                     |
| startSequence   |    N     | [Start Sequence]                           | `1`                              |
| startTime       |    N     | Unix 格式的[开始时间]                      | `1630349391`                     |
| flowControl     |    N     | [流控]                                     | `true`                           |
| ackWait         |    N     | [Ack Wait]                                 | `10s`                            |
| maxDeliver      |    N     | [最大投递次数]                             | `15`                             |
| backOff         |    N     | [退避策略]                                 | `"50ms, 1s, 5s, 10s"`            |
| maxAckPending   |    N     | [最大待确认消息数]                         | `5000`                           |
| replicas        |    N     | [副本数]                                   | `3`                              |
| memoryStorage   |    N     | [内存存储]                                 | `false`                          |
| rateLimit       |    N     | [速率限制]                                 | `1024`                           |
| heartbeat        |    N     | [心跳]                                     | `10s`                            |
| ackPolicy       |    N     | [确认策略]                                 | `explicit`                       |
| deliverPolicy   |    N     | 可选值：all、last、new、sequence、time     | `all`                            |
| domain          |    N     | [JetStream Leafondes]                      | `HUB`                            |
| apiPrefix       |    N     | [JetStream Leafnodes]                      | `PREFIX`                         |

## 创建 NATS 服务器

{{< tabpane text=true >}}

{{% tab "自托管" %}}
你可以使用 Docker 在本地运行启用了 JetStream 的 NATS 服务器：

```bash
docker run -d -p 4222:4222 nats:latest -js
```

然后你可以使用客户端端口与服务器交互：`localhost:4222`。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 NATS JetStream，使用 [helm](https://github.com/nats-io/k8s/tree/main/helm/charts/nats#jetstream)：

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm install --set nats.jetstream.enabled=true my-nats nats/nats
```

这将在 `default` 命名空间中安装单个 NATS 服务器。要查找与 NATS 交互的服务，请使用：

```bash
kubectl get svc my-nats
```

有关 helm chart 设置的更多信息，请参阅 [Helm chart 文档](https://helm.sh/docs/helm/helm_install/)。

{{% /tab %}}

{{< /tabpane >}}

## 创建 JetStream

为特定的主题创建 NATS JetStream 是必不可少的。例如，对于本地运行的 NATS 服务器，使用：

```bash
nats -s localhost:4222 stream add myStream --subjects mySubject
```

## 示例：竞争消费者模式

假设你希望每条消息仅由一个具有相同 app-id 的应用程序或 Pod 处理。通常，`consumerID` 元数据规范可以帮助你定义竞争消费者。

由于 NATS JetStream 不支持 `consumerID`，你需要指定 `durableName` 和 `queueGroupName` 来实现竞争消费者模式。例如：

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.jetstream
  version: v1
  metadata:
  - name: name
    value: "my-conn-name"
  - name: streamName
    value: "my-stream"
  - name: durableName 
    value: "my-durable-subscription"
  - name: queueGroupName
    value: "my-queue-group"
```

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})以获取配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
- [JetStream 文档](https://docs.nats.io/nats-concepts/jetstream)
- [NATS CLI](https://github.com/nats-io/natscli)


[Durable Name]: https://docs.nats.io/jetstream/concepts/consumers#durable-name
[Start Sequence]: https://docs.nats.io/jetstream/concepts/consumers#deliverbystartsequence
[Start Time]: https://docs.nats.io/jetstream/concepts/consumers#deliverbystarttime
[Replay Policy]: https://docs.nats.io/jetstream/concepts/consumers#replaypolicy
[Flow Control]: https://docs.nats.io/jetstream/concepts/consumers#flowcontrol
[Ack Wait]: https://docs.nats.io/jetstream/concepts/consumers#ackwait
[Max Deliver]: https://docs.nats.io/jetstream/concepts/consumers#maxdeliver
[BackOff]: https://docs.nats.io/jetstream/concepts/consumers#backoff
[Max Ack Pending]: https://docs.nats.io/jetstream/concepts/consumers#maxackpending
[Replicas]: https://docs.nats.io/jetstream/concepts/consumers#replicas
[Memory Storage]: https://docs.nats.io/jetstream/concepts/consumers#memorystorage
[Rate Limit]: https://docs.nats.io/jetstream/concepts/consumers#ratelimit
[Heartbeat]: https://docs.nats.io/jetstream/concepts/consumers#heartbeat
[Ack Policy]: https://docs.nats.io/nats-concepts/jetstream/consumers#ackpolicy
[JetStream Leafonodes]: https://docs.nats.io/running-a-nats-service/configuration/leafnodes/jetstream_leafnodes
[Decentralized JWT Authentication/Authorization]: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/jwt
[NATS token based authentication]: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens
