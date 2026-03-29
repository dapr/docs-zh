---
type: docs
title: "Dapr 客户端 .NET SDK 入门"
linkTitle: "Client"
weight: 20000
description: 如何开始使用 Dapr .NET SDK
no_list: true
---

Dapr 客户端包允许你从 .NET 应用程序与其他 Dapr 应用程序进行交互。

{{% alert title="注意" color="primary" %}}
 如果尚未尝试，请尝试[快速入门之一]({{% ref quickstarts %}})，快速了解如何使用 API 构建块结合 Dapr .NET SDK。

{{% /alert %}}


## 构建块

.NET SDK 允许你与所有 [Dapr 构建块]({{% ref building-blocks %}}) 进行交互。

{{% alert title="注意" color="primary" %}}

我们只会在第一个示例（服务调用）中包含 `DaprClient` 的依赖注入注册。在几乎所有其他示例中，我们假设你已经在后续示例的应用程序中注册了 `DaprClient`，并且已将 `DaprClient` 的实例作为名为 `client` 的实例注入到代码中。

{{% /alert %}}

### 调用服务

#### HTTP
你可以使用 `DaprClient` 或 `System.Net.Http.HttpClient` 来调用服务。

{{% alert title="注意" color="primary" %}}
 你也可以[使用命名的 `HTTPEndpoint` 或非 Dapr 环境的 FQDN URL 调用非 Dapr 端点]({{% ref "howto-invoke-non-dapr-endpoints.md#using-an-httpendpoint-resource-or-fqdn-url-for-non-dapr-endpoints" %}})。

{{% /alert %}}


{{< tabpane text=true >}}

{{% tab header="ASP.NET Core 项目" %}}
```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

using var scope = app.Services.CreateScope();
var client = scope.ServiceProvider.GetRequiredService<DaprClient>();
 
// 调用名为 "deposit" 的 POST 方法，该方法接受类型为 "Transaction" 的输入
var data = new { id = "17", amount = 99m };
var account = await client.InvokeMethodAsync<Account>("routing", "deposit", data, cancellationToken);
Console.WriteLine("Returned: id:{0} | Balance:{1}", account.Id, account.Balance);
```
{{% /tab %}}

{{% tab header="控制台项目" %}}
using Microsoft.Extensins.Hosting;
using Microsoft.Extensions.DependencyInjection;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

using var scope = app.Services.CreateScope();
var client = scope.ServiceProvider.GetRequiredService<DaprClient>();

// 调用名为 "deposit" 的 POST 方法，该方法接受类型为 "Transaction" 的输入
var data = new { id = "17", amount = 99m };
var account = await client.InvokeMethodAsync<Account>("routing", "deposit", data, cancellationToken);
Console.WriteLine("Returned: id:{0} | Balance:{1}", account.Id, account.Balance);
{{% /tab %}}

{{% tab header="HTTP" %}}
```csharp
var client = DaprClient.CreateInvokeHttpClient(appId: "routing");

// 在 HTTP 客户端上设置超时：
client.Timeout = TimeSpan.FromSeconds(2);

var deposit = new Transaction  { Id = "17", Amount = 99m };
var response = await client.PostAsJsonAsync("/deposit", deposit, cancellationToken);
var account = await response.Content.ReadFromJsonAsync<Account>(cancellationToken: cancellationToken);
Console.WriteLine("Returned: id:{0} | Balance:{1}", account.Id, account.Balance);
```
{{% /tab %}}
{{< /tabpane >}}

#### gRPC
你可以使用 `DaprClient` 通过 gRPC 调用服务。

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));
var invoker = DaprClient.CreateInvocationInvoker(appId: myAppId, daprEndpoint: serviceEndpoint);
var client = new MyService.MyServiceClient(invoker);

var options = new CallOptions(cancellationToken: cts.Token, deadline: DateTime.UtcNow.AddSeconds(1));
await client.MyMethodAsync(new Empty(), options);

Assert.Equal(StatusCode.DeadlineExceeded, ex.StatusCode);
```

- 有关服务调用的完整指南，请访问[操作指南：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 保存和获取应用程序状态

```csharp
var state = new Widget() { Size = "small", Color = "yellow", };
await client.SaveStateAsync(storeName, stateKeyName, state, cancellationToken: cancellationToken);
Console.WriteLine("Saved State!");

state = await client.GetStateAsync<Widget>(storeName, stateKeyName, cancellationToken: cancellationToken);
Console.WriteLine($"Got State: {state.Size} {state.Color}");

await client.DeleteStateAsync(storeName, stateKeyName, cancellationToken: cancellationToken);
Console.WriteLine("Deleted State!");
```

### 查询状态（Alpha）

```csharp
var query = "{" +
                "\"filter\": {" +
                    "\"EQ\": { \"value.Id\": \"1\" }" +
                "}," +
                "\"sort\": [" +
                    "{" +
                        "\"key\": \"value.Balance\"," +
                        "\"order\": \"DESC\"" +
                    "}" +
                "]" +
            "}";
