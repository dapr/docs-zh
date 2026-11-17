---
type: docs
title: "从 Dapr.Actors 迁移到 Dapr.Actors.Next"
linkTitle: "从 Dapr.Actors 迁移"
weight: 105000
description: "逐概念介绍如何把现有的 Dapr.Actors（以及 Dapr.Actors.AspNetCore）Actor 层迁移到 Dapr.Actors.Next"
---

本指南面向已经在 `Dapr.Actors`（通常由 `Dapr.Actors.AspNetCore` 托管）上运行 Actor、并希望迁移到 `Dapr.Actors.Next` 的开发者。它逐一介绍你当前使用的每个概念，给出新 SDK 中的对应写法，说明概念本身有哪些变化，指出容易犯严重错误的地方，并提供迁移前后的代码对比。本文默认你已了解 `Dapr.Actors` 的工作方式，不再重新讲解 Actor 模型；对于旧 SDK 中没有对应功能的特性（状态机、Subscription streams、内存测试运行时和状态迁移，各自都有独立页面），本文有意略过。

`Dapr.Actors.Next` 是一个全新的包族，API 与旧版不同。采用它意味着重写你的 Actor 层，而不是原地升级包版本。好消息是，它与 Dapr runtime 的线协议兼容，并且使用相同的类型名称寻址 Actor，因此新旧 SDK 可以共存，你可以一次迁移一个 Actor 类型，而不必一次性全部切换。

{{% alert title="运行时要求" color="warning" %}}
`Dapr.Actors.Next` 需要 Dapr runtime **v1.18.0 或更高版本**。它通过持久的、由应用发起的 `SubscribeActorEvents` gRPC 流托管 Actor，而不是通过入站的 HTTP Actor 处理端点。开始之前，请确认你的集群已运行 1.18 或更高版本；目前没有受支持的方式让新 SDK 对接更旧的 sidecar。虽然 `Dapr.Actors` 和 `Dapr.Actors.AspNetCore` 包可以与所有受支持的 Dapr runtime 版本配合使用，但它们不会用到任何 gRPC 功能；同时使用新旧两套 Actors SDK 的应用，需要再开放一个端口，用于接收运行时的 HTTP 和 gRPC 回调。
{{% /alert %}}

## 开始之前：最容易出问题的两件事

请先阅读这两点。相比之下，迁移的其余部分都是机械性的工作。

1. **已持久化的状态必须仍然可读。** 这是风险最高的一项，因为现有 Actor 已在你的 state store 中保存了状态。好消息是，`Dapr.Actors` 默认就用 System.Text.Json 序列化 Actor **状态**，`Dapr.Actors.Next` 也是如此，因此状态总体上是兼容的。真正可能让你出问题的，是 `JsonSerializerOptions` 的差异（属性命名策略、枚举按字符串还是数字序列化、null 与默认值如何输出），或者你在旧版中配置的自定义状态序列化器。请把序列化器配置视为静态存储契约的一部分，并验证两者一致；如果状态的结构确实发生了变化，请使用内置的[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})，而不是寄希望于字节恰好一致。

2. **跨 SDK 的实时调用只能在 JSON 路径上对齐。** 在新旧共存期间，`Dapr.Actors.Next` 代理发出的调用使用 System.Text.Json 序列化。这与旧版的**非远程处理**代理（同样是 JSON）一致，但与旧版的**远程处理**代理（DataContract）**不一致**。如果迁移途中的集群里，一个应用通过 Actor 协议调用另一个应用，那么两端必须就线协议格式达成一致。避免这类问题的一个简便方法，是把一个 Actor 类型与它的调用方一起迁移，这样同一类型就不会跨越两种序列化格式。

{{% alert title="每次只迁移一个 Actor 类型" color="primary" %}}
由于两套 SDK 都使用相同的类型名称寻址 Actor，并且与运行时线协议兼容，你无需进行大规模的一次性切换。先部署新的宿主（或在现有应用中启用新模式），迁移单个 Actor 类型及调用它的代码，验证状态读取和行为，然后再迁移下一个。对于尚未迁移的类型，继续保留 `Dapr.Actors` 包。你也可以为类型保留完整的 namespace，以便区分各自使用的是哪一套，避免迁移过程中出现冲突。
{{% /alert %}}

## 快速对照

