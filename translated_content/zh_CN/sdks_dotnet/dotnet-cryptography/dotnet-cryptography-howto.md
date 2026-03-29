---
type: docs
title: "如何操作：在 .NET SDK 中创建和使用 Dapr Cryptography"
linkTitle: "如何操作：使用 Cryptography 客户端"
weight: 510100
description: 了解如何使用 .NET SDK 创建和使用 Dapr Cryptography 客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或 [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装
要开始使用 Dapr Cryptography 客户端，请从 NuGet 安装 [Dapr.Cryptography 包](https://www.nuget.org/packages/Dapr.Cryptography)：
```sh
dotnet add package Dapr.Cryptography
```

`DaprEncryptionClient` 保持对网络资源的访问，这些资源以用于与 Dapr 边车通信的 TCP 套接字形式存在。

### 依赖注入

`AddDaprEncryptionClient()` 方法会将 Dapr 客户端注册到依赖注入容器中，这是使用此包的推荐方式。该方法接受一个可选的 options 委托用于配置 `DaprEncryptionClient`，以及一个 `ServiceLifetime` 参数，允许您为注册的服务指定不同的生命周期，而不是使用默认的 `Singleton` 值。

以下示例假设所有默认值都是可接受的，足以注册 `DaprEncryptionClient`：

```csharp
services.AddDaprEncryptionClient();
```

可选的配置委托用于通过在 `DaprEncryptionClientBuilder` 上指定选项来配置 `DaprEncryptionClient`，如下例所示：
```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprEncryptionClient((serviceProvider, clientBuilder) => {
     // 注入一个服务以从中获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     // 在客户端构建器上配置值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化
除了使用依赖注入外，也可以使用静态客户端构建器构建 `DaprEncryptionClient`。

为了获得最佳性能，请创建单个长期存在的 `DaprEncryptionClient` 实例，并在整个应用程序中提供对该共享实例的访问。`DaprEncryptionClient` 实例是线程安全的，旨在共享。

避免为每次操作创建 `DaprEncryptionClient`。

可以通过在调用 `.Build()` 创建客户端之前调用 `DaprEncryptionClientBuilder` 类上的方法来配置 `DaprEncryptionClient`。每个 `DaprEncryptionClient` 的设置是独立的，无法在调用 `.Build()` 后更改。

```csharp
var daprEncryptionClient = new DaprEncryptionClientBuilder()
    .UseJsonSerializerSettings( ... ) // 配置 JSON 序列化器
    .Build();
```

有关通过构建器配置 Dapr 客户端时可用选项的更多信息，请参阅 .NET [文档]({{< ref dotnet-client >}})。

## 试用一下
测试 Dapr AI .NET SDK。浏览示例以查看 Dapr 的实际应用：

| SDK 示例                                                                          | 描述 |
|-------------------------------------------------------------------------------------| ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Cryptography) | 克隆 SDK 存储库以尝试一些示例并开始使用。 |
