---
type: docs
title: "使用 Dapr Shared 每节点或每集群部署 Dapr"
linkTitle: "Dapr Shared"
weight: 50000
description: "了解更多关于使用 Dapr Shared 作为边车替代部署的信息"

---

Dapr 会自动注入一个边车，为您的应用程序启用 Dapr API，以获得最佳的可用性和可靠性。

Dapr Shared 支持两种替代部署策略，可以使用 Kubernetes `Daemonset` 进行每节点部署，或使用 `Deployment` 进行每集群部署，从而创建 Dapr 应用程序。

- **`DaemonSet`**：当以 Kubernetes `DaemonSet` 资源运行 Dapr Shared 时，daprd 容器会在集群中的每个 Kubernetes 节点上运行。这可以减少应用程序与 Dapr 之间的网络跳数。
- **`Deployment`**：当以 Kubernetes `Deployment` 运行 Dapr Shared 时，Kubernetes 调度器会决定 daprd 容器实例在集群中的哪个单个节点上运行。

{{% alert title="Dapr Shared 部署" color="primary" %}}
对于您部署的每个 Dapr 应用程序，您需要使用不同的 `shared.appId` 部署 Dapr Shared Helm chart。
{{% /alert %}}



## 为什么选择 Dapr Shared？

默认情况下，当 Dapr 安装到 Kubernetes 集群时，Dapr 控制平面会将 Dapr 作为边车注入到使用 Dapr 注解（`dapr.io/enabled: "true"`）的应用程序中。边车提供了许多优势，包括提高的弹性，因为每个应用程序都有一个实例，并且应用程序与边车之间的所有通信都在不涉及网络的情况下进行。

<img src="/images/dapr-shared/sidecar.png" width=800 style="padding-bottom:15px;">

虽然边车是 Dapr 的默认部署方式，但某些用例需要其他方法。假设您想要将工作负载的生命周期与 Dapr API 解耦。一个典型的例子是函数或函数即服务运行时，它们可能会自动缩减空闲工作负载以释放资源。对于这种情况，可能需要将 Dapr API 和所有 Dapr 异步功能（如订阅）分开保存。

Dapr Shared 正是为这些场景而创建的，它扩展了 Dapr 边车模型，增加了两种新的部署方法：`DaemonSet`（每节点）和 `Deployment`（每集群）。

{{% alert title="重要" color="primary" %}}
无论您选择哪种部署方法，重要的是要理解，在大多数用例中，每个服务（app-id）都有一个 Dapr Shared 实例（Helm release）。这意味着如果您有一个由三个微服务组成的应用程序，建议每个服务都有自己的 Dapr Shared 实例。您可以通过尝试 [Hello Kubernetes with Dapr Shared 教程](https://github.com/dapr/dapr-shared/blob/main/docs/tutorial/README.md)来查看实际操作。
{{% /alert %}}


### `DaemonSet`（每节点）

使用 Kubernetes `DaemonSet`，您可以定义需要在集群中的每个节点部署一次的应用程序。这使得在同一节点上运行的应用程序能够与本地 Dapr API 通信，无论 Kubernetes `Scheduler` 将您的工作负载调度到何处。

<img src="/images/dapr-shared/daemonset.png" width=800 style="padding-bottom:15px;">

{{% alert title="注意" color="primary" %}}
由于 `DaemonSet` 在每个节点上安装一个实例，与每集群部署的 `Deployment` 相比，它在您的集群中消耗更多资源，但具有提高弹性的优势。
{{% /alert %}}


### `Deployment`（每集群）

Kubernetes `Deployments` 在集群中安装一次。Kubernetes `Scheduler` 根据可用资源决定工作负载调度到哪个节点。对于 Dapr Shared，这意味着您的工作负载和 Dapr 实例可能位于不同的节点上，这可能会引入相当大的网络延迟，但可以减少资源使用。

<img src="/images/dapr-shared/deployment.png" width=800 style="padding-bottom:15px;">

## Dapr Shared 入门

{{% alert title="先决条件" color="primary" %}}
在安装 Dapr Shared 之前，请确保您已在集群中[安装 Dapr]({{% ref "kubernetes-deploy.md" %}})。
{{% /alert %}}

如果您想开始使用 Dapr Shared，可以通过安装官方 Helm Chart 创建一个新的 Dapr Shared 实例：

```
helm install my-shared-instance oci://registry-1.docker.io/daprio/dapr-shared-chart --set shared.appId=<DAPR_APP_ID> --set shared.remoteURL=<REMOTE_URL> --set shared.remotePort=<REMOTE_PORT> --set shared.strategy=deployment
```

您的启用 Dapr 的应用程序现在可以通过将 Dapr SDK 指向或向 Dapr Shared 实例暴露的 `my-shared-instance-dapr` Kubernetes 服务发送请求来使用 Dapr Shared 实例。

> 上面的 `my-shared-instance` 是 Helm Chart 的 release 名称。

如果您使用的是 Dapr SDK，可以为应用程序设置以下环境变量以连接到 Dapr Shared 实例（在本例中，运行在 `default` 命名空间中）：

```
        env:
        - name: DAPR_HTTP_ENDPOINT
          value: http://my-shared-instance-dapr.default.svc.cluster.local:3500
        - name: DAPR_GRPC_ENDPOINT
          value: http://my-shared-instance-dapr.default.svc.cluster.local:50001 
```

如果您不使用 SDK，可以向这些端点发送 HTTP 或 gRPC 请求。

## 后续步骤

- 尝试 [Hello Kubernetes with Dapr Shared 教程](https://github.com/dapr/dapr-shared/blob/main/docs/tutorial/README.md)。
- 在 [Dapr Shared 仓库](https://github.com/dapr/dapr-shared/blob/main/README.md) 中阅读更多信息
