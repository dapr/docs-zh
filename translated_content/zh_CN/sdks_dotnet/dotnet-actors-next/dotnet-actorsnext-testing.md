---
type: docs
title: "在 .NET SDK 中测试 Actor"
linkTitle: "测试"
weight: 150000
description: "借助内存运行时、xUnit v3 和 Coyote，确定性地测试 Actor 的并发、定时器、提醒与故障"
---

测试是 `Dapr.Actors.Next` 最突出的能力。Actor 中最难处理的部分——包括重入、调用进行中定时器到期、重复或乱序投递，以及状态写入过程中发生的故障——通常只有在运行中的边车并依赖真实时钟时才能触发，实际上难以测试。本 SDK 将非确定性的三个来源（传输、调度和时间）隔离在抽象之后，从而让这些场景变得确定、快速且可复现；同一份 Actor 代码既可以运行在真实运行时上，也可以运行在内存测试运行时上。

本页介绍开发阶段可用的功能、如何使用 xUnit v3 编写测试、如何添加 Coyote 进行更深入的探索，以及如何针对真实边车运行集成测试。

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者都将在 Dapr v1.20 中停止支持；只有 .NET 10 和 .NET 11 会受到支持，直至 2027 年底。
{{% /alert %}}

{{% alert title="包" color="primary" %}}
内存运行时位于 `Dapr.Actors.Next.Testing` 命名空间中。它是组成 `Dapr.Actors.Next` 元包的包之一，同时也作为独立包发布到 NuGet，因此你应直接将它安装到测试项目中，而不是在测试项目中引入完整的元包。它通过生产环境所用的同一套生成分发器驱动你的真实 Actor，因此不存在仅用于测试的 Actor 实现。
{{% /alert %}}

## 开发阶段可用的功能

`ActorTestRuntime` 提供一个受控调度器，它基于种子探索不同 Actor ID 之间整个轮次的执行顺序，以及单个调用链内的重入。策略包括带种子的随机游走和基于优先级的策略。同一 Actor ID 的独立轮次永不重叠：运行时持有 Actor 锁，并且每个 ID 同一时间最多只投递一个非重入回调。`StepAsync` 启动一个可运行的轮次；`RunToIdle` 则持续驱动已调度的工作，直到不再有可运行或进行中的轮次。