| 关注点                               | `Dapr.Actors`（+ `Dapr.Actors.AspNetCore`） | `Dapr.Actors.Next`                                                        |
|--------------------------------------| --- |---------------------------------------------------------------------------|
| 包                                   | `Dapr.Actors` + `Dapr.Actors.AspNetCore` | `Dapr.Actors.Next`（元包）                                                |
| 运行时连接                           | 入站 HTTP Actor 处理端点 | 出站的持久 `SubscribeActorEvents` gRPC 流                                 |
| 宿主配置                             | `AddActors(...)` + `app.MapActorsHandlers()` | 仅 `AddDaprActors(...)`                                                   |
| 注册                                 | 每个类型调用一次 `options.Actors.RegisterActor<T>()` | 源生成器自动发现；通常无需逐类型调用                                      |
| 契约接口                             | `interface I : IActor`（无特性） | `[GenerateActorClient] interface I : IActor`                              |
| 实现                                 | `[Actor(TypeName="…")] class : Actor`，带 `Actor(ActorHost)` 构造函数 | `[DaprActor("…")] class : Actor`，注入 `ActorActivationContext`           |
| Actor 内部获取标识                   | `this.Id`（来自 `Host`） | `protected override ActorId Id => context.ActorId`                        |
| 状态访问                             | `this.StateManager`（`IActorStateManager`） | `this.State`（`IActorStateAccessor`）                                     |
| 清除单个 Actor 实例的状态缓存        | `this.StateManager.UnloadStateAsync(string stateName, UnloadStateOptions options)` | `IActorStateAccessor.EvictCacheAsync(DaprEvictStateOptions options)`；驱逐缓存条目，但不持久化 |
| 显式保存                             | `SaveStateAsync()`（或轮次结束时自动保存） | 需要时调用 `State.SaveStateAsync()`；否则轮次结束时自动保存               |
| 代理形式                             | 远程处理（`Create<T>`）和非远程处理（`Create` + `InvokeMethodAsync`） | 单一代理：`IActorProxyFactory.Create<T>(id, type)`                        |
| 负载序列化                           | DataContract（远程处理）或 System.Text.Json（非远程处理） | 可插拔的 `IDaprSerializer` 路径（默认 System.Text.Json）                   |
| timer                               | `RegisterTimerAsync(name, callbackMethodName, byte[] state, …)` | `IActorTimerScheduler.ScheduleAsync(…, operationName, arguments, …)`      |
| reminder                                 | `RegisterReminderAsync(…)` + 实现 `IRemindable` | `IActorReminderScheduler.ScheduleAsync(…)`，路由到指定的具名 Actor 方法   |
| 选项                                 | `ActorRuntimeOptions` / `ActorReentrancyConfig` | `DaprActorsOptions`（选项模式）                                           |
| 依赖注入                             | 通过 AspNetCore DI 激活器，每次激活一个作用域；构造函数接收 `ActorHost` | 每次激活一个作用域；普通的构造函数注入                                    |
| 测试                                 | 针对 sidecar 的集成测试 | 内存中的确定性运行时（独立页面）                                          |
| 一个接口，多种 Actor 类型            | 不实用 | 支持                                                                      |
| 一个 Actor 类型，多个接口            | 不支持 | 支持                                                                      |
| 多参数的非远程处理方法               | 不可能（只能有单个负载参数） | 支持                                                                      |

## 包与托管

在旧模式下，你引用 `Dapr.Actors` 获取客户端和运行时类型，引用 `Dapr.Actors.AspNetCore` 进行托管，然后在 HTTP 端口上映射 Actor 端点，让 sidecar 能通过 HTTP 调用你的应用。在新模式下，你只需引用一个 `Dapr.Actors.Next` 包并映射一个 gRPC 端点；应用启动时，宿主会与运行时建立一条持久流，所有回调都通过这条流接收。

```xml
<!-- 之前 -->
<ItemGroup>
  <PackageReference Include="Dapr.Actors" Version="…" />
  <PackageReference Include="Dapr.Actors.AspNetCore" Version="…" />
</ItemGroup>
```

```xml
<!-- 之后：一个引用即可同时引入运行时、源生成器和分析器 -->
<ItemGroup>
  <PackageReference Include="Dapr.Actors.Next" Version="…" />
</ItemGroup>
```

```csharp
// 之前（Program.cs）：先注册，然后映射 Actor 的 HTTP 端点。
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<CartActor>();
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
});

var app = builder.Build();
app.MapActorsHandlers();   // 映射 dapr/config、deactivation、method、remind、timer、healthz 端点
app.Run();
```

```csharp
// 之后：不再映射端点。AddDaprActors 会启动从运行时接收数据流的宿主。
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
});

var app = builder.Build();
app.Run();
```

变化的原因：回调（调用、reminder、timer、停用）以前是通过你用 `MapActorsHandlers()` 映射的端点，以入站 HTTP 请求的形式到达的。现在它们通过应用主动向运行时打开的长期双向 gRPC 流到达。已经没有与 `MapActorsHandlers()` 对应的方法了。

{{% alert title="你的应用仍然运行着 gRPC 服务器" color="primary" %}}
移除 Actor 的 HTTP 处理端点并不意味着应用停止监听。应用仍然会暴露它的 gRPC 服务端口，运行时会用它做前置检查（例如，当你使用其他需要应用提供 gRPC 端点的 Dapr 功能时）。改变的只是 Actor 回调的投递方式。完整的宿主配置请参见[编写、注册和调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})。
{{% /alert %}}

