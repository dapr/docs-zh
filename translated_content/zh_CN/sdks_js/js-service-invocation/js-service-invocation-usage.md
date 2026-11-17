---
type: docs
title: "Service invocation configuration and usage"
linkTitle: "配置与使用"
weight: 30
description: "为 JavaScript service invocation 配置客户端、序列化、身份验证和失败处理"
---

本指南适用于 `@dapr/dapr` 3.19.0 或更高版本。完整的应用示例请参阅[调用服务]({{% ref js-service-invocation-howto.md %}})和[接收调用]({{% ref js-service-invocation-server.md %}})。

## 客户端生命周期

请复用长期存活的 `DaprClient`，而不是为每次调用都创建一个新的实例。在应用关闭期间调用 `await client.stop()` 之前，请先等待所有未完成的工作结束。如果使用 `DaprServer`，请先调用 `await server.stop()` 停止其监听器，然后调用 `await server.client.stop()` 关闭其嵌入式客户端的资源。仅停止服务器并不会停止该客户端。

客户端在首次使用时会初始化连接并等待 sidecar 就绪。你可以在接收应用流量之前调用 `await client.start()` 检查就绪状态。该调用会连接到已有的 sidecar，而不会启动 Dapr runtime 进程。

## 端点与身份验证

HTTP 是默认协议。HTTP 客户端应使用 sidecar 的 HTTP 端口，gRPC 客户端应使用其 gRPC 端口。端口选项为字符串：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

当既未提供主机也未提供端口时，若已设置所选协议对应的环境变量 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`，SDK 就会使用它。否则，SDK 使用已配置的主机和端口；若未配置，则回退到 `127.0.0.1` 以及 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`（默认值分别为 `3500` 和 `50001`）。只要提供了主机或端口中的任意一个，就会绕过端点环境变量。

`daprApiToken` 默认取自 `DAPR_API_TOKEN`。它用于向调用方自身的 sidecar 进行身份验证，而不是目标服务的应用授权请求头。若需对 HTTP 目标进行授权，请通过 `InvokerOptions.headers` 提供相应的应用请求头。请参阅[Dapr API token 身份验证]({{% ref api-token.md %}})和[service invocation 访问控制]({{% ref invoke-allowlist.md %}})。

两种传输方式都会将活动的 OpenTelemetry 上下文中的 baggage 传播到 sidecar。这种内置的传播并不意味着 gRPC 调用器支持任意的 `options.headers` metadata。

## 负载限制

gRPC 客户端使用 `maxBodySizeMb` 设置其传输层的发送和接收上限（默认值：4 MiB）。HTTP 客户端接受同一选项，但目前并不强制执行该选项；HTTP 请求受 sidecar 和目标应用的限制。`DaprServer.maxBodySizeMb` 控制 HTTP 监听器的请求体解析器上限（默认值：4 MiB）。这是两个独立的设置；客户端的该选项并不是 HTTP 上传大小限制。

按需配置[Dapr sidecar 的请求体大小限制]({{% ref arguments-annotations-overview.md %}})以及目标应用自身的限制。提高上限并不会启用流式传输，也不会取消调用器对响应的缓冲。

## 序列化

### 默认行为

对象和数组使用 JSON。底层的序列化辅助函数还支持文本和二进制请求数据（包括 `Buffer`），并会推断内容类型。公开的 `invoke()` TypeScript 签名接受 `data?: object`，因此原始类型的负载不在该类型化契约之内。

对于 HTTP，`options.headers["Content-Type"]` 会覆盖推断出的请求内容类型。SDK 选择序列化器时对大小写有要求，因此请使用这一精确写法。成功的 HTTP 响应会被完整读取为文本；无论响应的内容类型为何，只要可能，都会将其解析为 JSON，否则直接返回文本。

对于 gRPC，默认的请求序列化器会推断内容类型，并且不使用 headers 选项。响应以 UTF-8 解码，且必须包含 JSON。发送二进制数据并不会使其成为二进制响应的 API：两种调用器都不会暴露响应字节或响应流。

### 配置应用序列化器

在 `DaprClient` 上设置 `serializer`，在 `DaprServer` 上设置 `clientOptions.serializer`。`IDaprSerializer` 作为类型从 `@dapr/dapr` 导出，其定义如下：

```typescript
interface IDaprSerializer {
  readonly contentType?: string;
  serialize<T>(value: T): string;
  deserialize<T = unknown>(data: string): T;
}
```

SDK 还导出了 `JsonSerializer`。例如，以下可选的 JSON 配置可确保服务器返回的、除 `undefined` 之外的假值（falsy）也会被序列化：

```javascript
import { DaprClient, DaprServer, JsonSerializer } from "@dapr/dapr";

const serializer = new JsonSerializer();
const client = new DaprClient({ daprPort: "3501", serializer });
const server = new DaprServer({
  serverPort: "3000",
  clientOptions: { daprPort: "3500", serializer },
});
```