运行时还通过 `TimeProvider` 提供虚拟时间，提供生产环境所用的进程内定时器/提醒适配器，并支持检视已持久化的状态和调度记录。[远程调用模拟](#跨远程边界测试重入)可以在不传播环境执行上下文的情况下检查调用链。[状态写入暂停](#暂停状态写入并与停用竞争)让你可以在已知的持久化边界上挂起一个轮次，同时测试相互竞争的工作。[故障注入](#故障注入)覆盖状态写入、迁移和调用；回调流故障还需要一个装饰后的传输层和正在运行的流管理器。对于状态机 Actor，[结构分析](#状态机的结构分析)可以检测状态转换表中的缺陷。

无需边车、状态存储或 Docker 即可完成以上全部操作。

一组分析器确保 Actor 处于受控调度器能够穷举探索的模型之内。它们会标记逃逸出调度器的工作，例如 `Task.Run`（`DAPR1411`）、阻塞调用（`DAPR1412`）、使用了 `TimeProvider` 之外的墙钟时间（`DAPR1413`），以及未设种子的非确定性来源，例如 `Guid.NewGuid()` 或 `Random`（`DAPR1414`）。保持这些分析器无告警，正是让内存中的探索做到完备而非尽力而为的关键；参见[诊断参考]({{< ref "dotnet-actorsnext-howto.md#analyzers-and-diagnostics" >}})。

## 使用 xUnit v3 测试

Dapr .NET SDK 使用 xUnit v3 进行测试，本页示例也以此为前提。请将 Dapr .NET Actors SDK 与 xUnit v3 包添加到你的测试项目中：

```xml
<ItemGroup>
  <PackageReference Include="Dapr.Actors.Next" Version="..." />
  <PackageReference Include="xunit.v3" Version="..." />
  <PackageReference Include="xunit.runner.visualstudio" Version="..." />
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="..." />
</ItemGroup>
```

使用应用中的 Actor 与依赖注册创建运行时，创建 Actor 代理，驱动调度器，然后进行断言。示例假设所示的 Actor 契约与实现可以被 `AddDaprActors` 发现；请在服务配置中包含它们所需的全部依赖。`[Fact]` 与 `Assert` 的用法与之前的 xUnit 版本相同。

### 基本测试

```csharp
public class CartActorTests
{
    [Fact]
    public async Task Adding_an_item_updates_the_summary()
    {
        await using var rt = new ActorTestRuntime(services => services.AddDaprActors());
        var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");

        var add = cart.AddItem(new CartItem("sku-1", 2));
        await rt.RunToIdle();
        await add;

        var summary = cart.GetSummary();
        await rt.RunToIdle();
        Assert.Equal(1, (await summary).ItemCount);
    }
}
```

先发起每个调用，再推进调度器，之后再等待其结果。在 `RunToIdle` 之前等待一个已排队的调用，可能让测试无限期地等待下去。当测试有意暂停某个轮次时，请改用 `StepAsync`：只要该轮次仍处于暂停状态，`RunToIdle` 就无法结束。

{{% alert title="CreateActor 始终需要 Actor 类型名" color="primary" %}}
`CreateActor<TActor>(actorId, actorType)` 需要传入 Actor 类型名；不存在能从 `TActor` 推断类型名的重载。请传入该 Actor 宿主时所用的名称：即其 `[DaprActor]` 名称（或类型名回退值），或你注册它时使用的别名（参见[以自定义名称注册 Actor]({{< ref "dotnet-actorsnext-howto.md#registering-an-actor-under-a-custom-name" >}})）。要求传入名称，也能在一个接口对应多个 Actor 类型时消除歧义。

```csharp
var queue = rt.CreateActor<IQueueActor>(ActorId.Create("q1"), actorType: "OrdersQueue");
```
{{% /alert %}}

由于别名往往来自配置，而且通常会保留独立的 Debug 和 Release（或其他环境）配置档，因此请在测试中从宿主所用的同一来源解析别名，或使用一个共享常量，而不要硬编码字面量。如果宿主从配置中读取 `QUEUE_ACTOR_TYPE_NAME`，那么硬编码 `"OrdersQueue"` 的测试可能在某个配置档中恰好匹配，而在另一个配置档中却悄悄地指向默认名称或另一个名称。按与宿主相同的方式读取名称，可以让测试与其运行时所用的配置档保持一致。

```csharp
// 与宿主使用相同的方式解析别名，使测试跟随当前生效的配置档。
var actorType = configuration.GetValue("QUEUE_ACTOR_TYPE_NAME", "QueueActor");
var queue = rt.CreateActor<IQueueActor>(ActorId.Create("q1"), actorType);
```

### 注入依赖

以与宿主中相同的方式在运行时上配置服务。测试替身会被注入到 Actor 的每次激活作用域中。

```csharp
await using var rt = new ActorTestRuntime(services =>
{
    services.AddSingleton<IPricingClient>(new FakePricingClient(total: 42m));
    services.AddDaprActors();
});

var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");
var summary = cart.GetSummary();
await rt.RunToIdle();
Assert.Equal(42m, (await summary).Total);
```

### 使用虚拟时间测试定时器与提醒

运行时会注入 `CoreActorTimerScheduler` 和 `CoreActorReminderScheduler`，这两个是生产环境所用的**进程内**适配器，由 `rt.Time` 提供支撑。先运行注册定时器或提醒的轮次，然后推进时钟以放行到期的回调，最后驱动它们对应的邮箱轮次：

```csharp
[Fact]
public async Task Abandoned_cart_reminder_fires_after_thirty_minutes()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors());
    var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");

    var add = cart.AddItem(new CartItem("sku-1", 1));
    await rt.RunToIdle();
    await add;

    rt.Time.Advance(TimeSpan.FromMinutes(30));    // 放行已注册的 abandon-cart 提醒
    await rt.RunToIdle();

    var summary = cart.GetSummary();
    await rt.RunToIdle();
    Assert.True((await summary).IsAbandoned);
}
```

示例假设 `AddItem` 会注册该提醒。回调是独立的轮次，而不是注册它们的那个轮次的重入延续。适配器会抑制执行上下文的捕获，因此定时器或提醒不会继承该轮次的调用链。

通过再次注册同名的定时器或提醒、取消它并推进时间，来测试替换与取消行为。取消会阻止后续回调被放行；已放行的回调仍可能完成。`VirtualActorTimeProvider` 实现了 `TimeProvider.CreateTimer`，包括修改、释放以及执行上下文的捕获；其直接调用的 `ScheduleTimer` 和 `ScheduleReminder` 辅助方法仍然可用。对 `Time.Advance` 的调用不得重叠或递归。

该提供程序按顺序访问每个到期时间，同一时刻的到期项按注册顺序排列，并在其注册锁之外同步调用定时器回调。这些回调可以修改或取消定时器。如果某个定时器回调抛出异常，推进会在该到期时间点停止。Actor 回调的放行与执行已排队的 Actor 轮次是两件事，后者仍需要受控调度器。

虚拟时间不会推进真实边车的时钟，也无法复现持久化调度器的投递。这些检查请放在集成测试中进行。

### 状态写入失败

状态写入故障会使与之匹配的一次持久化尝试失败，但不会自动重试该调用。应使用 `StateOf` 检查已持久化的状态，而不是发起一个可能把脏缓存状态刷写出去的读取轮次：

```csharp
[Fact]
public async Task State_write_failure_is_reported_before_persistence()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors());
    var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");

    rt.Faults.FailNextStateWrite<CartState>(stateName: "cart");
    var add = cart.AddItem(new CartItem("sku-1", 1));
    await rt.RunToIdle();
    await Assert.ThrowsAsync<ActorInjectedTransientException>(() => add);

    Assert.Null(rt.StateOf(cart).Get<CartState>("cart"));
}
```

这里检查的是此前未持久化的 `"cart"` 条目。它并不断言 Actor 字段或缓存修改的回滚，也不断言已成功写入的数据的回滚。请根据应用的重试与幂等策略，显式地测试恢复过程。

### 轮次顺序：提醒在进行中的轮次之后运行，而非在其间运行

同一 Actor ID 的独立轮次永不重叠。一次方法调用是一个轮次，一个提醒是另一个轮次；如果提醒在某个方法轮次进行中到期，它会等待该轮次结束，然后作为自己的轮次运行。在推进时间之前，请使用状态写入暂停来确保方法确实处于进行中，而不要依赖异步调用启动的快慢。本示例假设 `AddItem` 会注册 abandon-cart 提醒：

```csharp
[Fact]
public async Task Reminder_due_during_a_turn_runs_after_it_and_sees_committed_state()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors());
    var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");
    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
    using var pause = rt.Faults.PauseNextStateWrite<CartState>(stateName: "cart");

    var add = cart.AddItem(new CartItem("sku-1", 1));
    await rt.StepAsync(timeout.Token);
    await pause.Reached.WaitAsync(timeout.Token);
    try
    {
        rt.Time.Advance(TimeSpan.FromMinutes(30));
        Assert.False(await rt.StepAsync(timeout.Token));   // 该 Actor 仍被占用
        Assert.Null(rt.StateOf(cart).Get<CartState>("cart"));
    }
    finally
    {
        pause.Release();
    }

    await rt.RunToIdle(timeout.Token);
    await add;

    var summary = cart.GetSummary();
    await rt.RunToIdle(timeout.Token);
    var result = await summary;
    Assert.Equal(1, result.ItemCount);
    Assert.True(result.IsAbandoned);
}
```

只有处于活动且匹配的调用链中的调用，才可能被放行为重入调用，并受 `EnableReentrancy` 和 `MaxReentrantDepth` 约束。标准请求头是 `Dapr-Reentrancy-Id`。SDK 同时以不区分大小写的方式接受旧版别名 `dapr-reentrant-id` 和 `x-dapr-reentrant-id`，并优先使用标准名称。

确实存在合理的竞争，但它是两个完整轮次先后顺序上的竞争，而不是两个轮次重叠。在拍卖示例中（参见[状态机 Actor]({{< ref dotnet-actorsnext-statemachine.md >}})），一次迟到的出价与关闭定时器的触发是两个独立的轮次，它们到达的先后顺序并不固定，因此调度器会探索哪个轮次先运行。每个轮次各自仍会运行至完成；测试断言无论以哪种顺序运行，结果都是正确的。

### 跨远程边界测试重入

将 `ActorTestRuntimeOptions.SimulateRemoteCalls` 设为 true，可以在保留已传播请求头的同时，移除通过测试调用客户端发起的调用中调用方的环境 `ExecutionContext`。这样即可在不依赖 `AsyncLocal` 状态能够跨越传输边界存活的前提下，测试自调用以及 A → B → A 的回调：

```csharp
await using var rt = new ActorTestRuntime(
    services => services.AddDaprActors(options =>
    {
        options.EnableReentrancy = true;
        options.MaxReentrantDepth = 4;
    }),
    new ActorTestRuntimeOptions { SimulateRemoteCalls = true });

var call = rt.InvokeAsync("CartActor", ActorId.Create("u1"), "Checkout");
using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
await rt.RunToIdle(timeout.Token);
await call;
```

这里的 `Checkout` 是你的 Actor 操作，它会等待嵌套的 Actor 调用。此外，也可以只通过该客户端选择下一个匹配的调用：

```csharp
rt.Faults.SimulateNextRemoteInvocation(actorType: "Inventory", methodName: "Reserve");
```

不匹配的调用不会消耗这个一次性控制。模拟仍使用内存中的序列化与派发；它不测试网络路由、放置、身份验证或真实的线协议。

在比较内存运行时与边车的行为时，请显式设置重入选项。SDK 会强制执行显式设置的 `EnableReentrancy = false` 以及最大深度；按类型设置的选项会覆盖应用级设置。未设置时，进程内运行时保留其历史上的本地重入行为，而 Dapr 会另外强制执行已公布的配置。

请等待嵌套调用。重入放行并不能让 Actor 字段或缓存状态对于任意并行分支或即发即忘的工作变得安全。调度器种子只能复现其排序决策，无法复现远程调用模拟所引入的每一种线程池交错；需要更深入的探索时，请使用显式暂停来固定边界，并使用 Coyote。

### 根据种子复现失败

当调度探索发现一种会导致失败的顺序时，它会报告对应的种子。固定该种子即可精确地重放它。

```csharp
await using var rt = new ActorTestRuntime(services => services.AddDaprActors(), options: new ActorTestRuntimeOptions
{
    // 使用失败运行所报告的种子重新初始化调度器，精确重放该顺序。
    Scheduler = new PriorityActorScheduler(seed: 1234567),
});
```

### 运行多种顺序

让同一场景跑过大量种子，以暴露依赖顺序的缺陷。每次迭代都用一个新的 `SeededRandomActorScheduler(seed)` 重建运行时；下面的两次出价由各自的调用方并发发出，但它们在拍卖 Actor 上以两个串行的轮次运行，每个种子会探索这些轮次的不同顺序。断言失败时，产生该失败的种子即为复现依据。

```csharp
[Fact]
public async Task Concurrent_bids_never_lose_the_high_bid()
{
    for (var seed = 0; seed < 1000; seed++)
    {
        await using var rt = new ActorTestRuntime(
            services => services.AddDaprActors(_ => { }),
            new ActorTestRuntimeOptions { Scheduler = new SeededRandomActorScheduler(seed) });
        var auction = rt.CreateActor<IAuctionActor>(ActorId.Create("a1"), "Auction");

        var a = auction.PlaceBid(new Bid(100m, "alice"));
        var b = auction.PlaceBid(new Bid(110m, "bob"));
        await rt.RunToIdle();
        await Task.WhenAll(a, b);

        Assert.Equal(110m, rt.StateOf(auction).Data<AuctionData>()!.HighBid);   // 种子固定了导致失败的顺序
    }
}
```

## 故障注入

`rt.Faults` 为下一个匹配的操作排队控制项。每个 `FailNext...` 控制项都是**一次性**的，即使传入 `transient: false` 也是如此。`transient: true`（默认值）选择 `ActorInjectedTransientException`；`false` 则选择 `ActorInjectedPermanentException`。它改变的是异常的分类，而不是失败的操作数量。如果你想演练更多次失败，请为每次额外的失败排队一个故障。不匹配的操作不会消耗故障。

| 控制项 | 边界与过滤条件 |
| --- | --- |
| `FailNextStateWrite<TState>()` | 在持久化该类型的值之前，包括显式保存或轮次结束时的保存。可选的 `stateName:` 将其限定到某一个条目。 |
| `FailNextMigration<TState>()` | 在针对该类型的迁移读取之前。可选的 `stateName:`。 |
| `FailNextUpcastHop<TFrom, TTo>()` | 在特定的迁移跳转之前。可选的 `stateName:`。 |
| `FailNextInvocation()` | 在测试调用边界的派发之前。可选的 `actorType:` 和 `methodName:`。 |
| `PauseNextStateWrite<TState>()` | 在持久化之前暂停，并返回一个 `ActorFaultPause`。可选的 `stateName:`。 |
| `SimulateNextRemoteInvocation()` | 通过测试调用客户端，移除下一个匹配调用的环境执行上下文，同时保留请求头。可选的 `actorType:` 和 `methodName:`。 |
| `FailNextStreamRead()` | 在收到入站帧之后、交付给运行时之前。可选的帧 `kind:`；需要装饰后的回调传输层。 |
| `FailNextStreamWrite()` | 在转发出站帧之前。可选的帧 `kind:`；需要装饰后的回调传输层。 |

故障注入不会安装自动的调用重试策略。请先断言失败的那次尝试，然后显式地演练恢复或重新传递。状态写入失败与响应在成功提交**之后**丢失是两种不同的场景：二者都不提供通用的回滚或恰好一次（exactly-once）保证。参见[投递保证]({{< ref "dotnet-actorsnext-howto.md#delivery-guarantees-you-must-design-for" >}})和[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})。