## 注册与发现

`Dapr.Actors` 要求你在选项委托中手动列举每一个 Actor 类型。`Dapr.Actors.Next` 则在构建时通过源生成器发现它们，因此常见情况下不再需要逐类型调用。

```csharp
// 之前：逐个显式注册 Actor。
builder.Services.AddActors(options =>
{
    options.Actors.RegisterActor<CartActor>();
    options.Actors.RegisterActor<OrderActor>();
});
```

```csharp
// 之后：自动发现；AddDaprActors 会接入作用域内的每个 [DaprActor]。
builder.Services.AddDaprActors();
```

你仍然可以使用 `options.Actors.RegisterActor<T>(name)` 以显式名称注册类型（例如名称来自配置），也可以在注册选项中设置 `EnableAutoActorRegistration = false` 来关闭自动托管，从而构建一个只调用 Actor、不托管任何 Actor 的 gateway。这些内容在[控制自动注册]({{< ref "dotnet-actorsnext-howto.md#controlling-automatic-registration" >}})中有详细介绍。

{{% alert title="如果 Actor 位于被引用的项目中，请选择启用引用扫描" color="warning" %}}
默认情况下，生成器只扫描正在执行的程序集。如果你的 `[DaprActor]` 类型（或状态升级器）位于宿主所引用的类库中，请在宿主的 `.csproj` 中添加 `<CompilerVisibleProperty Include="DaprActorsScanReferences" />`，以便它们被发现。这有助于那些希望把 Actor 类型放在共享项目中、再在各应用中按需引用的团队。如果你的应用不打算托管所有可被发现的 Actor 类型，应将 `EnableAutoActorRegistration` 设为 false，并自行手动注册它们。参见[跨程序集发现]({{< ref "dotnet-actorsnext-howto.md#cross-assembly-discovery" >}})。
{{% /alert %}}

## 定义 Actor

由“契约接口 + 实现类”组成的两部分结构没有变化，但两部分现在都带有特性，而且实现类获取标识和状态的方式也不同：它从注入的上下文对象中获取，而不再通过传给基类构造函数的 `ActorHost`。

```csharp
// 之前
public interface ICartActor : IActor          // 派生自 Dapr.Actors.IActor，无特性
{
    Task AddItem(CartItem item);
    Task<CartSummary> GetSummary();
}

[Actor(TypeName = "CartActor")]
public class CartActor : Actor, ICartActor
{
    public CartActor(ActorHost host) : base(host) { }   // 必需的基类构造函数

    public async Task AddItem(CartItem item)
    {
        var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
        cart.Items.Add(item);
        await StateManager.SetStateAsync("cart", cart);  // 显式设置，或依赖轮次结束时的保存
    }

    public async Task<CartSummary> GetSummary()
    {
        var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
        return new CartSummary(cart.Items.Count);
    }
}
```

```csharp
// 之后
using Dapr.Actors.Next;

[GenerateActorClient]                          // 契约上必需的标记
public interface ICartActor : IActor
{
    Task AddItem(CartItem item, CancellationToken ct = default);
    Task<CartSummary> GetSummary(CancellationToken ct = default);
}

[DaprActor]                        // 实现上必需的标记；名称参数可选，支持多个 IActor 接口
public sealed class CartActor(ActorActivationContext context) : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task AddItem(CartItem item, CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Items.Add(item);            // 通过 .Value 修改；轮次结束时保存
    }

    public async Task<CartSummary> GetSummary(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        return new CartSummary(cart.Value.Items.Count);
    }
}
```

变化及其原因：

- `[Actor(TypeName = "…")]` 变为 `[DaprActor("…")]`。两者的名称参数都是可选的；省略时使用类型名。Actor 类型名仍然是运行时用来路由的持久地址，因此请保持它与已有实例创建时使用的名称完全一致。
- 接口现在需要 `[GenerateActorClient]`。没有它，生成器就看不到这个契约；而如果实现类没有引用任何带标记的接口，生成器就什么都不会生成（没有代理、没有分发器、没有注册），也不会有任何错误提示。这是“Actor 静默不工作”最常见的原因。
- `Actor(ActorHost host)` 已经不存在。改为注入 `ActorActivationContext`，并从中重写 `Id` 和 `State`。基类上没有 `Host`、`ProxyFactory` 属性，也没有 `Logger` 属性；如果需要它们，请注入 `IActorProxyFactory` 和 `ILogger<T>`。

