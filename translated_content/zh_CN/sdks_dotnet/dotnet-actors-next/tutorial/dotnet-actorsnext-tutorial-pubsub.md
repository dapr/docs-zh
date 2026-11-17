---
type: docs
title: "Part 3: The cart that reacts"
linkTitle: "3. pub/sub"
weight: 163000
description: "只需一个属性即可实现动态 pub/sub，无需 broker 即可验证事件驱动的流程"
---

第三个示例延续购物车的场景。库存服务会发布 `inventory-restocked` 事件；一个正在等待缺货商品的购物车应当被唤醒，并将该商品标记为可用。订阅声明在 Actor 方法上，事件则指明由哪个购物车接收。

本部分的代码位于 `/examples/Actor.Next/03-PubSub/`。

## 你将构建的内容

```csharp
[DaprActor("RestockingCart")]
public sealed class RestockingCartActor(ActorActivationContext context) : Actor, IRestockingCartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    [Subscribe("orders-pubsub", "inventory-restocked", RouteBy = nameof(RestockEvent.CartId))]
    public async Task OnRestock(RestockEvent evt, CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new RestockingCartState(), ct);

        // 投递语义为至少一次，因此这段逻辑必须可以安全地重复执行：
        // 先执行移除，重复投递在首次成功之后就不会再产生效果。
        if (cart.Value.WaitingForStock.Remove(evt.Sku))
        {
            cart.Value.Available.Add(evt.Sku);
        }
    }
}
```

宿主会在你与 Actor 一起注册流式宿主时，根据 `[Subscribe]` 完成订阅的接线：

```csharp
builder.Services.AddDaprActors();
builder.Services.AddDaprActorStreams(); // 可在 `Dapr.Actors.Next` NuGet 包中获取
```

### 动态性为何重要

这里只有一个 declarative subscription，但它会扇出到事件中 `CartId` 所指定的购物车实例上，覆盖整个集群，且无需为每个实例单独配置。订阅由宿主负责；路由键在投递时决定 Actor ID；placement 会把唤醒请求路由到该购物车所在的位置，因此在某个副本上收到的事件可以驱动另一个副本上的购物车。投递相关的边界行为也随之而来：确认（ack）取决于轮次的结果，轮次成功则确认，瞬时失败则重试，有毒消息则进入死信。同时，CloudEvents 的 `traceparent` 会并入唤醒调用，因此入站事件与 Actor 轮次会显示在同一条追踪中。

在 `Dapr.Actors` 中，这个问题并没有现成的解决方案。你需要单独搭建一个订阅者服务，在其中接收事件，手动查找正确的 Actor ID，自行调用代理，并自己负责重试与幂等。而在这里，只需一个属性和一个指明目标的字段即可。

需要明确说明的一点是：投递语义为至少一次，因此 handler 必须是幂等的，这也是 `OnRestock` 被写成可以安全地执行两次的原因。这与管理 reminder 和重试调用的契约相同，只是在这里再次出现。

参考细节请见 [Subscription streams]({{< ref dotnet-actorsnext-streams.md >}})。

## 测试

