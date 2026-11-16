---
type: docs
title: "操作指南：在 .NET SDK 中创建和使用 Dapr AI 对话"
linkTitle: "操作指南：使用 AI 对话客户端"
weight: 50010
description: 了解如何使用 .NET SDK 创建和使用 Dapr 对话式 AI 客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

{{% alert title="对 .NET 版本的支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者都将在 Dapr v1.20 中停止支持；只有 .NET 10 和 .NET 11 将支持到 2027 年底。
{{% /alert %}}

要开始使用 Dapr AI .NET SDK 客户端，请从 NuGet 安装 [Dapr.AI 包](https://www.nuget.org/packages/Dapr.AI)：
```sh
dotnet add package Dapr.AI
```

本指南面向 SDK `1.19.0` 或更高版本。请配置对话组件及其模型提供方的凭据。导入 `Dapr.AI.Conversation` 和 `Dapr.AI.Conversation.Extensions`。该 API 为实验性功能（`DAPR_CONVERSATION`）。

`DaprConversationClient` 以 TCP 套接字的形式维护网络资源的访问，用于与 Dapr 边车通信。

### 依赖注入

`AddDaprConversationClient()` 方法通过依赖注入注册客户端，是使用此包的推荐方式。该方法接受一个可选的选项委托，用于配置 `DaprConversationClient`，还接受一个 `ServiceLifetime` 参数，允许你为注册的服务指定不同于默认值 `Singleton` 的生命周期。

以下示例假定所有默认值均可接受，足以注册 `DaprConversationClient`：

```csharp
services.AddDaprConversationClient();
```

可选的配置委托用于通过在 `DaprConversationClientBuilder` 上指定选项来配置 `DaprConversationClient`，如下例所示：
```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprConversationClient((serviceProvider, clientBuilder) => {
     //注入一个服务以从中获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     //在客户端构建器上配置该值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化
除了使用依赖注入，也可以使用静态客户端构建器来构建 `DaprConversationClient`。

为获得最佳性能，请创建一个长期存活的 `DaprConversationClient` 实例，并在整个应用程序中共享访问该实例。`DaprConversationClient` 实例是线程安全的，设计上就是用于共享的。

避免为每次操作都创建一个 `DaprConversationClient`。

可以在调用 `.Build()` 创建客户端之前，通过调用 `DaprConversationClientBuilder` 类的方法来配置 `DaprConversationClient`。每个 `DaprConversationClient` 的设置相互独立，调用 `.Build()` 之后无法再更改。

```csharp
var daprConversationClient = new DaprConversationClientBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .Build();
```

有关通过构建器配置 Dapr 客户端时可用选项的更多信息，请参阅 .NET [文档]({{% ref dotnet-client %}})。

## 试用
测试 Dapr AI .NET SDK。浏览示例，查看 Dapr 的实际效果：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 存储库以试用一些示例并开始使用。 |

## 构建块

.NET SDK 的这一部分允许你与对话 API 交互，以向大语言模型发送消息并接收其回复。

关于消息角色、选项、响应结构、缓存和令牌用量，请参阅 [对话请求与响应]({{< ref dotnet-ai-conversation-usage.md >}})；关于应用程序管理的工具调用周期，请参阅 [工具调用]({{< ref dotnet-ai-conversation-tools.md >}})。
