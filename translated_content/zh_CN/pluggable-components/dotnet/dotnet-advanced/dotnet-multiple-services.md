---
type: docs
title: ".NET Dapr 可插拔组件中的多个服务"
linkTitle: "多个服务"
weight: 1000
description: 如何从 .NET 可插拔组件公开多个服务
no_list: true
is_preview: true
---

可插拔组件可以托管多种类型的多个组件。您可能需要这样做：
- 为了最小化集群中运行的边车数量
- 为了分组可能共享库和实现的相关组件，例如：
   - 一个既作为通用状态存储公开的数据库，和
   - 允许更特定操作的输出绑定。

每个 Unix 域套接字可以管理对每种类型的一个组件的调用。要托管相同类型的多个组件，您可以将这些类型分散到多个套接字上。SDK 将每个套接字绑定到一个"服务"，每个服务由一种或多种组件类型组成。

## 注册多个服务

每次调用 `RegisterService()` 都会将一个套接字绑定到一组已注册的组件，其中每个服务可以注册每种类型的组件中的一个。

```csharp
var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "service-a",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<MyDatabaseStateStore>();
        serviceBuilder.RegisterBinding<MyDatabaseOutputBinding>();
    });

app.RegisterService(
    "service-b",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<AnotherStateStore>();
    });

app.Run();

class MyDatabaseStateStore : IStateStore
{
    // ...
}

class MyDatabaseOutputBinding : IOutputBinding
{
    // ...
}

class AnotherStateStore : IStateStore
{
    // ...
}
```

## 配置多个组件

配置 Dapr 以使用托管组件与任何单个组件相同 - 组件 YAML 引用关联的套接字。

```yaml
#
# 此组件使用与套接字 `state-store-a` 关联的状态存储
#
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store-a
spec:
  type: state.service-a
  version: v1
  metadata: []
```

```yaml
#
# 此组件使用与套接字 `state-store-b` 关联的状态存储
#
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store-b
spec:
  type: state.service-b
  version: v1
  metadata: []
```

## 后续步骤

- [了解有关组件生命周期的更多信息]({{% ref "dotnet-component-lifetime" %}})
- [了解有关应用程序环境的更多信息]({{% ref "dotnet-application-environment" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