### 暂停状态写入并与停用竞争

`PauseNextStateWrite<TState>` 会在持久化之前立即暂停下一个匹配的写入。先发起调用，使用 `StepAsync` 让它到达边界，然后在引入相互竞争的工作之前等待 `ActorFaultPause.Reached`：

```csharp
await using var rt = new ActorTestRuntime(services => services.AddDaprActors());
var id = ActorId.Create("u1");
var cart = rt.CreateActor<ICartActor>(id, "CartActor");
using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
using var pause = rt.Faults.PauseNextStateWrite<CartState>(stateName: "cart");

var add = cart.AddItem(new CartItem("sku-1", 1));
await rt.StepAsync(timeout.Token);
await pause.Reached.WaitAsync(timeout.Token);

var deactivate = rt.DeactivateAsync("CartActor", id);
try
{
    Assert.False(deactivate.IsCompleted);
    Assert.False(await rt.StepAsync(timeout.Token));
}
finally
{
    pause.Release();
}

await rt.RunToIdle(timeout.Token);
await Task.WhenAll(add, deactivate);
Assert.Single(rt.StateOf(cart).Get<CartState>("cart")!.Items);
```

外部发起的停用会排在进行中的工作之后，因此需要在等待它之前驱动调度器。由活动调用链发起的停用会被推迟，直到该轮次及其已放行的子调用全部结束。在这些工作仍在使用该激活实例期间，它不会被释放。