{{% alert title="两个特性必须成对使用" color="warning" %}}
接口上的 `[GenerateActorClient]` 与类上的 `[DaprActor]` 不能互相替代，两者也都不是可选的。生成器只会为实现了 `[GenerateActorClient]` 接口的 `[DaprActor]` 类生成 Actor。如果某个 Actor “能编译但从不被调用”，首先要检查它的接口是否派生自 `IActor` 并带有 `[GenerateActorClient]`（分析器 `DAPR1421` 会标记没有对应带标记契约的 `[DaprActor]`）。
{{% /alert %}}

### 生命周期钩子

这些钩子基本一一对应，但有两处不同：它们返回 `ValueTask` 并接收 `CancellationToken`；另外，单独的 `OnActorMethodFailedAsync` 已并入 `OnPostActorMethodAsync`，后者现在接收一个可为 null 的 `Exception`。

```csharp
// 之前
protected override Task OnActivateAsync() { … }
protected override Task OnDeactivateAsync() { … }
protected override Task OnPreActorMethodAsync(ActorMethodContext context) { … }
protected override Task OnPostActorMethodAsync(ActorMethodContext context) { … }
protected override Task OnActorMethodFailedAsync(ActorMethodContext context, Exception e) { … }
```

```csharp
// 之后
protected override ValueTask OnActivateAsync(CancellationToken ct = default) { … }
protected override ValueTask OnDeactivateAsync(CancellationToken ct = default) { … }
protected override ValueTask OnPreActorMethodAsync(ActorMethodContext context, CancellationToken ct = default) { … }
protected override ValueTask OnPostActorMethodAsync(ActorMethodContext context, Exception? exception, CancellationToken ct = default) { … }
// 没有单独的 OnActorMethodFailedAsync——请检查上面的 exception 参数
```

## State Management

状态是最值得你关注的部分，既因为它保存着你的持久数据，也因为其 API 形态发生了变化。`IActorStateManager` 变为 `IActorStateAccessor`，并通过 `State` 而不是 `StateManager` 暴露。读取操作现在返回一个 `IActorState<T>` 包装器，你通过它的 `.Value` 读取和修改值；未决的变更会在每个轮次结束时自动保存，如果需要更早持久化，可以调用 `State.SaveStateAsync()`。

```csharp
// 之前
var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
cart.Items.Add(item);
await StateManager.SetStateAsync("cart", cart);   // 显式设置；保存在轮次结束时进行
```

```csharp
// 之后
var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
cart.Value.Items.Add(item);                        // 修改 .Value；无需再设置
```

方法对照：

| `IActorStateManager`（旧） | `IActorStateAccessor`（新） | 说明 |
| --- | --- | --- |
| `GetStateAsync<T>(name)`（缺失时抛出异常） | `TryGetAsync<T>(name)` 后判空，或使用 `GetOrCreateAsync<T>(name, factory)` | 新的读取在缺失时返回 null 或直接创建；不再有缺失即抛异常的读取方法 |
| `TryGetStateAsync<T>(name)` → `ConditionalValue<T>` | `TryGetAsync<T>(name)` → `IActorState<T>?`（不存在时为 null） | 包装器上的 `.Value` 持有该值 |
| `GetOrAddStateAsync<T>(name, value)` | `GetOrCreateAsync<T>(name, () => value)` | 工厂是委托，仅在未命中时求值 |
| `SetStateAsync<T>(name, value)` | `SetAsync<T>(name, value)`，或修改 `.Value` | 在轮次内优先修改 `.Value` |
| `AddStateAsync` / `TryAddStateAsync` | `GetOrCreateAsync` / `SetAsync` | 没有专门的仅添加方法 |
| `AddOrUpdateStateAsync<T>(…)` | 修改 `.Value`（或 `SetAsync`） | 有了包装器，就不再需要先添加再更新的操作 |
| `RemoveStateAsync` / `TryRemoveStateAsync` | `RemoveAsync(name)` | — |
| `ContainsStateAsync(name)` | `TryGetAsync<T>(name) is not null` | — |
| `SaveStateAsync()` | `SaveStateAsync()` | 可选；仅在需要轮次中途写入时使用。轮次结束时的自动保存仍然有效 |
| `ClearCacheAsync()` | `EvictCacheAsync()` | 丢弃缓存条目但不持久化，因此下一次读取会访问存储 |

变化的原因：旧的缓存同样会在轮次结束时保存，因此自动保存并不是新东西。真正的新变化是使用体验（修改 `.Value`，代替“读取、修改、再设置”）。你通常不需要显式保存；只有当同一方法中的后续操作依赖于状态已经持久化时，才需要调用 `State.SaveStateAsync()`。一次成功的显式保存会把缓存标记为干净，因此除非 Actor 之后又修改了数据，轮次结束时的保存不会重复写入相同的数据。多次修改在一次保存前仍会合并为一次写入。

不要把 `EvictCacheAsync` 当作保存操作使用。它会从当前激活的缓存中移除条目，之后的读取将重新读取持久化的状态。默认情况下，它会拒绝驱逐脏条目；当 `EvictOnDirtyState = true` 时，脏条目会被直接丢弃，而不是被持久化。