该配置片段不会启动服务器。若要使用自定义编码，请实现 `IDaprSerializer`，并在两端配置兼容的序列化器。其传输表示为字符串；二进制格式必须使用字符串安全的表示形式，例如 base64。序列化错误会使该操作被拒绝。

调用时，客户端会序列化请求并反序列化响应。对于空响应，HTTP 会跳过自定义的响应反序列化；gRPC 则会将空的响应字符串也传递给反序列化器。

服务器端的调用回调仍然接收字符串类型的请求体，需要显式对其进行反序列化：

```javascript
import { HttpMethod } from "@dapr/dapr";

await server.invoker.listen("echo", async (request) => {
  // HTTP 在缺少请求体时传入 undefined；gRPC 则传入空字符串。
  if (!request.body) {
    throw new Error("An invocation body is required");
  }
  return serializer.deserialize(request.body);
}, { method: HttpMethod.POST });
```

使用自定义序列化器时，HTTP 会在调用处理程序之前，将非 JSON 的文本或缓冲区请求体保留为字符串。JSON 请求体仍会经过 HTTP 的 JSON 解析器，并被重新字符串化。服务器会使用其已配置的序列化器对回调的返回值进行序列化。

序列化器的 `contentType` 默认为 `application/json`。使用自定义序列化器时，两种客户端都可以通过 `headers["Content-Type"]` 覆盖它，但 gRPC 客户端仍不会转发其他自定义请求头。更改内容类型并不会改变序列化器的实现。

## 错误与响应信息

请等待调用结果，并在应用程序的错误边界处理失败。不要将被拒绝的 Promise 视为目标未执行该操作的证明。

| 失败 | 行为 |
| --- | --- |
| HTTP sidecar 或应用程序返回错误响应 | 以 `Error` 拒绝，其消息为一个 JSON 字符串，包含 `status`、`error`（状态文本）和 `error_msg`（响应体）。HTTP 辅助函数接受 200 至 399 的状态码；重定向由其底层 HTTP 客户端处理。 |
| HTTP 连接或序列化错误 | 以底层错误拒绝，该错误不一定包含 JSON 消息。 |
| gRPC 传输或运行时失败 | 以传输错误拒绝；ConnectRPC 的失败使用 `ConnectError` 错误码，而不是 HTTP 状态码数字。 |
| 未配置自定义序列化器时，gRPC 返回非 JSON 或空响应 | 以 `Error` 拒绝，其 JSON 消息包含 `error: "COULD_NOT_PARSE_RESULT"` 和 `error_msg`。 |
| 自定义响应反序列化失败 | 以序列化器的错误拒绝。 |

`invoke()` 仅返回解码后的响应体。它不会暴露成功的状态码、响应头、尾部（trailers）或每次调用的结构化响应 metadata。

目前，缺少 gRPC 回调注册时只会记录警告，并返回空的调用响应，而不是“未找到”的应用负载。随后，默认的 gRPC 客户端会解析失败。在诊断方法或动词不匹配的问题时，应同时检查目标端的日志和调用方的错误。

## 超时、取消与 resiliency

`InvokerOptions` 仅包含 `headers`。`invoke()` 不提供 `AbortSignal`、超时、截止时间、重试策略或任意的 gRPC 调用选项。不要照搬其他 SDK 的超时选项，也不要依赖那些展示了不受支持选项的示意性 API 注释。

请通过[Dapr resiliency 策略]({{% ref resiliency-overview.md %}})配置运行时的超时、重试和断路器。策略在运行时中生效，不会为 JavaScript 方法增加客户端侧的取消功能。本地的 `Promise.race()` 超时只会让调用方停止等待；它不会取消请求或远程处理。

对会改变状态的处理程序进行设计时，应能容忍重试，例如使用应用请求 ID 进行去重。超时或响应解码失败，可能发生在目标已经提交其工作之后。

## 原生 gRPC 服务与流式传输

在此版本中，`client.proxy.create()` 无法作为替代方案使用。HTTP 会以 `HTTPNotSupportedError` 拒绝；gRPC 则会因为 ConnectRPC 传输不支持 `GRPCClientProxy` 而拒绝。

对于原生的 protobuf 服务，请创建一个连接到调用方 sidecar 的生成式 gRPC 客户端，并按照[使用 gRPC 调用服务]({{% ref howto-invoke-services-grpc.md %}})中的说明附加 `dapr-app-id` metadata。这属于运行时的 gRPC 代理，与 SDK 的一元 `invoke()` 以及 `DaprServer` 回调 API 相互独立。

对于需要流式传输的大型 HTTP 请求或响应，请使用[运行时的 HTTP 流式支持]({{% ref "service-invocation-overview.md#streaming-for-http-service-invocation" %}})，并搭配能够暴露流的 HTTP 客户端和服务器。JavaScript 调用器会缓冲完整的响应，且没有流式重载。
