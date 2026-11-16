---
type: docs
title: "操作指南：使用 .NET SDK 编写、注册和调用 Actor"
linkTitle: "编写和注册 Actor"
weight: 110000
description: "定义 Actor，由源生成器自动完成连接，并通过 Dapr.Actors.Next 调用它们"
---

本文介绍如何定义 Actor、哪些特性会驱动源生成器、必须注册的最小内容，以及如何调用 Actor，包括跨程序集和跨应用的场景。

## 前提条件

Dapr 运行时 v1.18.0 或更高版本、应用上用于接收 gRPC 入站连接的端口，以及 `Dapr.Actors.Next` 包。`Dapr.Actors.Next` 是一个元包，将运行时、源生成器和分析器集中到同一个引用中。

```xml
<ItemGroup>
  <PackageReference Include="Dapr.Actors.Next" Version="..." />
</ItemGroup>
```

{{% alert title="无需映射 Actor 端点" color="primary" %}}
与 `Dapr.Actors` 不同，你不需要为运行时每次调用映射 Actor 处理程序端点。宿主会与运行时建立一个持久的 gRPC 连接，并通过该流接收 Actor 回调，因此不存在 `MapActorsHandlers()` 之类的接入步骤。应用仍像往常一样暴露其 gRPC 服务器端口，运行时继续用它进行 gRPC 前置检查。变化的是 Actor 回调的投递方式，而不是应用是否运行 gRPC 服务器。
{{% /alert %}}

{{% alert title="包引用" color="primary" %}}
Dapr .NET SDK 仓库中的所有项目都通过相对路径相互引用。由于 `Dapr.Workflows` 或 `Dapr.Actors.Next` 这类元包只是构建流水线的产物，源代码中的各个项目会直接引用仓库内的各个子项目（例如 `Dapr.Actors.Next.SourceGenerators` 或 `Dapr.Actors.Next.Abstractions`）。这些包不打算发布到 NuGet，仅用于 SDK 的本地实验和开发。在你自己的项目中使用时（无论是宿主项目还是测试项目），应从 NuGet 安装 `Dapr.Actors.Next`。
{{% /alert %}}

## 定义 Actor

一个 Actor 由两部分组成：一是派生自 `IActor` 并标注 `[GenerateActorClient]` 的契约接口，二是派生自 `Actor` 并标注 `[DaprActor]` 的实现类。

```csharp
using Dapr.Actors.Next;

[GenerateActorClient]
public interface ICartActor : IActor
{
    Task AddItem(CartItem item, CancellationToken ct = default);
    Task<CartSummary> GetSummary(CancellationToken ct = default);
}

[DaprActor]
public sealed class CartActor(ActorActivationContext context, IPricingClient pricing) : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task AddItem(CartItem item, CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Items.Add(item);            // 通过 .Value 修改；在轮次结束时保存
    }

    public async Task<CartSummary> GetSummary(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        return new(cart.Value.Items.Count, await pricing.Total(cart.Value, ct));
    }
}
```

在 `Actor` 基类上，`Id` 和 `State` 是抽象成员，因此每个 Actor 都必须提供它们。推荐的做法是注入 `ActorActivationContext`，并像上文所示那样从中重写这两个成员。状态通过 `IActorStateAccessor` 按名称访问：读取时返回一个 `IActorState<T>` 包装器，通过 `.Value` 获取其值；对 `.Value` 的修改会在轮次结束时统一保存，除非你提前显式调用 `State.SaveStateAsync()`。

### 两个特性都是必需的，且需配合使用

这两个特性不能互相替代，也都不是可选的。

接口上的 `[GenerateActorClient]` 决定了源生成器是否选取它。生成器只从同时满足两个条件的接口中构建 Actor 契约集合：派生自 `IActor`，并标注 `[GenerateActorClient]`。只派生自 `IActor` 的接口对它不可见。该特性不接受参数，它纯粹是一个标记，表示“为此契约生成客户端”。

实现类上的 `[DaprActor]` 是单独发现的，但只有当 `[DaprActor]` 类实现了上述某个 `[GenerateActorClient]` 接口时，它才会成为生成的 Actor。这一点可能出乎意料：

{{% alert title="没有标注接口的 [DaprActor] 不会生成任何内容" color="warning" %}}
如果 `[DaprActor]` 类没有实现标注了 `[GenerateActorClient]` 的接口，生成器不会为它生成任何内容：没有客户端代理、没有分发器、没有激活工厂，也没有注册。该类可以编译，看上去也像一个 Actor，但它永远不会被托管，也无法被调用，并且不会给出任何错误提示。如果你定义的 Actor 没有正常工作，首先要检查的是它的接口是否派生自 `IActor` 并标注了 `[GenerateActorClient]`。两个特性是成对使用的；只有 `[DaprActor]` 是不够的。
{{% /alert %}}

### 源生成器生成的内容

你编写标注的接口和标注的实现类；源生成器会生成托管和调用 Actor 所需的全部代码，调用时不需要反射。

| 你编写 | 源生成器生成 |
| --- | --- |
| `interface ICartActor : IActor` 上的 `[GenerateActorClient]` | 用于调用该 Actor 的强类型客户端代理，以及接口清单中该契约的条目 |
| 已标注接口的实现上的 `[DaprActor]` | 将传入调用路由到你方法的分发器 |
| 已标注接口的实现上的 `[DaprActor]` | 通过依赖注入构造 Actor 的强类型激活工厂 |
| 已标注接口的实现上的 `[DaprActor]` | 生成的注册信息和 Actor 注册表中的条目（其类型、方法与签名） |

你不需要实现代理、分发器或工厂，也不需要为每个 Actor 编写注册代码。

### 一个接口可支撑多个 Actor 类型

已注册 Actor 的标识是 Actor 类型名，而不是接口。可以有多个 `[DaprActor]` 类实现同一个 `[GenerateActorClient]` 接口，每个类都会成为各自独立的 Actor 类型，拥有自己的名称、状态、放置和注册。共享的接口只是它们共同具备的可调用形态。

