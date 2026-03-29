---
type: docs
title: "如何：通过 StatefulSet 水平扩展订阅者"
linkTitle: "如何：通过 StatefulSet 水平扩展订阅者"
weight: 6000
description: "了解如何使用 StatefulSet 进行订阅并通过一致的消费者 ID 进行水平扩展"
---

与 Pod 为临时性的 Deployments 不同，[StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) 允许在 Kubernetes 上部署有状态应用程序，同时为每个 Pod 保持一个稳定的标识。

以下是使用 Dapr 的 StatefulSet 示例：
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: python-subscriber
spec:
  selector:
    matchLabels:
      app: python-subscriber  # has to match .spec.template.metadata.labels
  serviceName: "python-subscriber"
  replicas: 3
  template:
    metadata:
      labels:
        app: python-subscriber # has to match .spec.selector.matchLabels
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "python-subscriber"
        dapr.io/app-port: "5001"
    spec:
      containers:
      - name: python-subscriber
        image: ghcr.io/dapr/samples/pubsub-python-subscriber:latest
        ports:
        - containerPort: 5001
        imagePullPolicy: Always
```

通过 Dapr 订阅发布订阅主题时，应用程序可以定义 `consumerID`，该 ID 决定了订阅者在队列或主题中的位置。借助 StatefulSets 的 Pod 稳定标识特性，每个 Pod 可以拥有唯一的 `consumerID`，从而实现订阅者应用程序的每个水平扩展。Dapr 会跟踪每个 Pod 的名称，该名称可在声明组件时使用 `{podName}` 标记。

在扩展给定主题的订阅者数量时，每个 Dapr 组件都有独特的设置来决定其行为。通常，多个消费者有两种选择：

 - 广播：发布到主题的每条消息都会被所有订阅者消费。
 - 共享：一条消息由任意订阅者消费（但不是全部）。

Kafka 通过 `consumerID` 隔离每个订阅者，并在主题中维护各自的位置。当实例重启时，它会重用相同的 `consumerID` 并从其最后已知位置继续，不会跳过消息。下面的组件演示了 Kafka 组件如何被多个 Pod 使用：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: my-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092
  - name: consumerID
    value: "{podName}"
  - name: authRequired
    value: "false"
```

MQTT3 协议具有共享主题功能，允许多个订阅者"竞争"主题中的消息，即一条消息仅由其中一个处理。例如：

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
      value: "{podName}"
    - name: cleanSession
      value: "true"
    - name: url
      value: "tcp://admin:public@localhost:1883"
    - name: qos
      value: 1
    - name: retain
      value: "false"
```

## 下一步

- 尝试 [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub)。
- 了解 [使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}}) 以及何时可能 [发送不含 CloudEvents 的消息]({{% ref pubsub-raw %}})。
- 查看 [发布订阅组件列表]({{% ref setup-pubsub %}})。
- 阅读 [API 参考文档]({{% ref pubsub_api %}})。