{{% alert title="两侧的状态序列化都是 System.Text.Json，但请核对选项" color="warning" %}}
`Dapr.Actors` 默认使用 System.Text.Json（Web 默认配置）序列化 Actor 状态，而 `Dapr.Actors.Next` 通过 `IDaprSerializer` 进行序列化，其默认实现同样是 System.Text.Json。因此，现有状态通常仍然可读。风险在于 `JsonSerializerOptions` 不一致（命名策略、枚举处理、null/默认值的输出），或者你在旧版中注册了自定义的 `IActorStateSerializer`。如果你改变了某个状态类型的**结构**，不要试图手动让字节对齐，请使用内置的[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})，它会在读取时把旧的普通值逐级折叠为新结构。另见[序列化]({{< ref dotnet-actorsnext-serialization.md >}})。
{{% /alert %}}

{{% alert title="记录类型与主构造函数类型现在可以直接用作负载" color="primary" %}}
在 `Dapr.Actors` 中，远程处理代理对**方法负载**使用 Data Contract Serializer，这要求类型具有公共无参构造函数或 `[DataContract]`/`[DataMember]` 特性，因此记录和主构造函数类如果要作为参数传递，就需要额外的构造函数或特性。`Dapr.Actors.Next` 对每次调用都使用 System.Text.Json，因此这些类型无需任何序列化特性即可按原样工作。（Actor 状态在旧 SDK 中本来就是 JSON，所以这里消除的主要是远程处理代理加在参数和返回类型上的额外限制。）
{{% /alert %}}

## 调用 Actor：单一代理，不再区分远程处理

`Dapr.Actors` 提供了两种调用 Actor 的方式：一种是强类型的**远程处理**代理（`ActorProxy.Create<T>`），使用 DataContract，只能在 .NET 之间调用；另一种是**非远程处理**代理（`ActorProxy.Create` 返回 `ActorProxy`，再调用 `InvokeMethodAsync<TRequest, TResponse>(method, data)`），使用 JSON，可以跨应用调用。`Dapr.Actors.Next` 将二者合并为一个代理：通过 `IActorProxyFactory` 获取，每次调用都通过 `IDaprSerializer` 序列化。

```csharp
// 之前 —— 远程处理（DataContract，仅限 .NET 之间）
var cart = ActorProxy.Create<ICartActor>(ActorId.Create(userId), "CartActor");
await cart.AddItem(item);

// 之前 —— 非远程处理（JSON，可跨应用；只能有单个负载参数）
var cart = ActorProxy.Create(ActorId.Create(userId), "CartActor");
await cart.InvokeMethodAsync<CartItem>("AddItem", item);
var summary = await cart.InvokeMethodAsync<CartSummary>("GetSummary");
```

```csharp
// 之后 —— 一个代理，通过注入的工厂获取，强类型，也支持跨应用调用
public sealed class CheckoutService(IActorProxyFactory proxies)
{
    public async Task Add(string userId, CartItem item)
    {
        var cart = proxies.Create<ICartActor>(ActorId.Create(userId), "CartActor");
        await cart.AddItem(item);
    }
}
```

变化的原因：

- 这里的强类型代理只在调用语法上与旧的远程处理客户端相似，它**不**使用 DataContract。无论是强类型还是动态调用，每次调用都使用 System.Text.Json 序列化。
- 优先使用注入的 `IActorProxyFactory`，而不是静态的 `ActorProxy.Create<T>(…)` 门面。静态门面仍然存在（对于从 `Dapr.Actors.Client.ActorProxy.Create` 过来的开发者来说，它保留了熟悉的写法），但它依赖进程级的可变状态；参见[避免使用静态 ActorProxy 门面]({{< ref "dotnet-actorsnext-howto.md#call-an-actor" >}})。
- `Create<T>(id, type)` 同时需要泛型接口和 Actor 类型名，因为一个接口可以对应多个 Actor 类型（见下文）。接口指明契约，类型名则选定你所指的已注册 Actor。

{{% alert title="没有编译期契约的调用，可使用动态客户端" color="primary" %}}
旧版非远程处理中按字符串调用的 `InvokeMethodAsync("MethodName", …)`，在新版中对应 `IDynamicActorClient.InvokeAsync(type, id, method, argsJson)`，并配合 `IActorRegistry` 进行发现。如果你之前使用非远程处理代理，仅仅是因为编译期没有契约（例如网关、工具或跨语言调用方），那么现在它已成为一条一等公民的、有文档说明的路径，而不再是代理上的一个重载。参见[动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})。
{{% /alert %}}

## timer

