---
type: docs
title: "构建块"
linkTitle: "构建块"
weight: 200
description: "通过标准 HTTP 或 gRPC API 访问的模块化最佳实践"
---

[构建块]({{% ref building-blocks %}}) 是一个可以从代码调用的 HTTP 或 gRPC API，它使用一个或多个 Dapr 组件。Dapr 由一组 API 构建块组成，并具有添加新构建块的扩展能力。Dapr 的构建块：
- 解决了构建弹性微服务应用中的常见挑战
- 编纂了最佳实践和模式

下图展示了构建块如何暴露一个公开 API，该 API 从你的代码调用，并使用组件来实现构建块的功能。

<img src="/images/concepts-building-blocks.png" width=250>

Dapr 提供以下构建块：

<img src="/images/building_blocks.png" width=1200>

| 构建块 | 端点 | 描述 |
|----------------|----------|-------------|
| [**服务调用**]({{% ref "service-invocation-overview" %}}) | `/v1.0/invoke` | 服务调用使应用程序能够通过 HTTP 或 gRPC 消息形式的标准端点相互通信。Dapr 提供了一个端点，既可以作为内置服务发现的反向代理，同时利用分布式追踪和错误处理。 |
| [**发布和订阅**]({{% ref "pubsub-overview" %}}) | `/v1.0/publish` `/v1.0/subscribe`| 发布订阅是一种松耦合的消息模式，发送者（或发布者）将消息发布到主题，订阅者订阅该主题。Dapr 支持应用程序之间的发布订阅模式。 |
| [**工作流**]({{% ref "workflow-overview" %}}) | `/v1.0/workflow` | 工作流 API 使你能够使用 Dapr 工作流定义跨越多个微服务的长时间运行、持久化的流程或数据流。工作流 API 可以与其他 Dapr API 构建块结合使用。例如，工作流可以使用服务调用调用其他服务或获取密钥，提供灵活性和可移植性。 |
| [**状态管理**]({{% ref "state-management-overview" %}}) | `/v1.0/state` | 应用程序状态是指应用程序希望超越单个会话保留的任何内容。Dapr 提供了基于键值的状态和查询 API，并使用可插拔的状态存储实现持久化。 |
| [**绑定**]({{% ref "bindings-overview" %}}) | `/v1.0/bindings` | 绑定提供了与外部云/本地服务或系统的双向连接。Dapr 允许你通过 Dapr 绑定 API 调用外部服务，也允许你的应用程序被所连接服务发送的事件触发。 |
| [**Actors**]({{% ref "actors-overview" %}}) | `/v1.0/actors` | Actor 是一个隔离的、独立计算的单元，具有单线程执行。Dapr 提供基于虚拟 Actor 模式实现的 Actor，具有单线程编程模型，且 Actor 在不使用时会被垃圾回收。 |
| [**密钥**]({{% ref "secrets-overview" %}}) | `/v1.0/secrets` | Dapr 提供了密钥构建块 API，并与密钥存储（如公共云存储、本地存储和 Kubernetes）集成来存储密钥。服务可以调用密钥 API 来检索密钥，例如获取数据库的连接字符串。 |
| [**配置**]({{% ref "configuration-api-overview" %}}) | `/v1.0/configuration` | 配置 API 使你能够从支持的配置存储中检索和订阅应用程序配置项。这使应用程序能够检索特定的配置信息，例如在启动时或在存储中进行配置更改时。 |
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}}) | `/v1.0-alpha1/lock` | 分布式锁 API 使你能够获取资源的锁，以便应用程序的多个实例可以访问资源而不会发生冲突并提供一致性保证。 |
| [**加密**]({{% ref "cryptography-overview" %}}) | `/v1.0-alpha1/crypto` | 加密 API 使你能够执行加密操作（如消息加密和解密），而不会将密钥暴露给你的应用程序。 |
| [**作业**]({{% ref "jobs-overview" %}}) | `/v1.0-alpha1/jobs` | 作业 API 使你能够调度和编排作业。示例场景包括：<ul><li>调度批处理作业在每个工作日运行</li><li>调度各种维护脚本执行清理</li><li>调度 ETL 作业在特定时间（每小时、每天）运行，以获取新数据、处理数据并用最新信息更新数据仓库。</li></ul> |
| [**对话**]({{% ref "conversation-overview" %}}) | `/v1.0-alpha2/conversation` | 对话 API 使你能够提供提示词以与不同的大语言模型（LLM）对话，并包含提示词缓存、响应格式化、使用量指标和个人身份信息（PII）混淆等功能。 |
