---
type: docs
title: "Dapr Messaging in the .NET SDK"
linkTitle: "Messaging"
weight: 220000
description: ".NET 统一 Dapr Messaging SDK（Dapr.Messaging）概览"
---

`Dapr.Messaging` 是面向 .NET 的统一 Dapr 发布订阅（Publish/Subscribe）消息 SDK。它将 Dapr 发布订阅的所有功能模式（事件发布、流式拉取订阅、编程式 gRPC 推送订阅和 HTTP 订阅）整合到一个现代化的包系列中。

与其将发布订阅分散在 `Dapr.Client` 和 `Dapr.AspNetCore` 之间，`Dapr.Messaging` 提供了一个清晰、内聚的编程模型，它建立在现代 .NET 基础之上：使用 Roslyn 源生成器实现无反射分发、编译期 Roslyn 分析器，以及标准的 `Microsoft.Extensions.Options` 模式。

{{% alert title="统一包架构" color="primary" %}}
`Dapr.Messaging` 是一个元包（meta-package），它将运行时客户端（`Dapr.Messaging.Runtime`）、核心抽象（`Dapr.Messaging.Abstractions`）、源生成器（`Dapr.Messaging.Generators`）和 Roslyn 分析器（`Dapr.Messaging.Analyzers`）整合到单个包引用中：

```xml
<ItemGroup>
  <PackageReference Include="Dapr.Messaging" Version="..." />
</ItemGroup>
```
{{% /alert %}}

## 变更内容

Dapr .NET SDK 最初将消息传递能力分散在多个包中：`Dapr.Client` 提供基本的发布方法和动态流式拉取方法，而 `Dapr.AspNetCore` 则通过 HTTP 端点处理基于控制器和最小 API 的推送订阅。

`Dapr.Messaging` 统一并现代化了这一架构：

1. **统一的发布与订阅**：使用 `IDaprPublishSubscribeClient` 发布事件（包括单个事件、原始字节流和批量发布），并使用单一的 `ITopicHandler<TMessage>` 接口编写订阅者。
2. **三种统一的投递模式**：订阅支持 `DeliveryMode.Streaming`（通过 gRPC 的流式订阅）、`DeliveryMode.Programmatic`（通过 gRPC 推送的编程式订阅）和 `DeliveryMode.Http`（通过 `/dapr/subscribe` 的声明式订阅），全部通过同一个 `[DaprTopic]` 特性进行配置。
3. **源生成器消除反射**：`Dapr.Messaging.Generators` 源生成器在编译期检查 `[DaprTopic]` 处理程序，并生成类型化的分发器、订阅者注册表和依赖注入连接代码。调用路径上不执行任何运行时反射或运行时代码生成。
4. **AOT 与裁剪注意事项**：处理程序发现和分发注册在编译期生成，但当前生成的订阅者分发器使用运行时 `System.Text.Json` 元数据。Native AOT 和裁剪场景需要针对目标 SDK 版本进行明确验证。
5. **Roslyn 分析器与诊断**：SDK 包含编译期分析器（`DAPR1610`–`DAPR1617`），在你编写代码时即可在 IDE 中捕获错误配置：
   - **`DAPR1610`（警告）**：同一主题上的投递模式冲突。
   - **`DAPR1611`（错误）**：`[DaprTopic]` 类未实现 `ITopicHandler<TMessage>`。
   - **`DAPR1612`（警告）**：Native AOT 编译中未注册的消息类型。
   - **`DAPR1613`（警告）**：编程式订阅缺少 `app.MapDaprMessaging()`（附带代码修复）。
   - **`DAPR1614`（警告）**：直接调用内部的 `DaprMessagingRegistration`。
   - **`DAPR1615`（警告）**：存在端点映射，但没有匹配的主题订阅者。
   - **`DAPR1616`（警告）**：启用了 `[DaprTopic]` 功能，但缺少配套属性。
   - **`DAPR1617`（警告）**：对于所选的投递模式或功能，`[DaprTopic]` 属性被忽略。
