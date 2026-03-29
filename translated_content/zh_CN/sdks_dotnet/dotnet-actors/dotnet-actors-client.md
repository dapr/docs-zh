---
type: docs
title: "IActorProxyFactory 接口"
linkTitle: "Actors 客户端"
weight: 100000
description: 了解如何使用 IActorProxyFactory 接口创建 actor 客户端
---

在 `Actor` 类或 ASP.NET Core 项目中，建议使用 `IActorProxyFactory` 接口来创建 actor 客户端。

`AddActors(...)` 方法会将 actor 服务注册到 ASP.NET Core 依赖注入中。

- **在 actor 实例外部：** `IActorProxyFactory` 实例作为单例服务通过依赖注入可用。
- **在 actor 实例内部：** `IActorProxyFactory` 实例作为属性（`this.ProxyFactory`）可用。

以下是在 actor 内部创建代理的示例：

```csharp
public Task<MyData> GetDataAsync()
{
    var proxy = this.ProxyFactory.CreateActorProxy<IOtherActor>(ActorId.CreateRandom(), "OtherActor");
    await proxy.DoSomethingGreat();

    return this.StateManager.GetStateAsync<MyData>("my_data");
}
```

在本指南中，你将学习如何使用 `IActorProxyFactory`。

{{% alert title="提示" color="primary" %}}
对于非依赖注入的应用程序，你可以使用 `ActorProxy` 上的静态方法。由于 `ActorProxy` 方法容易出错，在配置自定义设置时尽量避免使用它们。
{{% /alert %}}

## 标识 actor

`IActorProxyFactory` 上的所有 API 都需要 actor _类型_ 和 actor _id_ 才能与 actor 通信。对于强类型客户端，你还需要它的接口之一。

- **Actor 类型** 在整个应用程序中唯一标识 actor 实现。
- **Actor id** 唯一标识该类型的一个实例。

如果你没有 actor `id` 并且想要与一个新实例通信，可以使用 `ActorId.CreateRandom()` 创建一个随机 id。由于随机 id 是一个加密强度高的标识符，当你与它交互时，运行时会创建一个新的 actor 实例。

你可以使用 `ActorReference` 类型与其他 actor 交换 actor 类型和 actor id，作为消息的一部分。

## 两种 actor 客户端风格

actor 客户端支持两种不同的调用风格：

| Actor 客户端风格 | 描述 |
| ------------------ | ----------- |
| 强类型 | 强类型客户端基于 .NET 接口，提供强类型的典型好处。它们不适用于非 .NET actor。 |
| 弱类型 | 弱类型客户端使用 `ActorProxy` 类。建议仅在需要互操作性或其他高级原因时使用这些客户端。 |

### 使用强类型客户端

以下示例使用 `CreateActorProxy<>` 方法创建强类型客户端。`CreateActorProxy<>` 需要一个 actor 接口类型，并将返回该接口的一个实例。

```csharp
// 为 IOtherActor 创建一个代理，类型为 OtherActor，具有随机 id
var proxy = this.ProxyFactory.CreateActorProxy<IOtherActor>(ActorId.CreateRandom(), "OtherActor");

// 调用接口定义的方法来调用 actor
//
// proxy 是 IOtherActor 的实现，所以我们可以直接调用其方法
await proxy.DoSomethingGreat();
```

### 使用弱类型客户端

以下示例使用 `Create` 方法创建弱类型客户端。`Create` 返回 `ActorProxy` 的一个实例。

```csharp
// 为类型 OtherActor 创建一个代理，具有随机 id
var proxy = this.ProxyFactory.Create(ActorId.CreateRandom(), "OtherActor");

// 按名称调用方法来调用 actor
//
// proxy 是 ActorProxy 的一个实例
await proxy.InvokeMethodAsync("DoSomethingGreat");
```

由于 `ActorProxy` 是弱类型代理，你需要将 actor 方法名称作为字符串传入。

你还可以使用 `ActorProxy` 调用具有请求和响应消息的方法。请求和响应消息将使用 `System.Text.Json` 序列化器进行序列化。

```csharp
// 为类型 OtherActor 创建一个代理，具有随机 id
var proxy = this.ProxyFactory.Create(ActorId.CreateRandom(), "OtherActor");

// 调用代理上的方法来调用 actor
//
// proxy 是 ActorProxy 的一个实例
var request = new MyRequest() { Message = "Hi, it's me.", };
var response = await proxy.InvokeMethodAsync<MyRequest, MyResponse>("DoSomethingGreat", request);
```

使用弱类型代理时，你_必须_主动定义正确的 actor 方法名称和消息类型。使用强类型代理时，这些名称和类型作为接口定义的一部分为你定义。

### Actor 方法调用异常详细信息

actor 方法调用异常详细信息会向调用方和被调用方公开，提供追踪问题的入口点。异常详细信息包括：
- 方法名称
- 行号
- 异常类型
- UUID
 
你使用 UUID 在调用方和被调用方之间匹配异常。以下是异常详细信息的示例：
```
Dapr.Actors.ActorMethodInvocationException: Remote Actor Method Exception, DETAILS: Exception: NotImplementedException, Method Name: ExceptionExample, Line Number: 14, Exception uuid: d291a006-84d5-42c4-b39e-d6300e9ac38b
```

## 后续步骤

[了解如何使用 `ActorHost` 编写和运行 actor]({{% ref dotnet-actors-usage.md %}})。
