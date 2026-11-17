---
type: docs
title: "Dapr 术语与定义"
linkTitle: "术语"
weight: 1000
description: Dapr 文档中常见术语和缩写的定义
---

本页详细介绍了你在 Dapr 文档中可能遇到的所有常见术语。

| 术语 | 定义 | 更多信息 |
|:-----|------------|------------------|
| App/Application | 正在运行的服务/二进制文件，通常是你作为用户创建并运行的程序。                                                                                                                                                                                                                      
| Building block | Dapr 提供给用户的 API，用于帮助创建微服务和应用程序。 | [Dapr building blocks]({{% ref building-blocks-concept %}})
| Component | 由 Dapr building block 单独使用或与其他 component 一起使用的模块化功能类型。 | [Dapr components]({{% ref components-concept %}})
| Configuration | 用于声明 Dapr sidecar 或 Dapr control plane 所有设置的 YAML 文件。你可以在此配置 control plane mTLS 设置，或应用程序实例的跟踪和 middleware 设置。 | [Dapr 配置]({{% ref configuration-concept %}})
| Dapr | Distributed Application Runtime（分布式应用运行时）。 | [Dapr 概述]({{% ref overview %}})
| Dapr Actors | 一个 Dapr building block，实现了 virtual Actor 模式，用于构建具有身份、生命周期和并发管理的有状态单线程对象。 | [Actor 概述]({{% ref actors-overview %}})
| Dapr Agents | 基于 Dapr Python SDK 构建的开发者框架，用于创建由大型语言模型 (LLM) 驱动的持久化代理应用程序。 | [Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}})
| Dapr control plane | 属于 Dapr 安装一部分的服务集合，部署在 Kubernetes 集群等 hosting platform 上。这使启用 Dapr 的应用程序能够在该平台上运行，并处理 Actor placement、Dapr sidecar 注入或证书颁发/轮换等 Dapr 功能。 | [自托管概述]({{% ref self-hosted-overview %}})<br />[Kubernetes 概述]({{% ref kubernetes-overview %}})
| Dapr Workflows | 一个 Dapr building block，用于编写代码优先的 workflow，具有持久执行能力，可从崩溃中恢复，支持长时间运行的进程，并支持人在回路交互。 | [workflow 概述]({{% ref workflow-overview %}})
| HTTPEndpoint | HTTPEndpoint 是一种 Dapr 资源，用于标识可通过 service invocation API 调用的 non-Dapr endpoint。 | [service invocation API]({{% ref service_invocation_api %}})
| MCPServer | 一种 Dapr 资源，用于声明与模型上下文协议（MCP）服务器的连接，以便通过内置 workflow 编排实现持久化工具执行。 | [MCPServer 资源]({{% ref mcp-server-resource.md %}})
| Namespacing | Dapr 中的 namespace 可提供隔离，从而实现多租户。 | 了解有关 namespace 的更多信息：[components]({{% ref component-scopes %}})、[service invocation]({{% ref service-invocation-namespaces %}})、[pub/sub]({{% ref pubsub-namespaces %}})和 [Actor]({{% ref namespaced-actors %}})
| Self-hosted | 可在其中使用 Dapr 运行应用程序的 Windows/macOS/Linux 机器。Dapr 支持在机器上以“自托管”模式运行。 | [自托管模式]({{% ref self-hosted-overview %}})
| Service | 正在运行的应用程序或二进制文件。这可以指你的应用程序或 Dapr 应用程序。                       
| Sidecar | 作为单独进程或容器与应用程序一起运行的程序。 | [sidecar 模式](https://docs.microsoft.com/azure/architecture/patterns/sidecar) 
