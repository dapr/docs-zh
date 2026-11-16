---
type: docs
title: "如何：使用 Dapr Messaging .NET SDK 编写订阅并处理主题消息"
linkTitle: "订阅主题"
weight: 61000
description: "了解如何编写主题处理程序、配置流式、编程式和 HTTP 投递模式，并使用 Dapr.Messaging 接入无反射分发器"
---

本指南介绍如何使用现代的 `Dapr.Messaging` .NET SDK 编写和管理 Dapr 主题订阅。你将学习如何使用 `ITopicHandler<TMessage>` 编写强类型的主题处理程序，如何通过 `[DaprTopic]` 配置投递模式和路由规则，如何利用编译期源生成，以及如何管理动态流式订阅。

## 前提条件

- 已安装 [Dapr CLI]({{< ref install-dapr-cli.md >}})
- 已初始化的 [Dapr 环境]({{< ref install-dapr-selfhost.md >}})
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 已安装 `Dapr.Messaging` 包：

```xml
<ItemGroup>
  <PackageReference Include="Dapr.Messaging" Version="1.19.0" />
</ItemGroup>
```

{{% alert title="包引用" color="primary" %}}
`Dapr.Messaging` 是一个元包，将抽象、运行时客户端、源生成器和 Roslyn 分析器打包在单个包引用中。安装 `Dapr.Messaging` 会自动为你的项目启用编译期源生成和诊断分析。
{{% /alert %}}

## 定义主题处理程序

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者的支持都将在 Dapr v1.20 中移除；仅 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

主题订阅者实现强类型的 `ITopicHandler<TMessage>` 接口（或其泛型变体 `ITopicHandler<TMessage, TResult>`），并使用 `[DaprTopic]` 特性进行标注。

### 为什么使用 `ITopicHandler`？

- **强类型负载**：自动将传入的 JSON 或 CloudEvent 负载反序列化为强类型的 .NET 模型（`TMessage`），无需手写样板代码。
- **显式的消息处置**：`HandleAsync` 方法返回 `TopicResponseAction`（`Success`、`Retry` 或 `Drop`），让你能精确控制确认、重试以及死信路由。
- **作用域依赖注入**：每次投递消息时，处理程序都从独立的 `IServiceScope` 中解析，使作用域依赖（如 Entity Framework `DbContext`、仓储或日志记录器）可以通过构造函数进行干净的注入。
- **编译期源生成**：带注解的处理程序在构建时被发现，用于无反射的注册与派发。请单独验证 Native AOT，因为生成的消息反序列化仍然使用运行时 JSON 元数据。

{{% alert title="分析器校验" color="primary" %}}
- **`DAPR1611`（错误）**：如果带有 `[DaprTopic]` 的类未实现 `ITopicHandler<TMessage>` 或 `ITopicHandler<TMessage, TResult>`，`DAPR1611` 会触发构建错误。
- **`DAPR1612`（警告）**：如果在 Native AOT 编译期间，处理程序的消息类型未在源生成的 `JsonSerializerContext` 中注册，`DAPR1612` 会警告 AOT 反序列化可能失败。
{{% /alert %}}

{{% alert title="Dapr 发布订阅投递协议" color="primary" %}}
按照 Dapr 运行时规范（gRPC `AppCallback.OnTopicEvent` 和 HTTP 主题端点），主题投递处理程序会返回消息确认状态（`TopicResponseAction.Success`、`Retry` 或 `Drop`）。Dapr 发布订阅运行时不接受在响应事件投递时返回的任意业务数据负载。
{{% /alert %}}

### 示例：使用 `ITopicHandler<TMessage>` 的主题处理程序

```csharp
using Dapr.Messaging;
using Dapr.Messaging.PublishSubscribe;

public record Order(string Id, decimal Total, string CustomerEmail);

[DaprTopic("pubsub", "orders")]
public sealed class OrderHandler(ILogger<OrderHandler> logger, IInventoryService inventory) 
    : ITopicHandler<Order>
{
    public async Task<TopicResponseAction> HandleAsync(
        Order message, 
        TopicContext context, 
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Processing order {OrderId} from pubsub {PubSub}", message.Id, context.PubsubName);

        try
        {
            await inventory.ReserveStockAsync(message.Id, cancellationToken);
            return TopicResponseAction.Success;
        }
        catch (InventoryUnavailableException ex)
        {
            logger.LogWarning(ex, "Insufficient inventory for order {OrderId}; dropping message", message.Id);
            return TopicResponseAction.Drop;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Transient error processing order {OrderId}; retrying", message.Id);
            return TopicResponseAction.Retry;
        }
    }
}
```