timer 从 Actor 基类上的一个方法（`RegisterTimerAsync`）变为注入的 `IActorTimerScheduler`。旧 API 以字符串形式传入回调方法名，并附带一个 `byte[]` 状态块；新 API 则传入目标操作名，以及经配置的 Actor 线协议序列化器处理的带类型参数，或调用方提供的 `byte[]`，并将回调路由到该操作。

```csharp
// 之前 —— 回调是方法名字符串；状态是 byte[]；通过反射校验
protected override async Task OnActivateAsync()
{
    await RegisterTimerAsync(
        timerName: "refresh-prices",
        callback: nameof(RefreshPrices),
        callbackParams: Encoding.UTF8.GetBytes(sku),
        dueTime: TimeSpan.FromMinutes(1),
        period: TimeSpan.FromMinutes(5));
}

public Task RefreshPrices(byte[] data) { … }   // 0 或 1 个参数，必须返回 Task
```

```csharp
// 之后 —— 注入 Scheduler；以带类型参数的方式路由到指定操作
[DaprActor("Cart")]
public sealed class CartActor(ActorActivationContext context, IActorTimerScheduler timers)
    : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task AddItem(CartItem item, CancellationToken ct = default)
    {
        await timers.RescheduleAsync(
            actorType: "Cart",
            actorId: Id,
            name: "refresh-prices",
            dueTime: TimeSpan.FromMinutes(1),
            operationName: nameof(RefreshPrices),
            arguments: item.Sku,
            period: TimeSpan.FromMinutes(5),
            cancellationToken: ct);
    }

    public Task RefreshPrices(string sku, CancellationToken ct = default) => Task.CompletedTask;
}
```

说明：`dueTime` 仍然决定第一次触发的时间。省略 `period`（或将其设为 `TimeSpan.Zero` / `Timeout.InfiniteTimeSpan`）时 timer 只触发一次；`period` 为正值时则为周期性触发。`ttl` 是可选的，如果提供，必须不小于 `dueTime`。使用 `timers.CancelAsync(actorType, id, name, ct)` 取消 timer。持久性方面的注意事项没有变：timer 驻留在内存中并与激活实例绑定，因此不会在停用或重启后保留。

## reminder

reminder 是回调形态变化最大的部分。在 `Dapr.Actors` 中，你需要实现 `IRemindable.ReceiveReminderAsync`，这是一个接收*所有* reminder 的方法，你必须根据 `reminderName` 进行分支判断，并且负载是 `byte[]`。在 `Dapr.Actors.Next` 中，reminder 通过 `IActorReminderScheduler` 调度，并直接路由到指定的具名 Actor 方法；既没有 `IRemindable`，也没有集中派发的 switch。

```csharp
// 之前 —— 实现 IRemindable，并按名称分支
[Actor(TypeName = "Cart")]
public class CartActor : Actor, ICartActor, IRemindable
{
    public CartActor(ActorHost host) : base(host) { }

    public async Task StartAbandonWatch()
    {
        await RegisterReminderAsync(
            reminderName: "abandon-cart",
            state: Array.Empty<byte>(),
            dueTime: TimeSpan.FromMinutes(30),
            period: TimeSpan.Zero);
    }

    public async Task ReceiveReminderAsync(string reminderName, byte[] state, TimeSpan dueTime, TimeSpan period)
    {
        switch (reminderName)          // 一个方法派发给多个 reminder
        {
            case "abandon-cart":
                var cart = await StateManager.GetOrAddStateAsync("cart", new CartState());
                cart.Abandoned = true;
                await StateManager.SetStateAsync("cart", cart);
                break;
        }
    }
}
```

```csharp
// 之后 —— 通过注入的 Scheduler 调度；reminder 名称即为操作名称
[DaprActor("Cart")]
public sealed class CartActor(ActorActivationContext context, IActorReminderScheduler reminders)
    : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task StartAbandonWatch(CancellationToken ct = default)
    {
        await reminders.ScheduleAsync(
            actorType: "Cart",
            actorId: Id,
            name: nameof(AbandonCart),   // reminder 名称路由到此方法
            dueTime: TimeSpan.FromMinutes(30),
            period: TimeSpan.Zero,
            arguments: Array.Empty<byte>(),
            ttl: TimeSpan.FromDays(1),
            overwrite: true,
            cancellationToken: ct);
    }

    public async Task AbandonCart(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Abandoned = true;   // 无需 IRemindable、无需 switch，也无需显式保存
    }
}
```

变化及需要注意的地方：

- 不再有 `IRemindable`。删除该接口以及集中的 `ReceiveReminderAsync` switch；每个 reminder 都对应自己的方法。
- reminder 的 `name` 既是持久的 reminder 标识，也是回调时路由的操作。请选择一个稳定的名称，不要随意重命名。如果你重命名了方法，已注册的 reminder 仍会调用旧的操作名，直到它们被重新注册或取消。
- reminder 负载与 timer 采用相同的重载模式：既可以传入类型化的值（由 Actor 线协议序列化器序列化），也可以在你已自行序列化负载后传入 `byte[]`。
- `overwrite` 控制重新注册同名 reminder 时是否替换原有注册；Dapr 的默认值是覆盖，设置 `overwrite: false` 后，重复注册将失败。
- 持久性没有变化：reminder 在停用和重启后依然保留，并由 Dapr Scheduler 投递。

