---
type: docs
title: "分布式跟踪概述"
linkTitle: "概述"
weight: 10
description: "使用跟踪获取应用程序可见性的概述"
---

Dapr 使用 Open Telemetry（OTEL）和 Zipkin 协议进行分布式跟踪。OTEL 是行业标准，也是推荐使用的跟踪协议。

大多数 observability 工具都支持 OTEL，包括：
- [Google Cloud Operations](https://cloud.google.com/products/operations)
- [AWS X-ray](https://aws.amazon.com/xray/)
- [New Relic](https://newrelic.com)
- [Azure Monitor](https://azure.microsoft.com/services/monitor/)
- [Datadog](https://www.datadoghq.com)
- [Zipkin](https://zipkin.io/)
- [Jaeger](https://www.jaegertracing.io/)
- [SignalFX](https://www.signalfx.com/)
- [Dash0](https://www.dash0.com/)
- [Middleware](https://middleware.io/)

下图展示了 Dapr（使用 OTEL 和 Zipkin 协议）如何与多个 observability 工具集成。

{{< diagram observability-tracing >}}

## 场景

跟踪与 service invocation 和 pub/sub API 一起使用。你可以在使用这些 API 的服务之间传递跟踪上下文。跟踪有两种使用场景：

 1. Dapr 生成跟踪上下文，你将跟踪上下文传播到另一个服务。
 1. 你生成跟踪上下文，Dapr 将跟踪上下文传播到服务。

### 场景 1：Dapr 生成跟踪上下文头

#### 传播顺序服务调用

Dapr 负责创建跟踪头。但是，当有两个以上服务时，你需要负责在它们之间传播跟踪头。下面通过示例来说明这些场景：

##### 单次服务调用

例如，`service A -> service B`。

Dapr 在 `service A` 中生成跟踪头，然后从 `service A` 传播到 `service B`。无需进一步传播。

##### 多次顺序服务调用

例如，`service A -> service B -> 传播跟踪头到 -> service C`，依此类推，直至其他启用 Dapr 的服务。

Dapr 在请求开始时于 `service A` 中生成跟踪头，然后传播到 `service B`。之后，你需要负责获取这些头并将其传播到 `service C`，因为这取决于你的应用程序。

换句话说，如果应用程序调用 Dapr 并希望沿用已有的跟踪跨度（span）进行跟踪，它必须始终传播到 Dapr（本例中即从 `service B` 到 `service C`）。Dapr 始终将跟踪跨度传播给应用程序。

{{% alert title="注意" color="primary" %}}
Dapr SDK 中未提供用于传播和获取跟踪上下文的辅助方法。你需要使用 HTTP/gRPC 客户端，通过 HTTP 头和 gRPC metadata 传播和获取跟踪头。
{{% /alert %}}

##### 请求来自外部端点

例如，`从 gateway 服务到启用 Dapr 的服务 A`。

外部 gateway 入口调用 Dapr，Dapr 生成跟踪头并调用 `service A`。`Service A` 随后调用 `service B` 以及其他启用 Dapr 的服务。

你必须将跟踪头从 `service A` 传播到 `service B`。例如：`Ingress -> service A -> 传播跟踪头 -> service B`。这与[情况 2]({{% ref "tracing-overview.md#multiple-sequential-service-invocation-calls" %}})类似。

##### pub/sub 消息

Dapr 在发布的消息主题中生成跟踪头。对于 `rawPayload` 消息，可以指定 `traceparent` 头来传播跟踪信息。这些跟踪头会传播给监听该主题的任何服务。

自 Dapr 1.19 起，如果投递的消息不携带跟踪上下文（既没有 `traceparent`，也没有旧版 `traceid`），Dapr 会为本次投递启动一个新的根跨度，并将其 `traceparent` 头发送给应用程序。例如，这类情况包括在 Dapr 之外发布的消息，或从死信主题重新入队的消息。在 1.19 之前，这些投递没有跨度，`traceparent` 为空，因此不会出现在跟踪中。禁用跟踪时，行为不变。

#### 传播多个不同的服务调用

在以下场景中，Dapr 会替你完成部分工作，之后由你创建或传播跟踪头。

##### 从单个服务调用多个不同服务

当你从单个服务调用多个服务时，需要传播跟踪头。例如：

```
service A -> service B
[ .. some code logic ..]
service A -> service C
[ .. some code logic ..]
service A -> service D
[ .. some code logic ..]
```

在这种情况下：
1. 当 `service A` 首次调用 `service B` 时，Dapr 在 `service A` 中生成跟踪头。
1. `service A` 中的跟踪头被传播到 `service B`。
1. 这些跟踪头作为响应头的一部分，随 `service B` 的响应返回。
1. 然后，你需要将返回的跟踪上下文传播给后续服务（例如 `service C` 和 `service D`），因为 Dapr 不知道你希望复用同一个头。

### 场景 2：你从非 Dapr 应用程序生成自己的跟踪上下文头

生成自己的跟踪上下文头比较少见，调用 Dapr 时通常不需要这样做。

但在某些场景下，你可能会选择在服务调用中加入 W3C 跟踪头。例如，你有一个不使用 Dapr 的既有应用程序。在这种情况下，Dapr 仍会为你传播跟踪上下文头。

如果你决定自行生成跟踪头，可以通过以下三种方式实现：

1. 标准 OpenTelemetry SDK

   你可以使用行业标准的 [OpenTelemetry SDK](https://opentelemetry.io/docs/instrumentation/) 生成跟踪头，并将这些跟踪头传递给启用 Dapr 的服务。_这是首选方法_。

1. 供应商 SDK

   你可以使用提供 W3C 跟踪头生成方法的供应商 SDK，并将这些跟踪头传递给启用 Dapr 的服务。

1. W3C 跟踪上下文

   你可以按照 [W3C 跟踪上下文规范](https://www.w3.org/TR/trace-context/) 手动构造跟踪上下文，并将其传递给启用 Dapr 的服务。

   阅读[跟踪上下文概述]({{% ref w3c-tracing-overview %}})，了解有关 W3C 跟踪上下文和头的更多背景信息与示例。

### Baggage 支持

Dapr 支持两种机制，用于与跟踪上下文一起传播 W3C Baggage：

1. **Context Baggage（OpenTelemetry）**
   - 遵循 OpenTelemetry 约定，使用解码后的值
   - 在使用 OpenTelemetry 上下文传播时使用
   - 值以原始、未编码的形式存储和传输
   - 推荐用于 OpenTelemetry 集成，以及在处理应用程序上下文时使用

2. **Header/Metadata Baggage**
   - 设置 header/metadata baggage 时，必须对特殊字符进行 URL 编码（例如，空格编码为 `%20`，斜杠编码为 `%2F`）
   - 按照 W3C Baggage 规范的要求，值在传输过程中保持百分号编码
   - 检查原始 header/metadata 时，值保持编码状态
   - 只有 OpenTelemetry API 会解码这些值
   - 示例：设置 header baggage 时使用 `serverNode=DF%2028`（而不是 `serverNode=DF 28`）

出于安全考虑，context baggage 与 header baggage 严格分离，两者之间永不合并。这确保 baggage 值保持其预期的格式和安全属性。

#### 在 Dapr 中使用 Baggage

你可以根据使用场景，任选一种机制来传播 baggage。

1. **在应用程序代码中**：在调用 Dapr API 之前，在上下文中设置 baggage
2. **调用 Dapr 时**：将上下文传递给任意 Dapr API 调用
3. **在 Dapr 内部**：Dapr runtime 会自动获取 baggage
4. **传播**：Dapr 会自动将 baggage 传播给下游服务，并为每种机制保持相应的编码方式

以下是两种机制的示例：

**1. 使用 Context Baggage（OpenTelemetry）**

使用 OpenTelemetry SDK 时：

{{< tabpane text=true >}}

{{% tab header="Go" %}}

```go
import 	otelbaggage "go.opentelemetry.io/otel/baggage"

// 在上下文中设置 baggage（值保持未编码）
baggage, err = otelbaggage.Parse("userId=cassie,serverNode=DF%2028")
...
ctx := otelbaggage.ContextWithBaggage(t.Context(), baggage)
)

// 将此上下文传递给任意 Dapr API 调用
client.InvokeMethodWithContent(ctx, "serviceB", ...)
```

**2. 使用 Header/Metadata Baggage**

使用 gRPC metadata 时：
```go
import "google.golang.org/grpc/metadata"

// 在上下文中设置 URL 编码后的 baggage
ctx = metadata.AppendToOutgoingContext(ctx,
    "baggage", "userId=cassie,serverNode=DF%2028",
)

// 将此上下文传递给任意 Dapr API 调用
client.InvokeMethodWithContent(ctx, "serviceB", ...)
```

**3. 在目标服务中接收 Baggage**

在目标服务中，你可以访问所传播的 baggage：

```go
// 使用 OpenTelemetry（值会自动解码）
import "go.opentelemetry.io/otel/baggage"

bag := baggage.FromContext(ctx)
userID := bag.Member("userId").Value()  // "cassie"
```

```go
// 使用原始 gRPC metadata（值保持百分号编码）
import "google.golang.org/grpc/metadata"

md, _ := metadata.FromIncomingContext(ctx)
if values := md.Get("baggage"); len(values) > 0 {
    // values[0] 包含你设置的百分号编码字符串："userId=cassie,serverNode=DF%2028"
    // 请记住：设置 baggage 时必须对特殊字符进行 URL 编码

    // 要解码这些值，请使用 OpenTelemetry API：
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

Baggage 适用于以下场景：
- 在服务之间传播用户 ID 或关联 ID
- 传递租户或环境信息
- 跨服务边界保持一致的上下文
- 调试和排查分布式事务问题

#### 最佳实践

1. **选择合适的机制**
   - 使用 OpenTelemetry 时，使用 Context Baggage
   - 直接使用 HTTP/gRPC 时，使用 Header Baggage

2. **安全注意事项**
   - 注意 baggage 会跨服务边界传播
   - 不要在 baggage 中包含敏感信息
   - 请记住，context baggage 与 header baggage 保持分离

## 相关链接

- [Observability 概念]({{% ref observability-concept.md %}})
- [用于分布式跟踪的 W3C Trace Context]({{% ref w3c-tracing-overview %}})
- [W3C Trace Context 规范](https://www.w3.org/TR/trace-context/)
- [Observability quickstart](https://github.com/dapr/quickstarts/tree/master/tutorials/observability)