### 响应动作

`HandleAsync` 方法返回 `TopicResponseAction`，用于告诉 Dapr 运行时如何确认该消息：

| 响应动作 | 说明 |
| --- | --- |
| `TopicResponseAction.Success` | 消息已成功处理，应从发布订阅组件中确认（删除）。 |
| `TopicResponseAction.Retry` | 由于临时错误处理失败；Dapr 将根据组件的重试策略重新投递该消息。 |
| `TopicResponseAction.Drop` | 永久性处理失败；Dapr 将删除该消息，或将其路由到已配置的死信主题，且不再重试。 |

### 使用 `TopicContext` 访问投递上下文

传递给 `HandleAsync` 的 `TopicContext` 提供了关于该次投递的丰富元数据：

```csharp
public async Task<TopicResponseAction> HandleAsync(Order message, TopicContext context, CancellationToken cancellationToken)
{
    var pubsubName = context.PubsubName;       // Dapr 发布订阅组件的名称
    var topicName = context.TopicName;         // 主题的名称
    var messageId = context.MessageId;         // 唯一的消息标识符
    var metadata = context.Metadata;           // 组件特定的附加元数据
    var headers = context.Headers;             // 随投递一起转发的 CloudEvent 头
    var rawBytes = context.RawPayload;         // 原始负载字节（启用 EnableRawPayload 时）
    var cloudEvent = context.CloudEvent;       // 强类型的 CloudEvent 信封
    
    return TopicResponseAction.Success;
}
```

## 使用 `[DaprTopic]` 配置订阅

`[DaprTopic]` 特性指定要订阅的主题，以及消息的投递方式。

### 位置构造函数参数

`[DaprTopic]` 构造函数需要两个位置字符串参数：

1. **`pubsubName`**（第一个参数）：Dapr 发布订阅组件的名称（即组件 YAML 中 `metadata.name` 所定义的名称，例如 `"pubsub"` 或 `"messagebus"`）。
2. **`topicName`**（第二个参数）：要订阅的主题或队列名称（例如 `"orders"` 或 `"orders.us"`）。

```csharp
// 订阅 "pubsub" 组件上的 "orders" 主题
[DaprTopic("pubsub", "orders")]
public class OrderHandler : ITopicHandler<Order> { /* ... */ }
```

### 特性定义与属性

```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]
public sealed class DaprTopicAttribute(string pubsubName, string topicName) : Attribute
{
    public string PubsubName { get; }
    public string TopicName { get; }
    public DeliveryMode Delivery { get; set; } = DeliveryMode.Streaming;
    public string? Route { get; set; }
    public string? Match { get; set; }
    public int Priority { get; set; }
    public string? DeadLetterTopic { get; set; }
    public bool EnableRawPayload { get; set; }
    public bool BulkSubscribe { get; set; }
    public int MaxMessagesCount { get; set; } = 100;
    public int MaxAwaitDurationMs { get; set; } = 1000;
    public string[]? MetadataKeys { get; set; }
}
```

### 按投递模式划分的属性适用性

并非 `[DaprTopic]` 上的所有属性都与每种投递模式相关。下表列出了各模式适用的属性：

| 属性 | 说明 | `DeliveryMode.Streaming` | `DeliveryMode.Programmatic` | `DeliveryMode.Http` |
| --- | --- | :---: | :---: | :---: |
| `PubsubName` | Dapr 发布订阅组件的名称 | **必填** | **必填** | **必填** |
| `TopicName` | 主题的名称 | **必填** | **必填** | **必填** |
| `Delivery` | 投递模式（`Streaming`、`Programmatic`、`Http`） | 可选（默认） | 可选 | 可选 |
| `Route` | 用于事件派发的目标 HTTP 路径 | *忽略* | *忽略* | **适用** |
| `Match` | 用于基于内容的路由的 CEL 表达式 | *忽略* | **适用** | **适用** |
| `Priority` | 匹配 CEL 规则的优先级顺序 | *忽略* | **适用** | **适用** |
| `DeadLetterTopic` | 已丢弃或失败消息的回退主题 | **适用** | **适用** | **适用** |
| `EnableRawPayload` | 在不解析 CloudEvent 的情况下转发原始字节 | **适用** | **适用** | **适用** |
| `BulkSubscribe` | 启用批量消息投递 | *忽略* | **适用** | **适用** |
| `MaxMessagesCount` | 批量订阅的最大批次大小 | *忽略* | **适用** | **适用** |
| `MaxAwaitDurationMs` | 批次组装的最长等待时间（毫秒） | *忽略* | **适用** | **适用** |
| `MetadataKeys` | 将 `[DaprTopicMetadata]` 与该主题关联的键 | **适用** | **适用** | **适用** |

