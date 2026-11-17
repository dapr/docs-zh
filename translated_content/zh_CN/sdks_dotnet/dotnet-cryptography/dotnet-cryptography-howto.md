---
type: docs
title: "如何操作：在 .NET SDK 中创建和使用 Dapr Cryptography"
linkTitle: "如何操作：使用 Cryptography 客户端"
weight: 510100
description: 了解如何使用 .NET SDK 创建和使用 Dapr Cryptography 客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化 Dapr environment](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

{{% alert title="注意" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。Dapr v1.20 将不再支持这两个版本；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}
要开始使用 Dapr Cryptography 客户端，请从 NuGet 安装 [Dapr.Cryptography 包](https://www.nuget.org/packages/Dapr.Cryptography)：
```sh
dotnet add package Dapr.Cryptography
```

以下示例面向 SDK `1.19.0` 或更高版本。运行这些示例之前，请先配置一个加密 component 以及该 component 支持的密钥。需要导入 `Dapr.Cryptography.Encryption`、`Dapr.Cryptography.Encryption.Models` 和 `Dapr.Cryptography.Encryption.Extensions`。该客户端为实验性功能，对应的功能开关为 `DAPR_CRYPTOGRAPHY`。

`DaprEncryptionClient` 通过用于与 Dapr sidecar 通信的 TCP 套接字来保持对网络资源的访问。

### 依赖注入

`AddDaprEncryptionClient()` 方法会将 Dapr 客户端注册到依赖注入容器中，是使用此包的推荐方式。该方法接受一个可选的选项委托，用于配置 `DaprEncryptionClient`，还接受一个 `ServiceLifetime` 参数，可用于为已注册的服务指定不同于默认值 `Singleton` 的生命周期。

以下示例假设所有默认值均可接受，足以注册 `DaprEncryptionClient`：

```csharp
services.AddDaprEncryptionClient();
```

可选的配置委托通过在 `DaprEncryptionClientBuilder` 上指定选项来配置 `DaprEncryptionClient`，示例如下：
```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprEncryptionClient((serviceProvider, clientBuilder) => {
     //注入一个服务，以从中获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     //在客户端构建器上配置值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化
除了使用依赖注入之外，也可以使用静态客户端构建器来构建 `DaprEncryptionClient`。

为获得最佳性能，请创建一个长期存活的 `DaprEncryptionClient` 实例，并在整个应用程序中共享对该实例的访问。`DaprEncryptionClient` 实例是线程安全的，设计上即用于共享。

避免为每次操作都创建一个 `DaprEncryptionClient`。

可以在调用 `.Build()` 创建客户端之前，通过调用 `DaprEncryptionClientBuilder` 类的方法来配置 `DaprEncryptionClient`。每个 `DaprEncryptionClient` 的设置彼此独立，调用 `.Build()` 之后无法再更改。

```csharp
var daprEncryptionClient = new DaprEncryptionClientBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .Build();
```

有关通过构建器配置 Dapr 客户端时可用选项的更多信息，请参阅 .NET [文档]({{< ref dotnet-client >}})。

## 试用一下
动手试一试 Dapr Cryptography .NET SDK。浏览这些示例，看看 Dapr 的实际运行效果：

| SDK 示例                                                                            | 描述 |
|-------------------------------------------------------------------------------------| ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Cryptography) | 克隆 SDK 仓库，尝试一些示例并开始使用。 |

## 加密和解密缓冲内容

字节重载方法接受并返回 `ReadOnlyMemory<byte>`。它们会缓冲完整的输出，因此请将其用于能够装入内存的内容：

```csharp
using System.Text;
using Dapr.Cryptography.Encryption.Models;

var options = new EncryptionOptions(KeyWrapAlgorithm.RsaOaep256)
{
    EncryptionCipher = DataEncryptionCipher.AesGcm
};

var ciphertext = await daprEncryptionClient.EncryptAsync(
    "cryptostore", Encoding.UTF8.GetBytes("Sensitive content"), "encryption-key",
    options, cancellationToken);

var plaintext = await daprEncryptionClient.DecryptAsync(
    "cryptostore", ciphertext, "encryption-key", cancellationToken: cancellationToken);
```

请选择你所配置的密钥和加密 component 支持的密钥包装算法。SDK 提供了 AES 密钥包装（`Aes`、`A256kw`）、AES-CBC（`A128cbc`、`A192cbc`、`A256cbc`）和 RSA（`Rsa`、`RsaOaep256`）等选项；但枚举值存在并不保证每个加密 component 都支持它。

## 加密和解密流

流重载方法返回 `IAsyncEnumerable<ReadOnlyMemory<byte>>`。请消费所有输出块，并将它们写入目标位置，而不是缓冲整个文件：

```csharp
await using (var source = File.OpenRead("report.pdf"))
await using (var encrypted = File.Create("report.pdf.enc"))
{
    await foreach (var chunk in daprEncryptionClient.EncryptAsync(
        "cryptostore", source, "encryption-key", options, cancellationToken))
    {
        await encrypted.WriteAsync(chunk, cancellationToken);
    }
}

await using (var encrypted = File.OpenRead("report.pdf.enc"))
await using (var destination = File.Create("report-restored.pdf"))
{
    await foreach (var chunk in daprEncryptionClient.DecryptAsync(
        "cryptostore", encrypted, "encryption-key", cancellationToken: cancellationToken))
    {
        await destination.WriteAsync(chunk, cancellationToken);
    }
}
```

输入流和目标流由调用方负责管理。只有在请求和响应处理都完成之后，枚举才会结束。错误不仅可能在获取可枚举对象时发生，也可能在枚举过程中出现。提前释放枚举器会取消处理，并等待其停止；不要把不完整的输出文件当作完整的加密或解密文档。

## 加密和解密选项

| 设置项 | 行为 |
| --- | --- |
| `EncryptionOptions.KeyWrapAlgorithm` | 必需的构造函数参数，用于选择密钥包装算法。 |
| `EncryptionOptions.EncryptionCipher` | 默认为 `AesGcm`，也可以是 `ChaCha20Poly1305`。 |
| `EncryptionOptions.DecryptionKeyName` | 可选的密钥名称或版本，用于记录在加密头中以便解密。如果省略，SDK 会要求运行时在加密头中省略解密密钥名称。解密时需要提供该密钥。 |
| `EncryptionOptions.StreamingBlockSizeInBytes` | 上传块大小，默认为 4 KiB；必须为正数，通常不应超过 64 KiB。 |
| `DecryptionOptions.StreamingBlockSizeInBytes` | 解密时的上传块大小，默认同样为 4 KiB，且必须为正数。 |

`DecryptAsync` 接受可选的 `DecryptionOptions`。无论共享构建器的 JSON 序列化选项如何，加密操作都是针对字节而非 JSON 进行的。专用客户端实现了流式加密和解密；它不提供密钥获取、签名、验证，也不提供运行时的其他 subtle API。

## 错误与取消

请将取消令牌同时传递给客户端调用和目标写入操作。gRPC 和流处理失败必须在等待或枚举结果时被观察到；它们不是成功的空输出。取消操作或流失败不会删除应用程序已经写入的任何部分目标文件。
