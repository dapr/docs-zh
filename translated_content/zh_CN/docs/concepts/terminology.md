---
type: docs
title: "Dapr 术语和定义"
linkTitle: "术语"
weight: 1000
description: Dapr 文档中常用术语和缩写的定义
---

本页面详细说明了您在 Dapr 文档中可能遇到的所有常用术语。

| 术语 | 定义 | 更多信息 |
|:-----|------------|------------------|
| App/Application | 正在运行的服务/二进制文件，通常是您作为用户创建和运行的。 |
| 构建块 | Dapr 向用户提供的 API，用于帮助创建微服务和应用程序。 | [Dapr 构建块]({{% ref building-blocks-concept %}})
| Component | Dapr 构建块使用的模块化功能类型，可以单独使用或与其他组件集合一起使用。 | [Dapr 组件]({{% ref components-concept %}})
| Configuration | 用于声明 Dapr 边车或 Dapr 控制平面的所有设置的 YAML 文件。您可以在此处配置控制平面 mTLS 设置，或配置应用程序实例的跟踪和中间件设置。 | [Dapr 配置]({{% ref configuration-concept %}})
| Dapr | 分布式应用运行时。 | [Dapr 概述]({{% ref overview %}})
| Dapr Actors | 实现虚拟 actor 模式的 Dapr 构建块，用于构建具有身份标识、生命周期和并发管理功能的有状态单线程对象。 | [Actors 概述]({{% ref actors-overview %}})
| Dapr Agents | 基于 Dapr Python SDK 构建的开发者框架，用于创建由 LLM 驱动的持久化智能体应用程序。 | [Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}})
| Dapr 控制平面 | 托管平台（如 Kubernetes 集群）上 Dapr 安装的一部分服务集合。这允许启用 Dapr 的应用程序在该平台上运行，并处理 Dapr 功能，如 actor 放置、Dapr 边车注入或证书颁发/轮换。 | [自托管概览]({{% ref self-hosted-overview %}})<br />[Kubernetes 概览]({{% ref kubernetes-overview %}})
| Dapr Workflows | 用于编写代码优先工作流的 Dapr 构建块，具有持久执行能力，可从崩溃中恢复、支持长时间运行的流程，并实现人机交互。 | [工作流概览]({{% ref workflow-overview %}})
| HTTPEndpoint | HTTPEndpoint 是 Dapr 资源，用于标识要通过服务调用 API 调用的非 Dapr 端点。 | [服务调用 API]({{% ref service_invocation_api %}})
| 命名空间 | Dapr 中的命名空间提供隔离，从而提供多租户。 | 了解更多关于[组件]({{% ref component-scopes %}})的命名空间、[服务调用]({{% ref service-invocation-namespaces %}})的命名空间、[发布订阅]({{% ref pubsub-namespaces %}})的命名空间和 [actors]({{% ref namespaced-actors %}})的命名空间 |
| Self-hosted | 可用于运行带有 Dapr 的应用程序的 Windows/macOS/Linux 机器。Dapr 提供在这些机器上以"自托管"模式运行的能力。 | [自托管模式]({{% ref self-hosted-overview %}})
| Service | 正在运行的应用程序或二进制文件。这可以指您的应用程序或 Dapr 应用程序。 |
| 边车 | 与您的应用程序作为单独进程或容器一起运行的程序。 | [边车模式](https://docs.microsoft.com/azure/architecture/patterns/sidecar) |