`Release()` 让写入继续进行；在到达边界之前调用它是安全的。释放（Dispose）暂停对象同样会使其放行。被暂停的写入会遵循它自己的取消令牌。取消 `RunToIdle` 只会取消调度器的等待，而不会取消已在运行的轮次；因此清理时务必释放暂停。你也可以在暂停期间推进虚拟时间以测试回调顺序，或调用另一个 Actor 以验证其能否独立推进。

### 注入回调流故障

这些控制项针对的是承载 Actor 的 `SubscribeActorEvents` 流，而不是发布订阅的订阅流。`ActorTestRuntime` 不会打开该传输层。若要进行协议级的单元测试，请在假传输层之上运行 `SubscribeActorEventsStreamManager`；若要进行集成测试，请使用真实的 Actor 宿主，并用 `FaultInjectingActorEventsTransport` 装饰它的传输层。

在测试宿主中，请在 Actor 服务**之后**注册装饰器：

```csharp
using Dapr.Actors.Next.Core.State;
using Dapr.Actors.Next.Core.Transport;
using Dapr.Actors.Next.Testing;
using Microsoft.Extensions.DependencyInjection;

services.AddSingleton<ActorFaults>();
services.AddSingleton<IActorStateFaultInjector>(
    sp => sp.GetRequiredService<ActorFaults>());
services.AddSingleton<ISubscribeActorEventsTransport>(sp =>
    new FaultInjectingActorEventsTransport(
        createTransport(sp),
        sp.GetRequiredService<ActorFaults>()));
```

