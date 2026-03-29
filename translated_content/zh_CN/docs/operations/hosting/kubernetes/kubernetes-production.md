---
type: docs
title: "Kubernetes 生产环境指南"
linkTitle: "生产环境指南"
weight: 40000
description: "以生产就绪配置在 Kubernetes 集群上部署 Dapr 的最佳实践"
---

## 集群和容量要求

Dapr 对 Kubernetes 的支持遵循 [Kubernetes 版本倾斜策略](https://kubernetes.io/releases/version-skew-policy/)。

使用以下资源设置作为起点。具体要求因集群规模、Pod 数量和其他因素而异。请执行单独测试以找到适合您环境的正确值。在生产环境中，建议不要为 Dapr 控制平面组件添加内存限制，以避免 `OOMKilled` Pod 状态。

| 部署  | CPU | 内存
|-------------|-----|-------
| **Operator**  | 限制：1，请求：100m | 请求：100Mi
| **Sidecar Injector** | 限制：1，请求：100m  | 请求：30Mi
| **Sentry**    | 限制：1，请求：100m  | 请求：30Mi
| **Placement** | 限制：1，请求：250m  | 请求：75Mi

{{% alert title="注意" color="primary" %}}
更多信息，请参考 Kubernetes 文档中的 [CPU 和内存资源单位及其含义](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes)。
{{% /alert %}}

### Helm

使用 Helm 安装 Dapr 时，默认不设置限制/请求值。每个组件都有一个 `resources` 选项（例如 `dapr_dashboard.resources`），您可以使用它来调整 Dapr 控制平面以适应您的环境。

[Helm chart readme](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) 包含详细信息和示例。

对于本地/开发安装，您可能希望跳过配置 `resources` 选项。

### 可选组件

以下 Dapr 控制平面部署是可选的：

- **Placement**：用于使用 Dapr Actors
- **Sentry**：用于服务间调用的 mTLS
- **Dashboard**：用于集群的操作视图

## 边车资源设置

[使用支持的注解为 Dapr 边车设置资源分配]({{% ref "arguments-annotations-overview.md" %}})。与**资源限制**相关的具体注解为：

- `dapr.io/sidecar-cpu-limit`
- `dapr.io/sidecar-memory-limit`
- `dapr.io/sidecar-cpu-request`
- `dapr.io/sidecar-memory-request`

如果未设置，Dapr 边车将在没有资源设置的情况下运行，这可能导致问题。对于生产就绪的设置，强烈建议配置这些设置。

生产就绪设置中 Dapr 边车的示例设置：

| CPU | 内存 |
|-----|--------|
| 限制：300m，请求：100m | 限制：1000Mi，请求：250Mi

上述 CPU 和内存限制考虑到了 Dapr 支持大量 I/O 密集型操作。使用[监控工具]({{% ref observability %}}) 获取边车（和应用）容器的基线，并根据这些基线调整这些设置。

有关在 Kubernetes 中配置资源的更多详细信息，请参阅以下 Kubernetes 指南：
- [为容器和 Pod 分配内存资源](https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/) 
- [为容器和 Pod 分配 CPU 资源](https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/)

{{% alert title="注意" color="primary" %}}
由于 Dapr 旨在为您的应用程序处理大部分 I/O 密集型工作，因此分配给 Dapr 的资源会大幅减少应用程序的资源分配。
{{% /alert %}}

### 为 Dapr 边车设置软内存限制

当您已设置内存限制时，为 Dapr 边车设置软内存限制。使用软内存限制时，边车垃圾回收器会在超过限制时释放内存，而不是等待内存达到运行时堆中上次内存量的两倍。等待是 Go 中使用的[垃圾回收器](https://tip.golang.org/doc/gc-guide#Memory_limit)的默认行为，可能导致 OOM 终止事件。

例如，对于 app-id 为 `nodeapp` 且内存限制设置为 1000Mi 的应用程序，您可以在 Pod 注解中使用以下内容：

```yaml
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "nodeapp"
    # 我们的 daprd 内存设置
    dapr.io/sidecar-memory-limit: "1000Mi"   # 您的内存限制
    dapr.io/env: "GOMEMLIMIT=900MiB"         # 您内存限制的 90%。还要注意后缀 "MiB" 而不是 "Mi"
```

在此示例中，软限制已设置为 90% 以留出 5-10% 给其他服务，[正如建议的那样](https://tip.golang.org/doc/gc-guide#Memory_limit)。

`GOMEMLIMIT` 环境变量[允许内存大小使用某些后缀：`B`、`KiB`、`MiB`、`GiB` 和 `TiB`](https://pkg.go.dev/runtime)。

## 用于企业策略的边车服务注解

在企业环境中，集群策略可能会强制所有 Service 资源使用强制性注解，用于安全、计费或网络策略目的。Dapr Operator 为边车创建一个 Service，该服务可能需要这些自定义注解以符合您组织的策略。

您可以使用 `dapr.io/sidecar-svc-annotations` 注解将这些必需的注解添加到 Dapr 边车服务。

[了解如何为 Dapr 边车服务配置自定义注解]({{% ref "sidecar-service-annotations.md" %}})。

## 高可用模式

在生产就绪配置中部署 Dapr 时，最好以控制平面的高可用（HA）配置进行部署。这会在 `dapr-system` 命名空间中为每个控制平面 Pod 创建三个副本，使 Dapr 控制平面能够保持三个运行实例，并在单个节点故障和其他中断中存活。

对于新的 Dapr 部署，可以通过以下方式设置 HA 模式：
- [Dapr CLI]({{% ref "kubernetes-deploy.md#install-in-highly-available-mode" %}})，以及
- [Helm charts]({{% ref "kubernetes-deploy.md#add-and-install-dapr-helm-chart" %}})

对于现有的 Dapr 部署，[您可以通过一些额外步骤启用 HA 模式]({{% ref "#enable-high-availability-in-an-existing-dapr-deployment" %}})。

### 单个服务 HA Helm 配置

您可以通过将 `global.ha.enabled` 标志设置为 `true` 来通过 Helm 在所有服务中配置 HA 模式。默认情况下，`--set global.ha.enabled=true` 被完全遵守且不能被覆盖，这使得 placement 或 scheduler 服务无法同时作为单个实例运行。

> **注意：** scheduler 和 placement 服务的 HA 不是默认设置。

要独立于 `global.ha.enabled` 标志将 scheduler 和 placement 扩展到三个实例，请将 `global.ha.enabled` 设置为 `false`，并将 `dapr_scheduler.ha` 和 `dapr_placement.ha` 设置为 `true`。例如：

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

## 为控制平面服务设置集群关键优先级类名称

在某些情况下，节点可能面临内存和/或 CPU 压力，Dapr 控制平面 Pod 可能会被选中进行驱逐。为了防止这种情况，您可以为 Dapr 控制平面 Pod 设置关键优先级类名称。这确保 Dapr 控制平面 Pod 不会被驱逐，除非所有其他较低优先级的 Pod 都被驱逐。

保护 Dapr 控制平面组件免于驱逐尤为重要，尤其是 Scheduler 服务。当 Scheduler 被重新调度或重启时，可能会对正在进行的作业造成严重破坏，可能导致它们重复触发。为了防止这种破坏，您应该确保 Dapr 控制平面组件比您的工作负载具有更高的优先级类。

了解有关[保护任务关键型 Pod](https://kubernetes.io/blog/2023/01/12/protect-mission-critical-pods-priorityclass/) 的更多信息。

Kubernetes 中有两个内置的关键优先级类：
- `system-cluster-critical`
- `system-node-critical`（最高优先级）

建议为 Dapr 控制平面 Pod 将 `priorityClassName` 设置为 `system-cluster-critical`。如果您有自己的应用程序自定义优先级类，请确保它们的优先级值低于分配给 Dapr 控制平面的优先级值，以维持系统稳定性并防止核心 Dapr 服务中断。

对于新的 Dapr 控制平面部署，可以通过 Helm 值 `global.priorityClassName` 设置 `system-cluster-critical` 优先级类模式。

此优先级类可以通过 Dapr CLI 和 Helm charts 设置，使用 Helm `--set global.priorityClassName=system-cluster-critical` 参数。

#### Dapr 版本 < 1.14

对于 v1.14 以下的 Dapr 版本，建议您向 Dapr 控制平面命名空间添加 `ResourceQuota`。这可以防止与调度 Pod 相关的问题，[集群可能配置](https://kubernetes.io/docs/concepts/policy/resource-quotas/#limit-priority-class-consumption-by-default)了关于哪些 Pod 可以分配高优先级类的限制。从 v1.14 开始，Helm chart 会自动添加此功能。

如果您在命名空间 `dapr-system` 中安装了 Dapr，可以使用以下内容创建 `ResourceQuota`：

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dapr-system-critical-quota
  namespace: dapr-system
spec:
  scopeSelector:
    matchExpressions:
      - operator : In
        scopeName: PriorityClass
        values: [system-cluster-critical]
```

## 使用 Helm 部署 Dapr

[访问使用 Helm 部署 Dapr 的完整指南]({{% ref "kubernetes-deploy.md#install-with-helm" %}})。

### 参数文件

建议创建一个 values 文件，而不是在命令行上指定参数。将 values 文件检入源代码管理，以便您可以跟踪其更改。

[查看可用参数和设置的完整列表](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)。

以下命令在 `dapr-system` 命名空间中运行每个控制平面服务的三个副本。

```bash
# 添加/更新官方 Dapr Helm 仓库。
helm repo add dapr https://dapr.github.io/helm-charts/
# 或添加/更新私有 Dapr Helm 仓库。
helm repo add dapr http://helm.custom-domain.com/dapr/dapr/ \
   --username=xxx --password=xxx
helm repo update

# 查看有哪些 chart 版本可用
helm search repo dapr --devel --versions

# 创建一个 values 文件来存储变量
touch values.yml
cat << EOF >> values.yml
global:
  ha:
    enabled: true
EOF

# 运行安装/升级
helm install dapr dapr/dapr \
  --version=<Dapr chart version> \
  --namespace dapr-system \
  --create-namespace \
  --values values.yml \
  --wait

# 验证安装
kubectl get pods --namespace dapr-system
```

{{% alert title="注意" color="primary" %}}
上面的示例使用了 `helm install` 和 `helm upgrade`。您也可以运行 `helm upgrade --install` 来动态确定是安装还是升级。
{{% /alert %}}

Dapr Helm chart 会自动部署到带有标签 `kubernetes.io/os=linux` 的节点。您可以将 Dapr 控制平面部署到 Windows 节点。有关更多信息，请参阅[部署到混合 Linux/Windows K8s 集群]({{% ref "kubernetes-hybrid-clusters.md" %}})。

## 使用 Helm 升级 Dapr

Dapr 支持以下步骤的零停机升级。

### 升级 CLI（推荐）

升级 CLI 是可选的，但推荐这样做。

1. [下载最新版本](https://github.com/dapr/cli/releases)的 CLI。
1. 验证 Dapr CLI 在您的路径中。

### 升级控制平面

[在 Kubernetes 集群上升级 Dapr]({{% ref "kubernetes-upgrade.md#helm" %}})。

### 更新数据平面（边车）

更新运行 Dapr 的 Pod 以获取新版本的 Dapr 运行时。

1. 为任何具有 `dapr.io/enabled` 注解的部署发出滚动重启命令：

   ```bash
   kubectl rollout restart deploy/<Application deployment name>
   ```

1. 通过以下方式查看所有启用 Dapr 的部署列表：  
   - [Dapr Dashboard](https://github.com/dapr/dashboard) 
   - 使用 Dapr CLI 运行以下命令：

      ```bash
      dapr list -k
      
      APP ID     APP PORT  AGE  CREATED
      nodeapp    3000      16h  2020-07-29 17:16.22
      ```

### 在现有 Dapr 部署中启用高可用性

为现有 Dapr 部署启用 HA 模式需要两个步骤：

1. 删除现有的 placement stateful set。

   ```bash
   kubectl delete statefulset.apps/dapr-placement-server -n dapr-system
   ```

   您删除 placement stateful set 是因为在 HA 模式下，placement 服务会添加 [Raft](https://raft.github.io/) 用于领导者选举。但是，Kubernetes 只允许对 stateful set 的有限字段进行修补，从而导致 placement 服务升级失败。

   删除现有的 placement stateful set 是安全的。代理会重新连接并重新注册到新创建的 placement 服务，该服务将其表持久化在 Raft 中。

1. 发出升级命令。

   ```bash
   helm upgrade dapr ./charts/dapr -n dapr-system --set global.ha.enabled=true
   ```

## 推荐的安全配置

正确配置后，Dapr 可确保安全通信，并可以通过许多内置功能使您的应用程序更安全。

验证您的生产就绪部署包括以下设置：

1. **双向身份验证（mTLS）** 已启用。Dapr 默认启用 mTLS。[了解有关如何使用自己的证书的更多信息]({{% ref "mtls.md#bringing-your-own-certificates" %}})。

1. **应用程序到 Dapr API 身份验证** 已启用。这是您的应用程序与 Dapr 边车之间的通信。为了保护 Dapr API 免受未经授权的应用程序访问，[请启用 Dapr 的基于令牌的身份验证]({{% ref "api-token.md" %}})。

1. **Dapr 到应用程序 API 身份验证** 已启用。这是 Dapr 与您的应用程序之间的通信。[让 Dapr 知道它正在使用令牌身份验证与授权应用程序通信]({{% ref "app-api-token.md" %}})。

1. **组件密钥数据在密钥存储中配置**，而不是硬编码在组件 YAML 文件中。[了解如何将密钥与 Dapr 组件一起使用]({{% ref "component-secrets.md" %}})。

1. Dapr **控制平面安装在专用命名空间**上，例如 `dapr-system`。

1. Dapr 支持并启用为**某些应用程序限定组件范围**。这不是必需的做法。[了解有关组件范围的更多信息]({{% ref "component-scopes.md" %}})。

## 推荐的 Placement 服务配置

[Placement 服务]({{% ref "placement.md" %}}) 是 Dapr 中的一个组件，负责通过 placement 表向所有 Dapr 边车传播有关 actor 地址的信息（有关更多信息可以在[这里]({{% ref "actors-features-concepts.md#actor-placement-service" %}})找到）。

在生产环境中运行时，建议使用以下值配置 Placement 服务：

1. **高可用性**。确保 Placement 服务高度可用（三个副本）并且可以在单个节点故障中存活。Helm chart 值：`dapr_placement.ha=true`
2. **内存日志**。使用内存 Raft 日志存储以实现更快的写入。权衡是在最终的 Placement 服务 Pod 故障期间更多的 placement 表传播（因此，网络流量）。Helm chart 值：`dapr_placement.cluster.forceInMemoryLog=true`
3. **无元数据端点**。禁用未经身份验证的 `/placement/state` 端点，该端点暴露 Placement 服务的 placement 表信息。Helm chart 值：`dapr_placement.metadataEnabled=false`
4. **超时**使用以下超时值控制 Placement 服务与边车之间网络连接的敏感性。默认值已设置，但您可以根据您的网络条件调整这些值。
   1. `dapr_placement.keepAliveTime` 设置 Placement 服务在 gRPC 流上向 Dapr 边车发送[保活](https://grpc.io/docs/guides/keepalive/) ping 以检查连接是否仍处于活动状态的间隔。较低的值将导致在 Pod 丢失/重启情况下更短的 actor 重新平衡时间，但在正常运行期间网络流量更高。接受 `1s` 到 `10s` 之间的值。默认为 `2s`。
   2. `dapr_placement.keepAliveTimeout` 设置 Dapr 边车响应 Placement 服务的[保活](https://grpc.io/docs/guides/keepalive/) ping 的超时时间，然后 Placement 服务关闭连接。较低的值将导致在 Pod 丢失/重启情况下更短的 actor 重新平衡时间，但在正常运行期间网络流量更高。接受 `1s` 到 `10s` 之间的值。默认为 `3s`。
   3. `dapr_placement.disseminateTimeout` 设置在 actor 成员资格更改（通常与 Pod 重启相关）后传播延迟的超时时间，以避免在多个 Pod 重启期间过度传播。较高的值将降低传播频率，但会延迟表传播。接受 `1s` 到 `3s` 之间的值。默认为 `2s`。



## 服务账户令牌

默认情况下，Kubernetes 在每个容器中挂载一个包含[服务账户令牌](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)的卷。应用程序可以使用此令牌，其权限根据集群和命名空间的配置等因素而异，以对 Kubernetes 控制平面执行 API 调用。

创建新 Pod（或 Deployment、StatefulSet、Job 等）时，您可以通过在 Pod spec 中设置 `automountServiceAccountToken: false` 来禁用自动挂载服务账户令牌。

建议您考虑使用 `automountServiceAccountToken: false` 部署应用程序以提高 Pod 的安全态势，除非您的应用程序依赖于拥有服务账户令牌。例如，如果您有以下情况，您可能需要服务账户令牌：

- 您的应用程序需要与 Kubernetes API 交互。
- 您正在使用与 Kubernetes API 交互的 Dapr 组件；例如，[Kubernetes 密钥存储]({{% ref "kubernetes-secret-store.md" %}}) 或 [Kubernetes Events 绑定]({{% ref "kubernetes-binding.md" %}})。

因此，Dapr 不会自动为您设置 `automountServiceAccountToken: false`。但是，在您的解决方案不需要服务账户的所有情况下，建议您在 Pod spec 中设置此选项。

{{% alert title="注意" color="primary" %}}
使用作为 Kubernetes secrets 存储的[组件密钥]({{% ref "component-secrets.md" %}})初始化 Dapr 组件**不**需要您的 Pod 拥有服务账户令牌；Dapr Operator 在注入时解析 `secretKeyRef`。要使用 `automountServiceAccountToken: false` 运行，请使用注解 `dapr.io/disable-builtin-k8s-secret-store: "true"` 禁用边车的内置 Kubernetes 密钥存储。仅当您的应用程序使用运行时[密钥管理]({{% ref "secrets-overview.md" %}})构建块时才保持密钥存储启用（并挂载令牌）。
{{% /alert %}}

## 追踪和指标配置

追踪和指标在 Dapr 中默认启用。建议您为应用程序和 Dapr 控制平面设置分布式追踪和指标。

如果您已经有自己的可观测性设置，可以禁用 Dapr 的追踪和指标。

### 追踪

[为 Dapr 配置追踪后端]({{% ref "setup-tracing.md" %}})。

### 指标

对于指标，Dapr 会暴露一个在端口 9090 上监听的 Prometheus 端点，Prometheus 可以对其进行抓取。

[使用 Dapr 设置 Prometheus、Grafana 和其他监控工具]({{% ref observability %}})。

## 注入器看门狗

Dapr Operator 服务包含一个**注入器看门狗**，可用于检测和修复应用程序 Pod 可能没有 Dapr 边车（`daprd` 容器）部署的情况。例如，它可以帮助在集群完全故障后恢复应用程序。

在 Kubernetes 模式下运行 Dapr 时，注入器看门狗默认处于禁用状态。但是，您应该考虑针对您的具体情况使用适当的值启用它。

有关注入器看门狗以及如何启用它的更多详细信息，请参阅 [Dapr operator 服务文档]({{% ref operator %}})。

## 为边车容器配置 `seccompProfile`

默认情况下，Dapr 边车注入器会注入一个没有任何 `seccompProfile` 的边车。但是，为了使 Dapr 边车容器在带有[受限](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted)配置文件的命名空间中成功运行，边车容器需要 `securityContext.seccompProfile.Type` 不为 `nil`。

请参阅[参数和注解概述]({{% ref "arguments-annotations-overview.md" %}})以在边车容器上设置适当的 `seccompProfile`。

## 以非 root 用户运行
在 Kubernetes 中运行时，Dapr 服务确保每个进程都以非 root 用户运行。
这是通过检查进程的 UID 和 GID 是否为 `65532` 来完成的，如果不是预期的值则会致命错误。
如果您必须在 Kubernetes 中运行非默认的 UID 和 GID，请设置以下环境变量以跳过此检查。

```bash
DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK="true"
```

## 最佳实践

观看此视频，深入了解使用 Kubernetes 在生产环境中运行 Dapr 的最佳实践。


{{< youtube id=_U9wJqq-H1g >}}

## 相关链接

- [在 Kubernetes 上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
