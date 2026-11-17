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
 如果尚未尝试，请先试用[Quickstart 之一]({{% ref quickstarts %}})，快速了解如何结合 API building block 使用 Dapr .NET SDK。

{{% /alert %}}

## building block

.NET SDK 允许你与所有 [Dapr building block]({{% ref building-blocks %}}) 进行交互。

{{% alert title="注意" color="primary" %}}

我们只在第一个示例（service invocation）中包含 `DaprClient` 的依赖注入注册。在几乎所有其他示例中，我们假设你已经在应用程序的后续示例中注册了 `DaprClient`，并已将 `DaprClient` 的实例以名为 `client` 的实例注入到代码中。

{{% /alert %}}

### 调用服务

#### HTTP
你可以使用 `DaprClient` 或 `System.Net.Http.HttpClient` 来调用服务。

{{% alert title="注意" color="primary" %}}
 你也可以[使用命名的 `HTTPEndpoint` 或非 Dapr 环境的完全限定域名 URL 调用非 Dapr 端点]({{% ref "howto-invoke-non-dapr-endpoints.md#using-an-httpendpoint-resource-or-fqdn-url-for-non-dapr-endpoints" %}})。

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

```csharp
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
````

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

- 有关 service invocation 的完整指南，请访问[操作指南：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 保存与获取应用状态

```csharp
var state = new Widget() { Size = "small", Color = "yellow", };
await client.SaveStateAsync(storeName, stateKeyName, state, cancellationToken: cancellationToken);
Console.WriteLine("Saved State!");

state = await client.GetStateAsync<Widget>(storeName, stateKeyName, cancellationToken: cancellationToken);
Console.WriteLine($"Got State: {state.Size} {state.Color}");

await client.DeleteStateAsync(storeName, stateKeyName, cancellationToken: cancellationToken);
Console.WriteLine("Deleted State!");
```

### Query State（Alpha）

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

- 有关状态操作的完整列表，请访问[操作指南：获取与保存状态]({{% ref howto-get-save-state.md %}})。

### 发布消息

```csharp
var eventData = new { Id = "17", Amount = 10m, };
await client.PublishEventAsync(pubsubName, "deposit", eventData, cancellationToken);
Console.WriteLine("Published deposit event!");
```

- 有关状态操作的完整列表，请访问[操作指南：发布与订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [.NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Client/PublishSubscribe)，获取 pub/sub 的代码示例与操作说明。

### 与 output binding 交互

调用 `InvokeBindingAsync` 时，你可以自行处理序列化与编码，也可以让 SDK 将数据序列化为 JSON，然后再为你编码为字节。

{{% alert title="重要" color="warning" %}}
不同的 binding 所期望的数据结构各不相同，请特别注意，并确保你发送的数据得到相应处理。如果你同时编写输出与输入，请确保两者遵循相同的序列化约定。
{{% /alert %}}

#### 手动序列化

在大多数场景下，建议使用 `InvokeBindingAsync` 的这一重载，因为它能让你清晰、可控地处理数据。

_本示例中，数据以字符串的 UTF-8 字节表示形式发送。_

```csharp
using var client = new DaprClientBuilder().Build();

var request = new BindingRequest("send-email", "create")
{
    // 注意：这是 Twilio SendGrid binding 的示例负载
    Data = Encoding.UTF8.GetBytes("<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"),
    Metadata =
    {
        { "emailTo", "customer@example.com" },
        { "subject", "An email from Dapr SendGrid binding" },
    },
}
await client.InvokeBindingAsync(request);
```

#### 自动序列化与编码

_本示例中，数据以 UTF-8 编码的字节表示形式发送，其值已序列化为 JSON。_

```csharp
using var client = new DaprClientBuilder().Build();

var email = new 
{
    // 注意：这是 Twilio SendGrid binding 的示例负载
    data =  "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!",
    metadata = new 
    {
        emailTo = "customer@example.com",
        subject = "An email from Dapr SendGrid binding",    
    },
};
await client.InvokeBindingAsync("send-email", "create", email);
```

- 有关 output binding 的完整指南，请访问[操作指南：使用 binding]({{% ref howto-bindings.md %}})。

### 获取 secrets
在获取 secrets 之前，必须先注册并就绪出站通道，否则 SDK 将无法与 Dapr sidecar 进行双向通信。SDK 提供了一个专为此目的而设计的辅助方法，名为 `CheckOutboundHealthAsync`。这里的"出站"并不是指从 SDK 到运行时的出站，而更多是指从 Dapr 运行时回到使用 SDK 的客户端应用程序的出站。

该方法只是连接到 Dapr Health API 中的 {{% ref "health_api#wait-for-specific-health-check-against-outbound-path" %}} 端点，并根据返回的 HTTP 状态码判断运行时所报告的该端点的健康状况。

需要注意的是，此方法与 `WaitForSidecarAsync` 的操作几乎相同；`WaitForSidecarAsync` 会无限期轮询 `CheckOutboundHealthAsync` 端点，直到其返回健康状态值为止。它们仅适用于 secrets 或配置获取等场景。在其他场景中使用它们会导致非预期的行为（例如，由于没有注册使用"出站"通道的 component，该端点将永远无法就绪）。

此行为将在未来版本中更改，应谨慎依赖。

{{< tabpane text=true >}}

{{% tab header="多值 secrets" %}}

```csharp
// 从 DI 中获取 DaprClient 的实例
var client = scope.GetRequiredService<DaprClient>();

