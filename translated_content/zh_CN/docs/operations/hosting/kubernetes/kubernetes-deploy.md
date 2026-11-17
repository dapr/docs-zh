---
type: docs
title: "在 Kubernetes 集群上部署 Dapr"
linkTitle: "部署 Dapr"
weight: 20000
description: "按照以下步骤在 Kubernetes 上部署 Dapr。"
aliases:
    - /zh-hans/getting-started/install-dapr-kubernetes/
---

在 [Kubernetes 上设置 Dapr]({{% ref kubernetes-overview.md %}}) 时，你可以使用 Dapr CLI 或 Helm。

{{% alert title="混合集群" color="primary" %}}
Dapr CLI 和 Dapr Helm chart 都会自动部署到带有 `kubernetes.io/os=linux` 标签的节点上。如果你的应用程序需要，可以将 Dapr 部署到 Windows 节点。更多信息，请参阅[部署到混合 Linux/Windows Kubernetes 集群]({{% ref kubernetes-hybrid-clusters %}})。
{{% /alert %}}

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}
## 使用 Dapr CLI 安装

你可以使用 [Dapr CLI]({{% ref install-dapr-cli.md %}}) 在 Kubernetes 集群上安装 Dapr。

### 前置条件

- 安装：
   - [Dapr CLI]({{% ref install-dapr-cli.md %}})
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
- 创建一个支持 Dapr 的 Kubernetes 集群。这里有一些有用的链接：
   - [设置 KiNd 集群]({{% ref setup-kind.md %}})
   - [设置 Minikube 集群]({{% ref setup-minikube.md %}})
   - [设置 Azure Kubernetes Service 集群]({{% ref setup-aks.md %}})
   - [设置 GKE 集群]({{% ref setup-gke.md %}})
   - [设置 Amazon Elastic Kubernetes Service](https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html)


### 安装选项

你可以从官方 Helm chart 或私有 chart 安装 Dapr，也可以使用自定义命名空间等。

#### 从官方 Dapr Helm chart 安装 Dapr

`-k` 标志会在当前上下文的 Kubernetes 集群上初始化 Dapr。

1. 通过检查 `kubectl context (kubectl config get-contexts)` 验证是否设置了正确的“目标”集群。
   - 你可以使用 `kubectl config use-context <CONTEXT>` 设置不同的上下文。

1. 使用以下命令在集群上初始化 Dapr：

    ```bash
    dapr init -k
    ```

    **预期输出**
    
    ```bash
    ⌛  Making the jump to hyperspace...
    
    ✅  Deploying the Dapr control plane to your cluster...
    ✅  Success! Dapr has been installed to namespace dapr-system. To verify, run "dapr status -k" in your terminal. To get started, go here: https://aka.ms/dapr-getting-started
    ```
    
 #### 从官方 Dapr Helm chart 安装 Dapr（带开发标志）

添加 `--dev` 标志会在当前上下文的 Kubernetes 集群上初始化 Dapr，并额外部署 Redis 和 Zipkin。

