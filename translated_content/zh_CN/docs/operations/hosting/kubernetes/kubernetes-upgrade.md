---
type: docs
title: "在 Kubernetes 集群上升级 Dapr"
linkTitle: "升级 Dapr"
weight: 30000
description: "按照以下步骤在 Kubernetes 上升级 Dapr 并确保平滑升级。"
---

你可以使用 Dapr CLI 或 Helm 在 Kubernetes 集群上升级 Dapr 控制平面。

{{% alert title="注意" color="primary" %}}
请参阅 [Dapr 版本策略]({{% ref "support-release-policy.md#upgrade-paths" %}})，了解 Dapr 升级路径的指导。
{{% /alert %}}

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}
## 使用 Dapr CLI 升级

你可以使用 [Dapr CLI]({{% ref install-dapr-cli.md %}}) 来升级 Dapr。

### 前置条件

- [安装 Dapr CLI]({{% ref install-dapr-cli.md %}})
- 现有的 [运行 Dapr 的 Kubernetes 集群]({{% ref cluster %}})

### 升级现有集群至 {{% dapr-latest-version long="true" %}}

```bash
dapr upgrade -k --runtime-version={{% dapr-latest-version long="true" %}}
```

[你可以使用 Dapr CLI 提供所有可用的 Helm chart 配置。](https://github.com/dapr/cli#supplying-helm-values)

### 通过 CLI 进行升级的故障排查

在可能曾经安装过早于 1.0.0-rc.2 版本的集群上运行升级时，存在一个已知问题。

虽然这种情况很少见，但一些升级路径的边缘情况可能会在集群上留下不兼容的 `CustomResourceDefinition`。如果你遇到这种情况，你可能会看到类似如下的错误消息：

```
❌  Failed to upgrade Dapr: Warning: kubectl apply should be used on resource created by either kubectl create --save-config or kubectl apply
The CustomResourceDefinition "configurations.dapr.io" is invalid: spec.preserveUnknownFields: Invalid value: true: must be false in order to use defaults in the schema

```

#### 解决方案

1. 运行以下命令将 `CustomResourceDefinition` 升级到兼容版本：

    ```sh
    kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/release-{{% dapr-latest-version short="true" %}}/charts/dapr/crds/configuration.yaml
    ```

1. 继续执行 `dapr upgrade --runtime-version {{% dapr-latest-version long="true" %}} -k` 命令。

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}
## 使用 Helm 升级

你可以使用 Helm v3 chart 升级 Dapr。

❗**重要提示：** 最新的 Dapr Helm chart 不再支持 Helm v2。[从 Helm v2 迁移到 Helm v3](https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/)。

### 前置条件