```csharp
[GenerateActorClient]
public interface IQueueActor : IActor { Task Enqueue(WorkItem item, CancellationToken ct = default); }

[DaprActor]                                   // Actor 类型 "OrdersQueue"
public sealed class OrdersQueueActor : Actor, IQueueActor { /* ... */ }

[DaprActor]                                   // Actor 类型 "EmailsQueue"，契约相同，但是另一个 Actor
public sealed class EmailsQueueActor : Actor, IQueueActor { /* ... */ }
```

这就是为什么创建代理时既要提供 Actor 类型名，也要提供接口（参见 [调用 Actor](#调用-actor)）：接口指明契约，类型名则选定你要调用的已注册 Actor。当多个 Actor 类型实现同一个接口时，由类型名来区分它们；按接口查找会返回所有实现该接口的 Actor 类型，你需要按类型名选择想要的那一个。

由于类型名就是标识，共享同一接口的实现必须各自解析为不同的名称。分析器（`DAPR1420`）会在两个实现同一契约的 Actor 将注册到相同的 Actor 类型名时报告冲突，并提示你通过为它们指定不同的 `[DaprActor]` 名称或显式注册别名来修复。

### 一个 Actor 可实现多个契约

关系也可以反过来：单个 `[DaprActor]` 实现可以实现多个 `[GenerateActorClient]` 接口，所有这些接口都由同一个 Actor 类型提供服务。当一个实体有多个不同的侧面，并且你希望将它们表达为独立的契约（例如读取端和写入端，或公开契约和管理契约），同时又不想把该实体拆分为多个 Actor 时，这种方式很有用。

```csharp
[GenerateActorClient]
public interface IDocumentReader : IActor
{
    Task<DocumentSummary> Read(CancellationToken ct = default);
}

[GenerateActorClient]
public interface IDocumentWriter : IActor
{
    Task Write(DocumentPatch patch, CancellationToken ct = default);
}

[DaprActor("Document")]
public sealed class DocumentActor(ActorActivationContext context) : Actor, IDocumentReader, IDocumentWriter
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public Task<DocumentSummary> Read(CancellationToken ct = default) => /* ... */;
    public Task Write(DocumentPatch patch, CancellationToken ct = default) => /* ... */;
}
```

生成器为每个接口各生成一个强类型代理（`IDocumentReader` 和 `IDocumentWriter` 各有一个），但该 Actor 作为单一的 Actor 类型进行托管，只有一个注册和一个分发器，覆盖所有已实现契约的方法的并集。由于只有一个 Actor 类型，因此只有一个标识、一次激活和一组状态；这些接口只是同一个 Actor 上不同的可调用形态。

创建你所需要的代理即可调用，每个代理都使用相同的 Actor 类型名进行寻址：

```csharp
var reader = proxies.Create<IDocumentReader>(ActorId.Create(docId), "Document");
var summary = await reader.Read();

var writer = proxies.Create<IDocumentWriter>(ActorId.Create(docId), "Document");
await writer.Write(patch);
```

两个代理都路由到同一次激活，因此通过 `IDocumentWriter` 进行的写入，对于同一 ID 上随后通过 `IDocumentReader` 进行的读取是可见的。

{{% alert title="方法名在各契约之间必须唯一" color="warning" %}}
运行时根据方法名将传入调用路由到 Actor，因此单个 Actor 所实现的各接口中的方法必须具有不同的名称。同一 Actor 上两个声明了相同方法名的契约会在线路上发生冲突，只有其中一个会被派发。请保持方法名不同；如果两个契约确实共享同一操作，则应将它声明在两个契约都派生自的公共基接口上，使其成为一个方法，而不是两个。
{{% /alert %}}

{{% alert title="方法签名" color="primary" %}}
Actor 接口方法必须返回 `Task`、`Task<T>`、`ValueTask`、`ValueTask<T>` 或 `IAsyncEnumerable<T>`，并且其参数和返回类型必须能被所配置的序列化器序列化。分析器（`DAPR1417`）会报告不符合要求的方法。
{{% /alert %}}

## 启动时注册（最简方式）

唯一必需的调用是 `AddDaprActors`。选项委托是可选的。

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprActors();          // 发现并接入本程序集中的每个 [DaprActor]

var app = builder.Build();
app.Run();
```

这一次调用会以托管服务的形式启动 Actor 宿主（与运行时之间持久的 `SubscribeActorEvents` 流），注册每个已发现 Actor 的代理、分发器和工厂，注册所有状态升级器（参见 [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})），并填充 Actor 注册表。

{{% alert title="Actor 不再需要手动注册" color="primary" %}}
不再需要 `RegisterActor<T>()` 调用，也不需要 `app.MapActorsHandlers()`。Actor 在构建时由源生成器发现，宿主通过流与运行时连接，而不是暴露端点。调用 `AddDaprActors()` 即已足够。
{{% /alert %}}

### 配置选项

```csharp
builder.Services.AddDaprActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
    // ...
});
```

### 按类型配置运行时选项

当某个 Actor 类型需要与应用级默认值不同的运行时配置时，使用 `options.Actors.RegisterActor<TActor>(...)`。只有在按类型委托中设置的值才会覆盖应用级选项；未设置的值继承应用级选项。

```csharp
builder.Services.AddDaprActors(options =>
{
    options.ActorIdleTimeout = TimeSpan.FromMinutes(30);
    options.DrainRebalancedActorsTimeout = TimeSpan.FromSeconds(10);

    options.Actors.RegisterActor<CheckoutSessionActor>(typeOptions =>
    {
        typeOptions.IdleTimeout = TimeSpan.FromMinutes(5);
        typeOptions.DisableStateMigration = true;
    });

    options.Actors.RegisterActor<InventoryActor>(typeOptions =>
    {
        typeOptions.IdleTimeout = TimeSpan.FromHours(2);
        typeOptions.EnableReentrancy = true;
        typeOptions.MaxReentrantDepth = 4;
        typeOptions.DrainRebalancedActorsTimeout = TimeSpan.FromSeconds(5);
    });
});
```

空闲超时、排空设置和重入设置会向已注册 Actor 类型的 Dapr 边车进行公布。`DisableStateMigration` 由 SDK 在持久化该 Actor 状态时在本地应用，不会向边车公布。完整的可运行版本位于 `examples/Actor.Next/07-PerTypeOptions`。

当 SDK 在本地接纳匹配的调用链时，也会强制执行 `EnableReentrancy` 和 `MaxReentrantDepth`，并优先使用按类型的值，然后才是应用级的值。请显式配置这些选项，使其与应用的调用图保持一致。

{{% alert title="没有生命周期参数" color="primary" %}}
`AddDaprActors` 不接受 `ServiceLifetime`。Actor 的生命周期就是它的激活，由运行时管理：它以 ID 为键，跨越多个轮次，并在停用时结束。这不是依赖注入的生命周期，因此不可配置。Actor 实例在每次激活时于专用的依赖注入作用域中构造，跨轮次缓存，并在停用时与其作用域一起释放。你的 Actor 所依赖的服务保持你注册它们时所用的生命周期。
{{% /alert %}}

停用与 Actor 的工作是串行化的：外部请求会在活动工作之后排队等待，而由当前活动调用链发起的停用会被推迟，直到该轮次及其已接纳的可重入子调用全部完成。激活及其作用域不会在一个进行中的轮次之下被释放。

### 控制自动注册

默认情况下，`AddDaprActors()` 会发现作用域内的每个 `[DaprActor]` 并将其注册为托管：接入分发器和激活工厂，并向运行时公布该类型，以便运行时为其投递回调。它还会发现并注册每个状态升级器。有两个选项可以分别关闭这些自动行为：

```csharp
builder.Services.AddDaprActors(options =>
{
    options.EnableAutoActorRegistration = true;           // 默认值；自动托管发现的 [DaprActor] 类型
    options.EnableAutoStateMigrationRegistration = true;  // 默认值；自动注册发现的升级器
});
```

关键的区别在于托管与调用。调用 Actor 使用源生成的代理，该代理通过 `IActorProxyFactory`（或静态的 `ActorProxy.Create<T>()` 门面）获得，不依赖注册；只要引用了该契约，它以及 `IDynamicActorClient` 就能工作。注册则决定本应用是否托管某个类型：公布它、接收其回调并构造实例。关闭 `EnableAutoActorRegistration` 后，应用仍然可以调用 Actor，但不会自动托管任何 Actor，这就是双模式应用中的网关部分。

同一个应用在一种模式下作为网关运行，在另一种模式下托管 Actor 时，只需安装一次 `Dapr.Actors.Next`（两种模式都需要代理功能），再按模式进行选择：

```csharp
// 网关模式：将调用转发给托管在其他地方的 Actor；本应用不托管任何 Actor。
builder.Services.AddDaprActors(options =>
{
    options.EnableAutoActorRegistration = false;
    options.EnableAutoStateMigrationRegistration = false;   // 不托管任何内容，因此不会执行状态迁移
});