{{% alert title="属性范围规则与分析器校验" color="primary" %}}
- **`Route`**：仅在 `Delivery = DeliveryMode.Http` 时使用。在 `Streaming` 和 `Programmatic` 模式下，事件直接通过 gRPC 流或 gRPC 服务投递，而不是通过 HTTP 路由，因此设置 `Route` 不会产生任何效果。
- **路由规则（`Match` / `Priority`）**：通过 `Programmatic`（gRPC）或 `Http` 推送事件时，CEL 规则的求值由 Dapr 运行时完成。在 `Streaming` 模式下，客户端直接为该主题发起流，不存在服务端的 HTTP/gRPC 路由规则。
- **批量订阅（`BulkSubscribe`、`MaxMessagesCount`、`MaxAwaitDurationMs`）**：当 Dapr 通过 `Programmatic` 或 `Http` 推送事件时，用于配置服务端的批量聚合。
- **编译期属性校验（`DAPR1616` 与 `DAPR1617`）**：Roslyn 分析器会在构建时检查 `[DaprTopic]` 的配置。若你启用了某项功能（例如 `BulkSubscribe = true`）却未设置所需的配套属性（`MaxMessagesCount`、`MaxAwaitDurationMs`），`DAPR1616` 会发出警告。若你为所选投递模式或功能集中被忽略的属性赋值（例如在非 HTTP 主题上设置 `Route` 或 `Match`），`DAPR1617` 会发出警告。
{{% /alert %}}

### 三种投递模式

`DeliveryMode` 控制 Dapr 边车与你的应用之间的通信协议：

1. **`DeliveryMode.Streaming`（默认）**：
   - 应用会向 Dapr 边车发起一个持久的双向 gRPC 流（`SubscribeTopicEventsAlpha1`）。
   - 消息由应用拉取，并带有客户端侧的背压缓冲。
   - 流式订阅**无需映射任何入站 HTTP 或 gRPC 端点**。
   - 忽略 `Route` 等 HTTP 路由属性。

   ```csharp
   [DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Streaming)]
   public class StreamingOrderHandler : ITopicHandler<Order> { /* ... */ }
   ```

2. **`DeliveryMode.Programmatic`**：
   - Dapr 边车将消息推送到你应用的 `AppCallback` gRPC 服务。
   - 订阅会在启动时通过 `ListTopicSubscriptions` 自动发现，并通过 `OnTopicEvent` 调用。
   - 需要在端点管道上调用 `app.MapDaprMessaging()`。
   - 支持 CEL 路由规则（`Match`、`Priority`）和 `BulkSubscribe`。忽略 `Route`。

   ```csharp
   [DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Programmatic)]
   public class ProgrammaticOrderHandler : ITopicHandler<Order> { /* ... */ }
   ```

3. **`DeliveryMode.Http`**：
   - Dapr 边车通过调用 `GET /dapr/subscribe` 发现订阅，并通过 `POST <route>` 推送事件。
   - 需要在端点管道上调用 `app.MapDaprMessaging()`。
   - `Route` 定义事件被 POST 到的 HTTP 路径（若省略则默认为主题名称）。

   ```csharp
   [DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Http, Route = "/api/orders")]
   public class HttpOrderHandler : ITopicHandler<Order> { /* ... */ }
   ```

{{% alert title="投递模式与端点分析器校验" color="warning" %}}
- **`DAPR1610`（警告）**：确保同一发布订阅组件与主题不会在不同处理程序之间以冲突的投递模式注册。
- **`DAPR1613`（警告）**：当声明了编程式订阅但应用管道中省略了端点映射（`app.MapDaprMessaging()`）时发出警告。附带自动化的 IDE 代码修复。
- **`DAPR1615`（警告）**：当调用了端点映射或订阅者注册方法，而应用中没有对应的主题订阅者时发出警告。
{{% /alert %}}

### 使用 CEL 的基于内容的路由

你可以使用 `Match` 和 `Priority` 属性，基于通用表达式语言（CEL）表达式过滤和路由消息：

```csharp
[DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Http,
    Match = "event.type == \"priority\"", Priority = 1)]
public sealed class PriorityOrderHandler : ITopicHandler<Order> { /* ... */ }

[DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Http, Priority = 2)]
public sealed class StandardOrderHandler : ITopicHandler<Order> { /* ... */ }
```

### 死信主题与批量订阅

