---
type: docs
title: "Kubernetes 生产环境指南"
linkTitle: "生产环境指南"
weight: 40000
description: "以生产就绪配置在 Kubernetes 集群上部署 Dapr 的最佳实践"
---

## 集群和容量要求

Dapr 对 Kubernetes 的支持遵循 [Kubernetes 版本倾斜策略](https://kubernetes.io/releases/version-skew-policy/)。

使用以下资源设置作为起点。具体要求因集群规模、Pod 数量和其他因素而异。请执行单独测试，以找到适合你环境的值。在生产环境中，建议不要为 Dapr control plane 组件设置内存限制，以避免出现 `OOMKilled` Pod 状态。

| 部署  | CPU | 内存
|-------------|-----|-------
| **Operator**  | 限制：1，请求：100m | 请求：100Mi
| **Sidecar Injector** | 限制：1，请求：100m  | 请求：30Mi
| **Sentry**    | 限制：1，请求：100m  | 请求：30Mi
| **Placement** | 限制：1，请求：250m  | 请求：75Mi
| **Scheduler** | 请求：250m  | 请求：250Mi

{{% alert title="注意" color="primary" %}}
更多信息，请参考 Kubernetes 文档中的 [CPU 和内存资源单位及其含义](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes)。
{{% /alert %}}

### Helm

使用 Helm 安装 Dapr 时，默认不设置限制或请求值。每个组件都有一个 `resources` 选项（例如 `dapr_dashboard.resources`），你可以使用它来调整 Dapr control plane，使其适应你的环境。

例如，要为 Scheduler 设置起始请求值：

```yaml
dapr_scheduler:
  resources:
    requests:
      memory: 250Mi
      cpu: 250m
```

[Helm chart readme](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) 包含详细信息和示例。

对于本地或开发环境的安装，你可以跳过配置 `resources` 选项。

### 可选组件

以下 Dapr control plane 部署是可选的：

- **Placement**：用于使用 Dapr Actors
- **Sentry**：用于服务间调用的 mTLS
- **Dashboard**：用于集群的运维视图

## Sidecar 资源设置

[使用支持的注解为 Dapr sidecar 设置资源分配]({{% ref "arguments-annotations-overview.md" %}})。与**资源限制**相关的具体注解为：

- `dapr.io/sidecar-cpu-limit`
- `dapr.io/sidecar-memory-limit`
- `dapr.io/sidecar-cpu-request`
- `dapr.io/sidecar-memory-request`

如果未设置，Dapr sidecar 将在没有资源设置的情况下运行，这可能导致问题。对于生产就绪的设置，强烈建议配置这些设置。

生产就绪设置中 Dapr sidecar 的示例设置：

| CPU | 内存 |
|-----|--------|
| 限制：300m，请求：100m | 限制：1000Mi，请求：250Mi

上述 CPU 和内存限制考虑到了 Dapr 支持大量 I/O 密集型操作。使用[监控工具]({{% ref observability %}}) 获取 sidecar（和应用）容器的基线，并根据这些基线调整这些设置。

有关在 Kubernetes 中配置资源的更多详细信息，请参阅以下 Kubernetes 指南：
- [为容器和 Pod 分配内存资源](https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/)
- [为容器和 Pod 分配 CPU 资源](https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/)

{{% alert title="注意" color="primary" %}}
由于 Dapr 旨在为你的应用程序承担大部分 I/O 密集型工作，分配给 Dapr 的资源会大幅减少应用程序可用的资源。
{{% /alert %}}

### 为 Dapr sidecar 设置软内存限制

当你设置了内存限制时，为 Dapr sidecar 设置软内存限制。使用软内存限制后，sidecar 的垃圾回收器会在内存超过该限制时释放内存，而不是等到内存达到上一次运行时堆中内存量的两倍才释放。等待是 Go 所用[垃圾回收器](https://tip.golang.org/doc/gc-guide#Memory_limit)的默认行为，可能导致 OOM 终止事件。

例如，对于 app-id 为 `nodeapp`、内存限制设置为 1000Mi 的应用程序，你可以在 Pod 注解中使用以下内容：

```yaml
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "nodeapp"
    # 我们的 daprd 内存设置
    dapr.io/sidecar-memory-limit: "1000Mi"   # 你的内存限制
    dapr.io/env: "GOMEMLIMIT=900MiB"         # 为内存限制的 90%。另请注意后缀是 "MiB" 而不是 "Mi"
```

在此示例中，软限制设置为 90%，为其他服务留出 5-10% 的空间，[按推荐做法](https://tip.golang.org/doc/gc-guide#Memory_limit)进行配置。

`GOMEMLIMIT` 环境变量[允许使用以下内存大小后缀：`B`、`KiB`、`MiB`、`GiB` 和 `TiB`。](https://pkg.go.dev/runtime)

## 用于企业策略的 sidecar 服务注解

在企业环境中，集群策略可能会出于安全、计费或网络策略的目的，要求所有 Service 资源都带有强制注解。Dapr operator 会为 sidecar 创建一个 Service，该 Service 可能需要这些自定义注解，以符合组织的策略。

你可以使用 `dapr.io/sidecar-svc-annotations` 注解，将这些必需的注解添加到 Dapr sidecar 服务中。

[了解如何为 Dapr sidecar 服务配置自定义注解]({{% ref "sidecar-service-annotations.md" %}})。

## 高可用模式

在生产就绪的配置中部署 Dapr 时，最好以高可用（HA）配置部署 control plane。这会在 `dapr-system` namespace 中为每个 control plane Pod 创建三个副本，使 Dapr control plane 保持三个运行实例，从而能够在单个节点故障和其他中断中存活。

对于新的 Dapr 部署，可以通过以下两种方式设置 HA 模式：
- [Dapr CLI]({{% ref "kubernetes-deploy.md#install-in-highly-available-mode" %}})，以及
- [Helm charts]({{% ref "kubernetes-deploy.md#add-and-install-dapr-helm-chart" %}})

对于现有的 Dapr 部署，[你可以通过几个额外步骤启用 HA 模式]({{% ref "#在现有-dapr-部署中启用高可用性" %}})。

### 单个服务的 HA Helm 配置

你可以通过 Helm 为所有服务配置 HA 模式，方法是将 `global.ha.enabled` 标志设为 `true`。默认情况下，`--set global.ha.enabled=true` 会被完整遵循且无法覆盖，因此无法让 placement 或 Scheduler 服务同时以单实例运行。

> **注意：** Scheduler 和 placement 服务的 HA 不是默认设置。

要独立于 `global.ha.enabled` 标志，将 Scheduler 和 placement 扩展到三个实例，请将 `global.ha.enabled` 设为 `false`，并将 `dapr_scheduler.ha` 和 `dapr_placement.ha` 设为 `true`。例如：

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

> **注意：** 当 Actor placement 由 Scheduler 服务提供（`global.scheduler.placement.enabled=true`）时，不会部署 Placement 服务，`dapr_placement.ha` 没有效果。此时 Scheduler 的副本数决定 placement 的可用性。

### 分散 Placement 和 Scheduler 副本

启用 HA 后，默认的 Helm 值会添加 Pod 反亲和性，使 Scheduler 和 Placement 服务的副本在集群资源允许的情况下，尽量调度到不同的故障域。这通过以下 Helm chart [选项](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) 进行配置：

- `global.ha.topologyKey`：表示“不同域”的 Kubernetes 标签。默认设置为 `topology.kubernetes.io/zone`。
- `global.ha.podAntiAffinityPolicy`：启用软分散（默认值 `preferredDuringSchedulingIgnoredDuringExecution`）或硬分散（`requiredDuringSchedulingIgnoredDuringExecution`）。

在生产环境中运行时，请考虑以下建议。

1. **可用区**：默认的拓扑键会将 Pod 分散到不同可用区。这可以降低单个可用区故障同时让多个 Scheduler 或 Placement Pod 失效的可能性。
2. **单可用区、多节点**：可用区标签在整个集群中通常相同。将 `topologyKey` 设为 `kubernetes.io/hostname`，以便按节点进行分散。
3. **软分散**：这里推荐使用默认行为，在集群的可用区或节点不足时，仍允许 Pod 调度成功。
4. **硬分散**：仅当你绝对不能将两个副本放在同一拓扑值上时才使用。这要求 `topologyKey` 的不同取值数量不少于副本数，否则 Pod 会一直处于 `Pending` 状态。

例如，要在单可用区集群中按主机名配置硬分散，请使用以下 Helm 值：

```yaml
global:
  ha:
    enabled: true
    topologyKey: kubernetes.io/hostname
    podAntiAffinityPolicy: requiredDuringSchedulingIgnoredDuringExecution
```

## 为 control plane 服务设置集群关键优先级类名称

在某些情况下，节点可能出现内存和/或 CPU 压力，此时 Dapr control plane Pod 可能会被选中进行驱逐。为防止这种情况，你可以为 Dapr control plane Pod 设置关键优先级类名称。这可以确保 Dapr control plane Pod 不会被驱逐，除非所有优先级更低的其他 Pod 都已被驱逐。

保护 Dapr control plane 组件免受驱逐尤为重要，尤其是 Scheduler 服务。当 Scheduler 被重新调度或重启时，可能会严重干扰进行中的 job，甚至导致 job 重复触发。为避免这类干扰，你应确保 Dapr control plane 组件的优先级类高于你的应用工作负载。

了解更多关于[保护关键任务 Pod](https://kubernetes.io/blog/2023/01/12/protect-mission-critical-pods-priorityclass/) 的信息。

Kubernetes 中有两个内置的关键优先级类：
- `system-cluster-critical`
- `system-node-critical`（最高优先级）

建议为 Dapr control plane Pod 将 `priorityClassName` 设为 `system-cluster-critical`。如果你为应用程序自定义了优先级类，请确保它们的优先级值低于分配给 Dapr control plane 的值，以维护系统稳定性，并防止核心 Dapr 服务受到干扰。

对于新的 Dapr control plane 部署，可以通过 Helm 值 `global.priorityClassName` 设置 `system-cluster-critical` 优先级类。

可以通过 Dapr CLI 和 Helm chart 设置此优先级类，使用 Helm 参数 `--set global.priorityClassName=system-cluster-critical`。

#### Dapr 版本低于 1.14

对于 v1.14 以下的 Dapr 版本，建议你为 Dapr control plane 所在的 namespace 添加 `ResourceQuota`。这可以避免[集群可能配置的](https://kubernetes.io/docs/concepts/policy/resource-quotas/#limit-priority-class-consumption-by-default )对可分配高优先级类的 Pod 进行限制时出现的调度问题。从 v1.14 开始，Helm chart 会自动添加此配置。

如果你在 `dapr-system` namespace 中安装了 Dapr，可以使用以下内容创建 `ResourceQuota`：

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

建议创建一个 values 文件，而不是在命令行中指定参数。将 values 文件提交到源代码管理中，以便跟踪其变更。

[查看可用参数和设置的完整列表](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)。

以下命令会在 `dapr-system` namespace 中为每个 control plane 服务运行三个副本。

```bash
# 添加或更新官方 Dapr Helm 仓库。
helm repo add dapr https://dapr.github.io/helm-charts/
# 或添加或更新私有 Dapr Helm 仓库。
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

# 运行安装或升级
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
上面的示例使用了 `helm install` 和 `helm upgrade`。你也可以运行 `helm upgrade --install`，动态判断是执行安装还是升级。
{{% /alert %}}

Dapr Helm chart 会自动调度到带有 `kubernetes.io/os=linux` 标签的节点上（通过亲和性配置）。你也可以将 Dapr control plane 部署到 Windows 节点。更多信息，请参阅[部署到混合 Linux/Windows K8s 集群]({{% ref "kubernetes-hybrid-clusters.md" %}})。

## 使用 Helm 升级 Dapr

Dapr 支持通过以下步骤进行零停机升级。

### 升级 CLI（推荐）

升级 CLI 是可选的，但推荐这样做。

1. [下载最新版本](https://github.com/dapr/cli/releases)的 CLI。
1. 验证 Dapr CLI 在你的 PATH 中。

### 升级 control plane

[在 Kubernetes 集群上升级 Dapr]({{% ref "kubernetes-upgrade.md#helm" %}})。

### 更新数据平面（sidecar）

更新运行 Dapr 的 Pod，以获取新版本的 Dapr 运行时。

1. 对任何带有 `dapr.io/enabled` 注解的 Deployment 发出滚动重启命令：

   ```bash
   kubectl rollout restart deploy/<Application deployment name>
   ```

1. 使用 Dapr CLI 运行以下命令，查看所有启用 Dapr 的 Deployment 列表：

   ```bash
   dapr list -k
   
   APP ID     APP PORT  AGE  CREATED
   nodeapp    3000      16h  2020-07-29 17:16.22
   ```

### 在现有 Dapr 部署中启用高可用性

为现有 Dapr 部署启用 HA 模式需要两个步骤：

1. 删除现有的 placement StatefulSet。如果未部署 placement StatefulSet（例如 Actor placement 由 Scheduler 服务提供，即 `global.scheduler.placement.enabled=true`），请跳过此步骤。

   ```bash
   kubectl delete statefulset.apps/dapr-placement-server -n dapr-system
   ```

   你之所以要删除 placement StatefulSet，是因为在 HA 模式下，placement 服务会为领导者选举添加 [Raft](https://raft.github.io/)。但是，Kubernetes 只允许修补 StatefulSet 中有限的字段，因此会导致 placement 服务的升级失败。

   删除现有的 placement StatefulSet 是安全的。代理会重新连接并重新注册到新创建的 placement 服务，该服务会将其表持久化在 Raft 中。

1. 发出升级命令。

   ```bash
   helm upgrade dapr ./charts/dapr -n dapr-system --set global.ha.enabled=true
   ```

## 推荐的安全配置

正确配置后，Dapr 可确保安全通信，并通过许多内置功能使你的应用程序更加安全。

请确认你的生产就绪部署包含以下设置：

1. **双向身份验证（mTLS）** 已启用。Dapr 默认启用 mTLS。[了解如何使用自己的证书]({{% ref "mtls.md#bringing-your-own-certificates" %}})。

1. **应用程序到 Dapr API 的身份验证** 已启用。这是应用程序与 Dapr sidecar 之间的通信。为保护 Dapr API 免受未授权的应用程序访问，[请启用 Dapr 基于令牌的身份验证]({{% ref "api-token.md" %}})。

1. **Dapr 到应用程序 API 的身份验证** 已启用。这是 Dapr 与你的应用程序之间的通信。[让 Dapr 知道它正在使用令牌身份验证与经授权的应用程序通信]({{% ref "app-api-token.md" %}})。

1. **组件密钥数据配置在 secret store 中**，而不是硬编码在组件 YAML 文件中。[了解如何在 Dapr 组件中使用 secrets]({{% ref "component-secrets.md" %}})。

1. Dapr **control plane 安装在专用 namespace** 上，例如 `dapr-system`。

1. Dapr 支持并启用为**某些应用程序限定 component 的作用域**。这不是必需的做法。[了解有关 component 作用域的更多信息]({{% ref "component-scopes.md" %}})。

## 推荐的 Placement 服务配置

[Placement 服务]({{% ref "placement.md" %}}) 是 Dapr 中的一个组件，负责通过 placement 表向所有 Dapr sidecar disseminating Actor 地址信息（更多信息见[此处]({{% ref "actors-features-concepts.md#actor-placement-service" %}})）。

在生产环境中运行时，建议使用以下值配置 Placement 服务：

1. **高可用性**。确保 Placement 服务高度可用（三个副本），并能够在单个节点故障中存活。Helm chart 值：`dapr_placement.ha=true`
2. **内存日志**。使用内存 Raft 日志存储以加快写入速度。代价是在最终的 Placement 服务 Pod 故障时，会发生更多的 placement 表 disseminations（因而网络流量更大）。Helm chart 值：`dapr_placement.cluster.forceInMemoryLog=true`
3. **无 metadata 端点**。禁用未经身份验证的 `/placement/state` 端点，该端点会暴露 Placement 服务的 placement 表信息。Helm chart 值：`dapr_placement.metadataEnabled=false`
4. **超时**。使用以下超时值控制 Placement 服务与 sidecar 之间网络连接的敏感度。已设置默认值，但你可以根据网络状况进行调整。
   1. `dapr_placement.keepAliveTime` 设置 Placement 服务在 gRPC 流上向 Dapr sidecar 发送 [keepalive](https://grpc.io/docs/guides/keepalive/) ping 以检查连接是否仍然存活的间隔。较低的值会在 Pod 丢失或重启时缩短 Actor 重新平衡时间，但正常运行期间的网络流量会更高。可接受 `1s` 到 `10s` 之间的值。默认为 `2s`。
   2. `dapr_placement.keepAliveTimeout` 设置 Dapr sidecar 响应 Placement 服务 [keepalive](https://grpc.io/docs/guides/keepalive/) ping 的超时时间，超时后 Placement 服务会关闭连接。较低的值会在 Pod 丢失或重启时缩短 Actor 重新平衡时间，但正常运行期间的网络流量会更高。可接受 `1s` 到 `10s` 之间的值。默认为 `3s`。
   3. `dapr_placement.disseminateTimeout` 设置一轮 placement 表 dissemination 被视为失败前的完成时限。在此时限内未确认更新的 sidecar 会被视为无响应，并从该轮 dissemination 中移除，其 placement 流也会被重置。注意，sidecar 端的 Actor draining（`drainOngoingCallTimeout`）会延迟 sidecar 的确认，因此会计入此时限。默认为 `8s`。

当 Actor placement 由 Scheduler 服务提供（`global.scheduler.placement.enabled=true`）时，上述 `dapr_placement.*` 值不适用，因为未部署 Placement 服务。由 Scheduler 提供的 placement 需通过 Scheduler 参数调优：`--placement-disseminate-timeout`（一轮 dissemination 在移除慢速 sidecar 之前等待所有 sidecar 确认的时间，默认 `8s`，与 `dapr_placement.disseminateTimeout` 是不同的配置项）和 `--placement-disseminate-coalesce-window`（将成员变更合并为单次 dissemination 轮次的时间窗口，默认 `0`，即立即 dissemination）。[进一步了解由 Scheduler 服务提供 placement]({{% ref "placement#serving-placement-from-the-scheduler-service" %}})。

## Service Account 令牌

默认情况下，Kubernetes 会在每个容器中挂载一个包含 [Service Account 令牌](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)的卷。应用程序可以使用此令牌对 Kubernetes control plane 执行 API 调用，其权限取决于集群和 namespace 的配置等因素。

创建新的 Pod（或 Deployment、StatefulSet、Job 等）时，你可以在 Pod 规范中设置 `automountServiceAccountToken: false`，以禁用 Service Account 令牌的自动挂载。

除非你的应用程序依赖 Service Account 令牌，否则建议你考虑使用 `automountServiceAccountToken: false` 部署应用程序，以提高 Pod 的安全性。例如，在以下情况下你可能需要 Service Account 令牌：

- 你的应用程序需要与 Kubernetes API 交互。
- 你正在使用与 Kubernetes API 交互的 Dapr 组件，例如 [Kubernetes secret store]({{% ref "kubernetes-secret-store.md" %}}) 或 [Kubernetes Events binding]({{% ref "kubernetes-binding.md" %}})。

因此，Dapr 不会自动为你设置 `automountServiceAccountToken: false`。但是，在你的解决方案不需要 Service Account 的所有情况下，建议你在 Pod 规范中设置此选项。

{{% alert title="注意" color="primary" %}}
使用以 Kubernetes secrets 形式存储的 [component secrets]({{% ref "component-secrets.md" %}}) 初始化 Dapr 组件**不**需要你的 Pod 具有 Service Account 令牌；Dapr Operator 会在注入时解析 `secretKeyRef`。要在 `automountServiceAccountToken: false` 的条件下运行，请通过注解 `dapr.io/disable-builtin-k8s-secret-store: "true"` 禁用 sidecar 内置的 Kubernetes secret store。只有当你的应用程序使用运行时的 [Secrets management]({{% ref "secrets-overview.md" %}}) 构建块时，才需要保持 secret store 启用（并挂载令牌）。
{{% /alert %}}

## 追踪和指标配置

追踪和指标在 Dapr 中默认启用。建议你在生产环境中为应用程序和 Dapr control plane 配置分布式追踪和指标。

如果你已经有自己的observability 方案，可以禁用 Dapr 的追踪和指标。

### 追踪

[为 Dapr 配置追踪后端]({{% ref "setup-tracing.md" %}})。

### 指标

对于指标，Dapr 会暴露一个监听端口 9090 的 Prometheus 端点，Prometheus 可以抓取该端点。

[使用 Dapr 设置 Prometheus、Grafana 和其他监控工具]({{% ref "observability" %}})。

## 注入器看门狗

Dapr Operator 服务包含一个**注入器看门狗**，可用于检测并修复应用程序 Pod 可能在没有 Dapr sidecar（`daprd` 容器）的情况下被部署的问题。例如，它可以在集群完全故障后帮助恢复应用程序。

在 Kubernetes 模式下运行 Dapr 时，注入器看门狗默认处于禁用状态。但是，你应当根据具体情况，使用适当的值考虑启用它。

有关注入器看门狗的更多详细信息以及如何启用它，请参阅 [Dapr operator 服务文档]({{% ref operator %}})。

## 为 sidecar 容器配置 `seccompProfile`

默认情况下，Dapr sidecar 注入器注入的 sidecar 不带任何 `seccompProfile`。但是，为了让 Dapr sidecar 容器能够在采用[受限（Restricted）](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted)配置文件的 namespace 中成功运行，sidecar 容器需要 `securityContext.seccompProfile.Type` 不为 `nil`。

请参阅[参数和注解概述]({{% ref "arguments-annotations-overview.md" %}})，在 sidecar 容器上设置适当的 `seccompProfile`。

## 以非 root 用户运行
在 Kubernetes 中运行时，Dapr 服务会确保每个进程都以非 root 用户运行。
具体做法是检查进程的 UID 和 GID 是否为 `65532`，如果不是预期值，则以致命错误退出。
如果你必须在 Kubernetes 中使用非默认的 UID 和 GID，请设置以下环境变量以跳过此检查。

```bash
DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK="true"
```

## Actor 宿主的优雅关闭

删除 Pod 时，Kubernetes 会并发终止其容器，且不保证先后顺序。如果没有延迟用的钩子，应用程序容器和 `daprd` sidecar 几乎会同时收到停止信号。空闲的应用程序往往在毫秒内退出，而此时 sidecar 尚未关闭其 Actor 运行时。随后 sidecar 无法停用其所承载的 Actor（连接被拒绝；`OnDeactivateAsync` 永远不会运行）。在 sidecar 退出且 placement 表 re-disseminated 之前，其他 sidecar 仍会把调用路由到这个正在关闭的 Pod 上的 Actor。一次普通的滚动重启通常会造成持续数秒的 Actor 调用失败窗口。

解决办法是在 sidecar drains 并停用 Actor 期间，让应用程序继续提供服务：在*应用程序*容器上设置 `preStop` 钩子，并设置足以覆盖该钩子的终止宽限期。以下是一个可用的起点，请根据你的工作负载调整时长：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myactorapp
spec:
  selector:
    matchLabels:
      app: myactorapp
  template:
    metadata:
      labels:
        app: myactorapp
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myactorapp"
        dapr.io/app-port: "8080"
    spec:
      # 必须大于应用的 preStop sleep 时长加上应用自身的优雅关闭时长。
      terminationGracePeriodSeconds: 60
      containers:
        - name: myactorapp
          image: myregistry/myactorapp:latest
          lifecycle:
            preStop:
              # 在 sidecar drains 并停用 Actor 期间，保持应用继续提供服务。
              sleep:
                seconds: 15
```

在 1.30 之前的 Kubernetes 版本中，请改用 `exec` 形式，而不是原生的 `sleep` handler。它需要应用程序镜像中存在 shell 和 `sleep` 命令，否则在 distroless 或 `scratch` 镜像上会静默地不起作用：

```yaml
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]
```

在应用程序中，设置 `drainRebalancedActors: true`，并将 `drainOngoingCallTimeout` 设为 Actor 方法 handlers 的 p99 耗时。如果该值超过几秒，请将 Placement 服务的 `disseminateTimeout` 调高到其之上，并留出足够余量以确认 placement 更新，否则 Placement 会重置超过该时限的流。若超过 30 秒，还必须同时调高 `dapr.io/actors-disseminate-timeout`，否则 daprd 会将 drain 时长 clamps 为其 80%（[Drain timeout clamping]({{% ref "actors-runtime-config.md#drain-timeout-clamping" %}})）。

### 设置时长

```
preStop sleep                 >= [block-shutdown-duration +] drainOngoingCallTimeout + 5s (actor deactivation) + margin
terminationGracePeriodSeconds >  preStop sleep + app graceful shutdown
```

只有在你配置了 `block-shutdown-duration` 时才需要包含该项，即应用程序在自身关闭期间需要调用 Dapr API 的场景。Actor 停用在 drain 之后执行，使用由该宿主拥有的所有 Actor 共享的单一固定 5 秒预算。该预算不可配置，因此 Actor 数量非常多或停用 handlers 较慢的宿主，可能无法在该预算内完成。如果 `terminationGracePeriodSeconds` 先到期，Kubernetes 会发送 `SIGKILL`，问题就会回到最初的状态。

如果你在 Actor 宿主上启用了[应用健康检查]({{% ref "app-health.md" %}})，请注意它影响的是稳定运行状态，而不仅是关闭过程：被报告为不健康的应用，其所有 Actor 类型都会被注销，并在整个集群内重新平衡。因此探测端点必须开销低，`dapr.io/app-health-probe-timeout` 应据此设置，阈值保持默认值。

{{% alert title="重要" color="warning" %}}
对应用程序容器的任何探测（Kubernetes 存活探测或 Dapr 应用健康检查）都应指向仅由应用程序自身提供的端点。依赖 sidecar 的探测路径会形成循环：只要 sidecar 不可用，Kubernetes 存活探测就会重启你想保持运行的容器；而 Dapr 应用健康检查会把应用标记为不健康，并重新平衡其 Actor。
{{% /alert %}}

{{% alert title="原生 sidecar" color="warning" %}}
目前无法在[原生 sidecar]({{% ref "sidecar.md#native-sidecars-kubernetes-128" %}})下实现干净的 Actor 停用：Kubernetes 会先终止应用程序容器，然后才向 sidecar 发送信号，因此停用总是在已退出的应用程序上运行，任何 `preStop` 安排都无法改变这一顺序。请让 Actor 宿主保持默认的 sidecar 注入方式。
{{% /alert %}}

## 最佳实践

观看此视频，深入了解在生产环境中使用 Kubernetes 运行 Dapr 的最佳实践。

{{< youtube id=_U9wJqq-H1g >}}

## 相关链接

- [在 Kubernetes 上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