// 等待出站通道建立 - 仅用于此场景，不建议普遍使用
await client.WaitForOutboundHealthAsync();

// 获取基于键值对的 secrets - 返回 Dictionary<string, string>
var secrets = await client.GetSecretAsync("mysecretstore", "key-value-pair-secret");
Console.WriteLine($"Got secret keys: {string.Join(", ", secrets.Keys)}");
```

{{% /tab %}}

{{% tab header="单值 secrets" %}}

```csharp
// 从 DI 中获取 DaprClient 的实例
var client = scope.GetRequiredService<DaprClient>();

// 等待出站通道建立 - 仅用于此场景，不建议普遍使用
await client.WaitForOutboundHealthAsync();

// 获取基于键值对的 secrets - 返回 Dictionary<string, string>
var secrets = await client.GetSecretAsync("mysecretstore", "key-value-pair-secret");
Console.WriteLine($"Got secret keys: {string.Join(", ", secrets.Keys)}");

// 获取单值 secrets - 返回 Dictionary<string, string>，
// 其中包含一个值，并以 secrets 名称作为键
var data = await client.GetSecretAsync("mysecretstore", "single-value-secret");
var value = data["single-value-secret"]
Console.WriteLine("Got a secret value, I'm not going to be print it, it's a secret!");
```

{{% /tab %}}

{{< /tabpane >}}

- 有关 secrets 的完整指南，请访问[操作指南：获取 secrets]({{% ref howto-secrets.md %}})。

### 获取配置键
```csharp
// 获取指定的一组键。
var specificItems = await client.GetConfiguration("configstore", new List<string>() { "key1", "key2" });
Console.WriteLine($"Here are my values:\n{specificItems[0].Key} -> {specificItems[0].Value}\n{specificItems[1].Key} -> {specificItems[1].Value}");

// 通过提供空列表获取所有配置项。
var specificItems = await client.GetConfiguration("configstore", new List<string>());
Console.WriteLine($"I got {configItems.Count} entires!");
foreach (var item in configItems)
{
    Console.WriteLine($"{item.Key} -> {item.Value}")
}
```

### 订阅配置键
```csharp
// Subscribe Configuration API 返回一个包装器，其内部为 IAsyncEnumerable<IEnumerable<ConfigurationItem>>。
// 通过在 foreach 循环中访问其 Source 进行迭代。当流被中断或取消令牌被取消时，循环将结束。
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
        [Obsolete("Distributed Lock API is in Alpha, this can be removed once it is stable.")]
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
     
            // 以这种方式加锁时，由于该对象是可释放的，会自动解锁
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

#### 解锁已存在的锁

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

## sidecar API
### sidecar 健康检查
虽然 .NET SDK 提供了轮询 sidecar 健康状况的方法，但通常不建议开发者使用此功能，除非他们明确地使用 Dapr 来获取 secrets 或配置值。

提供了两个方法：
- `CheckOutboundHealthAsync`：查询 Dapr Health API 中的出站就绪端点 {{% ref "health_api#wait-for-specific-health-check-against-outbound-path" %}}，
并根据成功的 HTTP 状态码报告就绪状态。
- `WaitForSidecarAsync`：持续轮询 `CheckOutboundHealthAsync`，直到其返回成功的状态码。

"出站"方向是指从 Dapr 运行时到你的应用程序的出站通信。如果你的应用程序不使用 Actor、secrets 管理、配置获取或 workflow，运行时将不会尝试建立出站连接。这意味着，如果你的应用程序依赖 `WaitForSidecarAsync` 却没有使用上述任何 Dapr component，它将在启动期间无限期挂起，因为该端点永远不会建立。

未来版本将彻底移除这些方法，并将其改为 SDK 内部操作，因此通常不应依赖这两个方法。如需进一步确认你的场景是否需要使用它们，请到 Discord 的 #dotnet-sdk 频道咨询；但在大多数情况下，不需要使用这些方法。


### 关闭 sidecar
```csharp
var client = new DaprClientBuilder().Build();
await client.ShutdownSidecarAsync();
```

## 相关链接
- [.NET SDK 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples)
