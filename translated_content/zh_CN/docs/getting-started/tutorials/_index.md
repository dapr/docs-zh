---
type: docs
title: "Dapr 教程"
linkTitle: "Dapr 教程"
weight: 70
description: "通过深入示例了解如何使用 Dapr 概念"
no_list: true
---

既然您已经初始化了 Dapr 并尝试了 Dapr 的一些构建块，请浏览我们更详细的教程。

#### 开始之前

- [设置本地 Dapr 环境]({{% ref "install-dapr-cli.md" %}})。
- [通过快速入门探索 Dapr 的构建块]({{% ref "getting-started/quickstarts/_index.md" %}})。

## 教程

感谢我们庞大的 Dapr 社区，我们在 Dapr 文档和 [GitHub 仓库](https://github.com/dapr/quickstarts)上提供教程。

| Dapr 文档教程               | 描述                                                                                                                                                                                    |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [定义组件]({{% ref get-started-component.md %}})       | 创建组件定义文件以与 Secrets 构建块交互。
| [配置状态与发布订阅]({{% ref configure-state-pubsub.md %}}) | 为 Dapr 配置状态存储和发布订阅消息代理组件。

| GitHub 教程               | 描述                                                                                                                                                                                    |
|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Hello World](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world)            | *推荐* <br> 演示如何本地运行 Dapr。重点展示服务调用和状态管理。  |
| [Hello World Kubernetes](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)       | *推荐* <br> 演示如何在 Kubernetes 中运行 Dapr。重点展示服务调用和状态管理。  |
| [Distributed Calculator](https://github.com/dapr/quickstarts/tree/master/tutorials/distributed-calculator) | 演示一个分布式计算器应用程序，使用 Dapr 服务驱动 React Web 应用。重点展示多语言编程、服务调用和状态管理。 |
| [Pub/Sub](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub)                | 演示如何使用 Dapr 启用发布订阅应用程序。使用 Redis 作为发布订阅组件。  |
| [Bindings](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings)            | 演示如何使用 Dapr 创建与其他组件的输入和输出绑定。使用与 Kafka 的绑定。                                                                            |
| [Observability](https://github.com/dapr/quickstarts/tree/master/tutorials/observability) | 演示 Dapr 追踪能力。使用 Zipkin 作为追踪组件。 |
| [Secret Store](https://github.com/dapr/quickstarts/tree/master/tutorials/secretstore) | 演示使用 Dapr Secrets API 访问密钥存储。 |
