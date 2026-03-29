---
type: docs
title: "Dapr 软件开发工具包（SDK）"
linkTitle: "SDK"
weight: 20
description: "使用您喜欢的语言与 Dapr 一起工作"
no_list: true
---

Dapr SDK 是将 Dapr 集成到应用程序的最简单方式。选择您喜欢的语言，几分钟内即可上手使用 Dapr。

## SDK 包

选择下方的[您偏好的语言]({{% ref "#sdk-languages" %}})，以了解更多关于客户端、服务端、Actor 和工作流包的信息。

- **客户端（Client）**：Dapr 客户端允许您调用 Dapr 构建块 API 并执行各构建块的操作
- **服务扩展（Server extensions）**：Dapr 服务扩展允许您创建可被其他服务调用并可订阅主题的服务
- **Actor**：Dapr Actor SDK 允许您构建包含方法、状态、定时器和持久化提醒的虚拟 Actor
- **工作流（Workflow）**：Dapr 工作流让您能够以可靠的方式轻松编写长时间运行的业务逻辑和集成

## SDK 支持的语言

| 语言 | 状态 | 客户端 | 服务扩展 | Actor | 工作流 |
|----------|:------|:----------:|:-----------:|:---------:|:---------:|
| [.NET]({{% ref dotnet %}}) | Stable | ✔ |  [ASP.NET Core](https://github.com/dapr/dotnet-sdk/tree/master/examples/AspNetCore) | ✔ | ✔ |
| [Python]({{% ref python %}}) | Stable | ✔ | [gRPC]({{% ref python-grpc.md %}}) <br />[FastAPI]({{% ref python-fastapi.md %}})<br />[Flask]({{% ref python-flask.md %}})| ✔ | ✔ |
| [Java]({{% ref java %}}) | Stable | ✔ | Spring Boot  <br /> Quarkus| ✔ | ✔ |
| [Go]({{% ref go %}}) | Stable | ✔ | ✔ | ✔ | ✔ |
| [PHP]({{% ref php %}}) | Stable | ✔ | ✔ | ✔ | |
| [JavaScript]({{% ref js %}}) | Stable| ✔ | | ✔ | ✔  |
| [C++](https://github.com/dapr/cpp-sdk) | In development | ✔ | | |
| [Rust]({{% ref rust %}}) | In development | ✔ | | ✔ | |


## 框架

| 框架                              | 语言              | 状态         |    描述    |
|----------------------------------------|:----------------------|:---------------|:-----------------:|
| [Dapr Agents]({{% ref "../../developing-ai/dapr-agents" %}}) | Python | In development | 一个用于构建由大语言模型（LLM）驱动的自主代理的框架，该框架利用 Dapr 的分布式系统能力实现可靠执行，并内置安全性、可观测性和状态管理。 |

## 延伸阅读

- [Dapr SDK 中的序列化]({{% ref sdk-serialization.md %}})
