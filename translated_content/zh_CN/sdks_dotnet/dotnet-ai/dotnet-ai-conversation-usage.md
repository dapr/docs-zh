---
type: docs
title: "Dapr AI 客户端"
linkTitle: "AI 客户端"
weight: 50005
description: 了解如何创建 Dapr AI 客户端
---

Dapr AI 客户端包允许您与 Dapr 边车提供的 AI 功能进行交互。

{{% alert title="注意" color="primary" %}}
Dapr Conversation 构建块需要 Dapr 运行时 v1.16.0 或更高版本。响应格式、提示缓存保留以及令牌使用统计需要 Dapr 运行时 v1.17.0 或更高版本。
{{% /alert %}}

## 生命周期管理
`DaprConversationClient` 是 Dapr 客户端的专用版本，专门用于与 Dapr Conversation API 交互。它可以与 `DaprClient` 和其他 Dapr 客户端一起注册，不会产生任何问题。

它维护用于与 Dapr 边车通信的 TCP 套接字形式的网络资源访问。

为获得最佳性能，请创建一个 `DaprConversationClient` 的单一长期实例，并在整个应用程序中提供对该共享实例的访问。`DaprConversationClient` 实例是线程安全的，旨在共享使用。

利用依赖注入功能可以更好地实现这一点。注册方法支持注册为单例、作用域实例或瞬态（意味着每次注入时都会重新创建），但同时也支持注册以使用 `IConfiguration` 的值或其他注入的服务，这在每个类中从头创建客户端时是不切实际的。

避免为每次操作创建一个 `DaprConversationClient`。

## 通过 DaprConversationClientBuilder 配置 DaprConversationClient

可以通过在调用 `.Build()` 创建客户端本身之前调用 `DaprConversationClientBuilder` 类上的方法来配置 `DaprConversationClient`。每个 `DaprConversationClient` 的设置是独立的，在调用 `.Build()` 后无法更改。

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
- 用于向边车验证请求的 API 令牌
- 用于创建 SDK 使用的 `HttpClient` 实例的工厂方法
- 向边车发出请求时 `HttpClient` 实例使用的超时时间

SDK 将读取以下环境变量以配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作依赖于 gRPC 通道选项的配置。如果您需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprConversationClient = new DaprConversationClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ... ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 使用 `DaprConversationClient` 进行取消操作

`DaprConversationClient` 上的 API 执行异步操作并接受可选的 `CancellationToken` 参数。这遵循了 .NET 用于可取消操作的标准实践。请注意，当发生取消时，无法保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 通过依赖注入配置 `DaprConversationClient`

使用内置的扩展方法在依赖注入容器中注册 `DaprConversationClient` 可以带来以下好处：一次性注册长期服务、集中复杂配置，并通过在可能的情况下重用类似的长期资源（例如 `HttpClient` 实例）来提高性能。

有三种重载可用，为开发人员在其场景中配置客户端提供了最大的灵活性。如果尚未注册 `IHttpClientFactory`，每种方法都会代表您注册它，并配置 `DaprConversationClientBuilder` 在创建 `HttpClient` 实例时使用它，以尽可能重用同一实例并避免套接字耗尽和其他问题。

在第一种方法中，开发人员不进行任何配置，`DaprConversationClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprConversationClient(); // 注册 `DaprConversationClient` 以按需注入
var app = builder.Build();
```

## 发送对话请求

使用 `ConversationInput` 和 `ConversationOptions` 向您的对话组件发送提示：

```cs
var inputs = new[]
{
    new ConversationInput(new IConversationMessage[]
    {
        new SystemMessage("You are a helpful assistant."),
        new UserMessage("Summarize the following text...")
    })
};

var options = new ConversationOptions("my-conversation-component")
{
    Temperature = 0.2
};

var response = await daprConversationClient.ConverseAsync(inputs, options);
```

## 响应格式（JSON 架构）

您可以使用 `ConversationOptions.ResponseFormat` 提供 JSON 架构，以将响应强制转换为特定格式。此功能需要 Dapr 运行时 v1.17.0 或更高版本。

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

## 提示缓存保留

如果您的对话组件支持提示缓存，您可以使用 `ConversationOptions.PromptCacheRetention` 请求缓存保留窗口。此功能需要 Dapr 运行时 v1.17.0 或更高版本。

```cs
var options = new ConversationOptions("my-conversation-component")
{
    PromptCacheRetention = TimeSpan.FromMinutes(30)
};
```

## 令牌使用统计

当组件和运行时支持时，响应包含可选的令牌使用统计。使用数据可在 `ConversationResponseResult.Usage` 上获得，包括总数和详细细分：

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

有时开发人员需要使用上面详述的各种配置选项来配置创建的客户端。这是通过传入 `DaprConversationClientBuiler` 的重载来完成的，该重载公开了配置必要选项的方法。

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

最后，开发人员可能需要从另一个服务检索信息以填充这些配置值。该值可能从 `DaprClient` 实例、供应商特定的 SDK 或某个本地服务提供，但只要它也在 DI 中注册，就可以通过最后一个重载将其注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprConversationClient((serviceProvider, daprConversationClientBuilder) => {
    // 从服务提供程序检索 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprConversationClientBuilder`
    daprConversationClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```