// 托管模式：托管发现的 Actor，并从运行时接收其回调。
builder.Services.AddDaprActors();   // 默认值：两者均开启
```

在网关模式下，不会为托管而向运行时打开任何流，因为没有类型被公布；应用只保留调用所需的基础设施。

### 使用自定义名称注册 Actor

Actor 类型名是运行时进行路由的地址。若要显式选择该名称（例如从配置中读取），请在选项中按名称注册该 Actor：

```csharp
[DaprActor]                                      // 必须保留该特性；名称参数可选
public sealed class QueueActor : Actor, IQueueActor { /* ... */ }

// ...

var queueActorTypeName = builder.Configuration.GetValue("QUEUE_ACTOR_TYPE_NAME", "QueueActor");

builder.Services.AddDaprActors(options =>
{
    options.Actors.RegisterActor<QueueActor>(queueActorTypeName);   // 该类型以此名称托管
});
```

托管名称按以下优先级解析：如果提供了 `RegisterActor<T>(name)` 中的显式别名，则使用它；否则使用 `[DaprActor]` 特性上设置的名称；再否则使用 Actor 实现类的类型名。显式别名总是优先于其他两者，无论 `EnableAutoActorRegistration` 是否开启都是如此。关闭自动注册后，只有你显式注册的类型会被托管；不带名称的 `RegisterActor<T>()` 会以其解析出的默认名称注册该类型，即特性名称，若没有则回退为类型名。

{{% alert title="保留 [DaprActor] 特性；其名称是可选的" color="warning" %}}
别名会改变类型的托管名称，但它不能替代 `[DaprActor]` 特性。源生成器正是使用该特性来生成代理、分发器和激活工厂，因此即使你在其他地方提供了名称，类型仍必须带有 `[DaprActor]`。不过，特性上的名称参数是可选的：如果你省略它或留空，生成器会回退为 Actor 实现类的类型名。因此，当你打算从配置中设置别名时，可以只写不带参数的 `[DaprActor]`，由别名提供名称。切不可删除该特性，否则生成器将不再为该类型生成任何内容。
{{% /alert %}}

{{% alert title="自定义名称仍然是持久地址" color="warning" %}}
支持从配置中选择 Actor 类型名，但该名称是持久地址的一部分：状态和放置都以它为键。若更改一组已有实例所用的名称，这些实例将无法通过新名称访问。对于由配置驱动的名称，应在其背后数据的整个生命周期内保持固定，并且只有在采取与数据迁移同等的谨慎态度时才能更改。
{{% /alert %}}

### 跨程序集发现

默认情况下，生成器只扫描正在执行的程序集。如果你的 Actor 或其状态升级器位于被引用的项目中，请在宿主应用的 `.csproj` 中添加以下内容，以选择启用引用扫描：

```xml
<ItemGroup>
  <CompilerVisibleProperty Include="DaprActorsScanReferences" />
