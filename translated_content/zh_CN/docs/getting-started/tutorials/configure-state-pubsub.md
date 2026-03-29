---
type: docs
title: "教程：配置状态存储和发布订阅消息代理"
linkTitle: "配置状态存储与发布订阅"
weight: 80
description: "为 Dapr 配置状态存储和发布订阅消息代理组件"
aliases:
  - /zh-hans/getting-started/tutorials/configure-redis/
---

要开始使用状态和发布订阅构建块，你需要两个组件：

- 一个用于持久化和恢复的状态存储组件。
- 一个用于异步风格消息传递的发布订阅消息代理组件。

支持的组件完整列表可在此处找到：
- [支持的状态存储]({{% ref supported-state-stores %}})
- [支持的发布订阅消息代理]({{% ref supported-pubsub %}})

在本教程中，我们将介绍如何使用 Redis 快速上手。

### 步骤 1：创建 Redis 存储

Dapr 可以使用任何 Redis 实例，可以是：

- 在本地开发机器上容器化部署，或
- 托管的云服务。

如果你已有 Redis 存储，请转到 [配置](#configure-dapr-components) 部分。

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
在自托管环境中，Dapr CLI 会在初始化过程中自动安装 Redis。你已准备就绪！请跳转到 [下一步](#next-steps)。
{{% /tab %}}

{{% tab "Kubernetes" %}}
你可以使用 [Helm](https://helm.sh/) 在 Kubernetes 集群中创建 Redis 实例。开始之前，请先 [安装 Helm v3](https://github.com/helm/helm#install)。

将 Redis 安装到你的集群中：

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install redis bitnami/redis --set image.tag=6.2
```

对于 Dapr 的发布订阅功能，你需要至少 Redis 5 版本。对于状态存储，可以使用较低版本。
请注意，在 `install` 命令中添加 `--set architecture=standalone` 会创建单副本 Redis 设置，如果你在本地环境中工作，可以节省内存和资源。

运行 `kubectl get pods` 查看集群中现在运行的 Redis 容器：

```bash
$ kubectl get pods
NAME             READY   STATUS    RESTARTS   AGE
redis-master-0   1/1     Running   0          69s
redis-replicas-0    1/1     Running   0          69s
redis-replicas-1    1/1     Running   0          22s
```

对于 Kubernetes：
- 主机名为 `redis-master.default.svc.cluster.local:6379`
- secret `redis` 会自动创建。

{{% /tab %}}

{{% tab "Azure" %}}
验证你拥有 Azure 订阅。

1. 打开并登录 [Azure 门户](https://ms.portal.azure.com/#create/Microsoft.Cache) 以启动 Azure Redis 缓存创建流程。
1. 填写必要信息。
   - Dapr 发布订阅使用 Redis 5.0 引入的 [Redis 流](https://redis.io/topics/streams-intro)。要将 Azure Redis 缓存用于发布订阅，请将版本设置为 *(PREVIEW) 6*。
1. 单击 **创建** 以启动 Redis 实例的部署。
1. 在 Azure 门户的 **概述** 页面上记下 Redis 实例主机名，以备后用。
   - 它应该类似于 `xxxxxx.redis.cache.windows.net:6380`。
1. 实例创建完成后，获取你的访问密钥：
   1. 导航到 **设置** 下的 **访问密钥**。
   1. 创建一个 Kubernetes secret 来存储你的 Redis 密码：

      ```bash
      kubectl create secret generic redis --from-literal=redis-password=*********
      ```

{{% /tab %}}

{{% tab "AWS" %}}

1. 从 [AWS Redis](https://aws.amazon.com/redis/) 部署 Redis 实例。
1. 在 AWS 门户中记下 Redis 主机名，以备后用。
1. 创建一个 Kubernetes secret 来存储你的 Redis 密码：

   ```bash
   kubectl create secret generic redis --from-literal=redis-password=*********
   ```

{{% /tab %}}

{{% tab "GCP" %}}

1. 从 [GCP Cloud MemoryStore](https://cloud.google.com/memorystore/) 部署 MemoryStore 实例。
1. 在 GCP 门户中记下 Redis 主机名，以备后用。
1. 创建一个 Kubernetes secret 来存储你的 Redis 密码：

   ```bash
   kubectl create secret generic redis --from-literal=redis-password=*********
   ```

{{% /tab %}}

{{< /tabpane >}}

### 步骤 2：配置 Dapr 组件

Dapr 通过组件定义用于构建块功能的资源。以下步骤介绍如何将上面创建的资源连接到 Dapr 以用于状态和发布订阅。

#### 定位组件文件

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

在自托管模式下，组件文件自动创建于：
- **Windows**：`%USERPROFILE%\.dapr\components\`
- **Linux/MacOS**：`$HOME/.dapr/components`

{{% /tab %}}

{{% tab "Kubernetes" %}}

由于 Kubernetes 文件通过 `kubectl` 应用，因此可以在任何目录中创建。

{{% /tab %}}

{{< /tabpane >}}

#### 创建状态存储组件

创建一个名为 `redis-state.yaml` 的文件，并粘贴以下内容：

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    secretKeyRef:
      name: redis
      key: redis-password
  # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: <替换为上面的主机名 - 对于 Kubernetes 上的 Redis 它是 redis-master.default.svc.cluster.local:6379>
  - name: redisPassword
    secretKeyRef:
      name: redis
      key: redis-password
  # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

请注意，上面的代码示例使用了你在设置集群时创建的 Kubernetes secret。

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="其他存储" color="primary" %}}
如果使用 Redis 以外的状态存储，请参阅 [支持的状态存储]({{% ref supported-state-stores %}}) 以获取有关要设置的选项的信息。
{{% /alert %}}

#### 创建发布订阅消息代理组件

创建一个名为 `redis-pubsub.yaml` 的文件，并粘贴以下内容：

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    secretKeyRef:
      name: redis
      key: redis-password
 # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: <替换为上面的主机名 - 对于 Kubernetes 上的 Redis 它是 redis-master.default.svc.cluster.local:6379>
  - name: redisPassword
    secretKeyRef:
      name: redis
      key: redis-password
 # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

请注意，上面的代码示例使用了你在设置集群时创建的 Kubernetes secret。

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="其他存储" color="primary" %}}
如果使用 Redis 以外的发布订阅消息代理，请参阅 [支持的发布订阅消息代理]({{% ref supported-pubsub %}}) 以获取有关要设置的选项的信息。
{{% /alert %}}

#### 硬编码密码（不推荐）

*仅*用于开发目的，你可以跳过创建 Kubernetes secret 并将密码直接放入 Dapr 组件文件中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: <HOST>
  - name: redisPassword
    value: <PASSWORD>
  # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
  namespace: default
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: <HOST>
  - name: redisPassword
    value: <PASSWORD>
  # 取消下面的注释以通过 TLS 连接到 redis 缓存实例（例如 - Azure Redis Cache）
  # - name: enableTLS
  #   value: true 
```

### 步骤 3：应用配置

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

当你运行 `dapr init` 时，Dapr 会在本地机器上创建默认的 redis `pubsub.yaml`。通过打开你的组件目录进行验证：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- 在 Linux/MacOS 上，位于 `~/.dapr/components/pubsub.yaml`

对于新的组件文件：

1. 在应用文件夹中创建一个新的 `components` 目录，其中包含 YAML 文件。
1. 使用 `--resources-path` 标志向 `dapr run` 命令提供路径。

如果你以 [slim 模式]({{% ref self-hosted-no-docker.md %}})（不带 Docker）初始化 Dapr，则需要手动创建默认目录，或始终使用 `--resources-path` 指定组件目录。

{{% /tab %}}

{{% tab "Kubernetes" %}}

对状态和发布订阅文件运行 `kubectl apply -f <FILENAME>`：

```bash
kubectl apply -f redis-state.yaml
kubectl apply -f redis-pubsub.yaml
```

{{% /tab %}}

{{< /tabpane >}}

## 下一步
[尝试 Dapr 快速入门]({{% ref quickstarts.md %}})
