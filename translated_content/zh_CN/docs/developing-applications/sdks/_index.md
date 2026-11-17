---
type: docs
title: "Dapr 软件开发工具包（SDK）"
linkTitle: "SDK"
weight: 20
description: "使用你喜欢的语言与 Dapr 一起工作"
no_list: true
---

Dapr SDK 是将 Dapr 集成到应用程序的最简单方式。选择你喜欢的语言，几分钟内即可上手使用 Dapr。

## SDK 包

选择下方的[你偏好的语言]({{% ref "#sdk-languages" %}})，以了解更多关于客户端、服务端、Actor 和 workflow 包的信息。 

- **客户端（Client）**：Dapr 客户端允许你调用 Dapr building block API 并执行各 building block 的操作
- **服务扩展（Server extensions）**：Dapr 服务扩展允许你创建可被其他服务调用并可订阅主题的服务
- **Actor**：Dapr Actor SDK 允许你构建包含方法、状态、timer 和持久化 reminder 的 virtual Actor
- **workflow（Workflow）**：Dapr Workflow 让你能够以可靠的方式轻松编写长时间运行的业务逻辑和集成

## SDK 支持的语言

| 语言 | 状态 | 客户端 | 服务扩展 | Actor | workflow |
|----------|:------|:----------:|:-----------:|:---------:|:---------:|
| [.NET]({{% ref dotnet %}}) | Stable（稳定） | ✔ |  [ASP.NET Core](https://github.com/dapr/dotnet-sdk/tree/master/examples/AspNetCore) | ✔ | ✔ |
| [Python]({{% ref python %}}) | Stable（稳定） | ✔ | [gRPC]({{% ref python-grpc.md %}}) <br />[FastAPI]({{% ref python-fastapi.md %}})<br />[Flask]({{% ref python-flask.md %}})| ✔ | ✔ |
| [Java]({{% ref java %}}) | Stable（稳定） | ✔ | Spring Boot  <br /> Quarkus| ✔ | ✔ |
| [Go]({{% ref go %}}) | Stable（稳定） | ✔ | ✔ | ✔ | ✔ |
| [PHP]({{% ref php %}}) | Stable（稳定） | ✔ | ✔ | ✔ | |
| [JavaScript]({{% ref js %}}) | Stable（稳定）| ✔ | | ✔ | ✔  |
| [C++](https://github.com/dapr/cpp-sdk) | In development | ✔ | | |
| [Rust]({{% ref rust %}}) | In development | ✔ | | ✔ | |


## 框架

| 框架                              | 语言              | 状态         |    描述    |
|----------------------------------------|:----------------------|:---------------|:-----------------:|
| [Dapr Agents]({{% ref "../../developing-ai/dapr-agents" %}}) | Python | In development | 一个用于构建由大型语言模型 (LLM) 驱动的自主代理的框架，该框架利用 Dapr 的分布式系统能力实现持久执行，并内置安全性、可观测性和 State Management。 |

## 延伸阅读

- [Dapr SDK 中的序列化]({{% ref sdk-serialization.md %}})
