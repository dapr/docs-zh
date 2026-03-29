---
type: docs
title: "Dapr 术语与定义"
linkTitle: "术语"
weight: 1000
description: Dapr 文档中常见术语和缩写的定义
---

本页详细介绍了您在 Dapr 文档中可能遇到的所有常见术语。

| 术语 | 定义 | 更多信息 |
|:-----|------------|------------------|
| App/Application | 正在运行的服务/二进制文件，通常是您作为用户创建并运行的程序。                                                                                                                                                                                                                      
| Building block | Dapr 提供给用户的 API，用于帮助创建微服务和应用程序。 | [Dapr 构建块]({{% ref building-blocks-concept %}})
| Component | Dapr 构建块单独或与其他组件集合一起使用的模块化功能类型。 | [Dapr 组件]({{% ref components-concept %}})
| Configuration | 用于声明 Dapr 边车或 Dapr 控制平面所有设置的 YAML 文件。您可以在此配置控制平面 mTLS 设置，或应用程序实例的跟踪和中间件设置。 | [Dapr 配置]({{% ref configuration-concept %}})
| Dapr | Distributed Application Runtime（分布式应用运行时）。 | [Dapr 概述]({{% ref overview %}})
| Dapr Actors | 一个 Dapr 构建块，实现了虚拟 actor 模式，用于构建具有身份、生命周期和并发管理的有状态单线程对象。 | [Actors 概述]({{% ref actors-overview %}})
| Dapr Agents | 基于 Dapr Python SDK 构建的开发者框架，用于创建由 LLM 驱动的持久化代理应用程序。 | [Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}})
| Dapr control plane | 属于 Dapr 安装一部分的服务集合，部署在托管平台（如 Kubernetes 集群）上。这允许启用 Dapr 的应用程序在平台上运行，并处理 actor 放置、Dapr 边车注入或证书颁发/轮换等 Dapr 功能。 | [自托管概述]({{% ref self-hosted-overview %}})<br />[Kubernetes 概述]({{% ref kubernetes-overview %}})
| Dapr Workflows | 一个 Dapr 构建块，用于编写代码优先的工作流，具有持久执行能力，可从崩溃中恢复，支持长时间运行的进程，并支持人员交互。 | [工作流概述]({{% ref workflow-overview %}})
| HTTPEndpoint | HTTPEndpoint 是一种 Dapr 资源，用于标识可通过服务调用 API 调用的非 Dapr 端点。 | [服务调用 API]({{% ref service_invocation_api %}})
| Namespacing | Dapr 中的命名空间提供隔离，从而提供多租户能力。 | 了解有关命名空间的更多信息：[组件]({{% ref component-scopes %}})、[服务调用]({{% ref service-invocation-namespaces %}})、[发布订阅]({{% ref pubsub-namespaces %}}) 和 [actors]({{% ref namespaced-actors %}})
| Self-hosted | 您可以在其中运行 Dapr 应用程序的 Windows/macOS/Linux 机器。Dapr 提供了在机器上以"自托管"模式运行的功能。 | [自托管模式]({{% ref self-hosted-overview %}})
| Service | 正在运行的应用程序或二进制文件。这可以指您的应用程序或 Dapr 应用程序。                       
| Sidecar | 作为单独进程或容器与您的应用程序一起运行的程序。 | [边车模式](https://docs.microsoft.com/azure/architecture/patterns/sidecar)
