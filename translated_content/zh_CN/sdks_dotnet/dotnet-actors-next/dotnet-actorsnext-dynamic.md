---
type: docs
title: "Dynamic actor invocation in the .NET SDK"
linkTitle: "动态调用"
weight: 145000
description: "无需编译期契约，通过类型、ID 与方法调用 Actor，适用于 gateway、工具和跨语言调用方"
---

大多数应用代码通过强类型代理调用 Actor，这需要在编译期拥有 Actor 的契约接口。动态调用则是另一条路径：无需编译期契约，只需用 Actor 的类型名、ID 和方法名，连同序列化后的负载即可调用 Actor。它本身就是 Actor 协议，而不是 .NET 的编写功能，因此它是一种与语言无关的 Actor 调用方式，与 SDK 的其他部分有明显不同。

## 调用不等于托管

首先需要明白的最重要一点是：调用 Actor 不需要托管、注册或引用它。调用方只需提供类型名、ID、方法名和负载，运行时便会把调用路由到集群中托管该类型的应用。调用方无需实现该 Actor，调用时也无需调用 `AddDaprActors()`，更不需要该 Actor 所在的程序集。

这与托管方的宣告要求正好相反。托管 Actor 的应用会宣告其托管的类型，以便运行时将入站调用路由到它。调用方无需宣告任何内容，只管调用即可。强类型代理和动态客户端都是调用方，二者都不会因为发起调用而托管任何内容。

## .NET 接口概览

共有两个组成部分：发现与调用。

`IActorRegistry` 负责发现。源生成器会根据本应用托管的 Actor 生成它，其中包含每个类型、它的方法以及各方法的参数和返回值类型。这是真正的新能力：Dapr runtime metadata 只列出 Actor 类型名，而生成的注册表则携带完整签名，因此本应用中的代码可以枚举它对外暴露了什么，以及如何调用。

```csharp
public interface IActorRegistry
{
    IReadOnlyList<ActorTypeDescriptor> Actors { get; }
    bool TryGet(string actorType, out ActorTypeDescriptor descriptor);
}
```

`IDynamicActorClient` 负责调用。它以字符串形式发起调用，参数为 JSON，返回结果也是 JSON。

```csharp
public interface IDynamicActorClient
{
    Task<string?> InvokeAsync(string actorType, string actorId, string method,
                              string argsJson, CancellationToken cancellationToken = default);
}
```

下面是一个小型 gateway 示例，它列出自己托管的内容，并转发调用：

```csharp
public sealed class ActorGateway(IActorRegistry registry, IDynamicActorClient client)
{
    public IReadOnlyList<ActorTypeDescriptor> Catalog() => registry.Actors;   // 类型 + 签名

    public Task<string?> Forward(string type, string id, string method, string argsJson)
        => client.InvokeAsync(type, id, method, argsJson);
}
```

请注意两者的作用域：`IActorRegistry` 反映的是本应用托管的类型，因此它只用于发现本应用对外暴露的内容。`IDynamicActorClient` 则可以调用集群中托管的任何类型，无论本应用是否托管该类型，也无论它是否出现在本应用的注册表中。当你调用由其他应用托管的类型时，类型和方法应来自你已掌握的契约，而不是本地发现。

## 跨语言调用

由于一次调用由类型名、ID、方法名以及带内容类型的序列化负载组成，.NET 应用可以通过同一协议动态调用其他语言实现的 Actor，也可以被其他语言的 Actor 调用。这正是动态调用作为独立能力存在的最有力理由。

.NET SDK 只控制这次交换中的 .NET 一侧。它通过 `IDaprSerializer` 序列化和反序列化收发的 .NET 负载，并设置和读取内容类型。对于其他语言如何序列化负载、如何命名方法以及如何封送错误，SDK 无法控制。因此，跨语言互操作本质上是负载结构的协调问题，需要你自行负责：约定线路格式（动态路径下 JSON 是自然的默认选择）、约定内容类型，并对收到的数据进行校验。应把对方的约定视为外部契约，而不是 SDK 能够替你决定的事情。

以下内容都是关于 .NET SDK 在调用中自身一侧所做的事。

## 序列化：同一线路格式，中间没有代理

线路上的负载与强类型路径完全相同：序列化后的字节加上内容类型，不存在远程与非远程之分。唯一的区别在于调用方的序列化发生在哪里。强类型代理会通过 `IDaprSerializer` 为你序列化类型化的参数；动态客户端则直接接收你已序列化为 JSON 的参数，并原样发送。在接收端则完全没有区别：托管该 Actor 的分发器会通过 `IDaprSerializer` 把负载反序列化为方法的参数类型，与强类型调用的处理方式完全一致。

## 结果模型依然适用