步骤与[从官方 Dapr Helm chart 安装](#从官方-dapr-helm-chart-安装-dapr)类似，只需在 `init` 命令后追加 `--dev` 标志：

 ```bash
 dapr init -k --dev
 ```

预期输出：

```bash
⌛  Making the jump to hyperspace...
ℹ️  Note: To install Dapr using Helm, see here: https://docs.dapr.io/getting-started/install-dapr-kubernetes/#install-with-helm-advanced

ℹ️  Container images will be pulled from Docker Hub
✅  Deploying the Dapr control plane with latest version to your cluster...
✅  Deploying the Dapr Redis with latest version to your cluster...
✅  Deploying the Dapr Zipkin with latest version to your cluster...
ℹ️  Applying "statestore" component to Kubernetes "default" namespace.
ℹ️  Applying "pubsub" component to Kubernetes "default" namespace.
ℹ️  Applying "appconfig" zipkin configuration to Kubernetes "default" namespace.
✅  Success! Dapr has been installed to namespace dapr-system. To verify, run `dapr status -k' in your terminal. To get started, go here: https://aka.ms/dapr-getting-started
 ```

等待一小段时间后（或使用 `--wait` 标志并指定等待时长），你可以检查 Redis 和 Zipkin 组件是否已部署到集群中。

```bash
kubectl get pods --namespace default
```

预期输出：

```bash
NAME                              READY   STATUS    RESTARTS   AGE
dapr-dev-zipkin-bfb4b45bb-sttz7   1/1     Running   0          159m
dapr-dev-redis-master-0           1/1     Running   0          159m
dapr-dev-redis-replicas-0         1/1     Running   0          159m
dapr-dev-redis-replicas-1         1/1     Running   0          159m
dapr-dev-redis-replicas-2         1/1     Running   0          158m 
 ```

#### 从私有 Dapr Helm chart 安装 Dapr

在以下情况下，[从私有 Dapr Helm chart 安装 Dapr](#从官方-dapr-helm-chart-安装-dapr)会很有帮助：
- 需要对 Dapr Helm chart 进行更细粒度的控制
- 有自定义的 Dapr 部署
- 从由你的组织管理和维护的可信注册表中拉取 Helm chart

设置以下参数，以允许 `dapr init -k` 从已配置的 Helm 仓库安装 Dapr 镜像。

```
export DAPR_HELM_REPO_URL="https://helm.custom-domain.com/dapr/dapr"
export DAPR_HELM_REPO_USERNAME="username_xxx"
export DAPR_HELM_REPO_PASSWORD="passwd_xxx"
```
#### 以高可用模式安装

你可以在 `dapr-system` 命名空间中为每个控制平面 pod 运行三个副本，以适用于[生产场景]({{% ref kubernetes-production.md %}})。

```bash
dapr init -k --enable-ha=true
```

#### 在自定义命名空间中安装

Dapr 初始化时的默认命名空间为 `dapr-system`。你可以使用 `-n` 标志覆盖它。

```bash
dapr init -k -n mynamespace
```

#### 禁用 mTLS

Dapr 默认使用 [mTLS]({{% ref "security-concept.md#sidecar-to-sidecar-communication" %}}) 初始化。你可以通过以下命令禁用它：

```bash
dapr init -k --enable-mtls=false
```

#### 等待安装完成

你可以使用 `--wait` 标志等待安装完成部署。默认超时时间为 300 秒（5 分钟），也可以使用 `--timeout` 标志进行自定义。

```bash
dapr init -k --wait --timeout 600
```

### 使用 CLI 在 Kubernetes 上卸载 Dapr

在本地计算机上运行以下命令，以卸载集群中的 Dapr：

```bash
dapr uninstall -k
```

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}

## 使用 Helm 安装

你可以使用 Helm v3 chart 在 Kubernetes 上安装 Dapr。

❗**重要提示：** 最新的 Dapr Helm chart 不再支持 Helm v2。[从 Helm v2 迁移到 Helm v3](https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/)。

### 前置条件

- 安装：
   - [Helm v3](https://helm.sh/docs/intro/install/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
- 创建一个支持 Dapr 的 Kubernetes 集群。这里有一些有用的链接：
   - [设置 KiNd 集群]({{% ref setup-kind.md %}})
   - [设置 Minikube 集群]({{% ref setup-minikube.md %}})
   - [设置 Azure Kubernetes Service 集群]({{% ref setup-aks.md %}})
   - [设置 GKE 集群]({{% ref setup-gke.md %}})
   - [设置 Amazon Elastic Kubernetes Service](https://docs.aws.amazon.com/eks/latest/userguide/getting-started.html)


### 添加并安装 Dapr Helm chart

1. 添加 Helm 仓库并更新：

    ```bash
    // 添加官方 Dapr Helm chart。
    helm repo add dapr https://dapr.github.io/helm-charts/
    // 或者也添加私有 Dapr Helm chart。
    helm repo add dapr http://helm.custom-domain.com/dapr/dapr/ \
       --username=xxx --password=xxx
    helm repo update
    // 查看可用的 chart 版本
    helm search repo dapr --devel --versions
    ```

1. 在 `dapr-system` 命名空间中的集群上安装 Dapr chart。

    ```bash
    helm upgrade --install dapr dapr/dapr \
    --version={{% dapr-latest-version short="true" %}} \
    --namespace dapr-system \
    --create-namespace \
    --wait
    ```

   要以**高可用**模式安装：

    ```bash
    helm upgrade --install dapr dapr/dapr \
    --version={{% dapr-latest-version short="true" %}} \
    --namespace dapr-system \
    --create-namespace \
    --set global.ha.enabled=true \
    --wait
    ```

   要以**高可用**模式安装，并独立于全局配置扩展选定的服务：

   ```bash
       helm upgrade --install dapr dapr/dapr \
    --version={{% dapr-latest-version short="true" %}} \
    --namespace dapr-system \
    --create-namespace \
    --set global.ha.enabled=false \
    --set dapr_scheduler.ha=true \
    --set dapr_placement.ha=true \
    --wait
   ```
   
有关使用 Helm 安装和升级 Dapr 的更多信息，请参阅 [Kubernetes 上生产就绪部署的指南]({{% ref kubernetes-production.md %}})。

### 验证安装

安装完成后，验证 `dapr-operator`、`dapr-placement`、`dapr-sidecar-injector` 和 `dapr-sentry` pod 是否在 `dapr-system` 命名空间中运行：

```bash
kubectl get pods --namespace dapr-system
```

```bash
NAME                                     READY     STATUS    RESTARTS   AGE
dapr-operator-7bd6cbf5bf-xglsr           1/1       Running   0          40s
dapr-placement-7f8f76778f-6vhl2          1/1       Running   0          40s
dapr-sidecar-injector-8555576b6f-29cqm   1/1       Running   0          40s
dapr-sentry-9435776c7f-8f7yd             1/1       Running   0          40s
```

> **注意：** 当 Actor 放置由 Scheduler 服务提供（`global.scheduler.placement.enabled=true`）时，不会存在 `dapr-placement` pod。

### 卸载 Kubernetes 上的 Dapr

```bash
helm uninstall dapr --namespace dapr-system
```

### 更多信息

- 阅读 [Kubernetes 生产指南]({{% ref kubernetes-production.md %}})，了解生产环境的推荐 Helm chart 值
- [Dapr Helm chart 的更多详细信息](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)

{{% /tab %}}

{{< /tabpane >}}

### 使用基于 Mariner 的镜像

在 Kubernetes 上拉取的默认容器镜像基于 [*distroless*](https://github.com/GoogleContainerTools/distroless)。

或者，你可以使用基于 Mariner 2（最小 distroless）的 Dapr 容器镜像。[Mariner](https://github.com/microsoft/CBL-Mariner/)，正式名称为 CBL-Mariner，是由 Microsoft 维护的免费开源 Linux 发行版和容器基础镜像。对于某些 Dapr 用户，利用基于 Mariner 的容器镜像可以帮助你满足合规性要求。

要为 Dapr 使用基于 Mariner 的镜像，需要在 Docker 标签中添加 `-mariner`。例如，`ghcr.io/dapr/dapr:latest` 是基于 *distroless* 的 Docker 镜像，而 `ghcr.io/dapr/dapr:latest-mariner` 则基于 Mariner。也提供固定到特定版本的标签，例如 `{{% dapr-latest-version short="true" %}}-mariner`。

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}

在 Dapr CLI 中，你可以使用 `--image-variant` 标志切换到基于 Mariner 的镜像。

```sh
dapr init -k --image-variant mariner
```

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}

在 Kubernetes 和 Helm 中，你可以通过设置 `global.tag` 选项并添加 `-mariner`，来使用基于 Mariner 的镜像。例如：

```sh
helm upgrade --install dapr dapr/dapr \
  --version={{% dapr-latest-version short="true" %}} \
  --namespace dapr-system \
  --create-namespace \
  --set global.tag={{% dapr-latest-version long="true" %}}-mariner \
  --wait
```

{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [使用 Helm 参数及其他详细信息部署 Dapr]({{% ref "kubernetes-production.md#deploy-dapr-with-helm" %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
- [Kubernetes 生产指南]({{% ref kubernetes-production.md %}})
- [配置 state store 和发布订阅消息代理]({{% ref "getting-started/tutorials/configure-state-pubsub.md" %}})
