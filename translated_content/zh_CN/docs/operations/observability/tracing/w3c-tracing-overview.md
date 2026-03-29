---
type: docs
title: "W3C 追踪上下文概述"
linkTitle: "W3C 追踪上下文"
weight: 20
description: 在 Dapr 中使用 W3C 追踪上下文和标头的背景与场景
---

Dapr 使用 [Open Telemetry 协议](https://opentelemetry.io/)，而该协议又使用 [W3C 追踪上下文](https://www.w3.org/TR/trace-context/)进行分布式追踪，涵盖服务调用和发布订阅消息。Dapr 生成并传播追踪上下文信息，可将其发送到可观测性工具以进行可视化和查询。

## 背景

分布式追踪是追踪工具实现的一种方法论，用于跟踪、分析和调试跨越多个软件组件的事务。

通常，分布式追踪会跨越多个服务，因此需要能够唯一标识。**追踪上下文传播**会传递这一唯一标识。

过去，追踪上下文传播由各个追踪供应商单独实现。在多供应商环境中，这会导致互操作性问题，例如：

- 不同追踪供应商收集的追踪无法关联，因为没有共享的唯一标识符。
- 跨越不同追踪供应商边界的追踪无法传播，因为没有转发统一约定的标识符集。
- 特定于供应商的元数据可能会被中间设备丢弃。
- 云平台供应商、中间设备和服务提供商无法保证支持追踪上下文传播，因为没有可遵循的标准。

以前，大多数应用程序由单个追踪供应商监控，并保持在单个平台供应商的边界内，因此这些问题没有产生重大影响。

如今，越来越多的应用程序是分布式的，并利用多个中间件服务和云平台。现代应用程序的这一转变需要一个分布式追踪上下文传播标准。

[W3C 追踪上下文规范](https://www.w3.org/TR/trace-context/)定义了交换追踪上下文传播数据（称为追踪上下文）的通用约定格式。追踪上下文通过提供以下功能解决了上述问题：

- 为单个追踪和请求提供唯一标识符，允许多个提供商的追踪数据链接在一起。
- 约定的机制转发特定于供应商的追踪数据，并在多个追踪工具参与单个事务时避免追踪中断。
- 中间设备、平台和硬件提供商可以支持的行业标准。

这种统一的追踪数据传播方法提高了对分布式应用程序行为的可见性，便于进行问题和性能分析。

## W3C 追踪上下文和标头格式

### W3C 追踪上下文

Dapr 使用标准的 W3C 追踪上下文标头。

- 对于 HTTP 请求，Dapr 使用 `traceparent` 标头。
- 对于 gRPC 请求，Dapr 使用 `grpc-trace-bin` 标头。

当请求到达时没有追踪 ID，Dapr 会创建一个新的。否则，它会将追踪 ID 沿调用链传递。

### W3C 追踪标头
以下是 Dapr 为 HTTP 和 gRPC 生成和传播的特定追踪上下文标头。

{{< tabpane text=true >}}

{{% tab "HTTP" %}}

在将追踪上下文标头从 HTTP 响应传播到 HTTP 请求时，复制这些标头：

**Traceparent 标头**  

traceparent 标头以通用格式表示追踪系统中的传入请求，所有供应商都能理解：

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

[了解有关 traceparent 字段详细信息](https://www.w3.org/TR/trace-context/#traceparent-header)。

**Tracestate 标头**  

tracestate 标头以可能特定于供应商的格式包含父级：

```
tracestate: congo=t61rcWkgMzE
```

[了解有关 tracestate 字段详细信息](https://www.w3.org/TR/trace-context/#tracestate-header)。

**Baggage 支持**

Dapr 支持 [W3C Baggage](https://www.w3.org/TR/baggage/)，通过两种不同的机制传播键值对以及追踪上下文：

1. **上下文 Baggage（OpenTelemetry）**
   - 遵循 OpenTelemetry 约定，使用解码值
   - 通过应用程序上下文传播 baggage 时使用
   - 值以其原始的、未编码的形式存储
   - 使用 OpenTelemetry API 打印的示例：
     ```
     baggage: userId=cassie,serverNode=DF 28,isVIP=true
     ```

2. **HTTP 标头 Baggage**
   - 设置标头 baggage 时必须对特殊字符进行 URL 编码（例如，空格用 `%20`，斜杠用 `%2F`）
   - 值根据 W3C Baggage 规范的要求，在 HTTP 标头中保持百分比编码
   - 在 Dapr 中检查原始标头时，值保持编码状态
   - 只有像 `otelbaggage.Parse()` 这样的 OpenTelemetry API 会解码值
   - 示例（注意 URL 编码的空格 `%20`）：
     ```bash
     curl -X POST http://localhost:3500/v1.0/invoke/serviceB/method/hello \
       -H "Content-Type: application/json" \
       -H "baggage: userId=cassie,serverNode=DF%2028,isVIP=true" \
       -d '{"message": "Hello service B"}'
     ```

出于安全目的，上下文 baggage 和标头 baggage 严格分离，永不跨域合并。这确保 baggage 值在每个域中保持其预期的格式和安全属性。

支持多个 baggage 标头，将根据 W3C 规范进行组合。Dapr 在服务调用之间自动传播 baggage，同时为每个域维护适当的编码。

{{% /tab %}}

{{% tab "gRPC" %}}

在 gRPC API 调用中，追踪上下文通过 `grpc-trace-bin` 标头传递。

**Baggage 支持**

Dapr 支持 [W3C Baggage](https://www.w3.org/TR/baggage/)，通过两种不同的机制传播键值对以及追踪上下文：

1. **上下文 Baggage（OpenTelemetry）**
   - 遵循 OpenTelemetry 约定，使用解码值
   - 通过 gRPC 上下文传播 baggage 时使用
   - 值以其原始的、未编码的形式存储
   - 使用 OpenTelemetry API 打印的示例：
     ```
     baggage: userId=cassie,serverNode=DF 28,isVIP=true
     ```

2. **gRPC 元数据 Baggage**
   - 设置元数据 baggage 时必须对特殊字符进行 URL 编码（例如，空格用 `%20`，斜杠用 `%2F`）
   - 值在 gRPC 元数据中保持百分比编码
   - 示例（注意 URL 编码的空格 `%20`）：
     ```
     baggage: userId=cassie,serverNode=DF%2028,isVIP=true
     ```

出于安全目的，上下文 baggage 和元数据 baggage 严格分离，永不跨域合并。这确保 baggage 值在每个域中保持其预期的格式和安全属性。

支持多个 baggage 元数据条目，将根据 W3C 规范进行组合。Dapr 在服务调用之间自动传播 baggage，同时为每个域维护适当的编码。

{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [了解 Dapr 中的分布式追踪的更多信息]({{% ref tracing-overview.md %}})
- [W3C 追踪上下文规范](https://www.w3.org/TR/trace-context/)