## 选项与重入

`ActorRuntimeOptions` 变为 `DaprActorsOptions`，通过 `AddDaprActors` 委托中的标准选项模式进行配置。大多数选项沿用原有名称；重入是其中结构变化较大的部分。

```csharp
// 之前
builder.Services.AddActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
    options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(5);
    options.DrainRebalancedActors = true;
    options.ReentrancyConfig = new ActorReentrancyConfig
    {
        Enabled = true,
        MaxStackDepth = 32,
    };
});
```

```csharp
// 之后
builder.Services.AddDaprActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
    options.DrainRebalancedActorsTimeout = TimeSpan.FromSeconds(5);
    options.DrainRebalancedActors = true;
    options.EnableReentrancy = true;      // 原为 ReentrancyConfig.Enabled
    options.MaxReentrantDepth = 32;       // 原为 ReentrancyConfig.MaxStackDepth
});
```

除了属性重命名之外，关于重入还有两点需要知道。第一，`Dapr.Actors.Next` 会自动为你传播调用链 metadata，Actor 作者不再需要处理重入相关的请求头（`ActorReentrancyContextAccessor` 没有需要你调用的对应物）。第二，启用重入是一个有意为之的决定：如果未启用，一个回到已在调用链中的 Actor 的调用，会阻塞在第一个轮次仍持有的锁上。参见[重入自动完成，但必须启用]({{< ref "dotnet-actorsnext-howto.md#call-an-actor-from-inside-an-actor" >}})。

以下选项已不再以原有形式存在：运行时选项上的 `UseJsonSerialization` 和 `JsonSerializerOptions` 已移除，因为序列化现在由注入的 `IDaprSerializer` 完成，请在那里进行配置（参见[序列化]({{< ref dotnet-actorsnext-serialization.md >}})）。`DaprApiToken` 和 `HttpEndpoint` 在新模型中不再是 Actor 选项的范畴，因为新模型通过 gRPC 流与运行时通信。

## 投递语义保持不变——现在明确说明

`Dapr.Actors` 中的 Actor 调用本来就是至少一次（at-least-once）语义，reminder 在未被确认前也会反复触发；只是许多团队并没有为此做设计。`Dapr.Actors.Next` 并未改变这一契约，但它让失败路径变得可测试：调用可能被重新传递，reminder 在确认丢失时可能再次触发，即使处理它的轮次已经提交。因此，每个 Actor 方法、reminder 和订阅处理程序都必须能够安全地重复执行。无论是状态变更还是外部副作用（发布消息、调用另一个 Actor、扣款），都需要幂等或去重；仅依靠 Actor 状态并不能让一次自增或追加操作变得可安全重放。可以使用带装饰的回调传输层，在提交之后注入响应丢失故障，然后显式地测试重新传递。参见[需要为之设计的投递保证]({{< ref "dotnet-actorsnext-howto.md#delivery-guarantees-you-must-design-for" >}})。

## 测试

与其说这是一个迁移步骤，不如说这是一个机会。在 `Dapr.Actors` 中，测试 Actor 需要针对运行中的 sidecar 做集成测试，这使得重入、timer 与调用之间的竞争、重新传递以及保存过程中的故障实际上都无法测试。`Dapr.Actors.Next` 提供了一个内存中的、确定性的 `ActorTestRuntime`，它通过生产环境所用的同一套生成分发器驱动你的真实 Actor，支持虚拟时间和故障注入，无需 sidecar。迁移某个 Actor 类型时，正是补充那些以前无法编写的单元测试的好时机。参见[测试]({{< ref dotnet-actorsnext-testing.md >}})。

## 已取消的限制

在 `Dapr.Actors` 中，你可能曾为以下三个约束而做过设计，现在它们已不复存在。你不必使用这些新能力，但了解它们的存在有助于简化迁移，并移除旧的变通方案。

**通过 JSON 调用的方法可以有多个参数。** 旧的非远程处理路径只接受单个负载参数（`InvokeMethodAsync<TRequest, TResponse>(method, data)`），因此多参数操作必须打包进一个包装类型才能以这种方式调用。在 `Dapr.Actors.Next` 中，已不存在远程处理与非远程处理之分，强类型方法可以直接接收多个参数。

```csharp
// 以前常常被迫打包成单个包装负载；现在可以直接写自然的签名。
Task<Quote> PriceItem(string sku, int quantity, string currency, CancellationToken ct = default);
```

