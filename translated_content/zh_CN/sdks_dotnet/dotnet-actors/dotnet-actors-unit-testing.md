---
type: docs
title: "对 Dapr Actor 进行单元测试"
linkTitle: "单元测试"
weight: 45000
description: 了解如何在 .NET 中对 Dapr Actor 进行单元测试
---

Dapr Actor 封装了业务逻辑、状态转换和 Actor 之间的通信。单元测试可以在部署到启用了 Dapr 的集群之前尽早发现缺陷。

本指南介绍在不运行 Dapr sidecar 的情况下，使用标准 .NET 测试框架测试 Actor 的实用模式。

## 前提条件

- 使用 [Dapr.Actors](https://www.nuget.org/packages/Dapr.Actors) 包的 .NET 8、.NET 9、.NET 10 或 .NET 11 项目
- 测试框架：[xUnit](https://xunit.net/)、[NUnit](https://nunit.org/) 或 [MSTest](https://learn.microsoft.com/dotnet/core/testing/)
- （可选）模拟（mock）库：[Moq](https://github.com/devlooped/moq)、[NSubstitute](https://nsubstitute.github.io/) 或 [FakeItEasy](https://fakeiteasy.github.io/)

## 可测试的 API 范围

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将在 2026 年 11 月结束支持。这两个版本都将在 Dapr v1.20 中停止支持；只有 .NET 10 和 .NET 11 会持续受支持，直至 2027 年底。
{{% /alert %}}

Actor 类继承自 `Actor`（namespace 为 `Dapr.Actors.Runtime`）。可用于测试的关键成员如下：

| 成员 | 作用 |
|---|---|
| `StateManager` | 带类型的键值 state store（`IActorStateManager`） |
| `Id` | Actor 的唯一标识符（`ActorId`） |
| `Host` | 带有已注册类型信息的 `ActorHost` |
| `RegisterTimerAsync()` | 注册周期性回调 |
| `RegisterReminderAsync()` | 注册持久化 reminder |

## 使用 ActorHost 进行单元测试

最简单的单元测试使用轻量的 `ActorHost` 创建一个 Actor：

```csharp
using Dapr.Actors.Runtime;
using Xunit;

public class BankActorTests
{
    private readonly ActorHost _host = new(ActorTypeName: "BankActor");

    [Fact]
    public async Task NewActor_HasZeroBalance()
    {
        var actor = new BankActor(_host);
        Assert.Equal(0m, await actor.GetBalanceAsync());
    }

    [Fact]
    public async Task Deposit_IncreasesBalance()
    {
        var actor = new BankActor(_host);
        await actor.DepositAsync(100m);
        Assert.Equal(100m, await actor.GetBalanceAsync());
    }

    [Fact]
    public async Task Withdraw_DecreasesBalance()
    {
        var actor = new BankActor(_host);
        await actor.DepositAsync(100m);
        await actor.WithdrawAsync(30m);
        Assert.Equal(70m, await actor.GetBalanceAsync());
    }

    [Fact]
    public async Task Withdraw_ThrowsWhenInsufficientFunds()
    {
        var actor = new BankActor(_host);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => actor.WithdrawAsync(10m));
    }
}
```

> **提示：** 每个测试都会创建一个全新的 Actor 实例，因此状态不会在测试之间泄漏。

## 模拟 StateManager

如果 Actor 的构造函数通过依赖注入接收 `IActorStateManager`，请使用模拟框架：

```csharp
using Moq;

[Fact]
public async Task Deposit_SavesState()
{
    var mockState = new Mock<IActorStateManager>();
    var host = new ActorHost(ActorTypeName: "Test");
    var actor = new BankActor(host, mockState.Object);

    await actor.DepositAsync(100m);

    mockState.Verify(
        s => s.SetStateAsync("balance", 100m, It.IsAny<CancellationToken>()),
        Times.Once);
}
```

如果 Actor 直接使用基类的 `StateManager` 属性，请通过 `TrySaveStateAsync()` 测试状态持久化，或通过公共方法验证行为。

## 模拟跨 Actor 调用

Actor 通过 `IActorProxyFactory` 调用其他 Actor。为便于测试，请通过构造函数注入该工厂：

```csharp
public class OrderActor : Actor, IOrderActor
{
    private readonly IActorProxyFactory _proxyFactory;

    public OrderActor(ActorHost host, IActorProxyFactory proxyFactory)
        : base(host)
    {
        _proxyFactory = proxyFactory;
    }

    public async Task<OrderResult> PlaceOrderAsync(Order order)
    {
        var bankProxy = _proxyFactory.CreateActorProxy<IBankActor>(
            new ActorId(order.CustomerId), "BankActor");
        await bankProxy.WithdrawAsync(order.Amount);
        // ... 其他逻辑
    }
}
```

接下来，在测试中模拟代理工厂：

```csharp
[Fact]
public async Task PlaceOrder_WithdrawsFromBank()
{
    var mockBank = new Mock<IBankActor>();
    var mockFactory = new Mock<IActorProxyFactory>();
    mockFactory
        .Setup(f => f.CreateActorProxy<IBankActor>(
            It.IsAny<ActorId>(), "BankActor"))
        .Returns(mockBank.Object);

    var host = new ActorHost(ActorTypeName: "Test");
    var actor = new OrderActor(host, mockFactory.Object);

    await actor.PlaceOrderAsync(new Order { Amount = 50m });

    mockBank.Verify(b => b.WithdrawAsync(50m, default), Times.Once);
}
```

## 测试 timer 和 reminder

测试 Actor 在激活时是否正确注册了 timer 和 reminder：

```csharp
[Fact]
public async Task OnActivate_RegistersReminder()
{
    var host = new ActorHost(ActorTypeName: "Test");
    var actor = new MyActor(host);

    await actor.OnActivateAsync();

    // 断言 reminder 注册行为
    // （如已注入，则通过模拟的 IActorReminderManager 进行验证）
}
```

> **注意：** timer 回调是异步执行的。在单元测试中测试*注册*，在带有 Dapr sidecar 的集成测试中测试*执行*。

## 使用 Dapr 进行集成测试

若要与 Actor runtime 完整集成，请使用 Dapr sidecar：

```csharp
[Collection("Dapr")]
public class ActorIntegrationTests
{
    private readonly DaprContainer _dapr;

    public ActorIntegrationTests()
    {
        _dapr = new DaprBuilder()
            .WithAppPort(5001)
            .Build();
        _dapr.StartAsync().GetAwaiter().GetResult();
    }

    [Fact]
    public async Task Actor_RetainsStateAcrossCalls()
    {
        var proxy = ActorProxy.Create<IBankActor>(
            new ActorId("test-123"), "BankActor");

        await proxy.DepositAsync(50m);
        decimal balance = await proxy.GetBalanceAsync();

        Assert.Equal(50m, balance);
    }
}
```

## 最佳实践

| 原则 | 原因 |
|---|---|
| 注入依赖项 | 让模拟变得简单：`IActorStateManager`、`IActorProxyFactory` 等 |
| 避免在单元测试中执行 timer | timer 以异步方式运行回调；只测试注册 |
| 使用轻量的 `ActorHost` | 创建速度快；单元测试不需要 Dapr sidecar |
| 测试状态隔离 | 每个测试都创建一个全新的 Actor 实例 |
| 区分单元测试和集成测试 | 单元测试保持快速；集成测试使用 Dapr |

## 另请参阅

- [Dapr Actors 概述]({{% ref dotnet-actors-usage.md %}})
- [Dapr Actors 操作指南]({{% ref dotnet-actors-howto.md %}})
- [GitHub 上的 Actor 示例](https://github.com/dapr/dotnet-sdk/tree/main/examples/Actor)
