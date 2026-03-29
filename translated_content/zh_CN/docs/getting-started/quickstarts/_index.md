---
type: docs
title: "Dapr 快速入门"
linkTitle: "Dapr 快速入门"
weight: 70
description: "通过旨在帮助您快速上手 Dapr 的代码示例，尝试 Dapr 快速入门"
no_list: true
---

通过我们的 Dapr 快速入门快速上手，其中包含旨在帮助您快速上手 Dapr 的代码示例。

{{% alert title="注意" color="primary" %}}
 每个版本都会为 API 和 SDK 添加新的快速入门示例。您也可以通过 [教程]({{% ref "getting-started/tutorials/_index" %}}) 探索 Dapr。

{{% /alert %}}

#### 开始之前

- [设置本地 Dapr 环境]({{% ref "install-dapr-cli" %}})。

## 快速入门

| 快速入门 | 描述 |
| ----------- | ----------- |
| [服务调用]({{% ref serviceinvocation-quickstart %}}) | 使用 HTTP 或 gRPC 在两个服务之间进行同步通信。 |
| [发布订阅]({{% ref pubsub-quickstart %}}) |  使用消息在两个服务之间进行异步通信。 |
| [工作流]({{% ref workflow-quickstart %}}) | 在长期运行的、容错的、有状态的应用程序中编排业务工作流活动。 |
| [Agents]({{% ref dapr-agents-quickstarts.md %}}) | 构建 LLM 驱动的自主代理应用程序。 |
| [状态管理]({{% ref statemanagement-quickstart %}}) | 将服务的数据以键/值对的形式存储在支持的状态存储中。 |
| [Bindings]({{% ref bindings-quickstart %}}) | 使用输入绑定响应事件，使用输出绑定调用操作，从而与外部系统交互。 |
| [Actors]({{% ref actors-quickstart %}}) | 运行微服务和简单的控制台客户端，演示 Dapr Actors 中的有状态对象模式。 |
| [Secrets Management]({{% ref secrets-quickstart %}}) | 安全地获取密钥。 |
| [Configuration]({{% ref configuration-quickstart %}}) | 获取配置项并订阅配置更新。 |
| [Resiliency]({{% ref resiliency %}}) | 为您的 Dapr API 请求定义并应用容错策略。 |
| [Cryptography]({{% ref cryptography-quickstart %}}) | 使用 Dapr 的密码学 API 加密和解密数据。 |
| [Jobs]({{% ref jobs-quickstart %}}) | 使用 Dapr 的 Jobs API 计划、检索和删除作业。 |
| [Conversation]({{% ref conversation-quickstart %}}) | 安全可靠地与大语言模型（LLM）交互。 |
