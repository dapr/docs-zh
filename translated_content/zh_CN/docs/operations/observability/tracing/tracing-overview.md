---
type: docs
title: "分布式跟踪概述"
linkTitle: "概述"
weight: 10
description: "使用跟踪获取应用程序可见性的概述"
---

Dapr 使用 Open Telemetry (OTEL) 和 Zipkin 协议进行分布式跟踪。OTEL 是行业标准，是推荐的跟踪协议。

大多数可观测性工具都支持 OTEL，包括：
- [Google Cloud Operations](https://cloud.google.com/products/operations)
- [AWS X-ray](https://aws.amazon.com/xray/)
- [New Relic](https://newrelic.com)
- [Azure Monitor](https://azure.microsoft.com/services/monitor/)
- [Datadog](https://www.datadoghq.com/)
- [Zipkin](https://zipkin.io/)
- [Jaeger](https://www.jaegertracing.io/)
- [SignalFX](https://www.signalfx.com/)
- [Dash0](https://www.dash0.com/)

下图演示了 Dapr（使用 OTEL 和 Zipkin 协议）如何与多个可观测性工具集成。

<img src="/images/observability-tracing.png" width=1000 alt="使用 Dapr 的分布式跟踪">

## 场景

跟踪与服务调用和发布订阅 API 一起使用。你可以在使用这些 API 的服务之间流转跟踪上下文。跟踪的使用有两种场景：

 1. Dapr 生成跟踪上下文，你将跟踪上下文传播到另一个服务。
 1. 你生成跟踪上下文，Dapr 将跟踪上下文传播到服务。

### 场景 1：Dapr 生成跟踪上下文头

#### 传播顺序服务调用

Dapr 负责创建跟踪头。但是，当有两个以上服务时，你需要负责在它们之间传播跟踪头。让我们通过示例来了解这些场景：

##### 单次服务调用调用

例如，`service A -> service B`。

Dapr 在 `service A` 中生成跟踪头，然后从 `service A` 传播到 `service B`。不需要进一步传播。

##### 多次顺序服务调用调用

例如，`service A -> service B -> 传播跟踪头到 -> service C`，依此类推到其他启用 Dapr 的服务。

Dapr 在请求开始时在 `service A` 中生成跟踪头，然后传播到 `service B`。你现在需要负责获取这些头并将它们传播到 `service C`，因为这是特定于你的应用程序的。

换句话说，如果应用程序调用 Dapr 并希望使用现有跟踪头（span）进行跟踪，它必须始终传播到 Dapr（在本示例中从 `service B` 到 `service C`）。Dapr 始终将跟踪 span 传播到应用程序。

{{% alert title="注意" color="primary" %}}
Dapr SDK 中未公开用于传播和检索跟踪上下文的辅助方法。你需要使用 HTTP/gRPC 客户端通过 HTTP 头和 gRPC 元数据传播和检索跟踪头。
{{% /alert %}}

##### 请求来自外部端点

例如，`从网关服务到启用 Dapr 的服务 A`。

外部网关入口调用 Dapr，Dapr 生成跟踪头并调用 `service A`。`Service A` 然后调用 `service B` 和其他启用 Dapr 的服务。

你必须将头从 `service A` 传播到 `service B`。例如：`Ingress -> service A -> 传播跟踪头 -> service B`。这类似于[情况 2]({{% ref "tracing-overview.md#multiple-sequential-service-invocation-calls" %}})。

##### 发布订阅消息

Dapr 在发布的消息主题中生成跟踪头。对于 `rawPayload` 消息，可以指定 `traceparent` 头来传播跟踪信息。这些跟踪头被传播到监听该主题的任何服务。

#### 传播多个不同的服务调用

在以下场景中，Dapr 会为你完成部分工作，然后由你创建或传播跟踪头。

##### 从单个服务到不同服务的多次服务调用

当你从单个服务调用多个服务时，需要传播跟踪头。例如：

```
service A -> service B
[ .. 一些代码逻辑 ..]
service A -> service C
[ .. 一些代码逻辑 ..]
service A -> service D
[ .. 一些代码逻辑 ..]
```

在这种情况下：
1. 当 `service A` 首次调用 `service B` 时，Dapr 在 `service A` 中生成跟踪头。
1. `service A` 中的跟踪头被传播到 `service B`。
1. 这些跟踪头在 `service B` 的响应中作为响应头的一部分返回。
1. 然后你需要将返回的跟踪上下文传播到下一个服务，比如 `service C` 和 `service D`，因为 Dapr 不知道你想重用同一个头。

### 场景 2：你从非 Dapr 应用程序生成自己的跟踪上下文头

生成自己的跟踪上下文头不太常见，并且在调用 Dapr 时通常不需要。

但是，有些场景你可能会选择在服务调用中添加 W3C 跟踪头。例如，你有一个不使用 Dapr 的现有应用程序。在这种情况下，Dapr 仍然会为你传播跟踪上下文头。

如果你决定自己生成跟踪头，可以通过三种方式完成：

1. 标准 OpenTelemetry SDK

   你可以使用行业标准 [OpenTelemetry SDK](https://opentelemetry.io/docs/instrumentation/) 生成跟踪头，并将这些跟踪头传递给启用 Dapr 的服务。_这是首选方法_。

1. 供应商 SDK

   你可以使用提供生成 W3C 跟踪头方法的供应商 SDK，并将它们传递给启用 Dapr 的服务。

1. W3C 跟踪上下文

   你可以按照 [W3C 跟踪上下文规范](https://www.w3.org/TR/trace-context/) 手工制作跟踪上下文，并将它们传递给启用 Dapr 的服务。
   
   阅读[跟踪上下文概述]({{% ref w3c-tracing-overview %}})以获取有关 W3C 跟踪上下文和头的更多背景信息和示例。

### Baggage 支持

Dapr 支持两种不同的机制来传播 W3C Baggage 以及跟踪上下文：

1. **Context Baggage（OpenTelemetry）**
   - 遵循 OpenTelemetry 约定，使用解码值
   - 在使用 OpenTelemetry 上下文传播时使用
   - 值以其原始、未编码的形式存储和传输
   - 推荐用于 OpenTelemetry 集成以及在使用应用程序上下文时

2. **Header/Metadata Baggage**
   - 在设置头/元数据 baggage 时，必须对特殊字符进行 URL 编码（例如，空格使用 `%20`，斜杠使用 `%2F`）
   - 值根据 W3C Baggage 规范的要求在传输中保持百分号编码
   - 在检查原始头/元数据时值保持编码
   - 只有 OpenTelemetry API 会解码这些值
   - 示例：在设置头 baggage 时使用 `serverNode=DF%2028`（而不是 `serverNode=DF 28`）

出于安全目的，上下文 baggage 和头 baggage 严格分离，永远不会在域之间合并。这确保 baggage 值保持其预期的格式和安全属性。

#### 在 Dapr 中使用 Baggage

你可以根据用例使用任一机制传播 baggage。

1. **在你的应用程序代码中**：在进行 Dapr API 调用之前在上下文中设置 baggage
2. **调用 Dapr 时**：将上下文传递给任何 Dapr API 调用
3. **在 Dapr 内部**：Dapr 运行时自动获取 baggage
4. **传播**：Dapr 自动将 baggage 传播到下游服务，为每种机制维护适当的编码

以下是这两种机制的示例：

**1. 使用 Context Baggage (OpenTelemetry)**

使用 OpenTelemetry SDK 时：

{{< tabpane text=true >}}

{{% tab header="Go" %}}

```go
import 	otelbaggage "go.opentelemetry.io/otel/baggage"

// Set baggage in context (values remain unencoded)
baggage, err = otelbaggage.Parse("userId=cassie,serverNode=DF%2028")
...
ctx := otelbaggage.ContextWithBaggage(t.Context(), baggage)
)

// Pass this context to any Dapr API call
client.InvokeMethodWithContent(ctx, "serviceB", ...)
```

**2. 使用 Header/Metadata Baggage**

使用 gRPC 元数据时：
```go
import "google.golang.org/grpc/metadata"

// Set URL-encoded baggage in context
ctx = metadata.AppendToOutgoingContext(ctx,
    "baggage", "userId=cassie,serverNode=DF%2028",
)

// Pass this context to any Dapr API call
client.InvokeMethodWithContent(ctx, "serviceB", ...)
```

**3. 在目标服务中接收 Baggage**

在目标服务中，你可以访问传播的 baggage：

```go
// Using OpenTelemetry (values are automatically decoded)
import "go.opentelemetry.io/otel/baggage"

bag := baggage.FromContext(ctx)
userID := bag.Member("userId").Value()  // "cassie"
```

```go
// Using raw gRPC metadata (values remain percent-encoded)
import "google.golang.org/grpc/metadata"

md, _ := metadata.FromIncomingContext(ctx)
if values := md.Get("baggage"); len(values) > 0 {
    // values[0] contains the percent-encoded string you set: "userId=cassie,serverNode=DF%2028"
    // Remember: You must URL encode special characters when setting baggage
    
    // To decode the values, use OpenTelemetry APIs:
    bag, err := baggage.Parse(values[0])
    ...
    userID := bag.Member("userId").Value()  // "cassie"
}
```

*HTTP 示例（URL 编码）：*
```bash
curl -X POST http://localhost:3500/v1.0/invoke/serviceB/method/hello \
  -H "Content-Type: application/json" \
  -H "baggage: userID=cassie,serverNode=DF%2028" \
  -d '{"message": "Hello service B"}'
```

*gRPC 示例（URL 编码）：*
```go
ctx = grpcMetadata.AppendToOutgoingContext(ctx,
    "baggage", "userID=cassie,serverNode=DF%2028",
)
```

{{% /tab %}}

{{< /tabpane >}}

#### 常见用例

Baggage 适用于：
- 跨服务传播用户 ID 或关联 ID
- 传递租户或环境信息
- 跨服务边界维护一致的上下文
- 调试和故障排除分布式事务

#### 最佳实践

1. **选择正确的机制**
   - 在使用 OpenTelemetry 时使用 Context Baggage
   - 在直接使用 HTTP/gRPC 时使用 Header Baggage

2. **安全考虑**
   - 注意 baggage 会跨服务边界传播
   - 不要在 baggage 中包含敏感信息
   - 记住上下文 baggage 和头 baggage 保持分离

## 相关链接

- [可观测性概念]({{% ref observability-concept.md %}})
- [用于分布式跟踪的 W3C Trace Context]({{% ref w3c-tracing-overview %}})
- [W3C Trace Context 规范](https://www.w3.org/TR/trace-context/)
- [可观测性快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/observability)