</ItemGroup>
```

启用后，生成器还会从被引用的程序集（而不仅是正在执行的程序集）中发现并注册 `[DaprActor]` 类型和 `IActorStateUpcaster<,>` 实现。由于扫描引用会增加构建时间，该功能默认关闭。请注意，升级器的发现同样受 `EnableAutoStateMigrationRegistration` 约束：如果你关闭了自动迁移注册，则无论升级器位于本地还是被引用的项目中，扫描都不会自动注册它们。

## 注入依赖

注册 Actor 基础设施只需要 `AddDaprActors()`，也可以使用带选项的重载。托管和运行 Actor 不需要其他任何内容：

```csharp
builder.Services.AddDaprActors();
```

支持将依赖注入到 Actor 的构造函数中，任何被注入的服务都从 Actor 的每次激活作用域中解析，并随该作用域一同释放。但注入要求你自行注册该服务：`AddDaprActors()` 只接入 Actor 基础设施，不会代为注册任何 Dapr 构建块客户端。

例如，若要在 Actor 内部使用状态管理客户端来访问应用的状态存储（这些存储与 Actor 自身的 `State` 是分开的），请添加 `Dapr.StateManagement` 包，注册 `DaprStateManagementClient` 并将其注入：

```csharp
builder.Services.AddDaprActors();
builder.Services.AddDaprStateManagementClient();   // 来自 Dapr.StateManagement 包
```

```csharp
[DaprActor]
public sealed class CartActor(ActorActivationContext context, IPricingClient pricing, DaprStateManagementClient stateStores)
    : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;
    // pricing 和 stateStores 在每次激活时解析（前提是你已注册它们），并在停用时释放
}
```

{{% alert title="避免在字段中保存可变的共享状态" color="warning" %}}
由于 Actor 实例跨轮次缓存，任何被字段捕获的内容都会存活于整个激活期间。在字段中保存可变的共享状态，尤其是被捕获的单例，会破坏轮次隔离。请将每个 Actor 的状态保存在 `State` 中，并保持注入的服务无状态。分析器（`DAPR1419`）会标记类型不具备轮次安全性的非只读字段。
{{% /alert %}}

## 生命周期钩子

重写按 Actor 的生命周期钩子，以执行初始化和清理。这些钩子在 Actor 自身的轮次上运行，并与横切的过滤器管道相互独立。

```csharp
[DaprActor]
public sealed class CartActor(ActorActivationContext context) : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    protected override ValueTask OnActivateAsync(CancellationToken ct = default) => /* 实例激活时运行 */;
    protected override ValueTask OnDeactivateAsync(CancellationToken ct = default) => /* 停用前运行 */;
    protected override ValueTask OnPreActorMethodAsync(ActorMethodContext context, CancellationToken ct = default) => /* 每个方法之前 */;
    protected override ValueTask OnPostActorMethodAsync(ActorMethodContext context, Exception? exception, CancellationToken ct = default) => /* 每个方法之后 */;
}
```

对于跨越多种 Actor 类型的横切关注点，你可以实现 `IActorTurnFilter`，但它很少是合适的工具；参见下一节。

## 横切的轮次过滤器

`IActorTurnFilter` 会将每个 Actor 轮次（跨越所有 Actor 类型）包装为围绕调用的中间件管道。它只适用于一小类工作，大多数应用都不需要它。

只将轮次过滤器用于基础设施性质而非业务行为的关注点，并且这些关注点必须统一应用于多个 Actor 类型：例如在任何轮次运行前强制要求存在租户或认证头，或为每个轮次丰富追踪和指标。这些内容否则就需要被复制到每个 Actor 中，它们确实属于任何单个 Actor 之外。

除此之外的情况应避免使用轮次过滤器，原因如下：

- 它会作用于每种 Actor 类型的每个轮次，因此它位于全局热路径上；放在那里的逻辑会在所有地方都付出代价，无论是否相关。
- 它会把行为从 Actor 中移走。你无法仅通过阅读单个 Actor 就理解一个轮次做了什么，因为部分行为位于 Actor 从未提及的过滤器中。
- 多个过滤器之间的执行顺序会成为一个微妙的全局问题，容易出错且难以察觉。
- 过滤器中的业务逻辑比同样的逻辑放在 Actor 中更难发现，也更难测试；后者可以直接用测试运行时驱动。
- 轮次管道本身还执行框架工作，例如上下文恢复和轮次结束时的状态保存。过滤器中繁重或易失败的逻辑与这些工作共享生命周期，可能危及轮次的完整性。

对于只属于某一个 Actor 的关注点，请改用该 Actor 的生命周期钩子（`OnPreActorMethodAsync`、`OnPostActorMethodAsync`、`OnActivateAsync`、`OnDeactivateAsync`）；它们在 Actor 上可以被发现，并且可以单独测试。对于被多个 Actor 共享的行为，更推荐通过注入服务将其组合进 Actor，而不是拦截它们的轮次。

分析器（`DAPR1416`，信息级别）会在 `IActorTurnFilter` 看似包含业务逻辑时发出提示，以保持过滤器精简且只承担基础设施职责。

## 定时器与提醒

在 Actor 内部，通过注入所需的调度器来注册定时器和提醒。定时器使用 `IActorTimerScheduler`；持久提醒使用 `IActorReminderScheduler`。

```csharp
using Dapr.Actors.Next;
using Dapr.Actors.Next.Core.Timers;

