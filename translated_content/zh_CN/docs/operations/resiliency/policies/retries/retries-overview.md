---
type: docs
title: "重试 resiliency 策略"
linkTitle: "概述"
weight: 10
description: "为重试配置 resiliency 策略"
---

请求可能因瞬时错误而失败，例如遇到网络拥塞、重新路由到过载实例等。有时，请求也可能因已设置的其他 resiliency 策略而失败，例如触发了定义的超时或断路器策略。

在这些情况下，配置 `retries` 可以：
- 将相同请求发送到不同的实例，或
- 在条件清除后重试发送请求。

重试和超时协同工作，超时确保你的系统在需要时快速失败，而重试从临时故障中恢复。

Dapr 提供[默认 resiliency 策略]({{% ref default-policies.md %}})，你可以使用[用户定义的 retry policies 覆盖它们。]({{% ref override-default-retries.md %}})

{{% alert title="重要" color="warning" %}}
每个[pub/sub component]({{% ref supported-pubsub %}})都有自己的内置重试行为。显式应用 Dapr resiliency 策略不会覆盖这些隐式 retry policies。相反，resiliency 策略会增强内置重试，这可能导致消息重复聚集。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
对于 HTTP [service invocation]({{% ref service-invocation-overview %}})，流式请求（即使用分块传输编码或没有已知 `Content-Length` 的请求）会自动绕过 retry policies。由于请求体在读取时被消费，无法在重试时重放。具有已知 `Content-Length` 的非流式请求仍像以前一样支持重试。了解更多关于[流式 HTTP service invocation 与 resiliency]({{% ref "service-invocation-overview#streaming-requests-and-resiliency" %}})的信息。
{{% /alert %}}

## Retry policy format

**示例 1**

```yaml
spec:
  policies:
    # Retries are named templates for retry configurations and are instantiated for life of the operation.
    retries:
      pubsubRetry:
        policy: constant
        duration: 5s
        maxRetries: 10

      retryForever:
        policy: exponential
        maxInterval: 15s
        maxRetries: -1 # Retry indefinitely
```

**示例 2**

```yaml
spec:
  policies:
    retries:
      retry5xxOnly:
        policy: constant
        duration: 5s
        maxRetries: 3
        matching:
          httpStatusCodes: "429,500-599" # retry the HTTP status codes in this range. All others are not retried. 
          gRPCStatusCodes: "1-4,8-11,13,14" # retry gRPC status codes in these ranges and separate single codes.
```

## 规范元数据

以下重试选项是可配置的：