var queryResponse = await client.QueryStateAsync<Account>("querystore", query, cancellationToken: cancellationToken);

Console.WriteLine($"Got {queryResponse.Results.Count}");
foreach (var account in queryResponse.Results)
{
    Console.WriteLine($"Account: {account.Data.Id} has {account.Data.Balance}");
}
```

- 有关状态操作的完整列表，请访问[操作指南：获取和保存状态]({{% ref howto-get-save-state.md %}})。

### 发布消息

```csharp
var eventData = new { Id = "17", Amount = 10m, };
await client.PublishEventAsync(pubsubName, "deposit", eventData, cancellationToken);
Console.WriteLine("Published deposit event!");
```

- 有关状态操作的完整列表，请访问[操作指南：发布和订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [.NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Client/PublishSubscribe) 获取代码示例和试用发布订阅的说明

### 与输出绑定交互

调用 `InvokeBindingAsync` 时，你可以选择自己处理序列化和编码，或者让 SDK 为你将其序列化为 JSON 然后编码为字节。

{{% alert title="重要" color="warning" %}}
绑定所期望的数据形状各不相同，请特别注意并确保你发送的数据得到相应处理。如果你正在编写输出和输入，请确保它们都遵循相同的序列化约定。
{{% /alert %}}

#### 手动序列化

对于大多数场景，建议使用 `InvokeBindingAsync` 的此重载，因为它为你提供了清晰度和对数据处理方式的控制。

_在此示例中，数据作为字符串的 UTF-8 字节表示发送。_

```csharp
using var client = new DaprClientBuilder().Build();

var request = new BindingRequest("send-email", "create")
{
    // 注意：这是 Twilio SendGrid 绑定的示例负载 
    Data = Encoding.UTF8.GetBytes("<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"),
    Metadata =
    {
        { "emailTo", "customer@example.com" },
        { "subject", "An email from Dapr SendGrid binding" },
    },
}
await client.InvokeBindingAsync(request);
```

#### 自动序列化和编码

_在此示例中，数据作为序列化为 JSON 的值的 UTF-8 编码字节表示发送。_

```csharp
using var client = new DaprClientBuilder().Build();

var email = new 
{
    // 注意：这是 Twilio SendGrid 绑定的示例负载 
    data =  "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!",
    metadata = new 
    {
        emailTo = "customer@example.com",
        subject = "An email from Dapr SendGrid binding",    
    },
};
await client.InvokeBindingAsync("send-email", "create", email);
```

- 有关输出绑定的完整指南，请访问[操作指南：使用绑定]({{% ref howto-bindings.md %}})。

### 检索机密
在检索机密之前，重要的是确保出站通道已注册并准备就绪，否则 SDK 将无法与 Dapr 边车进行双向通信。SDK 提供了一个用于此目的的辅助方法，称为 `CheckOutboundHealthAsync`。这不是指从 SDK 到运行时的出站，而是指从 Dapr 运行时回到使用 SDK 的客户端应用程序的出站。

此方法只是打开到 {{% ref "health_api#wait-for-specific-health-check-against-outbound-path" %}}
Dapr Health API 中的端点的连接，并评估返回的 HTTP 状态码以确定运行时报告的端点的健康状况。

重要的是要注意，`WaitForSidecarAsync` 方法和此方法执行几乎相同的操作；`WaitForSidecarAsync`
无限期轮询 `CheckOutboundHealthAsync` 端点，直到它返回健康状态值。它们仅用于机密或配置检索等情况。在其他场景中使用它们会导致意外行为（例如，端点永远无法准备就绪，因为没有注册使用"出站"通道的组件）。

此行为将在未来版本中更改，应谨慎依赖。


{{< tabpane text=true >}}

{{% tab header="多值机密" %}}

```csharp
// 从 DI 获取 DaprClient 实例
var client = scope.GetRequiredService<DaprClient>();

// 等待出站通道建立 - 仅用于此场景，而非一般用途
await client.WaitForOutboundHealthAsync();

// 检索基于键值对的机密 - 返回 Dictionary<string, string>
var secrets = await client.GetSecretAsync("mysecretstore", "key-value-pair-secret");
Console.WriteLine($"Got secret keys: {string.Join(", ", secrets.Keys)}");
```

{{% /tab %}}

{{% tab header="单值机密" %}}

```csharp
// 从 DI 获取 DaprClient 实例
var client = scope.GetRequiredService<DaprClient>();

// 等待出站通道建立 - 仅用于此场景，而非一般用途
await client.WaitForOutboundHealthAsync();

// 检索基于键值对的机密 - 返回 Dictionary<string, string>
var secrets = await client.GetSecretAsync("mysecretstore", "key-value-pair-secret");
Console.WriteLine($"Got secret keys: {string.Join(", ", secrets.Keys)}");