- **死信主题**：设置 `DeadLetterTopic = "orders-dlq"`，即可将已丢弃的消息路由到死信队列。
- **批量订阅**：选择 HTTP 或编程式投递，并设置 `BulkSubscribe = true`、`MaxMessagesCount` 和 `MaxAwaitDurationMs`，即可接收批量消息。
- **原始负载**：设置 `EnableRawPayload = true`，即可接收未经 CloudEvent 信封解析的原始事件负载。

### 使用 `[DaprTopicMetadata]` 添加主题元数据

你可以使用 `[DaprTopicMetadata]` 特性为主题订阅附加键值元数据：

```csharp
[DaprTopic("pubsub", "orders", MetadataKeys = ["rawPayload"])]
[DaprTopicMetadata("rawPayload", "true")]
public sealed class RawOrderHandler : ITopicHandler<byte[]> { /* ... */ }
```

### 在单个处理程序上处理多个主题

`[DaprTopic]` 允许在单个处理程序类上标注多个特性。该处理程序会处理来自每个已配置主题的消息：

```csharp
[DaprTopic("pubsub", "orders.us")]
[DaprTopic("pubsub", "orders.eu")]
[DaprTopic("pubsub", "orders.asia")]
public sealed class MultiRegionOrderHandler : ITopicHandler<Order>
{
    public Task<TopicResponseAction> HandleAsync(Order message, TopicContext context, CancellationToken cancellationToken)
    {
        Console.WriteLine($"Received order from topic: {context.TopicName}");
        return Task.FromResult(TopicResponseAction.Success);
    }
}
```

## 源生成器产出的内容

构建项目时，`Dapr.Messaging.Generators` Roslyn 源生成器会发现所有实现 `ITopicHandler<TMessage>` 的 `[DaprTopic]` 类，并生成：

| 生成的产物 | 用途 |
| --- | --- |
| **类型化分发器** | 直接的、强类型的调用器，使用 `System.Text.Json` 反序列化消息负载，并调用 `HandleAsync`，无需基于反射的处理程序发现。 |
| **`IDaprMessagingSubscriberRegistry`** | 集中式注册表，包含所有已发现主题的 `TopicSubscriptionDescriptor` 定义。 |
| **`AddDaprMessaging()`** | 生成到你的程序集中的 `IServiceCollection` 扩展方法，可自动将选项、发布客户端、处理程序、分发器、订阅者注册表以及所需的托管服务注册到你的 DI 容器中。 |

处理程序发现与派发注册均在编译期生成。消息反序列化目前使用运行时的 `System.Text.Json` 元数据，因此 Native AOT 和裁剪场景需要额外的验证，并需要应用自行提供 `JsonSerializerContext`。

## 启动时注册

在 `Program.cs` 中使用 `builder.Services.AddDaprMessaging()` 注册 Dapr 消息服务：

```csharp
var builder = WebApplication.CreateBuilder(args);

// 注册完整的 Dapr 消息堆栈（选项、发布客户端以及源生成的订阅者）
builder.Services.AddDaprMessaging(options =>
{
    // 可选：配置 Dapr 边车连接选项
    options.DaprGrpcEndpoint = "http://localhost:50001";
});

var app = builder.Build();

// 自动映射已发现的投递模式所需的端点
app.MapDaprMessaging();

app.Run();
```

{{% alert title="注册与端点分析器校验" color="primary" %}}
- **`DAPR1614`（警告）**：如果应用代码直接调用内部的 `DaprMessagingRegistration` 类，而不是使用源生成的 `builder.Services.AddDaprMessaging()` 扩展方法，则会发出此警告。
- **`DAPR1613`（警告）**：如果注册了编程式主题订阅，但 `Program.cs` 中缺少 `app.MapDaprMessaging()`（或 `app.MapDaprAppCallback()`），则会触发此警告。
- **`DAPR1615`（警告）**：如果存在 `app.MapDaprMessaging()` 或订阅者注册端点，但不存在对应的 HTTP 或编程式主题处理程序，则会触发此警告。
{{% /alert %}}

## 动态流式订阅

除了声明式的 `[DaprTopic]` 处理程序外，`DaprPublishSubscribeClient` 还允许在运行时创建命令式的动态流式订阅：

