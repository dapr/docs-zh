---
type: docs
title: "操作指南：使用 Dapr 机密管理 .NET SDK 管理机密"
linkTitle: "操作指南：管理机密"
weight: 52050
description: 了解如何使用 Dapr 机密管理 .NET SDK 获取和管理机密
---

本文将介绍如何使用 `Dapr.SecretsManagement` 包从 Dapr 机密存储中获取机密。下面的演示使用[此处提供的示例项目](https://github.com/dapr/dotnet-sdk/tree/master/examples/SecretManagement)，涵盖直接获取单个机密、批量获取机密，以及通过所包含的源生成器实现的强类型访问。在本指南中，你将：

- 部署一个 .NET Web API 应用（[SecretManagementSample](https://github.com/dapr/dotnet-sdk/tree/master/examples/SecretManagement/SecretManagementSample)）
- 使用 Dapr .NET 机密管理 SDK 获取单个机密和批量机密
- 使用源生成器为机密存储创建强类型接口

在 .NET 示例项目中：
- 主程序 [`Program.cs`](https://github.com/dapr/dotnet-sdk/tree/master/examples/SecretManagement/SecretManagementSample/Program.cs) 包含全部三种用法。
- [`IMyVaultSecrets.cs`](https://github.com/dapr/dotnet-sdk/tree/master/examples/SecretManagement/SecretManagementSample/IMyVaultSecrets.cs) 文件演示了强类型的机密存储接口。

## 前提条件

这些示例面向 SDK `1.19.0` 或更高版本。这是一个只读 API：SDK 不提供在 Dapr 机密存储中创建、轮换、更新、删除或监视机密的操作。

- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 已将 [Dapr.SecretsManagement](https://www.nuget.org/packages/Dapr.SecretsManagement) NuGet 包安装到你的项目中

## 设置环境

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。这两个版本都将在 Dapr v1.20 中停止支持；到 2027 年底前，仅支持 .NET 10 和 .NET 11。
{{% /alert %}}

克隆 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk)。

```sh
git clone https://github.com/dapr/dotnet-sdk.git
```

在 .NET SDK 根目录中，进入 Dapr 机密管理示例目录。

```sh
cd examples/SecretManagement
```

## 在本地运行应用

要运行该 Dapr 应用，需要同时启动 .NET 程序和 Dapr 边车。进入 `SecretManagementSample` 目录。

```sh
cd SecretManagementSample
```

下面的命令会同时启动 Dapr 边车和 .NET 程序。

```sh
dapr run --app-id secretsapp --app-port 6543 --dapr-grpc-port 4001 --dapr-http-port 3500 -- dotnet run
```

> Dapr 在 `http://localhost:3500` 上监听 HTTP 请求，在 `http://localhost:4001` 上监听内部 gRPC 请求。

## 通过依赖注入注册 Dapr 机密管理客户端
Dapr 机密管理 SDK 提供了一个扩展方法，用于简化客户端的注册。在完成 `Program.cs` 中的依赖注入注册之前，添加以下代码行：

```cs
var builder = WebApplication.CreateBuilder(args);

//在这两行之间的任意位置添加
builder.Services.AddDaprSecretsManagementClient();

var app = builder.Build();
```

为客户端导入 `Dapr.SecretsManagement`，为注册导入 `Dapr.SecretsManagement.Extensions`。

你可能需要为客户端提供一些配置选项，这些选项需要在每次调用边车时都带上，例如 Dapr API 令牌，或非标准的 HTTP 或 gRPC 端点。为此，可以使用注册方法的一个重载，它允许配置 `DaprSecretsManagementClientBuilder` 实例：

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprSecretsManagementClient((_, daprSecretsClientBuilder) =>
{
    daprSecretsClientBuilder.UseDaprApiToken("abc123");
    daprSecretsClientBuilder.UseHttpEndpoint("http://localhost:8512"); //非标准的边车 HTTP 端点
});

var app = builder.Build();
```

不过，你想注入的值也可能需要从其他来源获取，而该来源本身也已注册为依赖项。还有一个重载可以把 `IServiceProvider` 注入到配置方法中。在下面的示例中，我们注册了一个虚构的单例，它可以从某处获取配置值，并将其传入 `AddDaprSecretsManagementClient` 的配置方法，以便在此处从其他地方获取 Dapr API 令牌用于注册：

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SecretRetriever>();
builder.Services.AddDaprSecretsManagementClient((serviceProvider, daprSecretsClientBuilder) =>
{
    var secretRetriever = serviceProvider.GetRequiredService<SecretRetriever>();
    var daprApiToken = secretRetriever.GetSecret("DaprApiToken").Value;
    daprSecretsClientBuilder.UseDaprApiToken(daprApiToken);

    daprSecretsClientBuilder.UseHttpEndpoint("http://localhost:8512");
});

var app = builder.Build();
```

## 使用 IConfiguration 配置 Dapr 机密管理客户端

你也可以使用已注册的 `IConfiguration` 来配置 Dapr 机密管理客户端，而无需像上一节那样通过 `DaprSecretsManagementClientBuilder` 显式指定每一项覆盖值。具体做法是：通过依赖注入提供的 `IConfiguration` 中填入相应的值，`AddDaprSecretsManagementClient()` 注册时会自动使用这些值来替代默认值。

首先，在配置中填入这些值。可以通过以下几种不同的方式完成，如下所示。

### 通过 `ConfigurationBuilder` 配置

无需使用配置源，也可以通过 `ConfigurationBuilder` 实例将值填充到内存中：

```csharp
var builder = WebApplication.CreateBuilder();

//创建配置
var configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string> {
            { "DAPR_HTTP_ENDPOINT", "http://localhost:54321" },
            { "DAPR_API_TOKEN", "abc123" }
        })
    .Build();

builder.Configuration.AddConfiguration(configuration);
builder.Services.AddDaprSecretsManagementClient(); //此处会自动从 IConfiguration 中填充 HTTP 和 gRPC 端点以及 API 令牌的值
```

### 通过环境变量配置

应用设置可以从应用程序可用的环境变量中读取。

以下环境变量将用于填充注册 Dapr 机密管理客户端时所用的 HTTP 端点和 API 令牌。

| 键 | 值 |
| --- | --- |
| DAPR_HTTP_ENDPOINT | http://localhost:54321 |
| DAPR_API_TOKEN | abc123 |

```csharp
var builder = WebApplication.CreateBuilder();

builder.Configuration.AddEnvironmentVariables();
builder.Services.AddDaprSecretsManagementClient();
```

Dapr 机密管理客户端将配置为使用 HTTP 端点 `http://localhost:54321`，并在所有出站请求中携带值为 `abc123` 的 API 令牌请求头。

## 获取单个机密

要从 Dapr 机密存储中获取单个机密，请使用 `DaprSecretsManagementClient` 上的 `GetSecretAsync` 方法。该方法接受机密存储组件的名称、机密键，以及可选的元数据字典。

```cs
app.MapGet("/secrets/{storeName}/{key}", async (
    string storeName,
    string key,
    DaprSecretsManagementClient secretsClient,
    CancellationToken cancellationToken) =>
{
    var secret = await secretsClient.GetSecretAsync(storeName, key, cancellationToken: cancellationToken);
    return Results.Ok(secret);
});
```

返回结果是一个 `IReadOnlyDictionary<string, string>`。某些机密存储（例如 Kubernetes）可以为每个键存储多个值，字典中的每个条目代表其中的一个值。

## 批量获取机密

要获取应用有权访问的机密存储中的全部机密，请使用 `GetBulkSecretAsync` 方法：

```cs
app.MapGet("/secrets/{storeName}", async (
    string storeName,
    DaprSecretsManagementClient secretsClient,
    CancellationToken cancellationToken) =>
{
    var secrets = await secretsClient.GetBulkSecretAsync(storeName, cancellationToken: cancellationToken);
    return Results.Ok(secrets);
});
```

返回结果是嵌套的 `IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>>`。外层键为机密名称；内层字典包含一个或多个键值对，表示该机密的数据。

## 传递元数据

`GetSecretAsync` 和 `GetBulkSecretAsync` 都接受可选的 `metadata` 参数。它允许你向机密存储组件传递额外的上下文。有效的元数据键和值由所使用的机密存储类型决定。

```cs
var metadata = new Dictionary<string, string>
{
    { "version", "2" }
};

var secret = await secretsClient.GetSecretAsync("my-vault", "db-password", metadata: metadata);
```

## 使用源生成器实现强类型机密

`Dapr.SecretsManagement` 包包含一个增量源生成器，它可以通过简单的接口定义生成对机密存储的强类型访问。这样就无需在整个代码库中到处传递存储名称和键字符串。

### 定义强类型机密存储接口

创建一个标注了 `[SecretStore]` 特性的 `partial interface`，并在该特性中指定 Dapr 机密存储组件的名称。每个属性对应一个机密键。

```cs
using Dapr.SecretsManagement.Abstractions;

[SecretStore("my-vault")]
public partial interface IMyVaultSecrets
{
    [Secret("db-connection-string")]
    string DatabaseConnection { get; }

    string ApiKey { get; } // 使用属性名 "ApiKey" 作为机密键
}
```

`[Secret]` 特性是可选的。应用该特性时，会将机密键覆盖为指定的值；省略时，则使用属性名作为机密键。

### 注册强类型机密存储

源生成器会生成一个依赖注入（DI）注册扩展方法，其名称与你的接口相对应（例如 `AddMyVaultSecrets()`）。将它链接在 `AddDaprSecretsManagementClient()` 之后即可：

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprSecretsManagementClient()
    .AddMyVaultSecrets();

var app = builder.Build();
```

### 工作原理

源生成器会生成以下内容：

1. 接口的具体实现类，它基于 `DaprSecretsManagementClient.GetBulkSecretAsync` 实现。
2. 一个 `IHostedService`，在应用启动时预加载所有已映射的机密。
3. 在 `IDaprSecretsManagementBuilder` 上定义的强类型依赖注入注册扩展方法。

由于机密在启动时批量加载，属性是同步的，宿主启动后即可立即使用，调用方无需处理异步流程。

### 使用强类型机密

完成注册后，即可通过标准依赖注入在任何地方注入该接口：

```cs
app.MapGet("/do-something", (IMyVaultSecrets secrets, IOtherSvc svc) =>
{
    var svcInstance = svc.Build(secrets.ApiKey);
    return svcInstance.DoSomething();
});
```

## 测试你的应用

### 使用直接 API 进行单元测试

`DaprSecretsManagementClient` 是抽象类，但没有无参构造函数。创建测试替身时，需要提供其 gRPC 客户端和 HTTP 客户端构造依赖项。或者，也可以把直接访问隔离在应用自己定义的接口之后。对于大多数使用方测试而言，下面这种生成的属性接口是更简单的切入点。

### 使用源生成器进行单元测试

生成的实现包装了一个仅含只读属性的普通接口，因此可以直接对其进行模拟（mock）：

```cs
var mockSecrets = new Mock<IMyVaultSecrets>();
mockSecrets.Setup(s => s.DatabaseConnection).Returns("Server=localhost;...");
mockSecrets.Setup(s => s.ApiKey).Returns("my-api-key");
```

### 集成测试

对于集成测试，请通过 `AddDaprSecretsManagementClient()` 进行注册，并将构建器配置为指向真实或测试用的边车。生成的 `IHostedService` 会使用真实客户端在启动时预加载机密，从而测试完整的端到端流程。