// 检索单值机密 - 返回 Dictionary<string, string>
// 包含一个以机密名称为键的单个值
var data = await client.GetSecretAsync("mysecretstore", "single-value-secret");
var value = data["single-value-secret"]
Console.WriteLine("Got a secret value, I'm not going to be print it, it's a secret!");
```

{{% /tab %}}

{{< /tabpane >}}

- 有关机密的完整指南，请访问[操作指南：检索机密]({{% ref howto-secrets.md %}})。

### 获取配置键
```csharp
// 检索特定键集。
var specificItems = await client.GetConfiguration("configstore", new List<string>() { "key1", "key2" });
Console.WriteLine($"Here are my values:\n{specificItems[0].Key} -> {specificItems[0].Value}\n{specificItems[1].Key} -> {specificItems[1].Value}");

// 通过提供空列表检索所有配置项。
var specificItems = await client.GetConfiguration("configstore", new List<string>());
Console.WriteLine($"I got {configItems.Count} entires!");
foreach (var item in configItems)
{
    Console.WriteLine($"{item.Key} -> {item.Value}")
}
```

### 订阅配置键
```csharp
// 订阅配置 API 返回 IAsyncEnumerable<IEnumerable<ConfigurationItem>> 的包装器。
// 通过在 foreach 循环中访问其 Source 来迭代它。当流被中断
// 或取消令牌被取消时，循环将结束。
var subscribeConfigurationResponse = await daprClient.SubscribeConfiguration(store, keys, metadata, cts.Token);
await foreach (var items in subscribeConfigurationResponse.Source.WithCancellation(cts.Token))
{
    foreach (var item in items)
    {
        Console.WriteLine($"{item.Key} -> {item.Value}")
    }
}
```

### 分布式锁（Alpha）

#### 获取锁

```csharp
using System;
using Dapr.Client;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace LockService
{
    class Program
    {
        [Obsolete("Distributed Lock API is in Alpha, this can be removed once it's stable.")]
        static async Task Main(string[] args)
        {
            const string daprLockName = "lockstore";
            const string fileName = "my_file_name";
            
            var builder = Host.CreateDefaultBuilder();
            builder.ConfigureServices(services =>
            {
                services.AddDaprClient();
            });
            var app = builder.Build();
            
            using var scope = app.Services.CreateScope();
            var client = scope.ServiceProvider.GetRequiredService<DaprClient>();
     
            // 使用此方法锁定也会自动解锁它，因为这是一个可释放对象
            await using (var fileLock = await client.Lock(DAPR_LOCK_NAME, fileName, "random_id_abc123", 60))
            {
                if (fileLock.Success)
                {
                    Console.WriteLine("Success");
                }
                else
                {
                    Console.WriteLine($"Failed to lock {fileName}.");
                }
            }
        }
    }
}
```

#### 解锁现有锁

```csharp
using System;
using Dapr.Client;

namespace LockService
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var daprLockName = "lockstore";
            
            var builder = Host.CreateDefaultBuilder();
            builder.ConfigureServices(services =>
            {
                services.AddDaprClient();
            });
            var app = builder.Build();
            
            using var scope = app.Services.CreateScope();
            var client = scope.ServiceProvider.GetRequiredService<DaprClient>();
            
            var response = await client.Unlock(DAPR_LOCK_NAME, "my_file_name", "random_id_abc123"));
            Console.WriteLine(response.status);
        }
    }
}
```

## 边车 API
### 边车健康检查
虽然 .NET SDK 提供了一种轮询边车健康状态的方法，但通常不建议开发人员使用此功能，除非他们明确使用 Dapr 来检索机密或配置值。

有两种方法可用：
- `CheckOutboundHealthAsync` 查询 Dapr Health API {{% ref "health_api#wait-for-specific-health-check-against-outbound-path" %}}
中的出站就绪端点，以获取成功的 HTTP 状态码并基于此值报告就绪状态。
- `WaitForSidecarAsync` 持续轮询 `CheckOutboundHealthAsync` 直到它返回成功的状态码。

"出站"方向是指从 Dapr 运行时到你的应用程序的出站通信。如果你的应用程序不使用 Actors、机密管理、配置检索或工作流，运行时将不会尝试创建出站连接。这意味着如果你的应用程序依赖于 `WaitForSidecarAsync` 而不使用任何这些 Dapr 组件，它将在启动期间无限期锁定，因为永远不会建立端点。

未来的版本将完全删除这些方法，并将其作为内部 SDK 操作执行，因此一般不应依赖任何一种方法。请在 Discord #dotnet-sdk 频道中联系以获取更多说明，了解你的场景是否可能需要使用此功能，但在大多数情况下，不应需要这些方法。


### 关闭边车
```csharp
var client = new DaprClientBuilder().Build();
await client.ShutdownSidecarAsync();
```

## 相关链接
- [.NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples)
