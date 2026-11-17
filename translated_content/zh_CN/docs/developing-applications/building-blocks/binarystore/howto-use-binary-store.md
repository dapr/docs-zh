---
type: docs
title: "操作指南：使用 Binary Store API"
linkTitle: "操作指南：使用 Binary Store"
weight: 200
description: "使用 Dapr Binary Store API 上传、获取、覆盖和删除文件"
---

本指南介绍如何配置 Binary Store component，并使用 Dapr HTTP API 或 .NET SDK 上传、获取和删除文件。示例使用运行时的 in-memory component 进行本地开发。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli %}})
- 已初始化 [Dapr environment]({{% ref install-dapr-selfhost %}})
- Dapr runtime 支持 Binary Store API（Dapr 1.19 或更高版本）
- 对于 .NET 示例，需要 `Dapr.BinaryStore` NuGet 包

## 配置 Binary Store

Binary Store component 表示 Dapr 所使用的存储后端。将以下 in-memory component 定义保存为 `components/binary-store.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mystore
spec:
  type: binarystore.in-memory
  version: v1
  metadata:
    - name: maxSize
      value: "16Mi"
    - name: maxTotalSize
      value: "64Mi"
```

`maxSize` 和 `maxTotalSize` 的值可以是字节数，也可以是带单位的大小字符串，例如 `16Mi` 或 `64Mi`。由于 component metadata 的值都是字符串，因此在 YAML 中需要为数字形式的字节数加引号（例如 `"16777216"`）。

component 名称 `mystore` 会用在 API 的 URL 中。这种内存实现适合用来体验 API，但它不会在 sidecar 重启后保留文件，也无法在多个 sidecar 实例之间共享文件。生产环境请配置合适的持久化 Binary Store component 及其所需的 metadata。

启动 Dapr sidecar 时，请让它能够访问 component 目录。例如，使用以下命令在端口 `3500` 上公开 HTTP API：

```sh
dapr run --app-id binary-store-example --resources-path ./components --dapr-http-port 3500
```

每个 .NET 标签页都展示了该示例所需的客户端注册与解析代码。在应用程序中，请在启动时注册单例一次，然后将其注入到你的服务中。

## 上传文件

以原始二进制数据的形式发送文件。使用 `POST` 可以在不替换现有文件的情况下创建文件。.NET 客户端默认也是不替换地创建：

{{< tabpane text=true >}}

<!-- HTTP -->
{{% tab "Bash" %}}

```sh
curl -X POST \
  http://localhost:3500/v1.0-alpha1/binarystore/mystore/report.pdf \
  --data-binary @./report.pdf
```

{{% /tab %}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
using Dapr.BinaryStore;
using Dapr.BinaryStore.Extensions;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprBinaryStoreClient();
var app = builder.Build();

var binaryStore = app.Services.GetRequiredService<DaprBinaryStoreClient>();
await using var content = File.OpenRead("./report.pdf");
await binaryStore.SetBinaryFileAsync("mystore", "report.pdf", content);
```

{{% /tab %}}

{{< /tabpane >}}

HTTP 请求成功时返回 `204 No Content`。如果 `report.pdf` 已存在，HTTP `POST` 会失败并返回 `409 Conflict`；.NET 客户端会以 `DaprException` 报告运行时失败。

如需替换已存在的文件，请使用 `PUT`。在 .NET 中，将 `overwrite` 设为 `true`：

{{< tabpane text=true >}}

<!-- HTTP -->
{{% tab "Bash" %}}

```sh
curl -X PUT \
  http://localhost:3500/v1.0-alpha1/binarystore/mystore/report.pdf \
  --data-binary @./updated-report.pdf
```

{{% /tab %}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
using Dapr.BinaryStore;
using Dapr.BinaryStore.Extensions;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprBinaryStoreClient();
var app = builder.Build();

var binaryStore = app.Services.GetRequiredService<DaprBinaryStoreClient>();
await using var content = File.OpenRead("./updated-report.pdf");
await binaryStore.SetBinaryFileAsync("mystore", "report.pdf", content, overwrite: true);
```

{{% /tab %}}

{{< /tabpane >}}

HTTP 覆盖成功时返回 `204 No Content`。

两种 API 都不要求将文件数据编码为 JSON。运行时会把内容流式传输给 component，component 可能会限制单个文件的最大大小或存储的总容量；请配置并审阅你所使用 component 的限制。HTTP 上传不受 sidecar [`--max-body-size`]({{% ref increase-request-size.md %}}) 限制的约束，因此文件可以大于该限制。

## 获取文件

`GET` 操作会以 `application/octet-stream` 内容类型返回原始二进制数据。使用 `-o` 可将响应直接写入文件。.NET SDK 可以把内容流式写入目标流：

{{< tabpane text=true >}}

<!-- HTTP -->
{{% tab "Bash" %}}

```sh
curl http://localhost:3500/v1.0-alpha1/binarystore/mystore/report.pdf \
  -o downloaded-report.pdf
```

{{% /tab %}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
using Dapr.BinaryStore;
using Dapr.BinaryStore.Extensions;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprBinaryStoreClient();
var app = builder.Build();

var binaryStore = app.Services.GetRequiredService<DaprBinaryStoreClient>();
await using var destination = File.Create("downloaded-report.pdf");
await binaryStore.GetBinaryFileAsync("mystore", "report.pdf", destination);
```

{{% /tab %}}

{{< /tabpane >}}

如果文件不存在，HTTP API 返回 `404 Not Found`；.NET 客户端会将运行时错误报告为 `DaprException`。

## 删除文件

{{< tabpane text=true >}}

<!-- HTTP -->
{{% tab "Bash" %}}

```sh
curl -X DELETE \
  http://localhost:3500/v1.0-alpha1/binarystore/mystore/report.pdf
```

{{% /tab %}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
using Dapr.BinaryStore;
using Dapr.BinaryStore.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprBinaryStoreClient();
var app = builder.Build();

var binaryStore = app.Services.GetRequiredService<DaprBinaryStoreClient>();
await binaryStore.DeleteBinaryFileAsync("mystore", "report.pdf");
```

{{% /tab %}}

{{< /tabpane >}}

HTTP 删除成功时返回 `204 No Content`。.NET 客户端完成该操作后不返回响应值。

## 文件名与嵌套路径

文件名是所选 Binary Store 中的相对路径。支持诸如 `images/profile.png` 之类的嵌套路径。构造 HTTP URL 时，请按需对路径字符进行编码。运行时会拒绝以下名称：以斜杠开头或结尾的名称、包含空路径段的名称、包含 `.` 或 `..` 段的名称，以及包含 `\`、`*`、`?`、`[`、`]` 或 `#` 的名称。

## 后续步骤

- 阅读[Binary Store 概述]({{% ref binarystore-overview.md %}})。
- 查阅[Binary Store API 参考]({{% ref binary_store_api.md %}})。
- 参阅 [Dapr .NET Binary Store 文档](https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-binarystore/)，了解 SDK 特定用法。
