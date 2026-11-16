---
type: docs
title: "操作指南：使用 KEDA 自动扩缩 Dapr 应用"
linkTitle: "KEDA"
description: "如何配置 Dapr 应用以使用 KEDA 进行自动扩缩"
weight: 3000
aliases:
  - /zh-hans/developing-applications/integrations/autoscale-keda/
---

Dapr 借助其构建块 API 方式，以及众多[发布订阅组件]({{% ref pubsub %}})，让编写消息处理应用变得十分容易。由于 Dapr 可以在多种环境中运行（例如虚拟机、裸机、云端或边缘 Kubernetes），Dapr 应用的自动扩缩由宿主层管理。

对于 Kubernetes，Dapr 与 [KEDA](https://github.com/kedacore/keda) 集成，KEDA 是 Kubernetes 上的事件驱动自动扩缩器。Dapr 的许多发布订阅组件与 [KEDA](https://github.com/kedacore/keda) 提供的扩缩器功能重叠，因此很容易配置 Kubernetes 上的 Dapr 部署，使其根据背压借助 KEDA 实现自动扩缩。

在本指南中，你将配置一个可扩缩的 Dapr 应用，以及 Kafka 主题上的背压。不过，你可以将此方法应用于 Dapr 提供的 _任何_ [发布订阅组件]({{% ref pubsub %}})。

{{% alert title="注意" color="primary" %}}
 如果你使用的是 Azure Container Apps，请参阅 Azure 官方文档中关于[使用 KEDA 扩缩器扩缩 Dapr 应用](https://learn.microsoft.com/azure/container-apps/dapr-keda-scaling)的内容。

{{% /alert %}}

## 安装 KEDA

要安装 KEDA，请按照 KEDA 官网上的[部署 KEDA](https://keda.sh/docs/latest/deploy/)说明操作。

## 安装并部署 Kafka

如果你没有可用的 Kafka 服务，可以在本示例中使用 Helm 将其安装到你的 Kubernetes 集群中：

```bash
helm repo add confluentinc https://confluentinc.github.io/cp-helm-charts/
helm repo update
kubectl create ns kafka
helm install kafka confluentinc/cp-helm-charts -n kafka \
		--set cp-schema-registry.enabled=false \
		--set cp-kafka-rest.enabled=false \
		--set cp-kafka-connect.enabled=false
```

要检查 Kafka 部署的状态：

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

## 创建 Kafka 主题

创建本示例中使用的主题（`demo-topic`）：

```shell
kubectl -n kafka exec -it kafka-client -- kafka-topics \
		--zookeeper kafka-cp-zookeeper-headless:2181 \
		--topic demo-topic \
		--create \
		--partitions 10 \
		--replication-factor 3 \
		--if-not-exists
```

> 主题的 `partitions` 数量与 KEDA 为你的部署所创建的最大副本数相关。

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

上面的 YAML 定义了你的应用所订阅的发布订阅组件，该组件即[你之前创建的主题（`demo-topic`）]({{% ref "#创建-kafka-主题" %}})。

如果你使用了 [Kafka Helm 安装说明]({{% ref "#安装并部署-kafka" %}})，可以保留 `brokers` 的值不变。否则，请将该值改为你的 Kafka brokers 的连接字符串。

请注意为 `consumerID` 设置的 `autoscaling-subscriber` 值。该值稍后将用于确保 KEDA 与你的部署使用相同的 [Kafka 分区偏移量](https://cloudurable.com/blog/kafka-architecture-topics/index.html#:~:text=Kafka%20continually%20appended%20to%20partitions,fit%20on%20a%20single%20server.)。

现在，将该组件部署到集群中：

```bash
kubectl apply -f kafka-pubsub.yaml
```

## 为 Kafka 部署 KEDA 自动扩缩器

部署 KEDA 扩缩对象，它会：
- 监控指定 Kafka 主题上的 lag
- 配置 Kubernetes 水平 Pod 自动扩缩器（HPA），以对你的 Dapr 部署进行扩容和缩容

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

让我们来看看上述文件中的几个元数据值：

| 值 | 说明 |
| ------ | ------------------------------ |
| `scaleTargetRef`/`name` | 在 Deployment 中定义的应用的 Dapr ID（即 `dapr.io/id` 注解的值）。 |
| `pollingInterval` | KEDA 检查 Kafka 当前主题分区偏移量的频率（以秒为单位）。 |
| `minReplicaCount` | KEDA 为你的部署创建的最小副本数。如果应用启动耗时较长，可以将其设置为 `1`，以确保部署中始终至少有一个副本在运行。否则，设置为 `0`，由 KEDA 为你创建第一个副本。 |
| `maxReplicaCount` | 部署的最大副本数。鉴于 [Kafka 分区偏移量](https://cloudurable.com/blog/kafka-architecture-topics/index.html#:~:text=Kafka%20continually%20appended%20to%20partitions,fit%20on%20a%20single%20server.) 的工作方式，该值不应高于主题分区的总数。 |
| `triggers`/`metadata`/`topic` | 应设置为你的 Dapr 部署所订阅的同一主题（本示例中为 `demo-topic`）。 |
| `triggers`/`metadata`/`bootstrapServers` | 应设置为与 `kafka-pubsub.yaml` 文件中使用的相同的 broker 连接字符串。 |
| `triggers`/`metadata`/`consumerGroup` | 应设置为与 `kafka-pubsub.yaml` 文件中的 `consumerID` 相同的值。 |

{{% alert title="重要" color="warning" %}}
 为 Dapr 服务订阅和 KEDA 扩缩器配置设置*相同*的连接字符串、主题和消费者组，对于确保自动扩缩正常工作至关重要。

{{% /alert %}}

将 KEDA 扩缩器部署到 Kubernetes：

```bash
kubectl apply -f kafka_scaler.yaml
```

全部完成！

## 查看 KEDA 扩缩器的运行效果

现在 `ScaledObject` KEDA 对象已配置完成，你的部署将根据 Kafka 主题的 lag 进行扩缩。[了解更多关于为 Kafka 主题配置 KEDA 的信息](https://keda.sh/docs/2.0/scalers/apache-kafka/)。

按照 KEDA 扩缩器清单中的定义，现在你可以开始向 Kafka 主题 `demo-topic` 发布消息，并在 lag 阈值高于 `5` 个主题时观察 Pod 自动扩缩。使用 Dapr [发布]({{% ref dapr-publish %}}) CLI 命令向 Kafka Dapr 组件发布消息。

## 后续步骤

[了解如何在 Azure Container Apps 中使用 KEDA 扩缩 Dapr 发布订阅或绑定应用](https://learn.microsoft.com/azure/container-apps/dapr-keda-scaling)
