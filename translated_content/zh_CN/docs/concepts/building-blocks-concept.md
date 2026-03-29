---
type: docs
title: "构建块"
linkTitle: "构建块"
weight: 200
description: "通过标准 HTTP 或 gRPC API 访问的模块化最佳实践"
---

[构建块]({{% ref building-blocks %}})是一个可以从代码调用的 HTTP 或 gRPC API，使用一个或多个 Dapr 组件。Dapr 由一组 API 构建块组成，具有可扩展性以添加新的构建块。Dapr 的构建块：
- 解决构建弹性微服务应用程序时的常见挑战
- 将最佳实践和模式编码化

下图展示了构建块如何暴露由代码调用的公共 API，并使用组件来实现构建块的能力。

<img src="/images/concepts-building-blocks.png" width=250>

Dapr 提供以下构建块：

<img src="/images/building_blocks.png" width=1200>

| 构建块 | 端点 | 描述 |
|----------------|----------|-------------|
| [**服务调用**]({{% ref "service-invocation-overview" %}}) | `/v1.0/invoke` | 服务调用使应用程序能够通过 http 或 gRPC 消息形式的已知端点相互通信。Dapr 提供的端点充当内置服务发现的反向代理组合，同时利用内置的分布式跟踪和错误处理。
| [**发布订阅**]({{% ref "pubsub-overview" %}}) | `/v1.0/publish` `/v1.0/subscribe`|  发布订阅是一种松耦合的消息传递模式，发送者（或发布者）将消息发布到主题，订阅者订阅该主题。Dapr 支持应用程序之间的发布订阅模式。
| [**工作流**]({{% ref "workflow-overview" %}}) | `/v1.0/workflow` | 工作流 API 使您能够使用 Dapr 工作流定义跨多个微服务的长时间运行的持久化进程或数据流。工作流 API 可以与其他 Dapr API 构建块结合使用。例如，工作流可以通过服务调用调用另一个服务或检索密钥，提供灵活性和可移植性。
| [**状态管理**]({{% ref "state-management-overview" %}}) | `/v1.0/state` | 应用程序状态是应用程序希望在单个会话之外保留的任何内容。Dapr 提供基于键/值的状态和查询 API，并带有可插拔的状态存储用于持久化。
| [**绑定**]({{% ref "bindings-overview" %}}) | `/v1.0/bindings` | 绑定提供与外部云/本地服务或系统的双向连接。Dapr 允许您通过 Dapr 绑定 API 调用外部服务，并允许您的应用程序被连接的服务发送的事件触发。
| [**Actor**]({{% ref "actors-overview" %}}) | `/v1.0/actors` |  Actor 是一个隔离的、独立的计算和状态单元，具有单线程执行。Dapr 提供基于虚拟 Actor 模式的 Actor 实现，该模式提供单线程编程模型，并且 Actor 在不使用时会被垃圾回收。
| [**密钥**]({{% ref "secrets-overview" %}}) | `/v1.0/secrets` | Dapr 提供密钥构建块 API，并与密钥存储集成（如公共云存储、本地存储和 Kubernetes）来存储密钥。服务可以调用密钥 API 来检索密钥，例如获取数据库的连接字符串。
| [**配置**]({{% ref "configuration-api-overview" %}}) | `/v1.0/configuration` | 配置 API 使您能够检索和订阅支持的配置存储的应用程序配置项。这使应用程序能够检索特定的配置信息，例如在启动时或在存储中进行配置更改时。
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}}) | `/v1.0-alpha1/lock` | 分布式锁 API 使您能够对资源加锁，以便应用程序的多个实例可以无冲突地访问资源并提供一致性保证。
| [**密码学**]({{% ref "cryptography-overview" %}}) | `/v1.0-alpha1/crypto` | 密码学 API 使您能够执行加密操作，例如加密和解密消息，而无需向应用程序暴露密钥。
| [**作业**]({{% ref "jobs-overview" %}}) | `/v1.0-alpha1/jobs` | 作业 API 使您能够调度和编排作业。示例场景包括：<ul><li>调度批处理作业在每个工作日运行</li><li>调度各种维护脚本执行清理</li><li>调度 ETL 作业在特定时间（每小时、每天）运行以获取新数据、处理新数据，并用最新信息更新数据仓库。</li></ul>
| [**对话**]({{% ref "conversation-overview" %}}) | `/v1.0-alpha2/conversation` | 对话 API 使您能够提供提示以与不同的大语言模型（LLM）对话，并包含提示缓存、响应格式化、使用指标和个人身份信息（PII）脱敏等功能。
