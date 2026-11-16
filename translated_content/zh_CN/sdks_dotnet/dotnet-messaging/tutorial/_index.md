---
type: docs
title: "教程：通过示例学习 Dapr.Messaging"
linkTitle: "教程"
weight: 160000
description: "一个由七部分组成的教程，介绍如何使用 Dapr.Messaging .NET SDK 发布和订阅消息，包括单元测试与集成测试"
---

本教程使用 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging) 中可运行的示例，演示 `Dapr.Messaging` 的主要功能。每个部分都包含实现模式，以及相应的单元测试和集成测试方法。

示例支持 .NET 8、.NET 9、.NET 10 或 .NET 11，并且需要 Dapr 运行时 1.18 或更高版本。单元测试无需 Dapr、Docker 或消息代理即可运行。集成测试使用 `Dapr.Testcontainers` 运行真实的 Dapr 边车和 Redis 发布订阅组件，这是在应用中验证投递行为的推荐方式。

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。两者的支持都将在 Dapr v1.20 中移除；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

## 教程内容

- [第 1 部分：发布事件]({{< ref dotnet-messaging-tutorial-publishing.md >}})：类型化事件、CloudEvent 元数据、批量发布和原始负载。
- [第 2 部分：声明式流式订阅]({{< ref dotnet-messaging-tutorial-streaming.md >}})：源生成的处理程序，并明确区分成功、重试和丢弃的确认。
- [第 3 部分：基于内容的路由与死信主题]({{< ref dotnet-messaging-tutorial-routing.md >}})：CEL 匹配规则、优先级、元数据和死信处理。
- [第 4 部分：批量订阅]({{< ref dotnet-messaging-tutorial-bulk.md >}})：通过有界的批大小和等待时长实现高吞吐量投递。
- [第 5 部分：gRPC AppCallback 推送]({{< ref dotnet-messaging-tutorial-appcallback.md >}})：面向暴露 gRPC 端口的应用，由边车发起的 gRPC 投递。
- [第 6 部分：HTTP 推送订阅]({{< ref dotnet-messaging-tutorial-http.md >}})：生成的 `/dapr/subscribe` 发现机制与自定义 HTTP 路由。
- [第 7 部分：动态流式订阅]({{< ref dotnet-messaging-tutorial-dynamic.md >}})：命令式的运行时订阅，具有监督、取消和重连行为。

## 测试模式

将消息处理决策放在普通的 C# 处理程序中，以便直接对其进行测试。示例中的单元测试会构造 `TopicContext`，调用 `HandleAsync`，并断言针对有效、无效和瞬时输入返回的 `TopicResponseAction`。

为基础设施边界添加集成测试。示例会创建 `PubSubHarness`，将应用配置为使用测试工具动态分配的 Dapr 端点，发布真实事件，并等待可观察的处理结果。验证异步投递时，请使用有界超时、`IAsyncLifetime` 清理以及测试日志接收器，而不要只依赖 sleep。

## 前提条件

- [.NET SDK](https://dotnet.microsoft.com/download) 8、9、10 或 11
- [Dapr CLI]({{< ref install-dapr-cli.md >}}) 以及 Dapr 环境
- Dapr 运行时 1.18 或更高版本，用于流式订阅
- Docker 或其他容器运行时，用于集成测试
- `Dapr.Messaging` 包

直接使用 SDK 仓库时，示例会引用本地的 SDK 项目。在应用中，请改为安装已发布的 `Dapr.Messaging` 包。
