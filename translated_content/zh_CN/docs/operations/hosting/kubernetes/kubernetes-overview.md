---
type: docs
title: "Kubernetes 上运行 Dapr 概述"
linkTitle: "概述"
weight: 10000
description: "如何在 Kubernetes 集群上运行 Dapr 的概述"
---

Dapr 可以配置为在任何受支持的 Kubernetes 版本上运行。为此，Dapr 首先部署以下 Kubernetes 服务，这些服务提供一流集成，使使用 Dapr 运行应用程序变得简单。

| Kubernetes 服务     | 描述                                                                                                                                                                                                                                                               |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `dapr-operator`         | 管理 [组件]({{% ref components %}}) 更新和 Dapr 的 Kubernetes 服务端点（状态存储、发布订阅等）                                                                                                                                             |
| `dapr-sidecar-injector` | 将 Dapr 注入到[已添加注解](#adding-dapr-to-a-kubernetes-deployment)的部署 Pod 中，并添加环境变量 `DAPR_HTTP_PORT` 和 `DAPR_GRPC_PORT`，以使用户定义的应用程序能够轻松与 Dapr 通信，而无需硬编码 Dapr 端口值。 |
| `dapr-placement`        | 仅用于 [Actor]({{% ref actors %}})。创建将 actor 实例映射到 Pod 的映射表                                                                                                                                                                       |
| `dapr-sentry`           | 管理服务之间的 mTLS 并充当证书颁发机构。有关更多信息，请阅读[安全概述]({{% ref "security-concept.md" %}})                                                                                                                   |
| `dapr-scheduler`        | 提供由 Jobs API、Workflow API 和 Actor Reminders 使用的分布式作业调度功能                                                                                                                                                                  |

<img src="/images/overview-kubernetes.png" width=1000>

## 支持的版本
Dapr 对 Kubernetes 的支持与 [Kubernetes 版本偏差策略](https://kubernetes.io/releases/version-skew-policy)保持一致。

## 将 Dapr 部署到 Kubernetes 集群

阅读[在 Kubernetes 集群上部署 Dapr]({{% ref kubernetes-deploy.md %}})以了解如何将 Dapr 部署到您的 Kubernetes 集群。

## 将 Dapr 添加到 Kubernetes 部署

在 Kubernetes 集群中部署和运行启用 Dapr 的应用程序非常简单，只需在 Pod 架构中添加几个注解即可。例如，在以下示例中，您的 Kubernetes Pod 被注解为：
- 为您的服务提供一个 Dapr 已知的 `id` 和 `port`
- 通过配置启用追踪
- 启动 Dapr 边车容器

```yml
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "nodeapp"
    dapr.io/app-port: "3000"
    dapr.io/config: "tracing"
```

有关更多信息，请查看 [Dapr 注解]({{% ref arguments-annotations-overview.md %}})。

## 从私有注册表拉取容器镜像

无论用户应用程序容器镜像来自何处，Dapr 都可以与其无缝协作。只需[初始化 Dapr]({{% ref install-dapr-selfhost.md %}})并将 [Dapr 注解]({{% ref arguments-annotations-overview.md %}})添加到您的 Kubernetes 定义中，即可添加 Dapr 边车。

Dapr 控制平面和边车镜像来自 [daprio Docker Hub](https://hub.docker.com/u/daprio) 容器注册表，这是一个公共注册表。

有关以下方面的信息：
- 从私有注册表拉取应用程序镜像，请参考 [官方 Kubernetes 文档](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)。
- 将 Azure Container Registry 与 Azure Kubernetes Service 结合使用，请参考 [AKS 文档](https://docs.microsoft.com/azure/aks/cluster-container-registry-integration)。

## 教程

通过[Hello Kubernetes 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)了解有关在 Kubernetes 集群上开始使用 Dapr 的更多信息。

## 相关链接

- [将 Dapr 部署到 Kubernetes 集群]({{% ref kubernetes-deploy %}})
- [升级 Kubernetes 集群上的 Dapr]({{% ref kubernetes-upgrade %}})
- [Kubernetes 上运行 Dapr 的生产指南]({{% ref kubernetes-production.md %}})
- [Dapr Kubernetes 快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)
