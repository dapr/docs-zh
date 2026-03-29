---
type: docs
title: "实现 .NET 状态存储组件"
linkTitle: "状态存储"
weight: 1000
description: 如何使用 Dapr 可插拔组件 .NET SDK 创建状态存储
no_list: true
is_preview: true
---

创建状态存储组件只需要几个基本步骤。

## 添加状态存储命名空间

添加状态存储相关命名空间的 `using` 语句。

```csharp
using Dapr.PluggableComponents.Components;
using Dapr.PluggableComponents.Components.StateStore;
```

## 实现 `IStateStore`

创建一个实现 `IStateStore` 接口的类。

```csharp
internal sealed class MyStateStore : IStateStore
{
    public Task DeleteAsync(StateStoreDeleteRequest request, CancellationToken cancellationToken = default)
    {
        // 从状态存储中删除请求的键...
    }

    public Task<StateStoreGetResponse?> GetAsync(StateStoreGetRequest request, CancellationToken cancellationToken = default)
    {
        // 从状态存储中获取请求的键值，否则返回 null...
    }

    public Task InitAsync(MetadataRequest request, CancellationToken cancellationToken = default)
    {
        // 调用以使用配置的元数据初始化组件...
    }

    public Task SetAsync(StateStoreSetRequest request, CancellationToken cancellationToken = default)
    {
        // 在状态存储中设置请求的键为指定值...
    }
}
```

## 注册状态存储组件

在主程序文件（例如 `Program.cs`）中，向应用程序服务注册状态存储。

```csharp
using Dapr.PluggableComponents;

var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "<socket name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterStateStore<MyStateStore>();
    });

app.Run();
```

## 批量状态存储

旨在支持批量操作的状态存储应实现可选的 `IBulkStateStore` 接口。其方法镜像了基础 `IStateStore` 接口的方法，但包含多个请求值。

{{% alert title="注意" color="primary" %}}
对于未实现 `IBulkStateStore` 的状态存储，Dapr 运行时将通过单独调用其操作来模拟批量状态存储操作。
{{% /alert %}}

```csharp
internal sealed class MyStateStore : IStateStore, IBulkStateStore
{
    // ...

    public Task BulkDeleteAsync(StateStoreDeleteRequest[] requests, CancellationToken cancellationToken = default)
    {
        // 从状态存储中删除所有请求的值...
    }

    public Task<StateStoreBulkStateItem[]> BulkGetAsync(StateStoreGetRequest[] requests, CancellationToken cancellationToken = default)
    {
        // 从状态存储中返回所有请求的值...
    }

    public Task BulkSetAsync(StateStoreSetRequest[] requests, CancellationToken cancellationToken = default)
    {
        // 在状态存储中设置所有请求的键的值...
    }
}
```

## 事务状态存储

旨在支持事务的状态存储应实现可选的 `ITransactionalStateStore` 接口。其 `TransactAsync()` 方法接收一个请求，其中包含要在事务中执行的一系列删除和/或设置操作。状态存储应遍历该序列并调用每个操作的 `Visit()` 方法，传入代表对每种操作类型要执行的操作的回调。

```csharp
internal sealed class MyStateStore : IStateStore, ITransactionalStateStore
{
    // ...

    public async Task TransactAsync(StateStoreTransactRequest request, CancellationToken cancellationToken = default)
    {
        // 开始事务...

        try
        {
            foreach (var operation in request.Operations)
            {
                await operation.Visit(
                    async deleteRequest =>
                    {
                        // 处理删除请求...

                    },
                    async setRequest =>
                    {
                        // 处理设置请求...
                    });
            }
        }
        catch
        {
            // 回滚事务...

            throw;
        }

        // 提交事务...
    }
}
```

## 可查询状态存储

旨在支持查询的状态存储应实现可选的 `IQueryableStateStore` 接口。其 `QueryAsync()` 方法接收有关查询的详细信息，例如筛选器、结果限制和分页，以及结果的排序顺序。状态存储应使用这些详细信息生成一组值作为其响应的一部分返回。

```csharp
internal sealed class MyStateStore : IStateStore, IQueryableStateStore
{
    // ...

    public Task<StateStoreQueryResponse> QueryAsync(StateStoreQueryRequest request, CancellationToken cancellationToken = default)
    {
        // 生成并返回结果...
    }
}
```

## ETag 和其他语义错误处理

Dapr 运行时对某些状态存储操作导致的某些错误条件有额外的处理。状态存储可以通过从其操作逻辑中抛出特定异常来指示此类情况：

| 异常 | 适用操作 | 描述
|---|---|---|
| `ETagInvalidException` | Delete、Set、Bulk Delete、Bulk Set | 当 ETag 无效时 |
| `ETagMismatchException`| Delete、Set、Bulk Delete、Bulk Set | 当 ETag 与预期值不匹配时 |
| `BulkDeleteRowMismatchException` | Bulk Delete | 当受影响的行数与预期行数不匹配时 |

## 后续步骤

- [了解可插拔组件 .NET SDK 的高级步骤]({{% ref "dotnet-advanced" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
