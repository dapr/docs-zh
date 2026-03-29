---
type: docs
title: ".NET Dapr 可插拔组件的生命周期"
linkTitle: "组件生命周期"
weight: 1000
description: 如何控制 .NET 可插拔组件的生命周期
no_list: true
is_preview: true
---

有两种方式注册组件：

 - 组件作为单例运行，其生命周期由 SDK 管理
 - 组件的生命周期由可插拔组件决定，可根据需要为多实例或单例

## 单例组件

_按类型_注册的组件是单例：一个实例将为与该 socket 关联的该类型的所有已配置组件提供服务。当该类型仅存在单个组件且在 Dapr 应用程序之间共享时，此方法最佳。

```csharp
var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "service-a",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<SingletonStateStore>();
    });

app.Run();

class SingletonStateStore : IStateStore
{
    // ...
}
```

## 多实例组件

可以通过传递"工厂方法"来注册组件。对于与该 socket 关联的该类型的每个已配置组件，都会调用此方法。该方法返回要与该组件关联的实例（无论是否共享）。当同一类型的多个组件可能使用不同的元数据集进行配置，或需要将组件操作彼此隔离时，此方法最佳。

工厂方法将接收上下文，例如已配置的 Dapr 组件的 ID，可用于区分组件实例。

```csharp
var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "service-a",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore(
            context =>
            {
                return new MultiStateStore(context.InstanceId);
            });
    });

app.Run();

class MultiStateStore : IStateStore
{
    private readonly string instanceId;

    public MultiStateStore(string instanceId)
    {
        this.instanceId = instanceId;
    }

    // ...
}
```

## 后续步骤

- [了解有关应用程序环境的更多信息]({{% ref "dotnet-application-environment" %}})
- [了解有关多个服务的更多信息]({{% ref "dotnet-multiple-services" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
