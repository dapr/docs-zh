---
type: docs
title: "Dapr AI 客户端"
linkTitle: "AI 客户端"
weight: 50005
description: 了解如何创建 Dapr AI 客户端
---

Dapr AI 客户端包允许你与 Dapr 边车提供的 AI 能力进行交互。

{{% alert title="注意" color="primary" %}}
Dapr 对话构建块需要 Dapr 运行时 v1.16.0 或更高版本。响应格式、提示词缓存保留以及令牌使用统计需要 Dapr 运行时 v1.17.0 或更高版本。
{{% /alert %}}

## 生命周期管理
`DaprConversationClient` 是 Dapr 客户端的一个专用版本，用于与 Dapr 对话 API 交互。它可以与 `DaprClient` 及其他 Dapr 客户端一同注册，不会有任何问题。

它通过用于与 Dapr 边车通信的 TCP 套接字维持对网络资源的访问。

为获得最佳性能，请创建一个长期存活的 `DaprConversationClient` 实例，并在整个应用程序中共享访问该实例。`DaprConversationClient` 实例是线程安全的，设计上就是用于共享的。

依赖注入功能可以帮助实现这一点。注册方法支持以单例、作用域或瞬态（即每次注入时都重新创建）的方式注册，还支持使用 `IConfiguration` 中的值或其他已注入的服务进行注册，这在每个类中从零开始创建客户端时很难做到。

避免为每次操作都创建一个 `DaprConversationClient`。

## 通过 DaprConversationClientBuilder 配置 DaprConversationClient

在调用 `.Build()` 创建客户端本身之前，可以通过调用 `DaprConversationClientBuilder` 类的方法来配置 `DaprConversationClient`。每个 `DaprConversationClient` 的设置相互独立，调用 `.Build()` 之后无法更改。

```cs
var daprConversationClient = new DaprConversationClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向其他 Dapr 边车进行身份验证的 API 令牌
    .Build();
```

`DaprConversationClientBuilder` 包含以下设置：

- Dapr 边车的 HTTP 端点
- Dapr 边车的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向边车验证请求身份的 API 令牌
- 用于创建 SDK 所用 `HttpClient` 实例的工厂方法
- 向边车发出请求时，`HttpClient` 实例所使用的超时时间

SDK 会读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的本地 HTTP 端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的本地 gRPC 端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作，这依赖于 gRPC 通道选项的配置。如果你需要自行配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprConversationClient = new DaprConversationClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 使用 `DaprConversationClient` 进行取消操作

`DaprConversationClient` 上的 API 执行异步操作，并接受可选的 `CancellationToken` 参数。这遵循 .NET 中可取消操作的标准做法。请注意，取消发生时，无法保证远程端点会停止处理该请求，只能保证客户端已停止等待其完成。

当操作被取消时，它可能会抛出 `OperationCanceledException`。

## 通过依赖注入配置 `DaprConversationClient`

使用内置的扩展方法在依赖注入容器中注册 `DaprConversationClient`，可以带来以下好处：只需注册一次长期服务、集中管理复杂配置，并通过尽可能复用同类长期资源（例如 `HttpClient` 实例）来提升性能。

共有三种重载，可让开发者以最大的灵活度为其场景配置客户端。每种重载都会在尚未注册的情况下代为注册 `IHttpClientFactory`，并让 `DaprConversationClientBuilder` 在创建 `HttpClient` 实例时使用它，从而尽可能复用同一实例，避免套接字耗尽等问题。

第一种方式无需开发者进行任何配置，`DaprConversationClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprConversationClient(); // 注册 `DaprConversationClient`，使其可按需注入
var app = builder.Build();
```

