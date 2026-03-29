---
type: docs
title: "如何：使用 KEDA 自动扩缩 Dapr 应用"
linkTitle: "KEDA"
description: "如何配置 Dapr 应用程序使用 KEDA 自动扩缩"
weight: 3000
---

Dapr 采用构建块 API 方式，并提供众多[发布订阅组件]({{% ref pubsub %}})，这使得编写消息处理应用变得轻而易举。由于 Dapr 可以在多种环境中运行（例如虚拟机、物理机、云或边缘 Kubernetes），因此 Dapr 应用的自动扩缩由托管层管理。

对于 Kubernetes，Dapr 与 [KEDA](https://github.com/kedacore/keda) 集成，KEDA 是一个面向 Kubernetes 的事件驱动自动扩缩器。Dapr 的许多发布订阅组件与 [KEDA](https://github.com/kedacore/keda) 提供的扩缩器重叠，因此可以轻松配置 Dapr 在 Kubernetes 上的部署，基于背压使用 KEDA 进行自动扩缩。

在本指南中，你将配置一个可扩缩的 Dapr 应用，以及 Kafka topic 上的背压。但是，你可以将此方法应用于 Dapr 提供的_任意_ [发布订阅组件]({{% ref pubsub %}})。

{{% alert title="注意" color="primary" %}}
 如果你使用的是 Azure Container Apps，请参阅官方 Azure 文档了解[使用 KEDA 扩缩器扩缩 Dapr 应用](https://learn.microsoft.com/azure/container-apps/dapr-keda-scaling)。

{{% /alert %}}

## 安装 KEDA

要安装 KEDA，请按照 KEDA 网站上的[部署 KEDA](https://keda.sh/docs/latest/deploy/) 说明进行操作。

## 安装并部署 Kafka

如果你没有 Kafka 服务，可以使用 Helm 将其安装到 Kubernetes 集群中：

```bash
helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/
helm repo update
kubectl create ns kafka
helm install kafka confluentinc/cp-helm-charts -n kafka \
		--set cp-schema-registry.enabled=false \
		--set cp-kafka-rest.enabled=false \
		--set cp-kafka-connect.enabled=false
```

查看 Kafka 部署状态：

```shell
kubectl rollout status deployment.apps/kafka-cp-control-center -n kafka
kubectl rollout status deployment.apps/kafka-cp-ksql-server -n kafka
kubectl rollout status statefulset.apps/kafka-cp-kafka -n kafka
kubectl rollout status statefulset.apps/kafka-cp-zookeeper -n kafka
```

安装完成后，部署 Kafka 客户端并等待其就绪：

```shell
kubectl apply -n kafka -f deployment/kafka-client.yaml
kubectl wait -n kafka --for=condition=ready pod kafka-client --timeout=120s
```

## 创建 Kafka topic

创建本示例使用的 topic（`demo-topic`）：

```shell
kubectl -n kafka exec -it kafka-client -- kafka-topics \
		--zookeeper kafka-cp-zookeeper-headless:2181 \
		--topic demo-topic \
		--create \
		--partitions 10 \
		--replication-factor 3 \
		--if-not-exists
```

> topic 的 `partitions` 数量与 KEDA 为你的部署创建的最大副本数相关。

## 部署 Dapr 发布订阅组件

为 Kubernetes 部署 Dapr Kafka 发布订阅组件。将以下 YAML 粘贴到名为 `kafka-pubsub.yaml` 的文件中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: autoscaling-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: kafka-cp-kafka.kafka.svc.cluster.local:9092
    - name: authRequired
      value: "false"
    - name: consumerID
      value: autoscaling-subscriber
```

以上 YAML 定义了你的应用订阅的发布订阅组件，即[你之前创建的 topic（`demo-topic`）]({{% ref "#create-the-kakfa-topic" %}})。

如果你按照 [Kafka Helm 安装说明]({{% ref "#install-and-deploy-kafka" %}}) 操作，可以保留 `brokers` 值不变。否则，请将此值更改为你的 Kafka brokers 连接字符串。

注意为 `consumerID` 设置的 `autoscaling-subscriber` 值。此值稍后用于确保 KEDA 和你的部署使用相同的 [Kafka partition offset](https://cloudurable.com/blog/kafka-architecture-topics/index.html#:~:text=Kafka%20continually%20appended%20to%20partitions,fit%20on%20a%20single%20server.)。

现在，将组件部署到集群：

```bash
kubectl apply -f kafka-pubsub.yaml
```

## 部署 KEDA Kafka 扩缩器

部署 KEDA 扩缩对象，它会：

- 监控指定 Kafka topic 上的 lag
- 配置 Kubernetes Horizontal Pod Autoscaler (HPA) 以扩缩你的 Dapr 部署

将以下内容粘贴到名为 `kafka_scaler.yaml` 的文件中，并在所需位置配置你的 Dapr 部署：

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: subscriber-scaler
spec:
  scaleTargetRef:
    name: <REPLACE-WITH-DAPR-DEPLOYMENT-NAME>
  pollingInterval: 15
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: kafka
    metadata:
      topic: demo-topic
      bootstrapServers: kafka-cp-kafka.kafka.svc.cluster.local:9092
      consumerGroup: autoscaling-subscriber
      lagThreshold: "5"
```

让我们回顾一下上述文件中的几个元数据值：

| 值 | 描述 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scaleTargetRef`/`name` | Deployment 中定义的应用的 Dapr ID（`dapr.io/id` 注解的值）。 |
| `pollingInterval` | KEDA 检查 Kafka 当前 topic partition offset 的频率（秒）。 |
| `minReplicaCount` | KEDA 为你的部署创建的最少副本数。如果你的应用启动时间较长，最好将其设置为 `1` 以确保部署始终至少运行一个副本。否则设置为 `0`，KEDA 会为你创建第一个副本。 |
| `maxReplicaCount` | 你的部署的最大副本数。根据 [Kafka partition offset](https://cloudurable.com/blog/kafka-architecture-topics/index.html#:~:text=Kafka%20continually%20appended%20to%20partitions,fit%20on%20a%20single%20server.) 的工作原理，你不应将此值设置为高于 topic partitions 的总数。 |
| `triggers`/`metadata`/`topic` | 应设置为你的 Dapr 部署订阅的同一 topic（本例中为 `demo-topic`）。 |
| `triggers`/`metadata`/`bootstrapServers` | 应设置为 `kafka-pubsub.yaml` 文件中使用的同一 broker 连接字符串。 |
| `triggers`/`metadata`/`consumerGroup` | 应设置为 `kafka-pubsub.yaml` 文件中 `consumerID` 的同一值。 |

{{% alert title="重要" color="warning" %}}
 将 Dapr 服务订阅和 KEDA 扩缩器配置的连接字符串、topic 和消费者组设置为*相同*的值对于确保自动扩缩正常工作至关重要。

{{% /alert %}}

将 KEDA 扩缩器部署到 Kubernetes：

```bash
kubectl apply -f kafka_scaler.yaml
```

全部完成！

## 查看 KEDA 扩缩器工作

现在 `ScaledObject` KEDA 对象已配置，你的部署将根据 Kafka topic 的 lag 进行扩缩。[了解有关为 Kafka topics 配置 KEDA 的更多信息](https://keda.sh/docs/2.0/scalers/apache-kafka/)。

按照 KEDA 扩缩器清单中的定义，你现在可以开始向 Kafka topic `demo-topic` 发布消息，并观察当 lag 阈值高于 `5` 时 pod 自动扩缩。使用 Dapr [Publish]({{% ref dapr-publish %}}) CLI 命令向 Kafka Dapr 组件发布消息。

## 后续步骤

[了解如何在 Azure Container Apps 中使用 KEDA 扩缩 Dapr 发布订阅或绑定应用](https://learn.microsoft.com/azure/container-apps/dapr-keda-scaling)