[DaprActor("Cart")]
public sealed class CartActor(
    ActorActivationContext context,
    IActorTimerScheduler timers,
    IActorReminderScheduler reminders) : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task AddItem(CartItem item, CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Items.Add(item);

        // 一次性的激活内定时器。如果在它触发前激活已被移除，回调将丢失。
        await timers.RescheduleAsync(
            actorType: "Cart",
            actorId: Id,
            name: "refresh-prices-once",
            dueTime: TimeSpan.FromMinutes(1),
            operationName: nameof(RefreshPrices),
            arguments: item.Sku,
            cancellationToken: ct);

        // 周期性的激活内定时器，受 TTL 限制。
        await timers.RescheduleAsync(
            actorType: "Cart",
            actorId: Id,
            name: "refresh-prices-periodic",
            dueTime: TimeSpan.FromMinutes(1),
            operationName: nameof(RefreshPrices),
            arguments: item.Sku,
            period: TimeSpan.FromMinutes(5),
            ttl: TimeSpan.FromMinutes(30),
            cancellationToken: ct);

        await reminders.ScheduleAsync(
            actorType: "Cart",
            actorId: Id,
            name: nameof(AbandonCart),
            dueTime: TimeSpan.FromMinutes(30),
            period: TimeSpan.Zero,
            arguments: Array.Empty<byte>(),
            ttl: TimeSpan.FromDays(1),
            overwrite: true,
            cancellationToken: ct);
    }

    public Task RefreshPrices(string sku, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public async Task AbandonCart(CancellationToken ct = default)
    {
        var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
        cart.Value.Abandoned = true;
    }
}
```

需要围绕其持久性进行设计。定时器存在于内存中，并与激活绑定：它无法在停用或进程重启后存活，因此应将其视为存活激活期间的尽力而为的便利功能，而不是持久的调度。提醒是持久的，由 Dapr 调度器投递，因此即使 Actor 处于空闲状态并需要重新激活，它仍会触发。凡是无论激活状态如何都必须唤醒的工作，请使用提醒；定时器只用于在 Actor 停用时丢失也无妨的工作。

定时器注册同时包含定时器 `name` 和 `operationName`；运行时将回调路由到 `operationName`。提醒注册则没有单独的回调字段：提醒的 `name` 既是持久提醒的标识，也是回调时路由到的 Actor 操作，因此应选择稳定的操作名称，不要随意重命名。如果 Actor 方法被重命名，所有已使用旧名称注册的持久提醒将继续调用旧的操作名称，直到它们被更新或取消。建议保留原有的回调方法，并让它替换提醒，以直接注册新方法。

{{% alert title="回调名称在构建时即被校验" color="primary" %}}
由于回调是字符串，拼写错误或重命名后残留的旧名称，否则只会在定时器或提醒触发时才暴露出来。分析器会在你输入时就将其捕获。回调必须能解析为运行时可派发的方法，也就是同时派生自 `IActor` 并标注 `[GenerateActorClient]` 的接口上的方法（仅存在于类上的方法，或存在于未标注 `[GenerateActorClient]` 的 Actor 接口上的方法，永远不会被派发）。当目标 Actor 类型定义在本应用（或被引用的项目）中时，`DAPR1429` 会标记与任何可派发方法都不匹配的回调（并附带一个建议最接近匹配项的代码修复），`DAPR1431` 会标记指向一个存在但未通过 `[GenerateActorClient]` 契约公开的方法的回调。当在本应用中找不到该 Actor 类型字符串时，`DAPR1430` 会警告它可能由其他 Dapr 应用托管，且无法在此验证。以上三条规则都适用于定时器的 `operationName` 和提醒的 `name`。
{{% /alert %}}

定时器和提醒的负载可以以强类型值或原始 `byte[]` 的形式进行调度。传入强类型值时会使用所配置的 Actor 线路序列化器，因此回调方法可以声明相匹配的强类型参数。如果你已自行序列化负载，或回调不接受负载而你想传入 `Array.Empty<byte>()`，则使用 `byte[]` 重载。

对于定时器，`dueTime` 控制首次触发的时间。如果你省略 `period`，或将其设为 `Timeout.InfiniteTimeSpan` 或 `TimeSpan.Zero`，SDK 会将该定时器视为一次性的，并在回调轮次提交后取消它。设置一个正的 `period` 即可创建周期性定时器。`ttl` 是可选的，用于限制定时器的存活时长；提供时，它必须大于或等于 `dueTime`。使用相同的 Actor 类型、Actor ID 和定时器名称即可取消定时器：

```csharp
await timers.CancelAsync("Cart", Id, "refresh-prices-periodic", ct);
```

对于提醒，`dueTime` 控制首次触发时间，`period` 控制重复触发；若要创建一次性提醒，请使用 `TimeSpan.Zero`。`ttl` 是可选的，用于限制提醒的存活时长。`overwrite` 控制注册一个已存在的提醒名称时是否替换之前的注册；Dapr 默认为覆盖，若设置 `overwrite: false`，则重复注册会失败。使用相同的 Actor 类型、Actor ID 和名称即可取消持久提醒：

```csharp
await reminders.CancelAsync("Cart", Id, nameof(AbandonCart), ct);
```

定时器和提醒的回调与普通调用通过同一个 Actor 事件流到达。只有在 Actor 轮次提交且待处理的状态已保存之后，SDK 才会确认该回调。对于一次性定时器，成功的确认会包含 `cancel: true`，以免运行时再次触发该定时器。周期性定时器和提醒会按照其注册继续运行，直到被取消、因 TTL 过期或被替换。如果处理程序抛出异常，或者在确认到达运行时之前流中断，运行时可能会重新投递该回调。请保持处理程序的幂等性，尤其是当它们执行外部副作用时。

定时器和提醒的回调是独立的 Actor 轮次，而不是注册它的轮次的可重入延续。它们会等待同一 Actor 上进行中的轮次结束。取消注册并不会撤销已被接纳执行的回调，因此正在进行中的回调仍可能完成。

### 查看与管理注册

SDK `1.19.0` 或更高版本还提供了定时器和提醒的查看功能，以及提醒的批量取消功能：

```csharp
var timer = await timers.GetAsync("Cart", Id, "refresh-prices-periodic", ct);
var actorTimers = await timers.ListAsync("Cart", Id, ct);

