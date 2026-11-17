---
type: docs
title: "How to: Implement pluggable components"
linkTitle: "实现 pluggable components"
weight: 1100
description: "了解如何编写和实现 pluggable components"
---

在本指南中，你将了解为何以及如何实现 [pluggable component]({{% ref pluggable-components-overview %}})。要了解如何配置和注册 pluggable component，请参阅 [如何操作：注册 pluggable component]({{% ref pluggable-components-registration.md %}})

## 实现 pluggable component

为了实现 pluggable component，你需要在该组件中实现一个 gRPC 服务。实现 gRPC 服务需要三个步骤：

### 查找 proto 定义文件

为每个受支持的服务接口（state store、pub/sub、bindings、secret store）都提供了 Proto 定义。

目前支持以下 component API：

- State stores
- Pub/sub
- Bindings
- Secret stores

|  Component  |    类型    | gRPC 定义  |                       内置参考实现                        | 文档                                                                                                                                                                  |
| :---------: | :--------: | :--------------: | :----------------------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State Store |  `state`   |  [state.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/state.proto)   |  [Redis](https://github.com/dapr/components-contrib/tree/master/state/redis)   | [概念]({{% ref "state-management-overview" %}}), [如何操作]({{% ref "howto-get-save-state" %}}), [api 规范]({{% ref "state_api" %}})                                        |
|   Pub/sub   |  `pubsub`  |  [pubsub.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/pubsub.proto)  |  [Redis](https://github.com/dapr/components-contrib/tree/master/pubsub/redis)  | [概念]({{% ref "pubsub-overview" %}}), [如何操作]({{% ref "howto-publish-subscribe" %}}), [api 规范]({{% ref "pubsub_api" %}})                                              |
|  Bindings   | `bindings` | [bindings.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/bindings.proto) | [Kafka](https://github.com/dapr/components-contrib/tree/master/bindings/kafka) | [概念]({{% ref "bindings-overview" %}}), [输入如何操作]({{% ref "howto-triggers" %}}), [输出如何操作]({{% ref "howto-bindings" %}}), [api 规范]({{% ref "bindings_api" %}}) |
|  Secret Store   | `secretstores` | [secretstore.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/secretstore.proto) | [Hashicorp/Vault](https://github.com/dapr/components-contrib/blob/master/secretstores/hashicorp/vault/vault.go) | [概念]({{% ref "secrets-overview" %}}), [如何操作]({{% ref "howto-secrets" %}}), [api 规范]({{% ref "secrets_api" %}}) |

以下是 pluggable component 状态存储（[state.proto]）的 gRPC 服务定义片段：

```protobuf
// StateStore 服务为 state store components 提供 gRPC 接口。
service StateStore {
  // 使用给定的 metadata 初始化 state store component。
  rpc Init(InitRequest) returns (InitResponse) {}
  // 返回已实现的 state store 功能列表。
  rpc Features(FeaturesRequest) returns (FeaturesResponse) {}
  // Ping state store，用于存活性检查。
  rpc Ping(PingRequest) returns (PingResponse) {}
  
  // 从 state store 中删除指定的键。
  rpc Delete(DeleteRequest) returns (DeleteResponse) {}
  // 从给定的键获取数据。
  rpc Get(GetRequest) returns (GetResponse) {}
  // 设置指定键的值。
  rpc Set(SetRequest) returns (SetResponse) {}


  // 一次删除多个键。
  rpc BulkDelete(BulkDeleteRequest) returns (BulkDeleteResponse) {}
  // 一次检索多个键。
  rpc BulkGet(BulkGetRequest) returns (BulkGetResponse) {}
  // 一次设置多个键的值。
  rpc BulkSet(BulkSetRequest) returns (BulkSetResponse) {}
}
```

`StateStore` 服务的接口共公开了 9 个方法：

- 2 个方法用于初始化和组件能力声明（Init 和 Features）
- 1 个方法用于健康或存活性检查（Ping）
- 3 个方法用于 CRUD 操作（Get、Set、Delete）
- 3 个方法用于批量 CRUD 操作（BulkGet、BulkSet、BulkDelete）

### 创建服务脚手架 

使用 [protocol buffers 和 gRPC 工具](https://grpc.io) 为服务创建必要的脚手架。通过 [gRPC 概念文档](https://grpc.io/docs/what-is-grpc/core-concepts/) 了解有关这些工具的更多信息。

这些工具可生成面向[任何支持 gRPC 的语言](https://grpc.io/docs/what-is-grpc/introduction/#protocol-buffer-versions)的代码。此代码是服务器的基础，它提供：
- 处理客户端调用的功能
- 基础设施，用于：
  - 解码传入请求
  - 执行服务方法
  - 编码服务响应

生成的代码并不完整，它缺少：

- 目标服务所定义方法的具体实现（pluggable component 的核心）。
- 处理 Unix Socket Domain 集成的代码，这是 Dapr 特有的。
- 处理与下游服务集成的代码。

在下一步中，你将了解如何填补这些空白。

### 定义服务

为所需的服务提供具体实现。每个 component 都有一个用于其核心功能的 gRPC 服务定义，它与核心 component 接口相同。例如：

- **State stores**

   pluggable state store **必须**提供 `StateStore` 服务接口的实现。
   
   除了此核心功能外，某些 component 还可能在其他**可选**服务下公开功能。例如，你可以通过为 `QueriableStateStore` 服务和 `TransactionalStateStore` 服务定义实现来添加额外功能。
   
- **Pub/sub**

   pluggable pub/sub components 只有一个在 [pubsub.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/pubsub.proto) 中定义的核心服务接口。它们没有可选服务接口。
 
- **Bindings**

   pluggable 输入和输出 bindings 在 [bindings.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/bindings.proto) 上有一个单一的核心服务定义。它们没有可选服务接口。

- **Secret Store**

   pluggable secret store 在 [secretstore.proto](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/secretstore.proto) 上有一个单一的核心服务定义。它们没有可选服务接口。

使用 gRPC 和 protocol buffers 工具生成上述 state store 示例的服务脚手架代码后，你可以为 `service StateStore` 下定义的 9 个方法定义具体实现，以及用于初始化并与依赖项通信的代码。

这些具体实现和辅助代码是你的 pluggable component 的**核心**。它们定义了 component 在处理来自 Dapr 的 gRPC 请求时的行为。

## 返回语义错误

返回语义错误也是 pluggable component 协议的一部分。component 必须返回对用户应用程序具有语义含义的特定 gRPC 代码，这些错误用于多种场景，从并发要求到仅用于提供信息的场景均有涵盖。

| 错误                    | gRPC 错误代码                 | 来源 component | 描述 |
| ------------------------ | ------------------------------- | ---------------- | ----------- |
| ETag 不匹配            | `codes.FailedPrecondition`      | state store      | 用于满足并发要求的错误映射 |
| ETag 无效             | `codes.InvalidArgument`         | state store      |  |
| 批量删除行不匹配 | `codes.Internal`                | state store      |  |

在 [State Management 概述]({{% ref "state-management-overview.md#concurrency" %}}) 中了解有关并发要求的更多信息。

以下示例演示了如何在你自己的 pluggable component 中返回错误，你可以根据需要更改消息。

{{< tabpane text=true >}}
 <!-- .NET -->
{{% tab ".NET" %}}

> **重要提示：** 为了使用 .NET 进行错误映射，请先安装 [`Google.Api.CommonProtos` NuGet 包](https://www.nuget.org/packages/Google.Api.CommonProtos/)。

**Etag 不匹配**

```csharp
var badRequest = new BadRequest();
var des = "The ETag field provided does not match the one in the store";
badRequest.FieldViolations.Add(    
   new Google.Rpc.BadRequest.Types.FieldViolation
       {        
         Field = "etag",
         Description = des
       });

var baseStatusCode = Grpc.Core.StatusCode.FailedPrecondition;
var status = new Google.Rpc.Status{    
   Code = (int)baseStatusCode
};

status.Details.Add(Google.Protobuf.WellKnownTypes.Any.Pack(badRequest));

var metadata = new Metadata();
metadata.Add("grpc-status-details-bin", status.ToByteArray());
throw new RpcException(new Grpc.Core.Status(baseStatusCode, "fake-err-msg"), metadata);
```

**Etag 无效**

```csharp
var badRequest = new BadRequest();
var des = "The ETag field must only contain alphanumeric characters";
badRequest.FieldViolations.Add(
   new Google.Rpc.BadRequest.Types.FieldViolation
   {
      Field = "etag",
      Description = des
   });

var baseStatusCode = Grpc.Core.StatusCode.InvalidArgument;
var status = new Google.Rpc.Status
{
   Code = (int)baseStatusCode
};

status.Details.Add(Google.Protobuf.WellKnownTypes.Any.Pack(badRequest));

var metadata = new Metadata();
metadata.Add("grpc-status-details-bin", status.ToByteArray());
throw new RpcException(new Grpc.Core.Status(baseStatusCode, "fake-err-msg"), metadata);
```

**批量删除行不匹配**

```csharp
var errorInfo = new Google.Rpc.ErrorInfo();

errorInfo.Metadata.Add("expected", "100");
errorInfo.Metadata.Add("affected", "99");

var baseStatusCode = Grpc.Core.StatusCode.Internal;
var status = new Google.Rpc.Status{
    Code = (int)baseStatusCode
};

status.Details.Add(Google.Protobuf.WellKnownTypes.Any.Pack(errorInfo));

var metadata = new Metadata();
metadata.Add("grpc-status-details-bin", status.ToByteArray());
throw new RpcException(new Grpc.Core.Status(baseStatusCode, "fake-err-msg"), metadata);
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

与 [Dapr Java SDK](https://github.com/tmacam/dapr-java-sdk/) 一样，Java Pluggable Components SDK 使用 [Project Reactor](https://projectreactor.io/)，它为 Java 提供异步 API。

可以通过以下方式直接返回错误：
1. 在方法返回的 `Mono` 或 `Flux` 上调用 `.error()` 方法
1. 提供适当的异常作为参数。 

你也可以抛出异常，只要该异常被捕获并反馈到生成的 `Mono` 或 `Flux` 中。

**ETag 不匹配**

```java
final Status status = Status.newBuilder()
    .setCode(io.grpc.Status.Code.FAILED_PRECONDITION.value())
    .setMessage("fake-err-msg-for-etag-mismatch")
    .addDetails(Any.pack(BadRequest.FieldViolation.newBuilder()
        .setField("etag")
        .setDescription("The ETag field provided does not match the one in the store")
        .build()))
    .build();
return Mono.error(StatusProto.toStatusException(status));
```

**ETag 无效**

```java
final Status status = Status.newBuilder()
    .setCode(io.grpc.Status.Code.INVALID_ARGUMENT.value())
    .setMessage("fake-err-msg-for-invalid-etag")
    .addDetails(Any.pack(BadRequest.FieldViolation.newBuilder()
        .setField("etag")
        .setDescription("The ETag field must only contain alphanumeric characters")
        .build()))
    .build();
return Mono.error(StatusProto.toStatusException(status));
```

**批量删除行不匹配**

```java
final Status status = Status.newBuilder()
    .setCode(io.grpc.Status.Code.INTERNAL.value())
    .setMessage("fake-err-msg-for-bulk-delete-row-mismatch")
    .addDetails(Any.pack(ErrorInfo.newBuilder()
        .putAllMetadata(Map.ofEntries(
            Map.entry("affected", "99"),
            Map.entry("expected", "100")
        ))
        .build()))
    .build();
return Mono.error(StatusProto.toStatusException(status));
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

**ETag 不匹配**

```go
st := status.New(codes.FailedPrecondition, "fake-err-msg")
desc := "The ETag field provided does not match the one in the store"
v := &errdetails.BadRequest_FieldViolation{
	Field:       etagField,
	Description: desc,
}
br := &errdetails.BadRequest{}
br.FieldViolations = append(br.FieldViolations, v)
st, err := st.WithDetails(br)
```

**ETag 无效**

```go
st := status.New(codes.InvalidArgument, "fake-err-msg")
desc := "The ETag field must only contain alphanumeric characters"
v := &errdetails.BadRequest_FieldViolation{
	Field:       etagField,
	Description: desc,
}
br := &errdetails.BadRequest{}
br.FieldViolations = append(br.FieldViolations, v)
st, err := st.WithDetails(br)
```

**批量删除行不匹配**

```go
st := status.New(codes.Internal, "fake-err-msg")
br := &errdetails.ErrorInfo{}
br.Metadata = map[string]string{
	affected: "99",
	expected: "100",
}
st, err := st.WithDetails(br)
```

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

- 使用此[示例代码](https://github.com/dapr/samples/tree/master/pluggable-components-dotnet-template)开始开发 .NET pluggable component 
- [查看 pluggable components 概述]({{% ref pluggable-components-overview.md %}})
- [了解如何注册你的 pluggable component]({{% ref pluggable-components-registration %}})
