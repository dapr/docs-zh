---
type: docs
title: "操作指南：在 .NET SDK 中创建和使用 Dapr AI 会话"
linkTitle: "操作指南：使用 AI 会话客户端"
weight: 50010
description: 了解如何使用 .NET SDK 创建和使用 Dapr 会话式 AI 客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

要开始使用 Dapr AI .NET SDK 客户端，请从 NuGet 安装 [Dapr.AI 包](https://www.nuget.org/packages/Dapr.AI)：
```sh
dotnet add package Dapr.AI
```

`DaprConversationClient` 维护对用于与 Dapr 边车通信的 TCP 套接字形式的网络资源的访问。

### 依赖注入

`AddDaprAiConversation()` 方法会将 Dapr 客户端注册到 ASP.NET Core 依赖注入容器中，这是使用此包的推荐方式。此方法接受一个可选的选项委托来配置 `DaprConversationClient`，以及一个 `ServiceLifetime` 参数，允许您为注册的服务指定不同的生命周期，而不是默认的 `Singleton` 值。

以下示例假定所有默认值都可以接受，足以注册 `DaprConversationClient`：

```csharp
services.AddDaprAiConversation();
```

可选的配置委托用于通过在 `DaprConversationClientBuilder` 上指定选项来配置 `DaprConversationClient`，如下例所示：
```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprAiConversation((serviceProvider, clientBuilder) => {
     //注入一个服务以从中获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     //在客户端构建器上配置值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化
除了使用依赖注入，也可以使用静态客户端构建器来构建 `DaprConversationClient`。

为了获得最佳性能，请创建一个单一的长期存活的 `DaprConversationClient` 实例，并在整个应用程序中提供对该共享实例的访问。`DaprConversationClient` 实例是线程安全的，旨在共享使用。

避免为每次操作创建一个 `DaprConversationClient`。

可以通过在调用 `.Build()` 创建客户端之前，在 `DaprConversationClientBuilder` 类上调用方法来配置 `DaprConversationClient`。每个 `DaprConversationClient` 的设置是独立的，在调用 `.Build()` 后无法更改。

```csharp
var daprConversationClient = new DaprConversationClientBuilder()
    .UseJsonSerializerSettings( ... ) //配置 JSON 序列化器
    .Build();
```

有关通过构建器配置 Dapr 客户端时可用选项的更多信息，请参阅 .NET [文档]({{% ref dotnet-client %}})。

## 试用
测试 Dapr AI .NET SDK。浏览示例以查看 Dapr 的实际效果：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 存储库以试用一些示例并开始使用。 |

## 构建块

.NET SDK 的这一部分允许您与会话 API 交互，以从大型语言模型发送和接收消息。