var reminder = await reminders.GetAsync("Cart", Id, nameof(AbandonCart), ct);
var actorReminders = await reminders.ListAsync("Cart", Id, ct);
var remindersForType = await reminders.ListAsync("Cart", cancellationToken: ct);
```

当注册不存在时，`GetAsync` 返回 null。列表操作返回具名的注册记录。定时器是宿主本地的：请通过托管该 Actor 的边车来查看，而不是通过集群中的任意边车。提醒的列表可以限定为某个 Actor ID，也可以限定为整个 Actor 类型。

要取消某个 Actor 的所有提醒：

```csharp
await reminders.CancelAllAsync("Cart", Id, ct);
```

省略 `actorId` 会取消**该给定类型的每个 Actor**的提醒。只有在有意管理整个类型时，才应使用这一范围更广的操作。

### 提醒的失败策略

注册提醒时可以提供 `failurePolicy`，以覆盖运行时对失败触发的默认处理：

```csharp
await reminders.ScheduleAsync(
    "Cart", Id, nameof(AbandonCart),
    dueTime: TimeSpan.FromMinutes(30),
    period: TimeSpan.Zero,
    arguments: Array.Empty<byte>(),
    overwrite: true,
    failurePolicy: new ActorReminderFailurePolicy.Constant(TimeSpan.FromSeconds(10))
    {
        MaxRetries = 5
    },
    cancellationToken: ct);
