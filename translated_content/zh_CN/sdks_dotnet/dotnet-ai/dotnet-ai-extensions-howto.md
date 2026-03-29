---
type: docs
title: "如何：在 Dapr 的 .NET Conversation SDK 中使用 Microsoft 的 AI 扩展"
linkTitle: "如何：在 Dapr 中使用 Microsoft 的 AI 扩展"
weight: 50020
description: 了解如何创建和使用结合 Microsoft AI 扩展的 Dapr
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

要开始使用此 SDK，请从 NuGet 安装 [Dapr.AI](https://www.nuget.org/packages/Dapr.AI) 和 
[Dapr.AI.Microsoft.Extensions](https://www.nuget.org/packages/Dapr.AI.Microsoft.Extensions) 包：
```sh
dotnet add package Dapr.AI
dotnet add package Dapr.AI.Microsoft.Extensions
```

`DaprChatClient` 是 `IChatClient` 接口的基于 Dapr 的实现，该接口由 
`Microsoft.Extensions.AI.Abstractions` 包提供，使用 Dapr 的[对话构建块]({{ ref conversation-overview.md }})。它允许
开发者针对 Microsoft 提供的抽象类型进行开发，同时提供与 Dapr 对话构建块的最大一致性。由于这两种方法都采用 OpenAI 的 API 方式，
预计它们在未来会日益趋同。

{{% alert title="Dapr 对话构建块" color="primary" %}}

请注意，Dapr 的对话构建块仍处于 alpha 状态，这意味着 API 的形状
可能会在未来版本中发生变化。此 SDK 包的目的是提供一个与 Microsoft 的 AI 扩展对齐且同时映射到并符合 Dapr API 的 API，
但类型和属性的名称可能会从一个版本更改为下一个版本，因此在使用此 SDK 时请注意这种可能性。

{{% /alert %}}

## 关于 Microsoft.Extensions.AI
`Dapr.AI.Microsoft.Extensions` 包实现了 `Microsoft.Extensions.AI` 抽象，为
.NET 应用程序中的 AI 服务提供统一的 API。`Microsoft.Extensions.AI` 旨在为
不同的 AI 提供商和场景提供一致的编程模型。有关 `Microsoft.Extensions.AI` 的详细信息，请参阅
[官方文档](https://learn.microsoft.com/dotnet/ai/microsoft-extensions-ai)。

{{% alert title="有限支持" color="warning" %}}

请注意，Microsoft 的 AI 扩展提供的属性和方法比 Dapr 的对话构建块当前
支持的要多得多。此包将仅映射那些具有 Dapr 支持的属性，而忽略其他属性，因此仅仅
它在 Microsoft.Extensions.AI 包中可用并不意味着 Dapr 支持它。请依赖此文档
和包中公开的 XML 文档来了解什么支持、什么不支持。

{{% /alert %}}

## 服务注册
可以使用多个扩展方法将 `DaprChatClient` 注册到依赖注入容器中。首先，
确保注册来自 NuGet 的 `Dapr.AI` 包中的 `DaprConversationClient`：

```csharp
services.AddDaprConversationClient();
```

然后使用您的对话组件名称注册 `DaprChatClient`：

```csharp
services.AddDaprChatClient("my-conversation-component");
```

### 配置选项
您可以通过 `DaprChatClientOptions` 配置 `DaprChatClient`，尽管当前实现仅
为组件名称本身提供配置。这预计在未来的版本中会发生变化。

```csharp
services.AddDaprChatClient("my-conversation-component", options => 
{
   // 在此处配置其他选项
});
```

您还可以配置服务生命周期（默认为 `ServiceLifetime.Scoped`）：

```csharp
services.AddDaprChatClient("my-conversation-component", ServiceLifetime.Singleton);
```

## 使用
注册后，您可以在您的服务中注入和使用 `IChatClient`：

```csharp
public class ChatService(IChatClient chatClient)
{
    public async Task<IReadOnlyList<string>> GetResponseAsync(string message)
    {
        var response = await chatClient.GetResponseAsync([
            new ChatMessage(ChatRole.User,
                "Please write me a poem in iambic pentameter about the joys of using Dapr to develop distributed applications with .NET")
            ]);
        
        return response.Messages.Select(msg => msg.Text).ToList();
    }
}
```

### 流式对话
`DaprChatClient` 尚不支持流式响应，使用相应的 `GetStreamingResponseAsync` 
方法将抛出 `NotImplemenetedException`。一旦 Dapr 运行时
支持此功能，这预计在未来的版本中会发生变化。

### 工具集成
客户端通过 `Microsoft.Extensions.AI` 工具集成支持函数调用。注册到对话的
工具将自动可供大语言模型使用。

```csharp
string GetCurrentWeather() => Random.Shared.NextDouble() > 0.5 ? "It's sunny today!" : "It's raining today!";
var toolChatOptions = new ChatOptions { Tools = [AIFunctionFactory.Create(GetCurrentWeather, "weather")] };
var toolResponse = await chatClient.GetResponseAsync("What's the weather like today?", toolChatOptions);
foreach (var toolResp in toolResponse.Messages)
{
    Console.WriteLine(toolResp);
}
```

## 错误处理
`DaprChatClient` 与 Dapr 的错误处理集成，并在发生问题时抛出适当的异常。

## 配置和元数据
底层的 Dapr 对话组件可以通过 Dapr 对话构建块配置来配置元数据和参数。
`DaprChatClient` 在调用对话组件时将遵循这些设置。

## 最佳实践

1. **服务生命周期**：为 `DaprChatClient` 注册使用 `ServiceLifetime.Scoped` 或 `ServiceLifetime.Singleton`，以避免不必要地创建多个实例。

2. **错误处理**：始终将调用包装在适当的 try-catch 块中，以处理 Dapr 特定和常规异常。

3. **资源管理**：`DaprChatClient` 通过其基类正确实现了 `IDisposable`，因此在使用依赖注入时会自动管理资源。

4. **配置**：正确配置您的 Dapr 对话组件以确保最佳性能和可靠性。

## 相关链接

- [Dapr 对话构建块]({{ ref conversation-overview.md }})
- [Microsoft.Extensions.AI 文档](https://learn.microsoft.com/dotnet/ai/microsoft-extensions-ai)
- [Dapr .NET Conversation SDK]({{% ref dotnet-ai-conversation-howto.md %}})
