---
type: docs
title: "Dapr Actors .NET SDK"
linkTitle: "Actor"
weight: 60000
description: "Dapr 虚拟 Actor 构建块在 .NET 中的概述"
---

通过 `Dapr.Actors` 包，你可以从 .NET 应用程序与 Dapr 虚拟 Actor 进行交互。Actor 是虚拟的，通过类型和 ID 寻址，支持状态管理、提醒、定时器，以及强类型和弱类型的代理客户端。当你需要对有状态对象进行单线程、基于实例的并发控制时，Actor 模式十分适用。

{{% alert title="Dapr.Actors 的状态" color="warning" %}}
`Dapr.Actors` 的活跃开发已经停止；该包现在只接收安全修复，所有新的 Actor 开发都在 [`Dapr.Actors.Next`]({{% ref dotnet-actors-next %}}) 中进行。`Dapr.Actors` 目前没有弃用日期，但它被视为处于仅维护模式。

`Dapr.Actors.Next` 预计将与 v1.19 版本的 Dapr 运行时和 SDK 一同作为稳定包发布。
{{% /alert %}}

## 核心概念

- [操作指南：在 .NET SDK 中运行和使用虚拟 Actor]({{< ref dotnet-actors-howto.md >}})：一份完整的教程，用于构建包含三个项目的解决方案，即 Actor 接口、带状态、提醒和定时器的 Actor 服务，以及代理客户端。
- [编写与运行 Actor]({{< ref dotnet-actors-usage.md >}})：使用 `ActorHost` 编写 Actor，包括依赖注入、释放、日志记录和自定义类型名称；在 ASP.NET Core 中通过 `AddActors`、JSON 选项以及经由 `MapActorsHandlers` 的端点路由托管 Actor，并注意中间件的常见陷阱。
- [Actor 序列化]({{< ref dotnet-actors-serialization.md >}})：两种序列化模型，即弱类型客户端（System.Text.Json，输出 JSON）和强类型客户端（Data Contract Serializer，输出 XML），以及在两者中配置类型的规则。
- [IActorProxyFactory 接口]({{< ref dotnet-actors-client.md >}})：使用强类型（`CreateActorProxy<>`）和弱类型（`Create`）代理方式创建 Actor 客户端，以及从方法调用中读取异常详情。

## 后续步骤

- [操作指南：在 .NET SDK 中运行和使用虚拟 Actor]({{< ref dotnet-actors-howto.md >}})
- [编写与运行 Actor]({{< ref dotnet-actors-usage.md >}})
- [Actor 序列化]({{< ref dotnet-actors-serialization.md >}})