- [安装 Helm v3](https://github.com/helm/helm/releases)
- 现有的 [运行 Dapr 的 Kubernetes 集群]({{% ref cluster %}})

### 升级现有集群至 {{% dapr-latest-version long="true" %}}

从 1.0.0 版本开始，使用 Helm 升级 Dapr 时，现有的证书值将自动被复用。

> **注意** Helm 不处理资源的升级，因此你需要手动执行该操作。资源具有向后兼容性，应仅向前安装。

1. 将 Dapr 升级到版本 {{% dapr-latest-version long="true" %}}：

   ```bash
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/components.yaml
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/configuration.yaml
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/subscription.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/resiliency.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/httpendpoints.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/mcpservers.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/workflowaccesspolicy.yaml
   ```

   ```bash
   helm repo update
   ```

   ```bash
   helm upgrade dapr dapr/dapr --version {{% dapr-latest-version long="true" %}} --namespace dapr-system --wait
   ```
   > *如果你正在使用 values 文件，请记得在运行升级命令时添加 `--values` 选项。*

1. 确保所有 pod 都在运行：

   ```bash
   kubectl get pods -n dapr-system -w

   NAME                                     READY   STATUS    RESTARTS   AGE
   dapr-operator-5cdd6b7f9c-9sl7g           1/1     Running   0          41s
   dapr-placement-server-0                  1/1     Running   0          41s
   dapr-sentry-84565c747b-7bh8h             1/1     Running   0          35s
   dapr-sidecar-injector-68f868668f-6xnbt   1/1     Running   0          41s
   ```

1. 重启你的应用程序部署以更新 Dapr 运行时：

   ```bash
   kubectl rollout restart deploy/<DEPLOYMENT-NAME>
   ```

{{% /tab %}}

{{< /tabpane >}}

## 调度器 RBAC 权限

从 Dapr 1.19 开始，调度器需要在 Dapr 控制平面命名空间中对 `pods` 拥有 `get`、`list` 和 `watch` 权限，以检测是否部署了放置服务。无论是否启用调度器放置，每次升级到 1.19 都需要此权限。Helm chart 和 `dapr upgrade -k` 会在发布命名空间中以 `dapr-scheduler-pods` Role 和 RoleBinding 的形式添加该权限。`dapr-scheduler` ClusterRole（或在命名空间 RBAC 模式下为 Role）仍只保留 `namespaces` 权限。

## 升级现有 Dapr 部署以启用高可用模式

[通过一些额外步骤在现有 Dapr 部署中启用高可用模式。]({{% ref "kubernetes-production.md#enabling-high-availability-in-an-existing-dapr-deployment" %}})

## 在现有 Dapr 部署中启用调度器放置

通过使用 `global.scheduler.placement.enabled=true` 进行升级，Actor 放置可以由 Scheduler 服务代替独立的放置服务提供。同一次升级会移除 placement StatefulSet，正在运行的边车会自行采用调度器放置，两个方向上都不需要重启边车。调度器会在几秒内检测到 placement pod 离开并接管；在此次升级之外，placement pod 崩溃或重启不会转移放置权限。[进一步了解由 Scheduler 服务提供放置。]({{% ref "placement#serving-placement-from-the-scheduler-service" %}})

{{% alert title="重要" color="warning" %}}
在启用此设置之前，请先完成 Dapr 版本的推出。运行较旧 Dapr 版本的边车只能使用放置服务：如果未部署它，它们的 Actor 和工作流 API 将停滞，直到 pod 升级到支持调度器放置的版本。不会丢失任何 Actor 状态。只要放置服务仍在运行，它就仍是放置权限的持有者：存在放置服务时，调度器不提供放置，因此集群在整个推出过程中始终只有一个放置权限持有者。一旦不再存在放置服务，调度器就会提供放置，而仍在连接的旧版边车会被记录为警告，因为已无服务可供其使用。
{{% /alert %}}

启用之前，请确认：

- 将每个边车升级到 1.19 或更高版本：在控制平面升级后重启你的应用程序。
- 保留 `global.scheduler.enabled=true`、`global.actors.enabled=true` 和 `global.actors.serviceName=placement`（即默认值）。如果缺少这些设置，Helm chart 将无法渲染该设置。
- 如果你在 Helm chart 之外管理 RBAC，请添加 [调度器 RBAC 权限](#调度器-rbac-权限) 中的 Role。

使用 `helm upgrade` 并添加 `--set global.scheduler.placement.enabled=true` 以及你平时使用的其他值来启用，或者使用 CLI 启用：

```bash
dapr upgrade -k --runtime-version={{% dapr-latest-version long="true" %}} --set global.scheduler.placement.enabled=true
```

同一次升级会重启调度器以加载 `--placement-enabled=true`，因此预计 Actor 和工作流活动会暂停，直到调度器再次就绪，所耗时间会长于接管本身的几秒钟。

要验证时，请检查边车是否记录了 `Connected to scheduler placement leader <address>`，并且恰好有一个调度器的 `dapr_scheduler_placement_leader` 指标为 `1`。如果 `dapr_scheduler_placement_incapable_sidecars` 大于 `0`，或者某个调度器记录了 `A sidecar running an older Dapr version is connected`，请升级这些 pod：它们的 Actor 和工作流 API 将会停滞。

要回滚，请将该设置改为 `false` 进行升级：placement StatefulSet 会重新部署，调度器会将放置权限交还给它，同样不需要重启边车。两个方向上，此变更都会[一次性重新分配 Actor]({{% ref "placement#serving-placement-from-the-scheduler-service" %}})，因为两个服务使用不同的算法放置 Actor。Actor 状态不受影响。

由于 `helm upgrade` 会重置未在命令行中传递的值，因此在之后的每次升级中都要传递该设置（或将其保存在你的 values 文件中），否则 placement StatefulSet 会被重新部署，放置权限也会交还给它。

## 降级

{{% alert title="警告" color="warning" %}}
不要从 1.19 直接回滚到 1.17.6 或更早版本。安全的回滚目标是 1.18.x。
{{% /alert %}}

Dapr 1.19 仍会签发 Dapr 1.18 引入的 Ed25519 工作负载身份密钥，并且 Sentry 会将采用 Ed25519 密钥的 CA 持久化在 `dapr-trust-bundle` Secret 中。1.17.7 之前的 Sentry 版本无法解析该信任包，启动时会崩溃，并报出以下错误：

```
fatal: error creating CA: failed to get CA bundle:
failed to verify CA bundle: unsupported key type ed25519.PrivateKey
```

| 从 | 到 | 结果 |
|---|---|---|
| 1.19 | 1.18.x | 安全。1.18 和 1.19 写入相同的信任包格式。 |
| 1.19 | 1.17.7 或更高的 1.17.x | 安全。1.17.7 可以读取 Ed25519 信任包（[#9904](https://github.com/dapr/dapr/pull/9904)）。 |
| 1.19 | 1.17.6 或更早版本 | Sentry 启动时会反复崩溃。请先回滚到 1.17.7，确认 `dapr status -k` 状态正常，再从该版本继续降级。 |

降级到 1.18.x 或 1.17.7 不需要轮换 CA。只有当目标版本低于 1.17.7，或你的安全策略要求时，才需要轮换 CA。

请按以下顺序降级：

1. 如果你启用了[调度器放置](#在现有-dapr-部署中启用调度器放置)，请使用 `global.scheduler.placement.enabled=false` 进行升级，并等待 Placement pod 就绪。检查边车是否记录了 `Connected to placement service: <address>`。

1. 如果你创建了使用 `requires` 的 `WorkflowAccessPolicy` 规则，请将其删除或收窄。1.18 控制平面和边车不认识该字段，会在没有该限制的情况下应用这些规则。

1. 使用 Helm 回滚控制平面：

   ```bash
   helm history dapr -n dapr-system
   helm rollback dapr <REVISION> -n dapr-system --wait
   ```

   或者指定一个版本：

   ```bash
   helm upgrade dapr dapr/dapr --version 1.18.7 --namespace dapr-system --wait
   ```

1. 重启你的应用程序部署，以便边车获取较旧的注入器镜像，并从回滚后的 Sentry 获取新的身份：

   ```bash
   kubectl rollout restart deploy/<DEPLOYMENT-NAME>
   ```

## 相关链接

- [Kubernetes 上的 Dapr]({{% ref kubernetes-overview.md %}})
- [更多关于使用 Helm 升级 Dapr 的信息]({{% ref "kubernetes-production.md#upgrade-dapr-with-helm" %}})
- [Dapr 生产指南]({{% ref kubernetes-production.md %}})
