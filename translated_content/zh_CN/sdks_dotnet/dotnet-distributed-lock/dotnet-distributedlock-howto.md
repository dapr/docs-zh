---
type: docs
title: "操作指南：在 .NET SDK 中创建和使用 Dapr 分布式锁"
linkTitle: "操作指南：使用分布式锁客户端"
weight: 61050
description: 了解如何使用 .NET SDK 创建和使用 Dapr 分布式锁客户端
---

## 前置条件
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、
  [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、
  [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或
  [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr environment](https://docs.dapr.io/getting-started/install-dapr-selfhost)

## 安装

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。Dapr v1.20 将不再支持这两个版本；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

要开始使用 Dapr 分布式锁 .NET SDK 客户端，请从 NuGet 安装 [Dapr.Distributed Lock 包](https://www.nuget.org/packages/Dapr.DistributedLock)：
```sh
dotnet add package Dapr.DistributedLock
```

以下示例面向 SDK `1.19.0` 或更高版本，并且需要已配置的分布式锁 component，例如名为 `lockstore` 的 Redis lock store。请导入 `Dapr.DistributedLock` 和 `Dapr.DistributedLock.Extensions`。此 API 处于实验阶段（`DAPR_DISTRIBUTEDLOCK`）。

`DaprDistributedLockClient` 以 TCP 套接字的形式维护对网络资源的访问，用于与 Dapr sidecar 通信。

### 依赖注入

`AddDaprDistributedLock()` 方法会将 Dapr 客户端注册到 ASP.NET Core 依赖注入中，这是使用此包的推荐方式。该方法接受一个可选的 options 委托，用于配置 `DaprDistributedLockClient`，还接受一个 `ServiceLifetime` 参数，用于为注册的服务指定不同于默认值 `Scoped` 的生命周期。

以下示例假定所有默认值都可以接受，足以注册 `DaprDistributedLockClient`：

```csharp
services.AddDaprDistributedLock();
```

可选的配置委托通过在 `DaprDistributedLockBuilder` 上指定选项来配置 `DaprDistributedLockClient`，如以下示例所示：
```csharp
services.AddSingleton<DefaultOptionsProvider>();
services.AddDaprDistributedLock((serviceProvider, clientBuilder) => {
     // 注入一个服务，用于获取值
     var optionsProvider = serviceProvider.GetRequiredService<DefaultOptionsProvider>();
     var standardTimeout = optionsProvider.GetStandardTimeout();
     
     // 在客户端构建器上配置该值
     clientBuilder.UseTimeout(standardTimeout);
});
```

### 手动实例化
除了使用依赖注入，也可以使用静态客户端构建器来构建 `DaprDistributedLockClient`。

为获得最佳性能，请创建一个长生命周期的 `DaprDistributedLockClient` 实例，并在整个应用程序中共享访问该实例。`DaprDistributedLockClient` 实例是线程安全的，旨在共享使用。

避免为每次操作创建一个 `DaprDistributedLockClient`。

可以在调用 `.Build()` 创建客户端之前，通过 `DaprDistributedLockBuilder` 类上的方法配置 `DaprDistributedLockClient`。每个 `DaprDistributedLockClient` 的设置彼此独立，调用 `.Build()` 之后无法更改。

```csharp
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .Build();
```

有关通过构建器配置 Dapr 分布式锁客户端时可用选项的更多信息，请参阅 .NET 的 [此处文档]({{% ref dotnet-distributed-lock %}})。

## 试用
试用 Dapr 分布式锁 .NET SDK。浏览示例，了解 Dapr 的实际运行效果：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples) | 克隆 SDK 仓库，尝试一些示例并开始使用。 |

## building block

.NET SDK 的这一部分允许你与分布式锁 API 交互，以加锁和解锁，从而在分布式应用程序中管理资源的独占性。

## 获取并自动释放锁

`TryLockAsync` 只进行一次获取尝试。获取成功时返回 `LockResponse`，资源无法被加锁时返回 `null`。它不会等待其他持有者释放该锁。

```csharp
var owner = Guid.NewGuid().ToString("N");
await using var resourceLock = await daprDistributedLockClient.TryLockAsync(
    "lockstore", "orders/42", owner, expiryInSeconds: 60,
    cancellationToken: cancellationToken);

if (resourceLock is null)
{
    Console.WriteLine("The resource is already locked; work was not started.");
}
else
{
    await ProcessOrderAsync(cancellationToken);
}
```

`LockResponse` 包含 `StoreName`、`ResourceId` 和 `LockOwner`，并实现了 `IAsyncDisposable`。作用域结束时，释放操作会尝试使用该身份解锁，但它不会向调用方公开解锁状态。需要检查结果时，请使用显式解锁，而不要假定释放操作一定已成功释放锁。

请为每次获取尝试选择一个唯一的所有者，而不仅仅是共享的 App ID。过期时间必须是正数秒。请确保受保护的工作在过期前完成；此客户端不会续约租约，也不提供防护令牌（fencing token）。调用方取消操作不会延长租约，也不会撤销已完成的工作。

## 显式解锁与状态

向 `TryUnlockAsync` 传入相同的 component、资源和所有者值：

```csharp
using Dapr.DistributedLock.Models;

var result = await daprDistributedLockClient.TryUnlockAsync(
    "lockstore", "orders/42", owner, cancellationToken);

if (result.Status != LockStatus.Success)
{
    throw new InvalidOperationException($"Unlock did not succeed: {result.Status}");
}
```

| `LockStatus` | 含义 |
| --- | --- |
| `Success` | 锁已释放。 |
| `LockDoesNotExist` | 锁已不存在，例如因为已过期。 |
| `LockBelongsToOthers` | 提供的所有者并不拥有此锁。 |
| `InternalError` | 运行时或 component 报告了解锁错误。 |

无效参数会抛出标准的参数异常。gRPC 失败会包装在 `DaprException` 中，请检查 `InnerException`。正常的获取冲突返回 `null`，而不是传输异常。

## 从 DaprClient 迁移

较旧的 `DaprClient.Lock` 返回带有 `Success` 属性的 `TryLockResponse`，而 `DaprDistributedLockClient.TryLockAsync` 返回一个可为空的、可释放的句柄。同样，应使用 `TryUnlockAsync` 代替 `DaprClient.Unlock`，并检查专用客户端的 `LockStatus`。两种响应模型并不能互换。