有时开发者需要使用上文详述的各种配置选项来配置所创建的客户端。这可以通过一个重载来完成，该重载传入 `DaprConversationClientBuilder` 并公开用于配置所需选项的方法。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprConversationClient((_, daprConversationClientBuilder) => {
   // 设置 API 令牌
   daprConversationClientBuilder.UseDaprApiToken("abc123");
   // 指定非标准的 HTTP 端点
   daprConversationClientBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发者可能需要从另一个服务中获取信息来填充这些配置值。该值可以来自 `DaprClient` 实例、厂商特定的 SDK 或某个本地服务。只要它也已在 DI 中注册，就可以通过最后一种重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprConversationClient((serviceProvider, daprConversationClientBuilder) => {
    // 从服务提供程序中获取 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprConversationClientBuilder`
    daprConversationClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```

## 发送对话请求

使用 `ConversationInput` 和 `ConversationOptions` 向你的对话组件发送提示：

```cs
using Dapr.AI.Conversation;
using Dapr.AI.Conversation.ConversationRoles;

var inputs = new[]
{
    new ConversationInput(new IConversationMessage[]
    {
        new SystemMessage { Content = [new MessageContent("You are a helpful assistant.")] },
        new UserMessage { Content = [new MessageContent("Explain Dapr service invocation briefly.")] }
    })
};

var options = new ConversationOptions("my-conversation-component")
{
    Temperature = 0.2
};

var response = await daprConversationClient.ConverseAsync(inputs, options);

foreach (var output in response.Outputs)
{
    foreach (var choice in output.Choices)
    {
        Console.WriteLine($"{choice.Index}: {choice.Message.Content} ({choice.FinishReason})");
    }
}
```

每个 `ConversationInput` 包含一个由特定角色消息组成的列表。SDK 支持 `SystemMessage`、`DeveloperMessage`、`UserMessage`、`AssistantMessage` 和 `ToolMessage`。内容由文本类型的 `MessageContent` 条目组成；此 API 不公开图像或音频消息部分。

每个响应输出包含 `Choices`、可选的 `Model` 以及可选的 `Usage`。每个候选项包含 `Index`、可为空的 `FinishReason`，以及一个带有文本和工具调用列表的 `Message`。不要假设响应总是只包含一个文本候选项。

## 请求选项与对话上下文

| 选项 | 行为 |
| --- | --- |
| `ConversationComponentId` | 必需的组件名称，通过 `ConversationOptions` 构造函数提供。 |
| `ContextId` | 可选的现有对话上下文。返回的上下文可通过 `ConversationResponse.ConversationId` 获取；保留时长取决于运行时和组件。 |
| `Temperature` | 提供商支持的创造性与可预测性设置。 |
| `ScrubPII` | 请求对响应数据进行脱敏。`ConversationInput.ScrubPII` 则单独请求对输入数据进行脱敏。 |
| `Metadata` | 组件特定的字符串键值元数据。 |
| `Parameters` | 以 `Google.Protobuf.WellKnownTypes.Any` 值表示的自定义参数。 |
| `Tools`、`ToolChoice` | 每个请求的工具声明与选择策略；参见 [工具调用]({{< ref dotnet-ai-conversation-tools.md >}})。 |
| `ResponseFormat` | 可选的 protobuf `Struct`，描述所请求的响应架构。 |
| `PromptCacheRetention` | 在受支持的情况下，可选的缓存保留时长。 |

客户端会将这些选项发送给运行时；提供商的支持情况各不相同。上下文 ID 并不是客户端侧的消息历史存储。你需要保留并发送提供商所要求的任何历史消息。`ConverseAsync` 返回完整的响应；本版本的此客户端没有令牌流式传输 API。

## 响应格式（JSON 架构）

你可以通过 `ConversationOptions.ResponseFormat` 提供 JSON 架构，以将响应强制转换为特定格式。此功能需要 Dapr 运行时 v1.17.0 或更高版本。

```cs
using Google.Protobuf.WellKnownTypes;

var responseFormat = new Struct
{
    Fields =
    {
        ["type"] = new Value { StringValue = "object" },
        ["properties"] = new Value
        {
            StructValue = new Struct
            {
                Fields =
                {
                    ["answer"] = new Value
                    {
                        StructValue = new Struct
                        {
                            Fields =
                            {
                                ["type"] = new Value { StringValue = "string" }
                            }
                        }
                    }
                }
            }
        },
        ["required"] = new Value
        {
            ListValue = new ListValue { Values = { new Value { StringValue = "answer" } } }
        }
    }
};

var options = new ConversationOptions("my-conversation-component")
{
    ResponseFormat = responseFormat
};
```

## 提示词缓存保留

如果你的对话组件支持提示缓存，可以使用 `ConversationOptions.PromptCacheRetention` 请求一个缓存保留时间窗口。此功能需要 Dapr 运行时 v1.17.0 或更高版本。

```cs
var options = new ConversationOptions("my-conversation-component")
{
    PromptCacheRetention = TimeSpan.FromMinutes(30)
};
```

## 令牌使用统计

当组件和运行时均支持时，响应中会包含可选的令牌使用统计信息。使用数据可通过 `ConversationResponseResult.Usage` 获取，其中包括总计数以及详细明细：

```cs
var response = await daprConversationClient.ConverseAsync(inputs, options);
var result = response.Outputs[0];

if (result.Usage is not null)
{
    var totalTokens = result.Usage.TotalTokens;
    var promptCachedTokens = result.Usage.PromptTokensDetails?.CachedTokens;
    var reasoningTokens = result.Usage.CompletionTokensDetails?.ReasoningTokens;
}
```
