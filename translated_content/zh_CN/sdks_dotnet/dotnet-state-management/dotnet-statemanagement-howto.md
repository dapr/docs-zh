---
type: docs
title: "操作指南：使用 Dapr 状态管理 .NET SDK 管理状态"
linkTitle: "操作指南：管理状态"
weight: 53050
description: 学习如何使用 Dapr 状态管理 .NET SDK 保存、读取、删除和查询状态
---

下面演示如何使用 `Dapr.StateManagement` 包管理状态。以下演示使用[此处提供的示例项目](https://github.com/dapr/dotnet-sdk/tree/master/examples/StateManagement)，内容涵盖通过源生成器获得的强类型状态存储客户端、用于批量操作和事务的直接客户端用法，以及使用 ETag 实现的乐观并发控制。在本指南中，你将：

- 部署一个 .NET 应用（[StateManagementExample](https://github.com/dapr/dotnet-sdk/tree/master/examples/StateManagement/StateManagementExample)）
- 使用 Dapr .NET 状态管理 SDK 保存、读取和删除状态条目
- 使用 ETag 实现乐观并发控制
- 执行批量操作与状态事务
- 使用源生成器创建强类型的、按存储划分范围的接口

在 .NET 示例项目中：

- 主文件 [`Program.cs`](https://github.com/dapr/dotnet-sdk/tree/master/examples/StateManagement/StateManagementExample/Program.cs) 同时包含两种用法（强类型存储与直接客户端）。
- [`IWidgetStore.cs`](https://github.com/dapr/dotnet-sdk/tree/master/examples/StateManagement/StateManagementExample/IWidgetStore.cs) 文件演示了强类型状态存储接口。

## 前提条件
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 已将 [Dapr.StateManagement](https://www.nuget.org/packages/Dapr.StateManagement) NuGet 包安装到你的项目中

## 设置环境

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。二者的支持将在 Dapr v1.20 中移除；只有 .NET 10 和 .NET 11 将支持至 2027 年底。
{{% /alert %}}

克隆 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk)。

```sh
git clone https://github.com/dapr/dotnet-sdk.git
```

在 .NET SDK 根目录中，进入 Dapr 状态管理示例目录。

```sh
cd examples/StateManagement
```

## 在本地运行应用

要运行该 Dapr 应用，你需要同时启动 .NET 程序和一个 Dapr 边车。进入 `StateManagementExample` 目录。

```sh
cd StateManagementExample
```

下面的命令会同时启动 Dapr 边车和 .NET 程序。

```sh
dapr run --app-id statemanagement-example --dapr-grpc-port 50001 -- dotnet run
```

> Dapr 在 `http://localhost:50001` 上监听 gRPC 请求。

## 注册客户端

这些示例面向 `Dapr.StateManagement` `1.19.0` 或更高版本。为了使用客户端、注册与序列化，请导入 `Dapr.StateManagement`、`Dapr.StateManagement.Extensions` 和 `System.Text.Json`。状态选项与操作模型位于 `Dapr.StateManagement` 中。

`DaprStateManagementClient` 通过 `IServiceCollection` 上的扩展方法 `AddDaprStateManagementClient()` 注册。该方法返回一个 `IDaprStateManagementBuilder`，可用它进一步注册由源生成器生成的强类型状态存储客户端。

### 默认注册

使用默认设置注册客户端。Dapr 端点与 API 令牌会自动从环境变量或 `IConfiguration` 中读取。

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprStateManagementClient();
```

### 使用自定义配置注册

如果需要配置客户端（例如覆盖 gRPC 端点或 JSON 序列化器选项），请传入一个回调：

```csharp
builder.Services.AddDaprStateManagementClient((sp, clientBuilder) =>
{
    clientBuilder.UseGrpcEndpoint("http://localhost:50001");
});
```

### 通过 `IServiceProvider` 注册

配置回调会接收 `IServiceProvider`，因此你可以解析其他服务：

```csharp
builder.Services.AddDaprStateManagementClient((sp, clientBuilder) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var endpoint = config["DaprGrpcEndpoint"];
    if (!string.IsNullOrEmpty(endpoint))
    {
        clientBuilder.UseGrpcEndpoint(endpoint);
    }
});
```

## 从 `IConfiguration` 配置客户端

客户端构建器继承自 `DaprGenericClientBuilder<T>`，支持从 `IConfiguration` 读取配置值。以下配置键会被识别：

| 键 | 说明 |
|--------------------|-----------------------------------------|
| `DAPR_GRPC_ENDPOINT` | Dapr 边车的 gRPC 端点 |
| `DAPR_HTTP_ENDPOINT` | Dapr 边车的 HTTP 端点 |
| `DAPR_API_TOKEN`     | 用于对 Dapr 边车进行身份验证的 API 令牌 |

这些值可以通过环境变量、`appsettings.json` 或任何其他 `IConfiguration` 来源提供。

使用内存中的配置：
```csharp
builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["DAPR_GRPC_ENDPOINT"] = "http://localhost:50001",
});

builder.Services.AddDaprStateManagementClient();
```

使用带前缀的环境变量：
```csharp
builder.Configuration.AddEnvironmentVariables(prefix: "MYAPP_");

// 将自动读取 MYAPP_DAPR_GRPC_ENDPOINT
builder.Services.AddDaprStateManagementClient();
```

## 保存与读取状态

使用 `GetStateAsync<TValue>` 读取单个值，使用 `SaveStateAsync<TValue>` 保存单个值：

```csharp
var client = app.Services.GetRequiredService<DaprStateManagementClient>();

// 保存一个 Widget
var widget = new Widget("medium", "blue");
await client.SaveStateAsync("statestore", "my-widget", widget);

// 读取它
var loaded = await client.GetStateAsync<Widget>("statestore", "my-widget");
Console.WriteLine($"Widget: {loaded?.Size} / {loaded?.Color}");
```

## 删除状态

```csharp
await client.DeleteStateAsync("statestore", "my-widget");
```

## 使用 ETag 的乐观并发控制

使用 `GetStateAndETagAsync` 读取值及其 ETag，然后使用 `TrySaveStateAsync` 或 `TryDeleteStateAsync`，仅当值未发生变化时才有条件地写入：

```csharp
// 读取值及其 ETag
var (existingValue, etag) = await client.GetStateAndETagAsync<Widget>("statestore", "my-widget");

if (etag is not null)
{
    // 修改该值
    var updated = existingValue! with { Color = "green" };

    // 仅当读取之后没有其他人修改它时才保存
    bool saved = await client.TrySaveStateAsync("statestore", "my-widget", updated, etag);
    Console.WriteLine(saved ? "ETag save succeeded." : "ETag mismatch — concurrent modification.");
}
```

删除操作的写法类似：

```csharp
var (_, etag) = await client.GetStateAndETagAsync<Widget>("statestore", "my-widget");

if (etag is not null)
{
    bool deleted = await client.TryDeleteStateAsync("statestore", "my-widget", etag);
    Console.WriteLine(deleted ? "Deleted." : "ETag mismatch.");
}
```

## 批量操作

### 批量保存多个条目

```csharp
await client.SaveBulkStateAsync("statestore", new List<SaveStateItem<Widget>>
{
    new("widget-a", new Widget("small", "red")),
    new("widget-b", new Widget("large", "white")),
});
```

### 批量读取多个条目

```csharp
var bulk = await client.GetBulkStateAsync<Widget>("statestore", new[] { "widget-a", "widget-b" });

foreach (var item in bulk)
{
    Console.WriteLine($"Key={item.Key}, Size={item.Value?.Size}, Color={item.Value?.Color}");
}
```

### 批量删除多个条目

```csharp
await client.DeleteBulkStateAsync("statestore", new List<BulkDeleteStateItem>
{
    new("widget-a"),
    new("widget-b"),
});
```

## 状态事务

在单个事务中原子地执行多个 upsert 与 delete 操作。并非所有状态存储都支持事务，请查阅 [Dapr 文档](https://docs.dapr.io/reference/components-reference/supported-state-stores/)，确认你所用的存储。

```csharp
await client.ExecuteStateTransactionAsync("statestore", new List<StateTransactionRequest>
{
    new("widget-a", null, StateOperationType.Delete),
    new("widget-b", null, StateOperationType.Delete),
});
```

upsert 在 `StateTransactionRequest` 中使用序列化后的字节，而不是通用保存方法那样自动进行对象序列化。请使用相同的序列化器设置：

```csharp
var data = JsonSerializer.SerializeToUtf8Bytes(
    new Widget("small", "blue"), new JsonSerializerOptions(JsonSerializerDefaults.Web));

await client.ExecuteStateTransactionAsync("statestore", new List<StateTransactionRequest>
{
    new("widget-c", data, StateOperationType.Upsert),
    new("widget-d", null, StateOperationType.Delete)
});
```

`StateTransactionRequest` 可以携带每个操作各自的 ETag、选项和元数据。请求级别的元数据则单独传给 `ExecuteStateTransactionAsync`。批量保存不能替代原子事务。

## 状态查询

如果底层状态存储支持查询，你可以使用带 JSON 查询表达式的 `QueryStateAsync`：

```csharp
var query = """
{
    "filter": {
        "EQ": { "color": "blue" }
    },
    "sort": [
        { "key": "size", "order": "ASC" }
    ]
}
""";

var response = await client.QueryStateAsync<Widget>("statestore", query);

foreach (var item in response.Results)
{
    Console.WriteLine($"Key={item.Key}, Size={item.Data?.Size}, Color={item.Data?.Color}");
}
```

> 查询支持取决于状态存储组件。有关查询语法与限制，请参阅 [Dapr 状态存储查询 API 文档](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/)。分页时，请在下一次查询的分页字段中沿用 `response.Token`；不要假设所有结果都能放进一次响应中。

查询字段指的是已存储的 JSON 文档。示例使用客户端默认的 Web JSON 设置，它将 `Widget.Color` 和 `Widget.Size` 序列化为 `color` 与 `size`；请根据你的序列化器及组件的索引要求调整查询。

## 向请求传递元数据

大多数状态管理操作都接受可选的 `metadata` 参数。元数据是由字符串键值对组成的字典，其有效的键与值取决于所用的状态存储组件：

```csharp
var metadata = new Dictionary<string, string>
{
    ["partitionKey"] = "widgets",
};

await client.SaveStateAsync("statestore", "my-widget", widget, metadata: metadata);
var loaded = await client.GetStateAsync<Widget>("statestore", "my-widget", metadata: metadata);
```

## 使用源生成器访问强类型状态存储

为了获得更简洁、更易维护且更易测试的写法，请使用源生成器创建绑定到特定状态存储的强类型接口。这样就不必在代码各处重复书写存储名称字符串。

### 第 1 步：定义接口

创建一个继承自 `IDaprStateStoreClient` 的 `partial interface`，并用 `[StateStore("storeName")]` 为其添加特性标注：

```csharp
using Dapr.StateManagement;

[StateStore("statestore")]
public partial interface IWidgetStore : IDaprStateStoreClient;
```

编译时，源生成器会生成以下内容：
1. 一个 sealed internal 实现类，它把所有 `IDaprStateStoreClient` 调用转发给 `DaprStateManagementClient`，并预先填入存储名称 `"statestore"`。
2. 一个位于 `IDaprStateManagementBuilder` 上的 DI 注册扩展方法，名为 `WithWidgetStore()`（接口名开头的 `I` 会被去掉）。

### 第 2 步：注册强类型存储

将生成的扩展方法链式接在 `AddDaprStateManagementClient()` 之后：

```csharp
builder.Services
    .AddDaprStateManagementClient()
    .WithWidgetStore();
```

### 第 3 步：注入并使用

将 `IWidgetStore` 注入你的服务。所有方法都与 `IDaprStateStoreClient` 保持一致，但省略了 `storeName` 参数：

```csharp
public class WidgetService(IWidgetStore store)
{
    public async Task<Widget?> GetWidgetAsync(string id)
    {
        return await store.GetStateAsync<Widget>(id);
    }

    public async Task SaveWidgetAsync(string id, Widget widget)
    {
        await store.SaveStateAsync(id, widget);
    }

    public async Task<bool> UpdateWidgetAsync(string id, Widget widget)
    {
        var (_, etag) = await store.GetStateAndETagAsync<Widget>(id);
        if (etag is null)
            return false;

        return await store.TrySaveStateAsync(id, widget, etag);
    }
}
```

### 注册多个强类型存储

你可以为不同的 Dapr 状态存储组件定义多个接口，并将它们全部注册：

```csharp
[StateStore("statestore")]
public partial interface IWidgetStore : IDaprStateStoreClient;

[StateStore("cachestore")]
public partial interface ICacheStore : IDaprStateStoreClient;
```

```csharp
builder.Services
    .AddDaprStateManagementClient()
    .WithWidgetStore()
    .WithCacheStore();
```

## 测试

### 使用直接客户端进行测试

由于 `DaprStateManagementClient` 是抽象类，你可以使用任意模拟框架对其进行模拟：

```csharp
var mockClient = new Mock<DaprStateManagementClient>();
mockClient
    .Setup(c => c.GetStateAsync<Widget>(
        "statestore", "my-widget", null, null, default))
    .ReturnsAsync(new Widget("medium", "blue"));

var service = new WidgetService(mockClient.Object);
```

### 使用强类型存储客户端进行测试

由于强类型存储实现了 `IDaprStateStoreClient`，可以直接模拟该接口：

```csharp
var mockStore = new Mock<IWidgetStore>();
mockStore
    .Setup(s => s.GetStateAsync<Widget>("my-widget", null, null, default))
    .ReturnsAsync(new Widget("medium", "blue"));

var service = new WidgetService(mockStore.Object);
```