```csharp
private static readonly ActorStreamSubscription Subscription =
    new("orders-pubsub", "inventory-restocked", "RestockingCart", nameof(IRestockingCartActor.OnRestock), nameof(RestockEvent.CartId));
private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);

[Fact]
public async Task Publishing_one_event_wakes_only_the_named_cart()
{
    await using var runtime = CreateRuntime();
    var named = runtime.CreateActor<IRestockingCartActor>(ActorId.Create("cart-1"), "RestockingCart");
    var other = runtime.CreateActor<IRestockingCartActor>(ActorId.Create("cart-2"), "RestockingCart");
    await AddSku(runtime, named, "sku-1");
    await AddSku(runtime, other, "sku-1");

    var delivery = Runner(runtime).ProcessEventAsync(Subscription, Event(new RestockEvent("cart-1", "sku-1")));
    await runtime.RunToIdle();
    var action = await delivery;

    Assert.Equal(ActorStreamDeliveryAction.Ack, action);
    Assert.True(await IsAvailable(runtime, named, "sku-1"));
    Assert.False(await IsAvailable(runtime, other, "sku-1"));
}

[Fact]
public async Task Transient_state_write_fault_retries_delivery_instead_of_acknowledging()
{
    await using var runtime = CreateRuntime();
    var cart = runtime.CreateActor<IRestockingCartActor>(ActorId.Create("cart-retry"), "RestockingCart");
    await AddSku(runtime, cart, "sku-1");

    runtime.Faults.FailNextStateWrite<RestockingCartState>();
    var firstDelivery = Runner(runtime).ProcessEventAsync(Subscription, Event(new RestockEvent("cart-retry", "sku-1")));
    await runtime.RunToIdle();
    var first = await firstDelivery;
    var secondDelivery = Runner(runtime).ProcessEventAsync(Subscription, Event(new RestockEvent("cart-retry", "sku-1")));
    await runtime.RunToIdle();
    var second = await secondDelivery;

    Assert.Equal(ActorStreamDeliveryAction.Retry, first);
    Assert.Equal(ActorStreamDeliveryAction.Ack, second);
    Assert.True(await IsAvailable(runtime, cart, "sku-1"));
}

private static ActorTestRuntime CreateRuntime()
{
    _ = typeof(RestockingCartActor);
    return new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
}

private static ActorStreamSubscriptionRunner Runner(ActorTestRuntime runtime)
{
    var invocationClient = (IActorInvocationClient)runtime.GetType().GetProperty("Runtime", BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(runtime)!;
    return new ActorStreamSubscriptionRunner(
        new ActorStreamForwarder(invocationClient, new ActorStreamRoutingKeyExtractor()),
        new DefaultActorStreamFailureClassifier());
}

private static ActorStreamEvent Event(RestockEvent evt) =>
    new("event-1", "orders-pubsub", "inventory-restocked", Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt, WebJsonOptions)), new Dictionary<string, string>());

private static async Task AddSku(ActorTestRuntime runtime, IRestockingCartActor cart, string sku)
{
    var add = cart.AddUnavailableSku(sku);
    await runtime.RunToIdle();
    await add;
}

private static async Task<bool> IsAvailable(ActorTestRuntime runtime, IRestockingCartActor cart, string sku)
{
    var read = cart.IsAvailable(sku);
    await runtime.RunToIdle();
    return await read;
}
```

这里无需搭建模拟的 broker：`Runner` 会驱动流式宿主所使用的同一条转发调用，以及 `Ack`/`Retry`/`Drop` 路径，它构建在运行时的内部调用客户端之上。`AddUnavailableSku` 和 `IsAvailable` 是普通的 Actor 方法；辅助方法只是调用它们，并通过 `RunToIdle` drain 轮次。流相关的类型（`ActorStreamSubscription`、`ActorStreamSubscriptionRunner`、`ActorStreamForwarder`、`ActorStreamRoutingKeyExtractor`、`DefaultActorStreamFailureClassifier`、`ActorStreamEvent`，以及 `ActorStreamDeliveryAction` 结果）都位于 `Dapr.Actors.Next.Streams` 中。

### 为何需要这些测试

pub/sub 驱动的行为正是这样一类功能：在旧版 SDK 中，只能借助真实的 broker 在集成测试里验证，而且速度很慢，因此大多数团队只会孤立地测试 handler，从不验证接线部分是否正确地完成了路由和重试。事件到达与正确的 Actor 恰好响应一次之间的粘合部分最容易出错，也是最难测试的部分。

在这里，两部分都只是普通的单元测试。第一个测试证明动态路由是精确的：一个事件只唤醒它所指定的购物车。第二个测试验证的是团队几乎从不测试的投递边界：失败的轮次会触发重试而不是确认，随后在写入成功后，重新传递会被确认。运行时代替 broker 的角色，因此你只需将事件交给订阅运行器，并检查它返回的投递动作，无需 Redis、Kafka 或 Docker。

## 另请参阅

- [Subscription streams]({{< ref dotnet-actorsnext-streams.md >}})
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
- 下一篇：[第 4 部分：拍卖]({{< ref dotnet-actorsnext-tutorial-auction.md >}})
