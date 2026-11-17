---
type: docs
title: "如何：在 Dapr 的 .NET Conversation SDK 中使用 Microsoft 的 AI 扩展"
linkTitle: "如何：在 Dapr 中使用 Microsoft 的 AI 扩展"
weight: 50020
description: 了解如何创建和使用结合 Microsoft AI 扩展的 Dapr
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者都将在 Dapr v1.20 中停止支持；只有 .NET 10 和 .NET 11 将支持到 2027 年底。
{{% /alert %}}

要开始使用此 SDK，请从 NuGet 安装 [Dapr.AI](https://www.nuget.org/packages/Dapr.AI) 和
[Dapr.AI.Microsoft.Extensions](https://www.nuget.org/packages/Dapr.AI.Microsoft.Extensions) 包：
```sh
dotnet add package Dapr.AI
dotnet add package Dapr.AI.Microsoft.Extensions
```

`DaprChatClient` 是 `IChatClient` 接口的基于 Dapr 的实现，该接口由 `Microsoft.Extensions.AI.Abstractions` 包提供，使用 Dapr 的[conversation building block]({{< ref conversation-overview.md >}})。它允许开发者针对 Microsoft 提供的抽象类型进行开发，同时与 Dapr conversation building block 保持最大程度的一致。由于这两种方法都采用 OpenAI 的 API 方式，预计它们会随着时间推移逐步趋同。

{{% alert title="Dapr conversation building block" color="primary" %}}

请注意，Dapr 的 conversation building block 仍处于 alpha 阶段，这意味着 API 的形态在未来版本中可能会发生变化。本 SDK 包旨在提供一个与 Microsoft AI 扩展对齐、同时映射到并符合 Dapr API 的 API，但类型和属性的名称可能会在版本之间发生变化，因此在使用本 SDK 时请留意这种可能性。

{{% /alert %}}

## 关于 Microsoft.Extensions.AI
`Dapr.AI.Microsoft.Extensions` 包实现了 `Microsoft.Extensions.AI` 抽象，为 .NET 应用程序中的 AI 服务提供统一的 API。`Microsoft.Extensions.AI` 旨在为不同的 AI 提供商和场景提供一致的编程模型。有关 `Microsoft.Extensions.AI` 的详细信息，请参阅[官方文档](https://learn.microsoft.com/dotnet/ai/microsoft-extensions-ai)。

{{% alert title="有限支持" color="warning" %}}

请注意，Microsoft 的 AI 扩展提供的属性和方法比 Dapr conversation building block 当前支持的要多得多。此包只会映射那些 Dapr 已支持的属性，并忽略其他属性，因此，某个功能存在于 Microsoft.Extensions.AI 包中，并不意味着 Dapr 支持它。请以本文档和包中公开的 XML 文档为准，了解支持与不支持的内容。

{{% /alert %}}

## 服务注册
`DaprChatClient` 可以通过多种扩展方法注册到依赖注入容器中。首先，请导入 `Dapr.AI.Conversation.Extensions`、`Dapr.AI.Microsoft.Extensions` 和 `Microsoft.Extensions.AI`。然后注册 NuGet 上 `Dapr.AI` 包中的 `DaprConversationClient`：

```csharp
services.AddDaprConversationClient();
```

接着，使用你的 conversation component 名称注册 `DaprChatClient`：

```csharp
services.AddDaprChatClient("my-conversation-component", configure: null);
```

在 `1.19.0` 中，请显式传入 `configure: null`，以消除带可选参数的重载之间的歧义。

### 配置选项
你可以通过 `DaprChatClientOptions` 配置 `DaprChatClient`，但当前实现仅为 component 名称本身提供配置。这一点预计会在未来的版本中改变。

```csharp
services.AddDaprChatClient("my-conversation-component", options => 
{
   // 在此处配置其他选项
});
```

你还可以配置服务生命周期（默认为 `ServiceLifetime.Scoped`）：

```csharp
services.AddDaprChatClient("my-conversation-component", ServiceLifetime.Singleton);
```

对于多个 component，请注册带键的客户端：

```csharp
services.AddDaprChatClient(
    serviceKey: "support", conversationComponentName: "support-conversation");
services.AddDaprChatClient(
    serviceKey: "catalog", conversationComponentName: "catalog-conversation");
```

通过 `[FromKeyedServices("support")] IChatClient` 或 `GetRequiredKeyedService<IChatClient>("support")` 解析它们。仅使用 component 名称的重载同样会注册一个带键的客户端，并以 component 名称作为其键。

## 使用
注册后，你可以在服务中注入并使用 `IChatClient`：

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
`DaprChatClient` 在 SDK `1.19.0` 中不支持流式响应。调用 `GetStreamingResponseAsync` 会抛出 `NotImplementedException`。

### 工具集成
该客户端会将工具声明映射到模型，并将返回的调用以 `FunctionCallContent` 形式提供。调用 `GetResponseAsync` 不会自动执行函数。应用程序自行实现的工具循环，或函数调用 middleware，必须执行允许的函数并返回结果。

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
`DaprChatClient` 集成了 Dapr 的错误处理机制，并会在出现问题时抛出相应的异常。

## 配置和元数据
底层的 Dapr conversation component 可以通过 Dapr conversation building block 的配置来设置元数据和参数。`DaprChatClient` 在调用 conversation component 时会遵循这些设置。

### SDK 1.19.0 中的映射

此适配器只实现了 `IChatClient` 的一个子集，而不是完整的 `ConversationOptions` 接口：

| Microsoft.Extensions.AI 接口 | Dapr 映射 |
| --- | --- |
| 用户、assistant、system 和 tool 角色 | 仅文本的对话消息。其他角色会抛出 `ArgumentOutOfRangeException`；输入映射不保留非文本部分，以及结构化的工具结果/调用历史。 |
| `ChatOptions.Temperature` | `ConversationOptions.Temperature` |
| `ChatOptions.ConversationId` | `ConversationOptions.ContextId` |
| `ChatOptions.ToolMode` | None、auto、required，或指定的必需函数 |
| `ChatOptions.Tools` | 工具名称、描述以及 `AdditionalProperties` 映射为函数参数；请验证你的工具实际发送的 schema。 |
| `ChatOptions.AdditionalProperties` | 字符串化的 component 元数据，而非 protobuf `Parameters`。 |
| 响应 | 对话 ID、结束原因、文本、返回的函数调用，以及 `RawRepresentation` 中的每个原始 choice。在本版本中，`ChatResponse` 不映射 token 用量和模型。 |

此适配器不映射响应格式、提示词缓存保留和 PII 清理等选项。如果你需要这些功能，或需要完全控制[工具调用对话历史]({{< ref dotnet-ai-conversation-tools.md >}})，请直接使用 `DaprConversationClient`。

## 最佳实践

1. **服务生命周期**：为 `DaprChatClient` 注册使用 `ServiceLifetime.Scoped` 或 `ServiceLifetime.Singleton`，以避免不必要地创建多个实例。

2. **错误处理**：始终将调用包裹在适当的 try-catch 块中，以同时处理 Dapr 特定异常和常规异常。

3. **资源管理**：在本版本中，`DaprChatClient.Dispose` 是空操作。依赖注入会管理单独注册的 `DaprConversationClient`；手动构造的应用程序必须保持该客户端存活，并自行将其释放。

4. **配置**：正确配置你的 Dapr conversation component，以确保最佳性能和可靠性。

## 相关链接

- [Dapr conversation building block]({{< ref conversation-overview.md >}})
- [Microsoft.Extensions.AI 文档](https://learn.microsoft.com/dotnet/ai/microsoft-extensions-ai)
- [Dapr .NET Conversation SDK]({{% ref dotnet-ai-conversation-howto.md %}})
