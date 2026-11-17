---
type: docs
title: "DaprBinaryStoreClient usage"
linkTitle: "DaprBinaryStoreClient 用法"
weight: 53100
description: 配置与使用 DaprBinaryStoreClient 的必备指南
---

本页的操作针对 SDK `1.19.0` 版本。请将该版本或更高版本与 Dapr runtime 1.19 或更高版本一起使用。

## 操作一览

| 操作 | API |
| --- | --- |
| 上传 | 使用 `Stream` 或 `ReadOnlyMemory<byte>` 的 `SetBinaryFileAsync`，可选择覆盖已有文件。 |
| 下载 | `GetBinaryFileChunksAsync`、写入目标流的 `GetBinaryFileAsync`，或将完整文件缓冲到内存中的 `GetBinaryFileBytesAsync`。 |
| 删除 | `DeleteBinaryFileAsync`。 |
| 绑定存储的访问 | 在 `IDaprBinaryStoreClient` 的 partial 接口上使用 `[BinaryStore]`，以及生成的 `With...` DI 注册。 |

本版 SDK 不提供列出文件、文件 metadata、条件式/ETag 写入或范围读取方法。
Binary Store 文件不是状态条目；state transaction 和状态 Query API 不适用于它们。

## 客户端生命周期

`DaprBinaryStoreClient` 会使用网络资源，并实现 `IDisposable`。应复用长期存活的客户端，而不是为每次操作都创建一个。依赖注入注册默认使用 `ServiceLifetime.Singleton`；如需其他生命周期，可使用可选的 `lifetime` 参数进行选择。

```csharp
using Dapr.BinaryStore.Extensions;
using Microsoft.Extensions.DependencyInjection;

builder.Services.AddDaprBinaryStoreClient(lifetime: ServiceLifetime.Singleton);
```

## 客户端配置

`DaprBinaryStoreClientBuilder` 继承了通用的 Dapr 客户端构建器配置。客户端会从环境变量或 `IConfiguration` 中读取以下值：

| 设置项 | 说明 |
|---------|-------------|
| `DAPR_GRPC_ENDPOINT` | Dapr sidecar 的 gRPC 端点地址 |
| `DAPR_HTTP_ENDPOINT` | Dapr sidecar 的 HTTP 端点地址 |
| `DAPR_API_TOKEN` | 用于向 Dapr sidecar 进行身份验证的 API 令牌 |
| `DAPR_GRPC_PORT` | 未设置 `DAPR_GRPC_ENDPOINT` 时使用的 gRPC 端口 |
| `DAPR_HTTP_PORT` | 未设置 `DAPR_HTTP_ENDPOINT` 时使用的 HTTP 端口 |

直接在构建器上显式设置的值优先于配置中的值：

```csharp
using Dapr.BinaryStore.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

builder.Services.AddDaprBinaryStoreClient((sp, clientBuilder) =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var endpoint = configuration["DaprGrpcEndpoint"];

    if (!string.IsNullOrEmpty(endpoint))
    {
        clientBuilder.UseGrpcEndpoint(endpoint);
    }
});
```

对于需要自定义通用 Dapr 客户端设置的应用，构建器还支持 `UseHttpEndpoint`、`UseDaprApiToken`、`UseGrpcChannelOptions` 和 `UseTimeout`。

## 流式传输与内存使用

对于大文件，请使用 `SetBinaryFileAsync` 和 `GetBinaryFileAsync` 的 `Stream` 重载。上传默认使用 32 KiB 的块大小；上传时可指定 `chunkSize` 进行调整，且须保证其大于零。`GetBinaryFileChunksAsync` 返回一个由运行时选定的块组成的异步序列。

对于已经在内存中的小文件，`SetBinaryFileAsync` 的 `ReadOnlyMemory<byte>` 重载和 `GetBinaryFileBytesAsync` 使用起来很方便。`GetBinaryFileBytesAsync` 会将完整的下载内容缓冲到一个字节数组中。

调用方负责管理这些流。下载会从目标流的当前位置开始写入，不会回绕或截断该位置；上传会从源流的当前位置开始读取。块枚举是惰性的，运行时错误可能在枚举过程中抛出。失败的下载可能会在目标中留下部分字节，你的应用不得将其视为完整文件。

## 取消操作

所有异步操作都接受 `CancellationToken`。请将该令牌传递给上传、下载、块枚举和删除操作，以便在调用方不再需要结果时取消操作：

```csharp
await client.SetBinaryFileAsync(
    storeName,
    fileName,
    source,
    cancellationToken: cancellationToken);
```

取消时会抛出 `OperationCanceledException`。对于块枚举，请将令牌传递给 `GetBinaryFileChunksAsync`：

```csharp
await foreach (var chunk in client.GetBinaryFileChunksAsync(
                   storeName,
                   fileName,
                   cancellationToken))
{
    await ProcessChunkAsync(chunk);
}
```

## 错误处理

当 Dapr runtime 报告失败时，客户端会抛出 `DaprException`。例如，不存在的文件无法被获取或删除；如果同名文件已存在，未指定 `overwrite: true` 的上传会失败。请检查 `InnerException` 以获取运行时的详细信息。无效的客户端参数（例如空的存储名称或文件名，或非正数的上传块大小）会导致标准的参数异常。
