---
type: docs
title: "Part 1: The cart, the modern baseline"
linkTitle: "1. 购物车"
weight: 161000
description: "你已经熟悉的 Actor，去掉了繁琐的样板代码，以及不再需要 sidecar 的 timer 测试"
---

第一个示例是最小的真实 Actor：一个购物车，它可以添加商品、返回汇总，并通过 timer 在空闲二十分钟后自行放弃。它没有任何特别之处，这正是重点所在。正是与 `Dapr.Actors` 的并排对比，才让这次现代化的改动一目了然。

本部分的代码位于 `/examples/Actor.Next/01-Cart/`。

## 你将构建的内容

```csharp
[GenerateActorClient]
public interface ICartActor : IActor
{
    Task AddItem(CartItem item, CancellationToken ct = default);
    Task<CartSummary> GetSummary(CancellationToken ct = default);
    Task AbandonCart(CancellationToken ct = default);
}

public sealed record CartItem(string Sku, int Quantity);
public sealed record CartSummary(int ItemCount, decimal Total, bool Abandoned);

public interface IPricingClient
{
    ValueTask<decimal> GetPriceAsync(string sku, CancellationToken cancellationToken = default);
}

public sealed class CartState
{
    public Dictionary<string, int> Items { get; set; } = [];
    public Dictionary<string, decimal> Prices { get; set; } = [];
    public bool Abandoned { get; set; }
}

[DaprActor("Cart")]
public sealed class CartActor(
    ActorActivationContext context,
    IPricingClient pricing,
    IActorTimerScheduler timers) : Actor, ICartActor
{
    private static readonly TimeSpan AbandonAfter = TimeSpan.FromMinutes(20);

    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task AddItem(CartItem item, CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Items[item.Sku] = cart.Value.Items.GetValueOrDefault(item.Sku) + item.Quantity;   // 通过 .Value 修改
        cart.Value.Prices[item.Sku] = await pricing.GetPriceAsync(item.Sku, ct);                     // 每次激活时注入
        cart.Value.Abandoned = false;

        // 每次添加时重新设置空闲 timer；其回调为 AbandonCart 方法。
        await timers.RescheduleAsync("Cart", Id, "abandon-cart", AbandonAfter, nameof(AbandonCart), string.Empty, cancellationToken: ct);
    }

    public async Task<CartSummary> GetSummary(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        var itemCount = cart.Value.Items.Values.Sum();
        var total = cart.Value.Items.Sum(entry => entry.Value * cart.Value.Prices.GetValueOrDefault(entry.Key));
        return new CartSummary(itemCount, total, cart.Value.Abandoned);
    }

    public async Task AbandonCart(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Abandoned = true;           // 在轮次结束时保存一次
    }
}
```

启动只需一行，无需端点映射，也无需为每个 Actor 单独注册：

```csharp
builder.Services.AddDaprActors();
```

### 为什么以此作为基线

这一示例一次性涵盖了整体骨架。该契约派生自 `IActor` 并带有 `[GenerateActorClient]`，这正是它被生成器识别的标记；实现类上的 `[DaprActor]` 随后会生成代理和分发器，且不使用反射；依赖通过构造函数注入到每次激活的作用域中；状态通过每个 Actor 的缓存读取，并在轮次结束时统一保存一次；Actor 回调则通过与运行时之间的持久化流到达，而不是经由映射的 Actor handler 端点。可空注解在签名中发挥着实际作用。这些都不是 Actor 模型的新行为：它与你在 `Dapr.Actors` 中编写的 Actor 相同，只是去掉了注册样板代码、端点映射以及基于反射的代理，而这也正是使 Native AOT 目标得以实现的原因。

有关这些内容背后的参考细节，请参阅 [编写、注册与调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})。

## 测试

```csharp
[Fact]
public async Task Advancing_virtual_time_fires_the_abandon_timer()
{
    await using var runtime = CreateRuntime();
    var cart = runtime.CreateActor<ICartActor>(ActorId.Create("idle-cart"), "Cart");

    var add = cart.AddItem(new CartItem("sku-1", 1));
    await runtime.RunToIdle();
    await add;

    runtime.Time.Advance(TimeSpan.FromMinutes(20));   // 触发放弃 timer；无需真实等待
    await runtime.RunToIdle();

    var summaryTask = cart.GetSummary();
    await runtime.RunToIdle();
    Assert.True((await summaryTask).Abandoned);
}

private static ActorTestRuntime CreateRuntime()
{
    _ = typeof(CartActor);
    return new ActorTestRuntime(services =>
    {
        services.AddSingleton<IPricingClient, FakePricingClient>();
        services.AddDaprActors(_ => { });
    });
}

private sealed class FakePricingClient : IPricingClient
{
    public ValueTask<decimal> GetPriceAsync(string sku, CancellationToken cancellationToken = default) =>
        ValueTask.FromResult(sku == "sku-1" ? 12.50m : 1.00m);
}
```

### 为什么测试是重点

这个测试在 `Dapr.Actors` 中的版本是集成测试：它需要启动一个 sidecar 和一个 state store，通过 HTTP 注册 Actor，然后要么睡眠二十分钟，要么——更常见的是——干脆放弃，根本不测试 timer。timer 路径恰恰是团队最容易忽略测试的那类内容，因为真实时钟使其变得不切实际。

新版本是一个不依赖任何基础设施、耗时不到一秒的单元测试。假的 `IPricingClient` 通过你在生产环境中使用的同一套依赖注入注入，而时钟由你掌控、可以随时推进，因此 timer 可以按需触发。大多数团队从不测试的路径，现在测试起来轻而易举；而且这个测试无需启动或拆除任何东西，因此运行得更快，占用的资源也更少。

有关完整的测试能力，请参阅 [测试]({{< ref dotnet-actorsnext-testing.md >}})。

## 另请参阅

- [编写、注册与调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
- 下一篇：[第 2 部分：演进购物车的状态]({{< ref dotnet-actorsnext-tutorial-migration.md >}})