动态调用的方法若抛出应用错误，其返回方式与强类型调用相同：以错误负载的形式由运行时原样回传给调用方。区别在于错误的还原。强类型代理知道契约，因此会将错误重建为对应的 CLR 异常类型并重新抛出。动态客户端没有可供还原的契约，因此它会直接暴露原始错误负载及其内容类型，由你自行解释。因此应当检查返回的错误，而不是捕获具体类型的异常。

## 投递契约依然适用

动态调用不会改变投递语义，因为投递语义是调用路径的属性，而与你如何发起调用无关。动态调用的方法是至少一次（at-least-once）语义：运行时已拉取但无法确认的调用会被重试，因此 Actor 方法必须能够安全地重复执行。强类型路径、reminder 和 subscription 投递受同一契约约束。如果你通过 gateway 暴露动态调用，其背后的 Actor 仍需要幂等的处理程序。

## 适用场景

- gateway 或 API 层，用于转发调用编译期未引用的 Actor。
- 管理或运维工具，按类型和方法通用地调用 Actor。
- 跨语言调用方，此时按定义就不存在编译期的 .NET 契约。
- 从注册表中发现可调用 Actor 并发起调用的代理（agent），它只是该接口的众多使用方之一。

对于行为在运行时而非编译期定义的 Actor，动态调用是调用它们的方式，但托管它们是另一项功能；参见[概述]({{< ref _index.md >}})中的代理相关内容以及解释执行的状态机模型。本页讨论的是调用，而不是运行时定义的托管。

## 测试

动态调用可以像强类型调用一样在内存测试运行时中驱动，因此无需 sidecar 即可测试 gateway 或通用路由器。

```csharp
// IDynamicActorClient 和 IActorRegistry 从运行时的服务提供程序中解析，
// 而内存运行时将该提供程序保存在一个私有字段中。
private static IServiceProvider Provider(ActorTestRuntime rt) =>
    (IServiceProvider)rt.GetType()
        .GetField("provider", BindingFlags.Instance | BindingFlags.NonPublic)!
        .GetValue(rt)!;

[Fact]
public async Task Gateway_forwards_a_dynamic_call_to_the_actor()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
    rt.CreateActor<ICartActor>(ActorId.Create("u1"), "CartActor");   // 在运行时中托管目标 Actor
    var client = Provider(rt).GetRequiredService<IDynamicActorClient>();

    var json = await client.InvokeAsync("CartActor", "u1", "GetSummary", "{}");

    Assert.NotNull(json);
}

[Fact]
public async Task Registry_exposes_hosted_types_and_their_signatures()
{
    await using var rt = new ActorTestRuntime(services => services.AddDaprActors(_ => { }));
    var registry = Provider(rt).GetRequiredService<IActorRegistry>();

    Assert.True(registry.TryGet("CartActor", out var cart));
    Assert.Contains(cart.Methods, m => m.Name == nameof(ICartActor.GetSummary));
}
```

第一个测试无需基础设施即可端到端验证转发路径；第二个测试则验证发现功能返回的签名，正是 gateway 或代理进行路由所依据的内容。完整的运行时请参见[测试]({{< ref dotnet-actorsnext-testing.md >}})。

## 需要注意的边界

- 没有编译期的签名检查。方法名错误或 `argsJson` 格式不正确会在运行时失败，而不是在构建时失败，这正是缺少契约所付出的代价。
- 契约漂移不会被自动发现。由于调用方在编译期没有对目标的引用，目标 Actor 方法签名的变更不会导致调用方构建失败，而是会以运行时失败的形式暴露，或者更糟，表现为悄无声息的负载不匹配。请在团队之间以线下方式协调契约变更；若目标是你自己托管的 Actor，则应使用注册表描述符上的 `ContractVersion` 主动检测漂移，而不是依赖编译器。
- 投递契约依然适用。与任何调用一样，动态调用的方法也是至少一次语义，因此目标处理程序必须可安全重复执行；通过动态方式调用并不能豁免这一要求（参见[投递保证]({{< ref "dotnet-actorsnext-howto.md#delivery-guarantees-you-must-design-for" >}})）。
- 负载的安全性取决于你的校验。接受外部传入的类型、方法和 JSON 的 gateway 或代理（agent），必须在调用前完成校验与授权；动态调用是一种通用能力，内置并没有允许列表。
- 应用错误以原始负载的形式返回，而不是重建的 CLR 异常（参见上文的结果模型）。
- 发现是本地的。`IActorRegistry` 列出的是本应用托管的类型；调用其他地方托管的类型，依据的是你已掌握的契约，而不是发现。

## 后续步骤

- [编写、注册和调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})，了解强类型路径以及调用与托管的区别。
- [序列化与状态迁移]({{< ref dotnet-actorsnext-serialization.md >}})，了解接收端所使用的序列化器。
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
