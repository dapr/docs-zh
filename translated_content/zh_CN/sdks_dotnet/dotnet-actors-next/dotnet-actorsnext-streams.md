---
type: docs
title: "在 .NET SDK 中使用订阅流"
linkTitle: "订阅流"
weight: 140000
description: "使用 Dapr.Actors.Next 通过 [Subscribe] 由发布订阅主题驱动 Actor"
---

订阅流让 Actor 能够响应已有 Dapr 发布订阅组件中的消息。你在 Actor 方法上标注 `[Subscribe]`，投递过来的主题事件就会唤醒该 Actor 并调用这个方法，效果与定时器或提醒触发时很相似。

{{% alert title="包" color="primary" %}}
订阅流位于 `Dapr.Actors.Next.Streams` 命名空间中，包含在 `Dapr.Actors.Next` 元包里。它使用的是现有的 Dapr 发布订阅与 Actor 调用机制，因此无需改动运行时，就能与当前运行时配合工作。
{{% /alert %}}

## 工作原理

订阅位于宿主中，而不在 Actor 的代码体中。该包会向主题打开一个流式订阅，接收经过过滤的事件，并把每个事件作为普通的、经 Placement 路由的代理调用转发给目标 Actor。正是这次调用唤醒了 Actor（无论 Placement 将它放置在哪里），并以基于轮次的方式运行它，同时保留所有常规保证。

由于转发本身是一次普通调用，接收主题事件的实例不需要承载目标 Actor。投递到某个副本的事件，完全可以驱动放置在另一个副本上的 Actor。

## 用法

在 Actor 方法上标注 `[Subscribe]`，指定发布订阅组件、主题，以及如何提取路由键。路由键即应当接收该事件的 Actor ID。

```csharp
[DaprActor]
public sealed class CartActor(ActorActivationContext context) : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    [Subscribe("orders-pubsub", "inventory-restocked", RouteBy = nameof(RestockEvent.CartId))]
    public async Task OnRestock(RestockEvent e, CancellationToken ct)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.MarkAvailable(e.Sku);
    }
}
```

路由键决定了哪个 Actor ID 会收到事件。流式服务负责打开订阅、反序列化事件并转发调用；订阅元数据由应用通过注册表提供。路由键可以是事件的属性、CloudEvents 属性（例如 `subject`），也可以是内容路径。

`[Subscribe]` 用于记录 Actor 方法的订阅目标，但当前实现不会自动发现该特性。应用必须把对应的 `ActorStreamSubscription` 添加到流注册表中。负责开启订阅的流式宿主是一个独立服务，需要你显式启用：

```csharp
builder.Services.AddDaprActors();
builder.Services.AddDaprActorStreams();

app.Services.GetRequiredService<ActorStreamSubscriptionRegistry>().Add(
    new ActorStreamSubscription(
        "orders-pubsub",
        "inventory-restocked",
        "CartActor",
        nameof(ICartActor.OnRestock),
        nameof(RestockEvent.CartId)));
```

注册表条目提供发布订阅组件、主题、Actor 类型、派发方法和路由键。特性与注册表条目应描述同一个订阅；注册表才是承载订阅的宿主所使用的配置。

## 投递语义

订阅的确认取决于转发调用的结果，因此在 Actor 处理完成之前，消息不会被确认。

- Actor 轮次成功：确认（ack）。
- 瞬时失败：重试。
- 有毒消息：根据组件的配置丢弃（drop）或进入死信（dead-letter）。

跨副本的单次投递由发布订阅组件自身的消费者与队列语义保证；该包不会重新实现扇出。每个事件只投递给一个应用实例，由它向唯一的目标 Actor 发起一次经 Placement 路由的调用。

{{% alert title="顺序与宿主由组件决定，而非 Actor" color="primary" %}}
这两点来自两个事实：订阅位于宿主中，投递又来自发布订阅组件。第一，顺序取决于组件提供的保证，通常不是跨事件的全序；转发调用和 Placement 本身也不会增加任何顺序保证，因此不要假设处理程序会按发布顺序看到事件。当顺序重要时，应在事件中携带序列号或时间戳，由 Actor 自行调和，而不是依赖到达顺序。第二，只有在承载该应用的实例运行并能接收时，事件才会被消费；订阅在 Actor 中并不持久。若没有任何宿主在线，投递遵循的是组件的保留与重新传递行为，而非 Actor 的行为。再加上至少一次投递的语义，这就是 `[Subscribe]` 处理程序必须幂等且容忍乱序的原因。
{{% /alert %}}