`createTransport` 是你现有的工厂，用于创建底层的假传输层或 `DaprActorEventsTransport`；请保留它的端点和 API 令牌配置。不要在该工厂内部解析 `ISubscribeActorEventsTransport`，否则会递归地解析到装饰器本身。只有当此宿主同时使用状态写入或迁移故障时，才需要注册 `IActorStateFaultInjector`。

从测试宿主中解析同一个 `ActorFaults` 实例，并在发送待测请求之前布置故障：

```csharp
var faults = host.Services.GetRequiredService<ActorFaults>();
faults.FailNextStreamRead(kind: SubscribeActorEventsFrameKind.Invoke);
```

在另一个场景中，改为使响应失败：

```csharp
faults.FailNextStreamWrite(kind: SubscribeActorEventsFrameKind.Invoke);
```

读取故障会消耗所选的入站帧，而不将其派发。写入故障会阻止所选的响应被转发；对于成功的调用响应，Actor 状态已经提交。省略 `kind` 会选中该方向上的下一个帧，它可能是初始注册帧，而不是调用帧。两种控制项都不会影响不匹配的帧，并且只会抛出一次所选的注入异常。

断言重新连接、Actor 类型的重新公告以及后续的进展。需考虑流管理器 5 秒的重连延迟；假传输层测试可以驱动其注入的 `TimeProvider`，而 `rt.Time` 不会自动控制真实宿主。装饰器不会替你重新传递请求。请在假传输层测试中显式地重新发送请求，或借助真实边车演练你配置的重试路径，并断言在响应丢失后，幂等操作不会重复产生状态变更或外部副作用。

