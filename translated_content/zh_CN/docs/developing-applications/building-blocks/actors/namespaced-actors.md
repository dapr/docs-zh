---
type: docs
title: "命名空间 Actor"
linkTitle: "命名空间 Actor"
weight: 40
description: "了解命名空间 Actor"
---


Dapr 中的命名空间提供隔离能力，从而实现多租户。通过 Actor 命名空间，相同的 Actor 类型可以部署到不同的命名空间中。你可以调用同一命名空间中的这些 Actor 实例。

{{% alert title="注意" color="primary" %}}
每个命名空间 Actor 部署必须使用各自独立的状态存储，尤其是当相同的 Actor 类型跨命名空间使用时。换言之，命名空间信息不会作为 Actor 记录的一部分写入，因此每个命名空间都需要独立的状态存储。有关示例，请参见[为命名空间配置 Actor 状态存储]({{% ref "#configuring-actor-state-stores-for-namespacing" %}})章节。
{{% /alert %}}

## 创建和配置命名空间

你可以在自托管模式或 Kubernetes 上使用命名空间。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
在自托管模式下，你可以通过设置 [`NAMESPACE` 环境变量]({{% ref environment %}})来指定 Dapr 实例的命名空间。

{{% /tab)}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上，你可以在部署 Actor 应用程序时创建和配置命名空间。例如，从以下 `kubectl` 命令开始：

```bash
kubectl create namespace namespace-actorA
kubectl config set-context --current --namespace=namespace-actorA
```

然后，将你的 Actor 应用程序部署到此命名空间中（本例中为 `namespace-actorA`）。

{{% /tab >}}

{{< /tabpane >}}

## 为命名空间配置 Actor 状态存储

每个命名空间 Actor 部署**必须**使用各自独立的状态存储。虽然你可以为每个 Actor 命名空间使用不同的物理数据库，但某些状态存储组件提供了通过表、前缀、集合等方式进行逻辑隔离的方法。这允许你使用相同的物理数据库来支持多个命名空间，只要你在 Dapr 组件定义中提供逻辑隔离即可。

以下是一些示例。

### 示例 1：通过 etcd 中的前缀

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.etcd
  version: v2
  metadata:
  - name: endpoints
    value: localhost:2379
  - name: keyPrefixPath
    value: namespace-actorA
  - name: actorStateStore
    value: "true"
```

### 示例 2：通过 SQLite 中的表名

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.sqlite
  version: v1
  metadata:
  - name: connectionString
    value: "data.db"
  - name: tableName
    value: "namespace-actorA"
  - name: actorStateStore
    value: "true"
```

### 示例 3：通过 Redis 中的逻辑数据库编号

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
  - name: actorStateStore
    value: "true"
  - name: redisDB
    value: "1"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key:  redis-password
  - name: actorStateStore
    value: "true"
  - name: redisDB
    value: "1"
auth:
  secretStore: <SECRET_STORE_NAME>
```

请查看你的[状态存储组件规范]({{% ref supported-state-stores %}})以了解其提供的功能。

{{% alert title="注意" color="primary" %}}
命名空间 Actor 使用多租户 Placement 服务。使用此控制平面服务时，每个应用程序部署都有自己的命名空间，属于命名空间"ActorA"应用程序的边车不会收到命名空间"ActorB"中应用程序的放置信息。
{{% /alert >}}

## 后续步骤

- [深入了解 Dapr Placement 服务]({{% ref placement %}})
- [Placement API 参考指南]({{% ref placement_api %}})