6. **标准选项与简化的依赖注入**：使用 `IOptions<DaprMessagingOptions>` 和单个 `services.AddDaprMessaging()` 方法，该方法在一次原子操作中注册选项、发布客户端、源生成的订阅者分发器以及所需的托管服务。

## 与旧版发布订阅方法的比较

| 能力 | 旧版（`Dapr.Client` / `Dapr.AspNetCore`） | 现代版（`Dapr.Messaging`） |
| --- | --- | --- |
| 包结构 | 分散在 `Dapr.Client` 和 `Dapr.AspNetCore` 中 | 单一的统一元包 `Dapr.Messaging` |
| 发布客户端 | `DaprClient.PublishEventAsync` | 专用的 `IDaprPublishSubscribeClient` / `DaprPublishSubscribeClient` |
| 批量发布 | `DaprClient.BulkPublishEventAsync` | `IDaprPublishSubscribeClient.BulkPublishEventAsync`，使用类型化的 `BulkPublishEntry<T>` |
| 订阅模型 | 控制器特性（`[Topic]`）或最小 API 端点 | 使用 `[DaprTopic]` 装饰的统一 `ITopicHandler<TMessage>` 处理程序 |
| 投递模式 | 流式 gRPC 与 HTTP 各自有独立实现 | 通过 `DeliveryMode`（`Streaming`、`Programmatic`、`Http`）配置 |
| 流式拉取订阅 | 仅限命令式客户端调用 | 同时支持声明式 `[DaprTopic(Delivery = DeliveryMode.Streaming)]` 和命令式 `SubscribeAsync` |
| 分发机制 | 运行时反射 / MVC 操作调用器 | 源生成的类型化分发器（`AddDaprMessaging`） |
| Native AOT 与裁剪 | 不支持 | 需要显式验证 |
| 编译期分析器 | 无 | 内置 Roslyn 分析器和代码修复（`DAPR16xx`） |
| 配置 | 自定义构建器方法 | 标准 `Microsoft.Extensions.Options` 模式（`DaprMessagingOptions`） |
| CloudEvents 支持 | 手动反序列化或控制器绑定 | 强类型的 `CloudEvent`、`CloudEvent<TData>` 和 `TopicContext.CloudEvent` |

## 核心概念

- **[教程：按示例学习 Dapr.Messaging]({{< ref "tutorial/_index.md" >}})**：涵盖发布、流式处理、路由、批量订阅、gRPC 推送、HTTP 推送、动态流式处理及其单元测试和集成测试模式的七个可运行示例。
- **[发布事件操作指南]({{< ref dotnet-messaging-publish-howto.md >}})**：逐步指南，介绍如何使用 `IDaprPublishSubscribeClient` 发布 JSON 事件、CloudEvents、原始负载和批量消息。
- **[订阅主题操作指南]({{< ref dotnet-messaging-subscribe-howto.md >}})**：逐步指南，介绍如何编写 `ITopicHandler<TMessage>` 订阅者、使用 `[DaprTopic]` 选择投递模式、编译期源生成、动态流式订阅以及编译器诊断。
- **[配置与使用指南]({{< ref dotnet-messaging-pubsub-usage.md >}})**：生命周期管理、依赖注入选项配置、高级功能（批量发布订阅、死信主题、CEL 路由），以及 AOT 与裁剪注意事项。

## 后续步骤

- [教程：按示例学习 Dapr.Messaging]({{< ref "tutorial/_index.md" >}})
- [操作指南：使用 IDaprPublishSubscribeClient 发布事件]({{< ref dotnet-messaging-publish-howto.md >}})
- [操作指南：创建订阅并处理主题消息]({{< ref dotnet-messaging-subscribe-howto.md >}})
- [Dapr Messaging 配置与使用参考]({{< ref dotnet-messaging-pubsub-usage.md >}})
- [Dapr 发布订阅构建块概览]({{% ref pubsub-overview %}})