| 重试选项 | 描述 |
| ------------ | ----------- |
| `policy` | 确定退避和重试间隔策略。有效值为 `constant` 和 `exponential`。<br/>默认为 `constant`。 |
| `duration` | 确定重试之间的时间间隔。仅适用于 `constant` 策略。<br/>有效值为 `200ms`、`15s`、`2m` 等格式。<br/> 默认为 `5s`。|
| `maxInterval` | 确定[`exponential` 退避策略](#指数退避策略)可以增长到的重试之间的最大间隔。<br/>额外的重试总是在 `maxInterval` 的持续时间后发生。默认为 `60s`。有效值为 `5s`、`1m`、`1m30s` 等格式。 |
| `maxRetries` | 要尝试的最大重试次数。<br/>`-1` 表示无限次重试，而 `0` 表示不会重试请求（本质上表现为未设置 retry policy）。<br/>默认为 `-1`。 |
| `matching.httpStatusCodes` | 可选：逗号分隔的[要重试的 HTTP 状态码或状态码范围](#重试状态码)字符串。未列出的状态码不会被重试。<br/>有效值：100-599，[参考](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)<br/>格式：`<code>` 或范围 `<start>-<end>`<br/>示例："429,501-503"<br/>默认：空字符串 `""` 或未设置字段。重试所有 HTTP 错误。 |
| `matching.gRPCStatusCodes` | 可选：逗号分隔的[要重试的 gRPC 状态码或状态码范围](#重试状态码)字符串。未列出的状态码不会被重试。<br/>有效值：0-16，[参考](https://grpc.io/docs/guides/status-codes/)<br/>格式：`<code>` 或范围 `<start>-<end>`<br/>示例："4,8,14"<br/>默认：空字符串 `""` 或未设置字段。重试所有 gRPC 错误。 |


## 指数退避策略

指数退避窗口使用以下公式：

```
BackOffDuration = PreviousBackOffDuration * (Random value from 0.5 to 1.5) * 1.5
if BackOffDuration > maxInterval {
  BackoffDuration = maxInterval
}
```

## 重试状态码

当应用程序跨越多个服务时，特别是在像 Kubernetes 这样的动态环境中，服务可能因各种原因而消失，网络调用可能会开始挂起。状态码为我们的操作提供了一个视角，可以看出它们在生产环境中可能在哪里失败。

### HTTP

下表列出了你可能收到的一些 HTTP 状态码示例，以及某些操作是否应该重试。

| HTTP 状态码          | 建议重试？     | 描述                  |
| ------------------------- | ---------------------- | ---------------------------- |
| 404 Not Found             | ❌ 否                  | 资源不存在。  |
| 400 Bad Request           | ❌ 否                  | 你的请求无效。     |
| 401 Unauthorized          | ❌ 否                  | 尝试获取新凭据。 |
| 408 Request Timeout       | ✅ 是                 | 服务器等待请求超时。       |
| 429 Too Many Requests     | ✅ 是                 | （如果存在，请遵守 `Retry-After` 头）。     |
| 500 Internal Server Error | ✅ 是                 | 服务器遇到意外情况。       |
| 502 Bad Gateway           | ✅ 是                 | 网关或代理收到无效响应。     |
| 503 Service Unavailable   | ✅ 是                 | 服务可能会恢复。       |
| 504 Gateway Timeout       | ✅ 是                 | 临时网络问题。     |

### gRPC

下表列出了你可能收到的一些 gRPC 状态码示例，以及某些操作是否应该重试。

| gRPC 状态码          | 建议重试？      | 描述                  |
| ------------------------- | ----------------------- | ---------------------------- |
| Code 1 CANCELLED          | ❌ 否                   | N/A                          |
| Code 3 INVALID_ARGUMENT   | ❌ 否                   | N/A                          |
| Code 4 DEADLINE_EXCEEDED  | ✅ 是                  | 使用退避重试           |
| Code 5 NOT_FOUND          | ❌ 否                   | N/A                          |
| Code 8 RESOURCE_EXHAUSTED | ✅ 是                  | 使用退避重试           |
| Code 14 UNAVAILABLE       | ✅ 是                  | 使用退避重试           |

### 基于状态码的 Retry filter

retry filter 允许通过指定应用重试的 HTTP 和 gRPC 状态码或范围，对 retry policies 进行细粒度控制。

```yml
spec:
  policies:
    retries:
      retry5xxOnly:
        # ...
        matching:
          httpStatusCodes: "429,500-599" # retry the HTTP status codes in this range. All others are not retried. 
          gRPCStatusCodes: "4,8-11,13,14" # retry gRPC status codes in these ranges and separate single codes.
```

基于状态码的重试过滤仅作用于对你的应用程序调用的传输层状态码。它不适用于 [bulk subscribe]({{% ref pubsub-bulk.md %}})，因为该状态不以 HTTP 或 gRPC 状态码的形式携带。例如，bulk subscribe handler 为某个条目返回 `RETRY` 时，无论配置了哪些状态码，始终都会按照策略设置进行重试。

{{% alert title="注意" color="primary" %}}
状态码的字段值必须遵循上述指定的格式。格式错误的值会产生错误日志（“Could not read resiliency policy”），并且 `daprd` 启动序列将继续。
{{% /alert %}}

## 演示

观看 [Diagrid 的 Dapr v1.15 庆祝活动](https://www.diagrid.io/videos/dapr-1-15-deep-dive)期间的演示，了解如何使用 Diagrid Dapr Ops Dashboard 设置重试状态码过滤器。

{{< youtube id=NTnwoDhHIcQ start=4565 >}}

## 后续步骤

- [了解如何为特定 API 覆盖默认 retry policies。]({{< ref override-default-retries.md >}})
- [了解如何从 resiliency 规范中定位你的 retry policies。]({{% ref targets.md %}})
- 了解更多：
  - [超时策略]({{% ref timeouts.md %}})
  - [断路器策略]({{% ref circuit-breakers.md %}})

## 相关链接

尝试其中一个 resiliency 快速入门：
- [Resiliency：服务到服务]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [Resiliency：State Management]({{% ref resiliency-state-quickstart.md %}})
