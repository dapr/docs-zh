---
type: docs
title: "操作指南：在 .NET SDK 中创建和使用 Dapr 分布式锁"
linkTitle: "操作指南：使用分布式锁客户端"
weight: 61050
description: 了解如何使用 .NET SDK 创建和使用 Dapr 分布式锁客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

要开始使用 Dapr 分布式锁 .NET SDK 客户端，请从 NuGet 安装 [Dapr.Distributed Lock 包](https://www.nuget.org/packages/Dapr.DistributedLock)：

```sh
dotnet add package Dapr.DistributedLock
```

`DaprDistributedLockClient` 以 TCP 套接字的形式维护对网络资源的访问，用于与 Dapr 边车通信。

### 依赖注入

`AddDaprDistributedLock()` 方法会将 Dapr 客户端注册到 ASP.NET Core 依赖注入中，这是使用此包的推荐方式。此方法接受一个可选的 options 委托用于配置 `DaprDistributedLockClient`，以及一个 `ServiceLifetime` 参数，允许您为注册的服务指定不同的生命周期，而不是使用默认的 `Singleton` 值。

以下示例假定所有默认值均可接受，足以注册 `DaprDistributedLockClient`：

```csharp
services.AddDaprDistributedLock();
```

可选的 configuration 委托用于通过在 `DaprDistributedLockBuilder` 上指定选项来配置 `DaprDistributedLockClient`，如以下示例所示：

```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprDistributedLock((serviceProvider, clientBuilder) => {
     // 注入服务以从中获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     // 在客户端构建器上配置值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化

除了使用依赖注入，也可以使用静态客户端构建器来构建 `DaprDistributedLockClient`。

为了获得最佳性能，请创建一个单一的长生命周期 `DaprDistributedLockClient` 实例，并在整个应用程序中提供对该共享实例的访问。`DaprDistributedLockClient` 实例是线程安全的，旨在共享使用。

避免为每次操作创建一个 `DaprDistributedLockClient`。

可以通过在调用 `.Build()` 创建客户端之前调用 `DaprDistributedLockBuilder` 类上的方法来配置 `DaprDistributedLockClient`。每个 `DaprDistributedLockClient` 的设置是独立的，在调用 `.Build()` 后无法更改。

```csharp
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseJsonSerializerSettings( ... ) // 配置 JSON 序列化器
    .Build();
```

有关通过构建器配置 Dapr 分布式锁客户端时可用的选项的更多信息，请参阅 .NET [文档此处]({{% ref dotnet-distributed-lock %}})。

## 试用

试用 Dapr 分布式锁 .NET SDK。浏览示例，查看 Dapr 的实际运行：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 存储库以尝试一些示例并开始使用。 |

## 构建块

.NET SDK 的这一部分允许您与分布式锁 API 交互，以放置和移除锁，从而管理分布式应用程序中的资源独占性。
