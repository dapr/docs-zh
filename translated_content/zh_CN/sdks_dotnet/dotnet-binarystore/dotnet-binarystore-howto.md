---
type: docs
title: "操作方法：使用 Dapr Binary Store .NET SDK 管理二进制文件"
linkTitle: "操作方法：管理二进制文件"
weight: 53050
description: 学习如何使用 Dapr Binary Store .NET SDK 存储、检索、流式传输和删除二进制文件
---

使用 `Dapr.BinaryStore` 包，通过 Dapr Binary Store component 存储和检索文件。客户端以分块方式流式传输文件内容，因此处理大文件时无需将整个文件加载到内存中。在本指南中，你将：

- 注册并配置 `DaprBinaryStoreClient`
- 使用流上传和下载文件
- 在流式操作与内存操作之间进行选择
- 使用源生成器将类型化客户端绑定到存储

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 一个已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- Dapr runtime 1.19 或更高版本
- [Dapr.BinaryStore](https://www.nuget.org/packages/Dapr.BinaryStore) NuGet 包
- 在 Dapr 中配置好的[Binary Store]({{% ref "developing-applications/building-blocks/binarystore/_index.md" %}}) component

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者的支持都将在 Dapr v1.20 中取消；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

安装该包：

```sh
dotnet add package Dapr.BinaryStore
```

## 配置 In-memory Binary Store

在本地开发时，请在应用目录中创建 `components` 目录，并将以下 component 保存为 `components\filestore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: filestore
spec:
  type: binarystore.in-memory
  version: v1
  metadata:
    - name: maxSize
      value: "4Mi"
    - name: maxTotalSize
      value: "512Mi"
```

该 component 将文件存储在 Dapr sidecar 的内存中，无需外部存储服务。它允许单个文件最大 4 MiB，所有文件合计最多 512 MiB。sidecar 停止后数据即会丢失，且不会在多个 sidecar 之间共享，因此请将其用于本地开发和测试，而不是持久化存储。

component 的 `metadata.name`（即 `filestore`）是下方示例中传给客户端方法或 `[BinaryStore]` 特性的存储名称。

## 注册客户端

在依赖注入中注册客户端。默认情况下，它从环境变量或 `IConfiguration` 中读取 Dapr 端点和 API 令牌。

```csharp
using Dapr.BinaryStore.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprBinaryStoreClient();

var app = builder.Build();
```

在应用的项目目录中启动应用，并加载 `components` 中的 in-memory component，同时启动其 Dapr sidecar：

```sh
dapr run --app-id binary-store-example --resources-path .\components -- dotnet run
```

如果需要覆盖端点，请配置客户端构建器：

```csharp
builder.Services.AddDaprBinaryStoreClient((sp, clientBuilder) =>
{
    clientBuilder.UseGrpcEndpoint("http://localhost:50001");
});
```

## 上传和下载文件

获取已注册的客户端，并传入 Binary Store component 名称、文件名和流。示例使用上面配置的 `filestore` component。运行示例前，请将一个不超过 4 MiB 的 `report.pdf` 文件放到应用的工作目录中。在 `var app = builder.Build();` 之后添加以下代码，并把所需的 `using` 指令放在文件顶部（`Program.cs` 中）。

```csharp
using Dapr.BinaryStore;
using Microsoft.Extensions.DependencyInjection;

var client = app.Services.GetRequiredService<DaprBinaryStoreClient>();
const string storeName = "filestore";
const string fileName = "uploads/report.pdf";

await using (var source = File.OpenRead("report.pdf"))
{
    await client.SetBinaryFileAsync(storeName, fileName, source);
}

await using (var destination = File.Create("downloaded-report.pdf"))
{
    await client.GetBinaryFileAsync(storeName, fileName, destination);
}
```

该示例将 `report.pdf` 以 `uploads/report.pdf` 的名称上传到内存存储，并下载为 `downloaded-report.pdf`。请在同一个 sidecar 上运行后续示例，以便在删除文件之前使用已上传的文件。

`SetBinaryFileAsync` 的 `Stream` 重载从输入流的当前位置开始读取，并以分块方式发送到运行时。默认上传块大小为 32 KiB；如需其他大小，可传入一个正整数作为 `chunkSize`。设置 `overwrite: true` 可替换已存在的文件。默认情况下，如果文件已存在，上传会失败。

文件名可以包含嵌套路径，例如 `uploads/report.pdf`。请避免使用前导或尾随斜杠、空路径段、`.` 或 `..` 段，以及字符 `\`、`*`、`?`、`[`、`]` 和 `#`；Dapr runtime 会拒绝这些名称。

## 处理内存中的内容

对于已能放入内存的内容，上传时可传入 `ReadOnlyMemory<byte>`，或使用 `GetBinaryFileBytesAsync` 获取完整文件：

```csharp
byte[] content = [0x01, 0x02, 0x03];
await client.SetBinaryFileAsync(storeName, "data.bin", content);

byte[] downloaded = await client.GetBinaryFileBytesAsync(storeName, "data.bin");
```

`GetBinaryFileBytesAsync` 会将整个文件缓冲到内存中。对于大文件，请优先使用 `GetBinaryFileAsync` 或 `GetBinaryFileChunksAsync`：

```csharp
await using var chunkDestination = File.Create("downloaded-report-from-chunks.pdf");

await foreach (var chunk in client.GetBinaryFileChunksAsync(storeName, fileName))
{
    await chunkDestination.WriteAsync(chunk);
}
```

## 删除文件

```csharp
await client.DeleteBinaryFileAsync(storeName, fileName);
```

## 使用绑定到存储的类型化客户端

该包包含一个源生成器，用于生成绑定到单个 component 的类型化客户端。定义一个扩展 `IDaprBinaryStoreClient` 的 `partial` 接口，并使用 `[BinaryStore]` 指定 component 名称：

```csharp
using Dapr.BinaryStore;

[BinaryStore("filestore")]
public partial interface IFileStore : IDaprBinaryStoreClient
{
}
```

在注册 `DaprBinaryStoreClient` 之后注册生成的客户端：

```csharp
builder.Services
    .AddDaprBinaryStoreClient()
    .WithFileStore();
```

生成的 `WithFileStore` 方法会注册 `IFileStore` 的实现。请在需要的地方注入该接口。它的方法与 `IDaprBinaryStoreClient` 相同，但无需传入存储名称：

```csharp
public sealed class ReportService(IFileStore fileStore)
{
    public Task SaveAsync(string name, Stream content, CancellationToken cancellationToken) =>
        fileStore.SetBinaryFileAsync(name, content, cancellationToken: cancellationToken);
}
```