```

`ActorReminderFailurePolicy.Drop` 会丢弃失败的触发。`Constant` 以指定的间隔重试；未设置 `MaxRetries` 时允许无限次重试。该策略只影响提醒投递失败的情况，不影响定时器的持久性、重复周期，也不影响 Actor 自身的应用级重试逻辑。

## 保存 Actor 状态

Actor 状态使用激活作用域内的写后缓存。在常见情况下，通过 `.Value` 或 `SetAsync` 修改状态，从 Actor 方法返回，然后由运行时在轮次结束时保存待处理的更改：

```csharp
public async Task AddItem(CartItem item, CancellationToken ct = default)
{
    var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
    cart.Value.Items.Add(item);
}
```

只有当你需要在方法继续执行之前，让当前更改抵达底层状态存储时，才调用 `State.SaveStateAsync(ct)`，例如在进行一次必须能读取到持久化 Actor 状态的外部调用之前：

```csharp
public async Task AddItemAndNotify(CartItem item, CancellationToken ct = default)
{
    var cart = await State.GetOrCreateAsync("cart", () => new CartState(), ct);
    cart.Value.Items.Add(item);

    await State.SaveStateAsync(ct);
    await notifications.CartUpdated(Id.Value, ct);
}
```

`SaveStateAsync` 成功后，已保存的缓存条目会被标记为干净。除非 Actor 在显式保存之后又修改了它们，否则轮次结束时的保存不会再次写入这些条目。在一次保存之前的多次修改仍会合并为一次写入。

`EvictCacheAsync` 则不同：它会从当前 Actor 激活中逐出缓存条目，使下一次读取回到持久状态。它不会持久化脏值。默认情况下它会拒绝脏的缓存条目；如果你传入 `new DaprEvictStateOptions { EvictOnDirtyState = true }`，这些脏的内存值将被丢弃。

## 设计时必须考虑的投递保证

Actor 回调是至少一次（at-least-once）语义，这决定了你编写 Actor 方法的方式。在构建任何非平凡的功能之前，理解这一点非常重要，因为如果你脑中存在“方法只会执行一次”的心智模型，这恰恰是最可能出错的假设。

调用可能会被重新投递。如果运行时已投递一次调用，但未收到响应（例如提交后流中断），调用方可能会观察到失败，即使状态更改已经成功。根据所配置的重试策略，该调用可能会再次执行。待处理的 Actor 状态在响应发送之前保存，而这些步骤并非原子操作。

因此，你的 Actor 方法必须能够安全地重复执行，包括其中的状态变更。仅仅因为使用了 Actor `State` 而递增计数器或追加条目，并不会自动具备幂等性；针对已提交状态的重试可能会再次应用该变更。请使用天然幂等的更新，或将稳定的请求标识及其结果与状态变更一并持久化，以便识别重复请求。外部副作用（发布事件、调用另一个 Actor、扣款）同样需要幂等策略。丢失的响应并不意味着回滚。

提醒在被确认之前可能会被重新投递，这取决于其运行时失败策略。配置的常量策略会改变重试间隔或上限，而丢弃策略则可能会停止该次触发的重试。因此，提醒处理程序必须是幂等的，并且重复出现的失败必须被暴露出来，而不是被吞掉。

{{% alert title="实践规则" color="primary" %}}
将每个 Actor 方法、提醒和订阅处理程序都设计为可以安全地重复执行。状态变更和外部副作用都需要幂等性。应将缺失的响应视为不确定的结果，而不是该操作从未执行或其状态变更已回滚的证据。
{{% /alert %}}

## 调用 Actor

调用 Actor 涉及两个相互独立的问题：编译时已知什么（这决定使用强类型代理还是动态客户端），以及从哪里调用（客户端，还是另一个 Actor）。无论哪种情况，Actor 类型名都是运行时用于放置的寻址键，并且序列化始终走同一条 `IDaprSerializer` 路径。

当你在编译时即可获得 Actor 的契约接口时，应使用强类型代理，这也是应用代码中的常见情况。它提供编译时的签名检查和编辑器补全。当 Actor 类型或方法存在于其他应用中，或在运行时才为人所知时（例如在网关或调用未引用的 Actor 的工具中），应使用动态客户端。

{{% alert title="没有远程处理代理与非远程处理代理之分，也没有 DataContract" color="warning" %}}
如果你是从 `Dapr.Actors` 迁移过来，请注意，这里的强类型代理并不是旧的远程处理客户端。这里不存在远程处理与非远程处理之分，你选择的调用形式也不会改变序列化方式。每一次调用，无论是强类型的还是动态的，都通过 `IDaprSerializer` 进行序列化（默认为 System.Text.Json）。除非你提供自定义的 `IDaprSerializer`，否则不支持 DataContract。选择代理还是动态客户端，只取决于你在编译时是否拥有该契约；从运行时的角度看，两者可以互换。
{{% /alert %}}

### 从 IActorProxyFactory 获取代理

以依赖注入友好的方式获取代理，是注入 `IActorProxyFactory` 并调用 `Create<TActor>(id, actorType)`：

```csharp
public sealed class CheckoutService(IActorProxyFactory proxies)
{
    public async Task Add(string userId, CartItem item)
    {
        var cart = proxies.Create<ICartActor>(ActorId.Create(userId), "CartActor");
        await cart.AddItem(item);
    }
}
```

泛型参数是契约接口，字符串是你要寻址的 Actor 类型名。两者都需要，因为一个接口可以支撑多个 Actor 类型（参见[一个接口可支撑多个 Actor 类型](#一个接口可支撑多个-actor-类型)），因此仅凭接口无法确定你指的是哪个已注册的 Actor。请传入你打算调用的具体 Actor 的类型名。

还有一个静态的 `ActorProxy.Create<TActor>(...)`，它由 `ActorProxy.Configure(...)` 和 `ActorProxy.Reset()` 支撑，但在几乎所有应用和测试代码中，都应优先使用注入的 `IActorProxyFactory`。

{{% alert title="避免使用静态的 ActorProxy 门面" color="warning" %}}
静态的 `ActorProxy.Create`、`Configure` 和 `Reset` 只是对进程级可变全局状态的便捷封装：`Create<T>()` 使用最后一次传给 `Configure(...)` 的工厂，而 `Reset()` 会将其清除。这种全局状态是一个陷阱。它可能在测试之间泄漏，可能将代理绑定到错误的服务提供程序，可能悄然掩盖缺失的依赖注入注册，并且在运行多个宿主或测试运行时的进程中行为不可预测。由于它是共享且可变的，其行为取决于整个进程中的调用顺序，而这正是你在调用路径上最不希望出现的情况。

请改为注入 `IActorProxyFactory`。它的作用域限定于创建它的容器，因此不存在可能泄漏或配置错误的环境状态，并且缺失的注册会明确失败，而不是解析为过时的全局对象。静态门面只为两种狭窄的情形而存在：当你确实处于依赖注入之外时（一个很小的示例，或没有容器的场合），提供一个简单的入口；以及为从 `Dapr.Actors.Client.ActorProxy.Create` 迁移过来的用户保留熟悉的写法。测试运行时的 `ActorTestRuntime.CreateActor<T>()` 是一种合理的受控用法，因为它会在使用之前自行配置生成的工厂。除了这类情况之外，请使用注入的工厂。
{{% /alert %}}

### 在 Actor 内部调用其他 Actor

Actor 调用另一个 Actor 的方式相同，即在其构造函数中注入 `IActorProxyFactory`。Actor 可以通过激活时提供的 `protected ActorId Id` 读取自身的标识，这有助于推导目标 ID 或传递关联信息：

```csharp
[DaprActor]
public sealed class CartActor(ActorActivationContext context, IActorProxyFactory proxies, IPricingClient pricing)
    : Actor, ICartActor
{
    protected override ActorId Id => context.ActorId;
    protected override IActorStateAccessor State => context.State;

    public async Task Checkout(CancellationToken ct = default)
    {
        var orders = proxies.Create<IOrderActor>(ActorId.Create($"order-{Id}"), "OrderActor");
        await orders.Place(Id, ct);   // Id 是本购物车自身的 Actor ID
    }
}
```

从轮次内部发起的调用，有三点是确定的，其中两点容易被忽略：

- 等待调用不会释放你的轮次。运行时会在整个轮次期间持有该 Actor 的锁，包括在你等待对另一个 Actor 的调用期间。另一个 Actor 运行它自己的轮次；你的轮次会一直保持打开，直到你的方法返回。
- 该调用与任何调用一样是至少一次语义。如果你的轮次被重新投递（参见[设计时必须考虑的投递保证](#设计时必须考虑的投递保证)），出站调用会再次执行，因此目标必须具备幂等性，或者该调用必须可以安全地重复。
- 启用时，重入由框架自动处理。Actor 开发者无需手动提供重入头。当 Actor 运行时启用了重入时，`Dapr.Actors.Next` 会在 Actor 轮次中发起的 Actor 调用之间自动传播调用链元数据，因此，一条重新进入调用链中已有 Actor 的调用链（A 调用 B，B 再回调 A）会被识别为重入，而不会因第一个轮次仍持有的锁而阻塞。

{{% alert title="显式配置重入" color="primary" %}}
设置 `DaprActorsOptions.EnableReentrancy`，并使用 `DaprActorsOptions.MaxReentrantDepth` 限制深度。按类型的设置会覆盖应用级设置。SDK 只有在重入调用与被占用 Actor 的活动调用链匹配时才会接纳它；当显式禁用重入或超过深度限制时，它会以 `ActorInvocationException` 拒绝接纳。Dapr 还会根据所公布的 Actor 配置另行控制重入的投递，因此当重入被禁用时，不要依赖循环调用图能够继续推进。

规范的传播头是 `Dapr-Reentrancy-Id`。SDK 对它的大小写不敏感，同时也识别 `dapr-reentrant-id` 和 `x-dapr-reentrant-id`，并且当存在多个别名时优先使用规范名称。对于自定义的调用基础设施，`ActorHeaders.WithCurrentReentrancy(headers)` 会在不修改所提供集合的情况下捕获活动调用链；显式的调用链头优先于环境上下文。普通的 Actor 代理调用会为你处理这些。

请等待嵌套的 Actor 调用，而不是在可变的 Actor 状态上启动并行或即发即忘的分支。重入的接纳并不是通用的线程安全保证。
{{% /alert %}}

### 在其他 Dapr 应用中调用 Actor

从调用方的角度看，调用由另一个应用托管的 Actor，与调用本应用中的 Actor 完全相同。你使用相同的类型名创建相同的代理并等待即可；放置机制会将调用路由到托管该类型的应用，在常见情况下无需特殊的跨应用客户端、端点，也无需管理 App ID。

```csharp
// 无论 "CartActor" 托管在本应用还是其他应用中，调用方式相同：
var cart = proxies.Create<ICartActor>(ActorId.Create(userId), "CartActor");
await cart.AddItem(item);   // 放置机制会将调用路由到 "CartActor" 所在的位置
```

真正使跨应用边界得以工作的，仅仅是你如何共享契约：

- 将带有 `[GenerateActorClient]` 特性的 Actor 契约接口，放在两个应用都引用的共享程序集中。由于该特性随接口一同传递，调用方应用自身的构建会根据它生成客户端代理，即使该应用没有实现。
- 托管应用引用实现并调用 `AddDaprActors()`。
- 调用方应用只引用契约；它不托管该 Actor，也不需要 `EnableAutoActorRegistration`。

由于两端的序列化都走同一条 `IDaprSerializer` 路径，且与代理无关，强类型代理同样适用于跨应用调用，而旧的远程处理代理则做不到这一点。

{{% alert title="保持类型名稳定" color="warning" %}}
Actor 类型名是持久地址的一部分；状态和放置都以它为键。请慎重选择并且不要更改它，否则已有的实例将无法被访问。若要演进行为或状态，请对状态进行版本化，而不是对类型名进行版本化。参见[状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})。
{{% /alert %}}

### 动态调用

较少见的情况是在完全没有编译时契约的情况下进行调用。当 Actor 类型或方法在运行时才为人所知时，例如在网关、管理工具、跨语言的调用方或智能体中，请通过 `IDynamicActorClient` 进行调用，并通过 `IActorRegistry` 在运行时发现可被调用的内容，而不是使用强类型代理。这是一项独立的、与语言无关的能力，有其专门的页面：参见[动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})。

## 分析器与诊断

该包附带了一些分析器，可在构建时捕获 Actor 特有的错误，其中若干分析器还提供代码修复。它们使用 `DAPR14xx` 范围的编号。

| 编号 | 标记内容 | 类别 | 严重程度 |
| --- | --- | --- | --- |
| `DAPR1410` | 状态形状变更导致已发布状态的反序列化失败 | 兼容性 | 警告 |
| `DAPR1411` | 工作脱离了 Actor 调度器，例如 `Task.Run` | 并发 | 警告 |
| `DAPR1412` | Actor 轮次内的阻塞调用 | 并发 | 警告 |
| `DAPR1413` | 读取挂钟时间，而不是使用注入的 `TimeProvider` | 确定性 | 警告 |
| `DAPR1414` | 未设种子的非确定性来源，例如 `Guid.NewGuid()` 或 `Random` | 确定性 | 警告 |
| `DAPR1415` | 状态迁移的目标不可达，因为没有升级器迁移到它 | 兼容性 | 警告 |
| `DAPR1416` | `IActorTurnFilter` 中的业务逻辑 | 设计 | 信息 |
| `DAPR1417` | Actor 接口方法使用了不支持的返回类型 | 用法 | 警告 |
| `DAPR1418` | 对已发布的 Actor 接口线路契约进行了原地修改 | 兼容性 | 警告 |
| `DAPR1419` | Actor 实例字段中保存了可变的共享状态 | 并发 | 警告 |
| `DAPR1420` | 共享同一契约的多个 Actor 注册了相同的 Actor 类型名 | 用法 | 警告 |
| `DAPR1421` | `[DaprActor]` 实现未公开 `[GenerateActorClient]` 契约 | 用法 | 警告 |
| `DAPR1423` | 某个状态类型看似属于一个迁移家族，但未与之相连 | 兼容性 | 警告 |
| `DAPR1424` | Actor 状态迁移链中有序片段之间存在缺口 | 兼容性 | 警告 |
| `DAPR1425` | 非追加式的状态迁移步骤需要手写升级器 | 兼容性 | 警告 |
| `DAPR1426` | Actor 状态迁移家族存在多条通往同一目标的折叠路径 | 兼容性 | 警告 |
| `DAPR1427` | 同一持久化 Actor 状态名被用于多个迁移家族 | 用法 | 警告 |
| `DAPR1428` | Actor 代码针对较旧的状态类型，而存在更新的可达版本 | 用法 | 信息 |
| `DAPR1429` | 已调度的提醒/定时器回调与任何可派发的 Actor 方法都不匹配 | 用法 | 错误 |
| `DAPR1430` | 已调度的提醒/定时器指向本应用中未找到的 Actor 类型 | 用法 | 警告 |
| `DAPR1431` | 已调度的提醒/定时器回调方法未通过生成的 Actor 客户端公开 | 用法 | 错误 |

## 最佳实践

- 只添加 `AddDaprActors()`，其余交给生成器完成；如果你使用 `DaprStateManagementClient` 等构建块客户端，请单独注册它们。
- 将 Actor 状态保存在 `State` 中，字段保持不可变，并让注入的服务保持无状态。
- 在编译时即可获得契约时，通过 `IActorProxyFactory` 使用强类型代理；仅在网关和确实需要延迟绑定的工具中使用 `IDynamicActorClient`。
- 选定 Actor 类型名后就不要再更改。
- 将 `[DaprActor]` 标注在实现类上，并让契约派生自 `IActor`；不要手写代理或注册代码。

## 后续步骤

- [教程第 1 部分：购物车，现代基线]({{< ref dotnet-actorsnext-tutorial-cart.md >}})
- [序列化]({{< ref dotnet-actorsnext-serialization.md >}})
- [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})
- [状态机 Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
