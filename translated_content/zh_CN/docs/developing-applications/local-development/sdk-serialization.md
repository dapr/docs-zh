---
type: docs
title: "Dapr SDK 中的序列化"
linkTitle: "SDK 序列化"
description: "Dapr 如何在 SDK 内序列化数据"
weight: 400
aliases:
  - '/zh-hans/developing-applications/sdks/serialization/'
---

Dapr SDK 为两种用例提供序列化。首先，是通过请求和响应负载发送的 API 对象。其次，是需要持久化的对象。对于这两种情况，每种语言 SDK 都提供了默认的序列化方法。

| Language SDK                 | 默认序列化器                                                                                                                                                                                                                                          |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [.NET]({{% ref dotnet %}}) | 对于远程 actor 使用 [DataContracts](https://learn.microsoft.com/dotnet/framework/wcf/feature-details/using-data-contracts)，其他情况使用 [System.Text.Json](https://www.nuget.org/packages/System.Text.Json)。了解更多关于 .NET 序列化的信息 [here]({{% ref dotnet-actors-serialization %}}) |                                               |
| [Java]({{% ref java %}})   | 用于 JSON 序列化的 [DefaultObjectSerializer](https://dapr.github.io/java-sdk/io/dapr/serializer/DefaultObjectSerializer.html)                                                                                                                           |
| [JavaScript]({{% ref js %}}) | JSON                                                                                                                                                                                                                                                        |

## 服务调用

{{< tabpane text=true >}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
    using var client = (new DaprClientBuilder()).Build();
    await client.InvokeMethodAsync("myappid", "saySomething", "My Message");
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

```java
    DaprClient client = (new DaprClientBuilder()).build();
    client.invokeMethod("myappid", "saySomething", "My Message", HttpExtension.POST).block();
```

{{% /tab %}}

{{< /tabpane >}}

在上面的示例中，应用 `myappid` 接收到一个 `saySomething` 方法的 `POST` 请求，请求负载为 `"My Message"` — 由于序列化器会将输入的 String 序列化为 JSON，所以它被引号包裹。

```text
POST /saySomething HTTP/1.1
Host: localhost
Content-Type: text/plain
Content-Length: 12

"My Message"
```

## 状态管理

{{< tabpane text=true >}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
    using var client = (new DaprClientBuilder()).Build();
    var state = new Dictionary<string, string>
    {
      { "key": "MyKey" },
      { "value": "My Message" }
    };
    await client.SaveStateAsync("MyStateStore", "MyKey", state);
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

```java
    DaprClient client = (new DaprClientBuilder()).build();
    client.saveState("MyStateStore", "MyKey", "My Message").block();
```

在此示例中，`My Message` 被保存。它没有被引号包裹，因为 Dapr 的 API 在保存前会在内部解析 JSON 请求对象。

{{% /tab %}}

{{< /tabpane >}}

在此示例中，`My Message` 被保存。它没有被引号包裹，因为 Dapr 的 API 在发送前会在内部序列化字符串。

## 发布订阅

{{< tabpane text=true >}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
    using var client = (new DaprClientBuilder()).Build();
    await client.PublishEventAsync("MyPubSubName", "TopicName", "My Message");
```

事件被发布，内容被序列化为 `byte[]` 并发送到 Dapr 边车。订阅者将其作为 [CloudEvent](https://github.com/cloudevents/spec) 接收。Cloud 事件将 `data` 定义为字符串。Dapr SDK 也为 `CloudEvent` 对象提供了内置的反序列化器。

```csharp
public async Task<IActionResult> HandleMessage(string message) 
{
  //ASP.NET Core 自动将 UTF-8 编码的字节反序列化为字符串
  return new Ok();
}
```

或者

```csharp
app.MapPost("/TopicName", [Topic("MyPubSubName", "TopicName")] (string message) => {
  return Results.Ok();
}
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

```java
  DaprClient client = (new DaprClientBuilder()).build();
  client.publishEvent("TopicName", "My Message").block();
```

事件被发布，内容被序列化为 `byte[]` 并发送到 Dapr 边车。订阅者将其作为 [CloudEvent](https://github.com/cloudevents/spec) 接收。Cloud 事件将 `data` 定义为 String。Dapr SDK 也为 `CloudEvent` 对象提供了内置的反序列化器。

```java
  @PostMapping(path = "/TopicName")
  public void handleMessage(@RequestBody(required = false) byte[] body) {
      // Dapr 的事件符合 CloudEvent 规范
      CloudEvent event = CloudEvent.deserialize(body);
  }
```

{{% /tab %}}

{{< /tabpane >}}

## 绑定

对于输出绑定，对象被序列化为 `byte[]`，而输入绑定按原样接收原始 `byte[]` 并将其反序列化为预期的对象类型。

{{< tabpane text=true >}}

<!-- .NET -->
{{% tab ".NET" %}}

* 输出绑定：
```csharp
    using var client = (new DaprClientBuilder()).Build();
    await client.InvokeBindingAsync("sample", "My Message");
```

* 输入绑定（控制器）：
```csharp
  [ApiController]
  public class SampleController : ControllerBase
  {
    [HttpPost("propagate")]
    public ActionResult<string> GetValue([FromBody] int itemId)
    {
      Console.WriteLine($"Received message:  {itemId}");
      return $"itemID:{itemId}";
    }
  }
 ```
  
* 输入绑定（最小 API）：
```csharp
app.MapPost("value", ([FromBody] int itemId) =>
{
  Console.WriteLine($"Received message: {itemId}");
  return ${itemID:{itemId}";
});
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

* 输出绑定：
```java
    DaprClient client = (new DaprClientBuilder()).build();
    client.invokeBinding("sample", "My Message").block();
```

* 输入绑定：
```java
  @PostMapping(path = "/sample")
  public void handleInputBinding(@RequestBody(required = false) byte[] body) {
      String message = (new DefaultObjectSerializer()).deserialize(body, String.class);
      System.out.println(message);
  }
```

{{% /tab %}}

{{< /tabpane >}}

它应该打印：
```
My Message
```

## Actor 方法调用
Actor 方法调用的对象序列化和反序列化与服务方法调用的方式相同，唯一的区别是应用不需要反序列化请求或序列化响应，因为这一切都由 SDK 透明地完成。

对于 Actor 方法，SDK 仅支持具有零个或一个参数的方法。

{{< tabpane text=true >}}

根据您使用的是强类型还是弱类型客户端，.NET SDK 提供了不同的序列化选项：强类型客户端使用 DataContracts，而弱类型客户端可以选择 DataContracts 或 System.Text.JSON。您可以参考 [本文档]({{% ref dotnet-actors-serialization %}}) 了解各种序列化方式之间的差异和需要注意的细节。

<!-- .NET -->
{{% tab ".NET" %}}

* 使用弱类型客户端和 System.Text.JSON 调用 Actor 的方法：
```csharp
    var proxy = this.ProxyFactory.Create(ActorId.CreateRandom(), "DemoActor");
    await proxy.SayAsync("My message");
```

* 实现 Actor 的方法：
```csharp
public Task SayAsync(string message) 
{
    Console.WriteLine(message);
    return Task.CompletedTask;
}
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

* 调用 Actor 的方法：
```java
public static void main() {
    ActorProxyBuilder builder = new ActorProxyBuilder("DemoActor");
    String result = actor.invokeActorMethod("say", "My Message", String.class).block();
}
```

* 实现 Actor 的方法：
```java
public String say(String something) {
  System.out.println(something);
  return "OK";
}
```

{{% /tab %}}

{{< /tabpane >}}

它应该打印：
```
    My Message
```

## Actor 的状态管理
Actor 也可以具有状态。在这种情况下，状态管理器将使用状态序列化器对对象进行序列化和反序列化，并对应用透明地处理这些操作。

{{< tabpane text=true >}}

<!-- .NET -->
{{% tab ".NET" %}}

```csharp
public Task SayAsync(string message) 
{
    // 从键读取状态
    var previousMessage = await this.StateManager.GetStateAsync<string>("lastmessage");
    
    // 在序列化后为键设置新状态
    await this.StateManager.SetStateAsync("lastmessage", message);
    return previousMessage;
}
```

{{% /tab %}}

<!-- Java -->
{{% tab "Java" %}}

```java
public String actorMethod(String message) {
    // 从键读取状态并反序列化为 String
    String previousMessage = super.getActorStateManager().get("lastmessage", String.class).block();

    // 在序列化后为键设置新状态
    super.getActorStateManager().set("lastmessage", message).block();
    return previousMessage;
}
```

{{% /tab %}}

{{< /tabpane >}}

## 默认序列化器

Dapr 的默认序列化器是一个 JSON 序列化器，具有以下预期：

1. 使用基本 [JSON 数据类型](https://www.w3schools.com/js/js_json_datatypes.asp)以实现跨语言和跨平台兼容性：string、number、array、boolean、null 和另一个 JSON 对象。应用可序列化对象中的每个复杂属性类型（DateTime，例如），都应表示为 JSON 的基本类型之一。
2. 使用默认序列化器持久化的数据也应保存为 JSON 对象，无需额外的引号或编码。下面的示例展示了字符串和 JSON 对象在 Redis 存储中的样子。

  ```bash
  redis-cli MGET "ActorStateIT_StatefulActorService||StatefulActorTest||1581130928192||message
  "This is a message to be saved and retrieved."
  ```

  ```bash
  redis-cli MGET "ActorStateIT_StatefulActorService||StatefulActorTest||1581130928192||mydata
  {"value":"My data value."}
  ```

3. 自定义序列化器必须将对象序列化为 `byte[]`。
4. 自定义序列化器必须将 `byte[]` 反序列化为对象。
5. 当用户提供自定义序列化器时，应将其作为 `byte[]` 传输或持久化。持久化时，还要编码为 Base64 字符串。大多数 JSON 库原生支持此操作。

  ```bash
  redis-cli MGET "ActorStateIT_StatefulActorService||StatefulActorTest||1581130928192||message
  "VGhpcyBpcyBhIG1lc3NhZ2UgdG8gYmUgc2F2ZWQgYW5kIHJldHJpZXZlZC4="
  ```

  ```bash
  redis-cli MGET "ActorStateIT_StatefulActorService||StatefulActorTest||1581130928192||mydata
  "eyJ2YWx1ZSI6Ik15IGRhdGEgdmFsdWUuIn0="
  ```