## 追踪

CloudEvents 的 `traceparent` 会从事件中提取，并附加到转发调用上，因此入站投递与 Actor 唤醒会显示为同一条追踪，而不是两条互不相连的追踪。在追踪视图中，宿主这一跳和代码里一样被抽象掉了。

## 测试订阅流

无需搭建假的消息代理。你可以直接对着内存运行时驱动订阅运行器，它执行的是流式宿主所用的同一套转发调用以及 `Ack`/`Retry`/`Drop` 路径。描述订阅、基于运行时的调用客户端构建运行器，然后向其输入 `ActorStreamEvent`：

```csharp
private static readonly ActorStreamSubscription Subscription = new(
    "orders-pubsub", "inventory-restocked", "CartActor",
    nameof(ICartActor.OnRestock), nameof(RestockEvent.CartId));

private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

// 运行器把投递来的事件转发给经 Placement 路由的 Actor。它需要运行时的调用客户端，
// 内存运行时在内部公开了该客户端。
private static ActorStreamSubscriptionRunner Runner(ActorTestRuntime rt)
{
    var invocationClient = (IActorInvocationClient)rt.GetType()
        .GetProperty("Runtime", BindingFlags.Instance | BindingFlags.NonPublic)!
        .GetValue(rt)!;
    return new ActorStreamSubscriptionRunner(
        new ActorStreamForwarder(invocationClient, new ActorStreamRoutingKeyExtractor()),
        new DefaultActorStreamFailureClassifier());
}

private static ActorStreamEvent Event(RestockEvent evt) => new(
    "event-1", "orders-pubsub", "inventory-restocked",
    Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt, WebJson)),
    new Dictionary<string, string>());
```

```csharp
[Fact]
public async Task Restock_event_routes_to_the_cart_in_its_route_key()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
    var cart = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");

    var delivery = Runner(rt).ProcessEventAsync(Subscription,
        Event(new RestockEvent { CartId = "u1", Sku = "sku-1" }));
    await rt.RunToIdle();

    Assert.Equal(ActorStreamDeliveryAction.Ack, await delivery);
    Assert.Contains("sku-1", (await cart.GetSummary()).Available);
}

[Fact]
public async Task Transient_failure_is_retried_not_acked()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
    _ = rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");

    rt.Faults.FailNextStateWrite<CartState>();   // 第一次投递在轮次中途失败
    var delivery = Runner(rt).ProcessEventAsync(Subscription,
        Event(new RestockEvent { CartId = "u1", Sku = "sku-1" }));
    await rt.RunToIdle();

    Assert.Equal(ActorStreamDeliveryAction.Retry, await delivery);   // 重试，而非确认
}
```

这里用到的类型（`ActorStreamSubscription`、`ActorStreamSubscriptionRunner`、`ActorStreamForwarder`、`ActorStreamRoutingKeyExtractor`、`DefaultActorStreamFailureClassifier`、`ActorStreamEvent`，以及结果类型 `ActorStreamDeliveryAction`）都位于 `Dapr.Actors.Next.Streams` 命名空间中。

针对真实组件的端到端行为由 Testcontainers 集成测试套件验证；参见[测试]({{< ref dotnet-actorsnext-testing.md >}})。

## 最佳实践

- 为该主题选择一个稳定、且每个事件都存在的路由键；无法解析出路由键的事件无法被路由。
- 保持 `[Subscribe]` 处理程序幂等。投递是至少一次的，被重试的消息可能会被重新处理。
- 把订阅处理程序当作其他轮次一样看待：保持简短，让它来驱动状态转换。对于状态机 Actor，事件进入状态机的方式与其他事件完全相同。
- 依赖组件的投递与顺序保证，而不是自行构建扇出。

## 后续步骤

- [教程第 3 部分：会响应的购物车]({{< ref dotnet-actorsnext-tutorial-pubsub.md >}})
- [状态机 Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