**一个接口可以支撑多个 Actor 类型。** 决定已注册 Actor 身份的是 Actor 类型名，而不是接口。因此，多个 `[DaprActor]` 类可以实现同一个 `[GenerateActorClient]` 接口，每个类都是独立的 Actor 类型，拥有各自的状态和 placement。这使得在多个专用 Actor 之间共享同一契约变得切实可行。

```csharp
[GenerateActorClient]
public interface IQueueActor : IActor { Task Enqueue(WorkItem item, CancellationToken ct = default); }

[DaprActor]                                   // Actor 类型为 "OrdersQueueActor"
public sealed class OrdersQueueActor : Actor, IQueueActor { /* … */ }

[DaprActor]                                   // Actor 类型为 "EmailsQueueActor"，契约相同
public sealed class EmailsQueueActor : Actor, IQueueActor { /* … */ }
```

**一个 Actor 类型可以实现多个接口。** 关系也可以反过来：同一个实现类可以实现多个 `[GenerateActorClient]` 接口——例如一个读取端和一个写入端，或一个公开契约和一个管理契约——它们都由同一个 Actor 类型提供服务，共享同一个标识和同一套状态。唯一的规则是，各契约中的方法名必须唯一，因为运行时是按方法名进行路由的。

```csharp
[DaprActor("Document")]
public sealed class DocumentActor(ActorActivationContext context)
    : Actor, IDocumentReader, IDocumentWriter
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;
    // 两个契约上的 Read() 与 Write() 共享同一个激活实例和同一份状态。
}
```

参见[一个接口可支撑多个 Actor 类型]({{< ref "dotnet-actorsnext-howto.md#one-interface-can-back-several-actor-types" >}})和[一个 Actor 可实现多个契约]({{< ref "dotnet-actorsnext-howto.md#one-actor-can-implement-several-contracts" >}})。

## 建议的迁移步骤

1. **确认运行时版本为 1.18 或更高**，覆盖 Actor 将运行的所有位置。
2. **挑选一个 Actor 类型**作为首个迁移对象——最好是状态较小、调用方较少的类型。
3. **使用 `[GenerateActorClient]` 创建契约。** 如果调用方位于其他应用中，请把接口放在双方都引用的共享程序集中。
4. **重写实现类**：使用 `[DaprActor]`，注入 `ActorActivationContext`，重写 `Id`/`State`，将 `StateManager` 调用改为 `State`，把 timer 改为 `IActorTimerScheduler`，把 reminder 改为 `IActorReminderScheduler` 加具名方法，删除 `IRemindable`，并且只在确实需要轮次中途进行持久化写入时才保留 `SaveStateAsync`。
5. **验证状态可读性**：编写一个测试，植入旧结构的值，并用新代码读取；如果结构发生了变化，引入升级器。
6. **将该类型的调用方迁移**到 `IActorProxyFactory`，使调用与 Actor 共享同一种序列化格式，避免远程处理与 JSON 混用。
7. **使用 `ActorTestRuntime` 添加单元测试**，覆盖以前无法测试的路径。
8. **对下一个类型重复上述步骤。** 对尚未迁移的类型，继续引用 `Dapr.Actors`。

## 高风险检查清单

- **缺少特性。** 没有 `[GenerateActorClient]` 接口的 `[DaprActor]` 会静默地什么都不生成。（`DAPR1421`）
- **Actor 类型名变更。** 类型名是持久地址的一部分；修改它会使已有实例失去归属。请保持不变。
- **序列化器选项漂移。** 两侧的状态都是 JSON，但命名策略、枚举处理方式的不同，或旧版自定义序列化器，都可能导致已有状态无法读取。请进行验证，并对真正的结构变化使用状态迁移。
- **共存期间的远程处理与 JSON 混用。** Next 代理（JSON）与旧版远程处理调用方（DataContract）无法对齐。请将一个 Actor 类型与其调用方一起迁移。
- **reminder 方法重命名。** reminder 名称就是被路由的操作；重命名方法会使已注册的 reminder 仍指向旧名称。
- **假设恰好一次。** 处理程序必须能够安全地重复执行；请让状态更新和外部副作用具有幂等性，或对请求去重。
- **静态 `ActorProxy` 门面。** 它能工作，但其进程级可变状态是一个隐患；请改为注入 `IActorProxyFactory`。
- **Actor 位于被引用的项目中。** 除非设置了 `DaprActorsScanReferences`，否则发现过程只扫描正在执行的程序集。

## 后续步骤

- [概述：Dapr Actors（Next）]({{< ref _index.md >}})
- [编写、注册和调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})
- [序列化]({{< ref dotnet-actorsnext-serialization.md >}})
- [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
- [教程：通过示例学习 Dapr.Actors.Next]({{< ref "tutorial/_index.md" >}})
</content>
</invoke>