在较早的调用处于挂起状态时，流读取器仍会继续放行回调，因此嵌套回调不会被阻塞在固定的并发上限之后。未完成的调用仍会消耗与已放行负载成正比的内存。断开连接会取消已接受的工作；Actor 代码必须遵守取消，忽略取消的代码可能会比失败的流存活得更久。

SDK 的[测试指南](https://github.com/dapr/dotnet-sdk/blob/ae6002f82c5bd7e9c4af5589d04cf2f535b786c6/src/Dapr.Actors.Next.Testing/README.md)描述了以下测试类中的回归覆盖：`RuntimeConcurrencyTests`、`TimerConcurrencyTests`、`StreamConcurrencyTests`、`ActorStreamFaultTests`、`VirtualTimerConcurrencyTests` 和 `RealSidecarConcurrencyTests`。

## 状态机的结构分析

基于 `StateMachineActor<TState, TData>` 构建的状态机 Actor 以表格的形式保存其状态转换，因此测试运行时无需执行状态机即可检查其结构。`ActorStateMachine.Analyze<TActor>()` 会检查该表格并报告缺陷：没有任何转换能够到达的状态、无法离开的状态、永远不会被选中的守卫分支，以及跨层级的进入/退出顺序问题。`AssertNoStructuralDefects()` 会把任何发现都转为测试失败。

```csharp
[Fact]
public void Order_machine_is_structurally_sound()
    => ActorStateMachine.Analyze<OrderActor>().AssertNoStructuralDefects();
```

把它作为单元测试运行，这样当重构导致某个状态被孤立时，构建会失败，而不是在生产环境中才暴露出来。编写细节请参见[状态机 Actor]({{< ref dotnet-actorsnext-statemachine.md >}})。

## 使用 Coyote 进行深度测试

内置调度器会探索 Actor 模型中结构化的不确定性：消息顺序、重入，以及定时器与消息之间的竞争。无需任何额外工具，它就能覆盖绝大多数 Actor 缺陷。对于其余情况，例如处理程序中包含复杂的进程内异步，或需要全程序数据竞争检测的场景，你可以在 [Microsoft Coyote](https://microsoft.github.io/coyote/) 下运行同样的测试；Coyote 会对整个调用图中的 `Task`、`await` 和锁进行系统化控制。

### 安装 Coyote

将 Coyote 包添加到测试项目中，并安装 CLI 工具：

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.Coyote" Version="..." />
  <PackageReference Include="Microsoft.Coyote.Test" Version="..." />
</ItemGroup>
```

```bash
dotnet tool install --global Microsoft.Coyote.CLI
```

### 启用 Coyote 桥接

`Dapr.Actors.Next` 的测试设施包含一个可选的 Coyote 桥接，它会把运行时的调度决策交由 Coyote 的系统化引擎处理。它通过 `DAPR_ACTORS_NEXT_COYOTE` 构建常量在编译时启用，而不是逐个测试切换，因此一个专用的测试配置即可为整个程序集开启它：

```xml
<PropertyGroup Condition="'$(Configuration)' == 'Coyote'">
  <DefineConstants>$(DefineConstants);DAPR_ACTORS_NEXT_COYOTE</DefineConstants>
</PropertyGroup>
```

设置该常量后，`CoyoteBridge.IsEnabled` 为 `true`，运行时的调度将经由 Coyote 进行；否则使用内置调度器。测试可以通过 `CoyoteBridge.IsEnabled` 断言自己运行在哪种模式下。

### 在系统化探索下运行测试套件

对于最深入的模式（Coyote 同时控制处理程序内的异步与锁），请改写已编译的测试程序集，并在 Coyote 测试器下运行它。测试在 JIT 上运行，因此这不会与你的 AOT 生产构建发生冲突。

```bash
# 改写测试程序集，使 Coyote 控制所有并发
coyote rewrite ./bin/Debug/net10.0/MyActors.Tests.dll

# 对某个测试入口进行 N 次迭代的系统化探索
coyote test ./bin/Debug/net10.0/MyActors.Tests.dll \
  --method CartActorTests.Concurrent_bids_never_lose_the_high_bid \
  --iterations 10000
```

如果你希望一切都在 `dotnet test` 中完成，也可以通过 `Microsoft.Coyote.SystematicTesting.TestingEngine` 从测试中以进程内方式驱动 Coyote。

{{% alert title="何时使用 Coyote" color="primary" %}}
先从内置运行时开始：它无需改写代码，开箱即可覆盖 Actor 模型的不确定性。当 Actor 的处理程序确实包含你希望探索的复杂进程内异步，或者你希望对 SDK 不负责的代码进行数据竞争检测时，再添加 Coyote。
{{% /alert %}}

## 使用 Testcontainers 进行集成测试

内存运行时用来证明你的 Actor 逻辑。集成测试则用来证明真实的协议：`SubscribeActorEvents` 流、与真实边车之间的序列化、经由真实调度器的提醒，以及放置。请使用 `Dapr.Testcontainers` 包来搭建这些环境。

{{% alert title="单元测试能证明什么，不能证明什么" color="primary" %}}
内存运行时忠实地模拟了 SDK 自身的调度器、时间和投递行为，因此它能证明你的逻辑、你对顺序的假设、你的故障处理以及你的迁移。但它并不是真实的运行时。它无法证明：你序列化的负载能在真实运行的 `daprd` 上正确反序列化；放置与提醒是否按配置工作；真实的流重新连接后能否正确地重新公告；或者在负载下墙钟时间是否依然成立。请把大部分覆盖放在快速的内存测试中，并用少量集成测试来证明只有真实边车才能证明的部分。对于协议边界而言，全绿的单元测试套件是必要的，但并不充分。
{{% /alert %}}

Actor 集成测试夹具必然是多容器的。Actor 需要放置服务，提醒需要 Scheduler 服务，并且除了边车和待测应用之外，还需要一个状态存储。

```csharp
public sealed class DaprActorFixture : IAsyncLifetime
{
    // 请查阅解决方案中的 Dapr.Testcontainers API，以组合以下组件：
    //   redis（状态存储）+ placement + scheduler + daprd + 承载 Actor 的应用，
    //   位于共享网络中，并带有就绪门控。
    public async ValueTask InitializeAsync() { /* 启动容器 */ }
    public async ValueTask DisposeAsync()    { /* 停止容器 */ }
}

public class CartActorIntegrationTests(DaprActorFixture fixture) : IClassFixture<DaprActorFixture>
{
    [Fact]
    public async Task Reminder_fires_through_the_real_scheduler()
    {
        var cart = ActorProxy.Create<ICartActor>(ActorId.Create("u1"), "CartActor");
        await cart.AddItem(new CartItem("sku-1", 1));
        // ……等待真实调度器投递提醒，然后断言
    }
}
```

请把集成测试留给只有真实边车才能证明的内容，例如流的往返、真实的序列化、提醒与放置行为，以及端到端的订阅投递。大部分覆盖仍应放在快速的内存测试中。

## 覆盖率

由于困难的路径都能在内存中触达，因此达到较高的覆盖率是切实可行的。请把大部分覆盖放在针对 `ActorTestRuntime` 的快速单元测试中，并在其之上为协议部分补充集成测试。在计算覆盖率分母时，应排除生成的文件以及源生成器和分析器程序集；生成器由快照测试与运行测试覆盖，分析器则由分析器测试覆盖。

## 最佳实践

- 默认使用内存运行时，只在剩余的深度场景中才添加 Coyote。
- 使用 `rt.Time.Advance(...)` 驱动定时器和提醒；测试中绝不使用真实的延迟。
- 当调度探索失败时，记录报告的种子，并添加一个固定种子的回归测试。
- 使用 `rt.Faults` 显式测试失败路径，而不只测试正常路径。
- 对于状态机 Actor，请将 `Analyze<T>().AssertNoStructuralDefects()` 作为测试断言，使结构上的回归导致构建失败。
- 集成测试应当数量少，并聚焦于真实协议的行为；单元测试应当数量多且速度快。

## 后续步骤

- [教程：通过示例学习 Dapr.Actors.Next]({{< ref "tutorial/_index.md" >}})
- [状态机 Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [订阅流]({{< ref dotnet-actorsnext-streams.md >}})
- [序列化与状态迁移]({{< ref dotnet-actorsnext-serialization.md >}})
