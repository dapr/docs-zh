---
type: docs
title: "Dapr Placement control plane 服务概述"
linkTitle: "Placement"
description: "Dapr Placement 服务概述"
---

{{% alert title="弃用通知" color="warning" %}}
从 Dapr v1.19 开始，actor placement 可以由 [Scheduler 服务]({{% ref scheduler %}}) 提供，需通过可选标志 `global.scheduler.placement.enabled=true` 启用（默认为 `false`）。独立的 Placement 服务计划在 Dapr v1.21 中弃用，届时 Scheduler 将默认提供 actor placement。
{{% /alert %}}

Dapr Placement 服务用于计算和分发分布式哈希表，以确定运行在[自托管模式]({{% ref self-hosted %}})或 [Kubernetes]({{% ref kubernetes %}}) 上的 [Dapr Actor]({{% ref actors %}}) 的位置。哈希表按命名空间分组，将 Actor 类型映射到 Pod 或进程，使 Dapr 应用程序能够与 Actor 通信。每当 Dapr 应用程序激活一个 Dapr Actor 时，Placement 服务都会使用最新的 Actor 位置更新哈希表。

## 自托管模式

Placement 服务 Docker 容器会作为 [`dapr init`]({{% ref self-hosted-with-docker %}}) 的一部分自动启动，除非你使用 `dapr init --scheduler-placement` 进行初始化，此时由 [Scheduler 服务提供 placement](#由-scheduler-服务提供-placement)。如果你以 [slim-init 模式]({{% ref self-hosted-no-docker %}}) 运行，也可以将其作为进程手动运行。

## Kubernetes 模式

Placement 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm 图表部署。你可以在高可用（HA）模式下运行 Placement。[了解有关在 Kubernetes 服务中设置 HA 模式的更多信息。]({{% ref "kubernetes-production#individual-service-ha-helm-configuration" %}})

另外，actor placement 也可以由 [Scheduler 服务]({{% ref scheduler %}}) 提供，而不使用独立的 Placement 服务。参见[由 Scheduler 服务提供 placement](#由-scheduler-服务提供-placement)。

有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 由 Scheduler 服务提供 placement

Scheduler 服务本身可以提供 actor placement，因此无需运行独立的 Placement 服务。

在 Kubernetes 模式下，设置 Helm 值：

```
global.scheduler.placement.enabled=true
```

启用此设置后，不会部署 Placement StatefulSet，Scheduler 将以 `--placement-enabled=true` 运行。

在自托管模式下，使用 `dapr init --scheduler-placement` 初始化 Dapr（需要 Dapr 1.19 或更高版本）。Placement 容器不会启动，CLI 会为你启动带有 `--placement-enabled=true` 的 Scheduler 容器，无需其他配置。该标志在 [slim-init 模式]({{% ref self-hosted-no-docker %}}) 下不可用：`dapr init --slim` 会安装 Placement 和 Scheduler 两个二进制文件，但不会运行其中任何一个，因此由你自行选择运行哪一个；如果运行 Scheduler 二进制文件，请传入 `--placement-enabled=true`。应用程序和 sidecar 无需任何自身配置：每个 sidecar 都从 control plane 所通告的服务获取 actor placement，因此集群始终只有一个 placement 决策方。切换该设置的任一方向都无需重启 sidecar。

两种服务使用不同的算法放置 Actor：Placement 服务使用一致性哈希环，而 Scheduler 使用会合哈希。两者提供相同的保证（每个 sidecar 都会确定性地为每个 Actor ID 得出同一台主机，且所有权会分散到各台主机上），但最终的 Actor 到主机的分配并不相同。因此，无论朝哪个方向切换 placement 决策方，都会将 Actor 重新分配一次：受影响的 Actor 会被停用，并在其新主机上重新激活，且状态保持不变，与任何 Actor 重新平衡的情况相同。

Scheduler 通过检测是否部署了 Placement 服务来决定谁是 placement 决策方，因此切换完全取决于部署或移除 Placement 服务。在 Kubernetes 中，Scheduler 会监视 Placement Pod 并解析 Placement 服务名称；在所有模式下，它还会探测已连接 sidecar 所配置的任何 Placement 地址。Placement 的出现会立即生效，而其消失则必须经过连续多次检查确认：重启或短暂无法访问的 Placement 服务会保留 placement 决策方的身份，只有移除它才会将 actor placement 转交给 Scheduler。

{{% alert title="重要" color="warning" %}}
在启用此设置之前，请先完成 Dapr 版本的推出。运行旧版 Dapr 的 sidecar 只能使用 Placement 服务：如果未部署 Placement 服务，它们的 Actor 和 Workflow API 将会停滞，直到 Pod 升级到支持 scheduler placement 的版本为止。不会丢失任何 Actor 状态。当 Placement 服务运行时，它仍是 placement 决策方：只要存在 Placement 服务，Scheduler 就不会提供 placement，因此集群在整个推出过程中始终只有一个 placement 决策方。一旦不再有 Placement 服务，Scheduler 便开始提供 placement，此时已连接的旧版 sidecar 会被记录一条警告，因为已没有任何服务能为它提供 placement。
{{% /alert %}}

[`/placement/state` API](#placement-表) 仅由独立的 Placement 服务提供，Scheduler 不提供该 API。

## Placement 表

存在一个[Placement 服务的 HTTP API `/placement/state`]({{% ref placement_api %}})，用于公开 placement 表信息。该 API 与 healthz 位于 sidecar 上的同一端口。这是一个未经身份验证的端点，默认禁用。若要启用它，你需要将 `DAPR_PLACEMENT_METADATA_ENABLED` 环境变量或 `metadata-enabled` 命令行参数设置为 true。如果使用 Helm，只需将 `dapr_placement.metadataEnabled` 设置为 true。

{{% alert title="重要" color="warning" %}}
在将 Actor 部署到不同命名空间时（{{% ref namespaced-actors %}}），如果你想阻止从所有命名空间检索 Actor，建议禁用 `metadata-enabled`。metadata 端点作用于所有命名空间。
{{% /alert %}}

### 用例
placement 表 API 可用于检索当前的 placement 表，其中包含所有命名空间中注册的所有 Actor。这有助于调试，并允许工具提取和呈现有关 Actor 的信息。

### HTTP 请求

```
GET http://localhost:<healthzPort>/placement/state
```

### HTTP 响应代码

代码 | 描述
---- | -----------
200  | 返回 Placement 表信息
500  | Placement 无法返回 Placement 表信息

### HTTP 响应体

**Placement 表 API 响应对象**

名称                   | 类型                                                                  | 描述
----                   | ----                                                                  | -----------
tableVersion           | int                                                                   | Placement 表版本
hostList               | [Actor 主机信息](#actorhostinfo)[]                                   | 已注册 Actor 主机信息的 JSON 数组。

<a id="actorhostinfo"></a>**Actor 主机信息**

名称  | 类型    | 描述
----  | ----    | -----------
name  | string  | Actor 的 host:port 地址。
appId | string  | App ID。
actorTypes | json string array | 它所托管的 Actor 类型列表。
updatedAt | timestamp | Actor 注册或更新的时间戳。

### 示例

```shell
 curl localhost:8080/placement/state
```

```json
{
    "hostList": [{
            "name": "198.18.0.1:49347",
            "namespace": "ns1",
            "appId": "actor1",
            "actorTypes": ["testActorType1", "testActorType3"],
            "updatedAt": 1690274322325260000
        },
        {
            "name": "198.18.0.2:49347",
            "namespace": "ns2",
            "appId": "actor2",
            "actorTypes": ["testActorType2"],
            "updatedAt": 1690274322325260000
        },
        {
            "name": "198.18.0.3:49347",
            "namespace": "ns2",
            "appId": "actor2",
            "actorTypes": ["testActorType2"],
            "updatedAt": 1690274322325260000
        }
    ],
    "tableVersion": 1
}
```

## 禁用 Placement 服务

可以通过以下设置禁用 Placement 服务：

```
global.actors.enabled=false
```

在 Kubernetes 模式下，使用此设置时不会部署 Placement 服务。这不仅会禁用 Actor 部署，还会禁用 workflow，因为 workflow 依赖 Actor。但此设置仅适用于 Kubernetes 模式，而使用 `--slim` 初始化 Dapr 会在自托管模式下排除 Placement 服务的部署。

当 actor placement 由 Scheduler 服务提供时（`global.scheduler.placement.enabled=true`），同样不会部署 Placement 服务。在这种情况下，Actor 和 workflow 仍可正常运行。参见[由 Scheduler 服务提供 placement](#由-scheduler-服务提供-placement)。

有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面](https://docs.dapr.io/operations/hosting/kubernetes/)。

## 相关链接

[了解有关 Placement API 的更多信息。]({{% ref placement_api %}})
