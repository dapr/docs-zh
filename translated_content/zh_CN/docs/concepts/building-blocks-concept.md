---
type: docs
title: "building block"
linkTitle: "building block"
weight: 200
description: "通过标准 HTTP 或 gRPC API 访问的模块化最佳实践"
---

[building block]({{% ref building-blocks %}})是一个可以从代码调用的 HTTP 或 gRPC API，并使用一个或多个 Dapr component。Dapr 由一组 API building blocks 组成，并可扩展以添加新的 building block。Dapr 的 API building blocks：
- 解决构建弹性微服务应用程序时的常见挑战
- 将最佳实践和模式编码为规范

下图展示了 building block 如何使用 component 实现 building block 的能力，并暴露由你的代码调用的公共 API。

{{< diagram name="building-blocks-concept" width="75" >}}

Dapr 提供以下 building blocks：

{{< diagram building-blocks >}}

| building block | 端点 | 描述 |
|----------------|----------|-------------|
| [**workflow**]({{% ref "workflow-overview" %}}) | `/v1.0/workflow` | Dapr 的持久执行引擎。workflow API 使你能够定义跨多个微服务的长时间运行的持久化流程或数据流，并确保每个步骤即使遇到崩溃、重启和中断也能运行完成。workflow 历史记录可以[经过加密签名和验证]({{% ref "workflow-history-signing.md" %}})，从而使执行过程具有防篡改性且可审计。workflow API 可以与其他 Dapr API building blocks 结合使用。例如，workflow 可以通过 service invocation 调用另一个服务或检索密钥，从而提供灵活性和可移植性。
| [**服务到服务调用**]({{% ref "service-invocation-overview" %}}) | `/v1.0/invoke` | service invocation 使应用程序能够通过已知端点相互通信，并以 http 或 gRPC 消息的形式传递信息。Dapr 提供的端点兼具反向代理和内置服务发现的功能，同时利用内置的分布式跟踪和错误处理。
| [**发布和订阅**]({{% ref "pubsub-overview" %}}) | `/v1.0/publish` `/v1.0/subscribe`| pub/sub 是一种松耦合的消息传递模式，发送者（或发布者）向主题发布消息，订阅者则订阅该主题。Dapr 支持应用程序之间的 pub/sub 模式。
| [**State Management**]({{% ref "state-management-overview" %}}) | `/v1.0/state` | 应用程序状态是应用程序希望在单次会话结束后继续保留的任何内容。Dapr 提供基于键/值的状态和 Query API，并支持可插拔的 state store 以实现持久化。
| **Binary Store** | `/v1.0-alpha1/binarystore` | Binary Store API 使你能够使用可插拔的存储 component 存储、检索和删除二进制文件。上传和下载会以流的形式进行，不会在 Dapr sidecar 中缓冲整个文件。
| [**绑定**]({{% ref "bindings-overview" %}}) | `/v1.0/bindings` | 绑定提供与外部云端或本地服务、系统的双向连接。Dapr 允许你通过 Dapr 绑定 API 调用外部服务，也允许应用程序由连接的服务发送的事件触发。
| [**Actors**]({{% ref "actors-overview" %}}) | `/v1.0/actors` | Actor 是一个隔离、独立的计算和状态单元，以单线程方式执行。Dapr 提供基于 virtual Actor 模式的 Actor 实现，该模式提供单线程编程模型，并在 Actor 不再使用时对其进行垃圾回收。
| [**密钥**]({{% ref "secrets-overview" %}}) | `/v1.0/secrets` | Dapr 提供密钥 building block API，并与公共云存储、本地存储和 Kubernetes 等密钥存储集成以存储密钥。服务可以调用密钥 API 来检索密钥，例如获取数据库连接字符串。
| [**配置**]({{% ref "configuration-api-overview" %}}) | `/v1.0/configuration` | Configuration API 使你能够检索和订阅受支持的配置存储中的应用程序配置项。借助此 API，应用程序可以检索特定的配置信息，例如在启动时或存储中的配置发生变化时获取这些信息。
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}}) | `/v1.0-alpha1/lock` | 分布式锁 API 使你能够锁定资源，以便应用程序的多个实例可以无冲突地访问该资源，并获得一致性保证。
| [**密码学**]({{% ref "cryptography-overview" %}}) | `/v1.0-alpha1/crypto` | 密码学 API 使你能够执行加密操作，例如加密和解密消息，而无需向应用程序暴露密钥。
| [**job**]({{% ref "jobs-overview" %}}) | `/v1.0/jobs` | Jobs API 使你能够调度和编排 job。示例场景包括：<ul><li>调度批处理 job，使其在每个工作日运行</li><li>调度各种维护脚本以执行清理</li><li>调度 ETL job，使其在特定时间（每小时或每天）运行，以获取新数据、处理数据，并使用最新信息更新数据仓库。</li></ul>
| [**对话**]({{% ref "conversation-overview" %}}) | `/v1.0-alpha2/conversation` | conversation API 使你能够提供提示，与不同的大语言模型（LLM）进行对话，并包含提示缓存、响应格式化、使用指标和个人身份信息（PII）混淆等功能。
| [**搜索**]({{% ref "search-overview" %}}) | `/v1.0-alpha1/search` | Search API 使你能够使用便携式查询、筛选、排序和分页模型，在全文搜索引擎中索引、检索和查询 JSON 文档。
| [**向量**]({{% ref "vector-overview" %}}) | `/v1.0-alpha1/vector` | 向量 API 使你能够在向量数据库中存储预先嵌入的向量，并结合 metadata 筛选执行相似性查询，适用于检索增强生成（RAG）和语义搜索等用例。