```csharp
var messagingClient = app.Services.GetRequiredService<DaprPublishSubscribeClient>();

// 配置订阅选项
var options = new DaprSubscriptionOptions(
    new MessageHandlingPolicy(
        TimeoutDuration: TimeSpan.FromSeconds(10), 
        DefaultResponseAction: TopicResponseAction.Retry))
{
    DeadLetterTopic = "orders-dlq",
    MaximumQueuedMessages = 500,
    MaximumCleanupTimeout = TimeSpan.FromSeconds(15),
    ErrorHandler = async (DaprException ex) =>
    {
        Console.WriteLine($"Subscription error: {ex.Message}");
    }
};

// 启动动态订阅
await using var subscription = await messagingClient.SubscribeAsync(
    "pubsub", 
    "dynamic-orders", 
    options, 
    async (TopicMessage message, CancellationToken ct) =>
    {
        var payload = Encoding.UTF8.GetString(message.Data.Span);
        Console.WriteLine($"Received dynamic message: {payload}");
        return TopicResponseAction.Success;
    });

// SubscribeAsync 的类型为 IAsyncDisposable；运行时句柄还额外暴露了 completion。
await ((IDaprSubscription)subscription).Completion;
```

## 分析器与诊断

`Dapr.Messaging` 附带了 Roslyn 分析器，可在构建时强制执行正确的消息传递实践：

| ID | 标题 | 严重性 | 说明 |
| --- | --- | --- | --- |
| `DAPR1610` | 重复主题且投递模式冲突 | **警告** | 当同一 `(pubsubName, topicName)` 在不同的 `[DaprTopic]` 特性中配置了不同的 `DeliveryMode` 值时触发。 |
| `DAPR1611` | 处理程序必须实现 `ITopicHandler<T>` | **错误** | 当 `[DaprTopic]` 放在未实现 `ITopicHandler<TMessage>` 或 `ITopicHandler<TMessage, TResult>` 的类上时触发。 |
| `DAPR1612` | 消息类型未在 `JsonSerializerContext` 中注册 | **警告** | 当消息类型未被 Native AOT 编译中的 `[JsonSerializable]` 覆盖时发出警告。 |
| `DAPR1613` | 为编程式订阅映射端点 | **警告** | 当编程式订阅已配置但未调用 `app.MapDaprAppCallback()` 或 `app.MapDaprMessaging()` 时发出警告。附带自动化的代码修复。 |
| `DAPR1614` | 不要直接调用 `DaprMessagingRegistration` | **警告** | 当应用代码直接调用 `DaprMessagingRegistration`，而不是调用 `services.AddDaprMessaging()` 时发出警告。 |
| `DAPR1615` | 移除未使用的订阅者注册 | **警告** | 当存在订阅者注册或端点映射，但没有对应的 HTTP 或编程式主题订阅者时发出警告。 |
| `DAPR1616` | `[DaprTopic]` 配置不完整 | **警告** | 当 `[DaprTopic]` 启用了某项功能（如 `BulkSubscribe = true`），却未设置其所需的配套属性（`MaxMessagesCount`、`MaxAwaitDurationMs`）时发出警告。 |
| `DAPR1617` | `[DaprTopic]` 配置被忽略 | **警告** | 当 `[DaprTopic]` 设置了在所选投递模式或功能集中被忽略的属性时发出警告（例如在非 HTTP 主题上设置 `Route` 或 `Match`）。 |

有关 Dapr .NET SDK 中所有 Roslyn 分析器、诊断严重性以及可用自动代码修复的完整参考，请参阅 [Dapr 源代码分析器与生成器]({{< ref dotnet-guidance-source-generators.md >}})。

## 最佳实践

- **优先使用 `DeliveryMode.Streaming`**：适用于后台工作进程、控制台应用和服务，这些场景希望获得双向流以及客户端侧背压，而无需托管入站 HTTP 或 gRPC 服务器。
- **优先使用 `DeliveryMode.Programmatic`**：适用于高吞吐量的 gRPC 服务，即由 Dapr 边车直接将事件推送到 ASP.NET Core gRPC 端点。
- **始终区分临时错误与永久错误**：对于临时错误（网络超时、数据库锁），返回 `TopicResponseAction.Retry`；对于无法恢复的错误（有毒消息、架构违规），返回 `TopicResponseAction.Drop`，以将其路由到死信主题。
- **注入作用域服务**：`ITopicHandler<TMessage>` 实例会在独立的 `IServiceScope` 内为每条消息解析，从而确保 Entity Framework `DbContext` 等作用域依赖能被安全地解析。
- **显式验证 Native AOT**：生成的分发器目前使用运行时的 `System.Text.Json` 元数据；请针对你的目标 SDK 版本和消息类型测试 Native AOT 与裁剪。

## 后续步骤

- [操作指南：使用 IDaprPublishSubscribeClient 发布事件]({{< ref dotnet-messaging-publish-howto.md >}})
- [教程：通过示例了解 Dapr.Messaging]({{< ref "tutorial/_index.md" >}})
- [Dapr Messaging 配置与使用指南]({{< ref dotnet-messaging-pubsub-usage.md >}})
- [Dapr 发布订阅组件规范]({{% ref pubsub-overview %}})
