---
type: docs
title: "Dapr 客户端 Java SDK 入门"
linkTitle: "Client"
weight: 3000
description: 如何开始使用 Dapr Java SDK
---

Dapr 客户端包允许你从 Java 应用程序与其他 Dapr 应用程序进行交互。

{{% alert title="注意" color="primary" %}}
如果你还没有尝试过，请先[试用其中一个 Quickstart]({{% ref quickstarts %}})，快速了解如何将 Dapr Java SDK 与 API building blocks 一起使用。

{{% /alert %}}

## 前置条件

[完成初始设置并将 Java SDK 导入你的项目]({{% ref java %}})

## 初始化客户端

你可以这样初始化 Dapr 客户端：

```java
DaprClient client = new DaprClientBuilder().build()
```

这将连接到默认的 Dapr gRPC 端点 `localhost:50001`。有关使用环境变量和系统属性配置客户端的信息，请参阅[属性]({{% ref properties.md %}})。

#### 错误处理

最初，Dapr 中的错误遵循标准 gRPC 错误模型。然而，为了提供更详细、信息量更大的错误消息，Dapr 在 1.13 版本中引入了增强的错误模型，该模型与 gRPC 的 Richer error model 保持一致。作为响应，Java SDK 扩展了 DaprException，使其包含 Dapr 中新增的错误详细信息。

下面的示例演示了在使用 Dapr Java SDK 时如何处理 DaprException 并获取其中的错误详细信息：

```java
...
      try {
        client.publishEvent("unknown_pubsub", "mytopic", "mydata").block();
      } catch (DaprException exception) {
        System.out.println("Dapr exception's error code: " + exception.getErrorCode());
        System.out.println("Dapr exception's message: " + exception.getMessage());
        // DaprException 现在包含 `getStatusDetails()`，可获取 Dapr 运行时返回的更多错误详细信息。
        System.out.println("Dapr exception's reason: " + exception.getStatusDetails().get(
        DaprErrorDetails.ErrorDetailType.ERROR_INFO,
            "reason",
        TypeRef.STRING));
      }
...
```

## building blocks

Java SDK 允许你与所有 [Dapr building blocks]({{% ref building-blocks %}}) 进行交互。

### 调用服务

{{% alert title="已弃用" color="warning" %}}
service invocation 相关的 `DaprClient.invokeMethod` 封装方法已弃用。请改用下文介绍的 SDK 辅助方法 `DaprClient.invokeHttpClient(appId)`，或任何针对 Dapr sidecar 的原生 HTTP（或 gRPC）客户端。
{{% /alert %}}

SDK 提供了一个预先配置好的 HTTP 客户端封装，它绑定到目标应用的调用前缀。相对路径会基于 `{daprHttpEndpoint}/v1.0/invoke/{appId}/method/` 解析；配置了 `dapr-api-token` 时，该请求头会被自动附加：

```java
import io.dapr.client.DaprBodyPublishers;
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprInvokeHttpClient;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

try (DaprClient client = new DaprClientBuilder().build()) {
  DaprInvokeHttpClient invoker = client.invokeHttpClient("order-processor");

  HttpRequest request = invoker.newRequestBuilder("orders")
      .header("Content-Type", "application/json")
      .POST(DaprBodyPublishers.json(order))
      .build();

  HttpResponse<String> response = invoker.send(request, HttpResponse.BodyHandlers.ofString());
}
```

`DaprBodyPublishers.json(...)` 使用 SDK 默认的 Jackson 序列化器对负载进行序列化，与已弃用的 `invokeMethod` API 内部采用的 JSON 编码方式一致。对于原始负载，可以使用任意 `HttpRequest.BodyPublisher`（例如 `HttpRequest.BodyPublishers.ofString(...)`）。

`newRequestBuilder(relativePath)` 会按原样解析路径，不会替你进行编码。如果某个路径段可能包含 URI 中不合法的字符（例如空格），请先使用 `io.dapr.utils.UriUtils.encodePath(...)` 方法对其编码。若不编码而直接传入这些字符，会抛出 `IllegalArgumentException`。`encodePath` 方法会对每个以正斜杠（`/`）分隔的路径段进行百分号编码，保留分隔符和任何前导斜杠，并原样附加查询字符串。这一行为与已弃用的 `invokeMethod` API 自动应用的逐段编码保持一致：

```java
import io.dapr.utils.UriUtils;

// "Name With Spaces" 编码后为 "Name%20With%20Spaces"
HttpRequest request = invoker.newRequestBuilder(
        UriUtils.encodePath("orders/Name With Spaces"))
    .GET()
    .build();
```

下表概括了使用 `DaprClientBuilder` 配置后，`DaprInvokeHttpClient` 替你处理的事项，以及需要由你自己负责的事项：

| 关注点 | 由 SDK 处理 | 由你负责 |
|---|---|---|
| 调用 URL（`/v1.0/invoke/{appId}/method/...`） | ✓ — 基于 sidecar 端点解析，默认为 `http://localhost:3500`（可通过 `DAPR_HTTP_ENDPOINT`，或 `DAPR_SIDECAR_IP` 加 `DAPR_HTTP_PORT` 覆盖） | |
| `dapr-api-token` 请求头 | ✓ — 仅在通过 `dapr.api.token` 系统属性或 `DAPR_API_TOKEN` 环境变量配置时附加 | |
| HTTP 读取超时 | ✓ — 默认为 **60 秒**；可通过 `dapr.http.client.readTimeoutSeconds` 系统属性或 `DAPR_HTTP_CLIENT_READ_TIMEOUT_SECONDS` 环境变量覆盖 | |
| `User-Agent: dapr-sdk-java/<version>` 请求头 | ✓ — 其值会自动跟随 SDK 版本 | |
| URL 路径编码 | | 使用 `UriUtils.encodePath(...)` 对可能包含 URI 非法字符（如空格）的路径段进行编码。`newRequestBuilder` 方法会原样解析路径，遇到非法字符时抛出 `IllegalArgumentException`。 |
| `Content-Type` 请求头 | | 通过 `.header("Content-Type", "...")` 设置 |
| 请求体序列化 | | 默认 JSON 使用 `DaprBodyPublishers.json(...)`，或使用任意 `HttpRequest.BodyPublisher` |
| 响应体反序列化 | | 选择一个 `HttpResponse.BodyHandler`（`ofString`、`ofByteArray` 或自定义） |
| 响应状态与错误处理 | | 检查 `HttpResponse.statusCode()`，并对非 2xx 响应作出处理 |
| 追踪上下文传播（`traceparent`、`tracestate`、`baggage`） | | 除非希望使用 Dapr 的默认值，否则请从你自己的 OpenTelemetry 上下文附加自定义请求头 |
| 请求体分帧（`Content-Length` 与 `Transfer-Encoding: chunked`） | | 使用长度已知的 `BodyPublisher`。参见下方的提示。 |

{{% alert title="优先使用长度已知的请求体发布器" color="primary" %}}
当 `BodyPublisher` 报告的内容长度未知时（例如使用 `BodyPublishers.fromInputStream`），JDK 的 `HttpClient` 会发送 `Transfer-Encoding: chunked` 请求头。分块请求在高并发下与下游 HTTP 服务器的交互可能不佳，因此建议使用长度已知的发布器，例如 `DaprBodyPublishers.json(...)`、`BodyPublishers.ofByteArray(...)`、`BodyPublishers.ofString(...)` 或 `BodyPublishers.ofFile(...)`。它们会生成 `Content-Length` 分帧，并与已弃用的 `invokeMethod` API 所使用的线路格式一致。
{{% /alert %}}

此外，你也可以直接使用原生的 `java.net.http.HttpClient` 配合 `dapr-app-id` 请求头调用 sidecar，这种调用本身无需依赖 SDK：

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

HttpClient httpClient = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .POST(HttpRequest.BodyPublishers.ofString("{\"orderId\":100}"))
    .uri(URI.create("http://localhost:" + DAPR_HTTP_PORT + "/orders"))
    .header("Content-Type", "application/json")
    .header("dapr-app-id", "order-processor")
    .build();

HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
```

- 有关 service invocation 的完整指南，请访问[操作指南：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 保存和获取应用程序状态

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import reactor.core.publisher.Mono;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  // 保存状态
  client.saveState(STATE_STORE_NAME, FIRST_KEY_NAME, myClass).block();

  // 获取状态
  State<MyClass> retrievedMessage = client.getState(STATE_STORE_NAME, FIRST_KEY_NAME, MyClass.class).block();

  // 删除状态
  client.deleteState(STATE_STORE_NAME, FIRST_KEY_NAME).block();
}
```

- 有关状态操作的完整列表，请访问[操作指南：获取和保存状态]({{% ref howto-get-save-state.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/state)，获取代码示例，并了解如何试用 State Management。

### 发布和订阅消息

##### 发布消息

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.Metadata;
import static java.util.Collections.singletonMap;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  client.publishEvent(PUBSUB_NAME, TOPIC_NAME, message, singletonMap(Metadata.TTL_IN_SECONDS, MESSAGE_TTL_IN_SECONDS)).block();
}
```

##### 订阅消息

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dapr.Topic;
import io.dapr.client.domain.BulkSubscribeAppResponse;
import io.dapr.client.domain.BulkSubscribeAppResponseEntry;
import io.dapr.client.domain.BulkSubscribeAppResponseStatus;
import io.dapr.client.domain.BulkSubscribeMessage;
import io.dapr.client.domain.BulkSubscribeMessageEntry;
import io.dapr.client.domain.CloudEvent;
import io.dapr.springboot.annotations.BulkSubscribe;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class SubscriberController {

  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

  @Topic(name = "testingtopic", pubsubName = "${myAppProperty:messagebus}")
  @PostMapping(path = "/testingtopic")
  public Mono<Void> handleMessage(@RequestBody(required = false) CloudEvent<?> cloudEvent) {
    return Mono.fromRunnable(() -> {
      try {
        System.out.println("Subscriber got: " + cloudEvent.getData());
        System.out.println("Subscriber got: " + OBJECT_MAPPER.writeValueAsString(cloudEvent));
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    });
  }

  @Topic(name = "testingtopic", pubsubName = "${myAppProperty:messagebus}",
          rule = @Rule(match = "event.type == 'myevent.v2'", priority = 1))
  @PostMapping(path = "/testingtopicV2")
  public Mono<Void> handleMessageV2(@RequestBody(required = false) CloudEvent envelope) {
    return Mono.fromRunnable(() -> {
      try {
        System.out.println("Subscriber got: " + cloudEvent.getData());
        System.out.println("Subscriber got: " + OBJECT_MAPPER.writeValueAsString(cloudEvent));
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    });
  }

  @BulkSubscribe()
  @Topic(name = "testingtopicbulk", pubsubName = "${myAppProperty:messagebus}")
  @PostMapping(path = "/testingtopicbulk")
  public Mono<BulkSubscribeAppResponse> handleBulkMessage(
          @RequestBody(required = false) BulkSubscribeMessage<CloudEvent<String>> bulkMessage) {
    return Mono.fromCallable(() -> {
      if (bulkMessage.getEntries().size() == 0) {
        return new BulkSubscribeAppResponse(new ArrayList<BulkSubscribeAppResponseEntry>());
      }

      System.out.println("Bulk Subscriber received " + bulkMessage.getEntries().size() + " messages.");

      List<BulkSubscribeAppResponseEntry> entries = new ArrayList<BulkSubscribeAppResponseEntry>();
      for (BulkSubscribeMessageEntry<?> entry : bulkMessage.getEntries()) {
        try {
          System.out.printf("Bulk Subscriber message has entry ID: %s\n", entry.getEntryId());
          CloudEvent<?> cloudEvent = (CloudEvent<?>) entry.getEvent();
          System.out.printf("Bulk Subscriber got: %s\n", cloudEvent.getData());
          entries.add(new BulkSubscribeAppResponseEntry(entry.getEntryId(), BulkSubscribeAppResponseStatus.SUCCESS));
        } catch (Exception e) {
          e.printStackTrace();
          entries.add(new BulkSubscribeAppResponseEntry(entry.getEntryId(), BulkSubscribeAppResponseStatus.RETRY));
        }
      }
      return new BulkSubscribeAppResponse(entries);
    });
  }
}
```

##### Bulk Publish 消息

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.BulkPublishResponse;
import io.dapr.client.domain.BulkPublishResponseFailedEntry;
import java.util.ArrayList;
import java.util.List;
class Solution {
  public void publishMessages() {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // 创建要发布的消息列表
      List<String> messages = new ArrayList<>();
      for (int i = 0; i < NUM_MESSAGES; i++) {
        String message = String.format("This is message #%d", i);
        messages.add(message);
        System.out.println("Going to publish message : " + message);
      }

      // 使用 Bulk Publish API 发布消息列表
      BulkPublishResponse<String> res = client.publishEvents(PUBSUB_NAME, TOPIC_NAME, "text/plain", messages).block()
    }
  }
}
```

- 有关发布消息和订阅主题的完整指南，请访问[操作指南：发布和订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/pubsub/http)，获取代码示例，并了解如何试用 pub/sub。

### 与 output binding 交互

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  // 发送携带消息的类对象；BINDING_OPERATION="create"
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, myClass).block();

  // 发送普通字符串
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, message).block();
}
```

- 有关 output binding 的完整指南，请访问[操作指南：output binding]({{% ref howto-bindings.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http)，获取代码示例，并了解如何试用 output binding。

### 与 input binding 交互

```java
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/")
public class myClass {
    private static final Logger log = LoggerFactory.getLogger(myClass);
        @PostMapping(path = "/checkout")
        public Mono<String> getCheckout(@RequestBody(required = false) byte[] body) {
            return Mono.fromRunnable(() ->
                    log.info("Received Message: " + new String(body)));
        }
}
```

- 有关 input binding 的完整指南，请访问[操作指南：input binding]({{% ref howto-triggers %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http)，获取代码示例，并了解如何试用 input binding。

### 获取 secrets

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  Map<String, String> secret = client.getSecret(SECRET_STORE_NAME, secretKey).block();
  System.out.println(JSON_SERIALIZER.writeValueAsString(secret));
}
```

- 有关 secrets 的完整指南，请访问[操作指南：获取 secrets]({{% ref howto-secrets.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/secrets)，获取代码示例，并了解如何获取 secrets。

### Actor
Actor 是一个隔离的、独立的计算与状态单元，以单线程方式执行。Dapr 提供了基于[virtual Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/)的 Actor 实现，它提供单线程编程模型，并且 Actor 在闲置时会被垃圾回收。在 Dapr 的实现中，你按照 Actor 模型编写 Dapr Actor，Dapr 则利用底层平台提供的可扩展性与可靠性。

```java
import io.dapr.actors.ActorMethod;
import io.dapr.actors.ActorType;
import reactor.core.publisher.Mono;

@ActorType(name = "DemoActor")
public interface DemoActor {

  void registerReminder();

  @ActorMethod(name = "echo_message")
  String say(String something);

  void clock(String message);

  @ActorMethod(returns = Integer.class)
  Mono<Integer> incrementAndGet(int delta);
}
```

从 Dapr 1.19 开始，继承 `AbstractActor` 的 Actor 可以为 timer 或 reminder 设置重复次数、生存时间（TTL）或两者兼有，使其在到期后自行停止，无需手动取消注册。将 `ActorTimerOptions` 传给 `registerActorTimer`，或将 `ActorReminderOptions` 传给 `registerReminder` 即可。设置重复次数时，周期需为整数秒；设置 TTL 时，周期需为正值。

```java
// 在 Actor 实现内部：触发 5 次，每 10 秒一次
registerReminder(
    "myreminder",
    "reminder state",
    ActorReminderOptions.builder()
        .setDueTime(Duration.ofSeconds(5))
        .setPeriod(Duration.ofSeconds(10))
        .setRepetitions(5)
        .build()).block();

// 每秒触发一次，并在 1 分钟后过期
registerActorTimer(
    null,
    "clock",
    "ping!",
    ActorTimerOptions.builder()
        .setPeriod(Duration.ofSeconds(1))
        .setTtl(Duration.ofMinutes(1))
        .build()).block();
```

- 有关 Actor 的完整指南，请访问[操作指南：在 Dapr 中使用 virtual Actor]({{% ref howto-actors.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/actors)，获取代码示例，并了解如何试用 Actor。

### 获取并订阅应用程序配置

> 注意：这是一个预览 API，因此只能通过 DaprPreviewClient 接口访问，而不能通过普通的 DaprClient 接口访问。

```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

try (DaprPreviewClient client = (new DaprClientBuilder()).buildPreviewClient()) {
  // 获取单个键的配置
  Mono<ConfigurationItem> item = client.getConfiguration(CONFIG_STORE_NAME, CONFIG_KEY).block();

  // 获取多个键的配置
  Mono<Map<String, ConfigurationItem>> items =
          client.getConfiguration(CONFIG_STORE_NAME, CONFIG_KEY_1, CONFIG_KEY_2);

  // 订阅配置变更
  Flux<SubscribeConfigurationResponse> outFlux = client.subscribeConfiguration(CONFIG_STORE_NAME, CONFIG_KEY_1, CONFIG_KEY_2);
  outFlux.subscribe(configItems -> configItems.forEach(...));

  // 取消订阅配置变更
  Mono<UnsubscribeConfigurationResponse> unsubscribe = client.unsubscribeConfiguration(SUBSCRIPTION_ID, CONFIG_STORE_NAME)
}
```

- 有关配置操作的完整列表，请访问[操作指南：管理存储中的配置]({{% ref howto-manage-configuration.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/configuration)，获取代码示例，并了解不同的配置操作。

### 查询已保存的状态

> 注意：这是一个预览 API，因此只能通过 DaprPreviewClient 接口访问，而不能通过普通的 DaprClient 接口访问。

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.QueryStateItem;
import io.dapr.client.domain.QueryStateRequest;
import io.dapr.client.domain.QueryStateResponse;
import io.dapr.client.domain.query.Query;
import io.dapr.client.domain.query.Sorting;
import io.dapr.client.domain.query.filters.EqFilter;

try (DaprClient client = builder.build(); DaprPreviewClient previewClient = builder.buildPreviewClient()) {
        String searchVal = args.length == 0 ? "searchValue" : args[0];
        
        // 创建 JSON 数据
        Listing first = new Listing();
        first.setPropertyType("apartment");
        first.setId("1000");
        ...
        Listing second = new Listing();
        second.setPropertyType("row-house");
        second.setId("1002");
        ...
        Listing third = new Listing();
        third.setPropertyType("apartment");
        third.setId("1003");
        ...
        Listing fourth = new Listing();
        fourth.setPropertyType("apartment");
        fourth.setId("1001");
        ...
        Map<String, String> meta = new HashMap<>();
        meta.put("contentType", "application/json");

        // 保存状态
        SaveStateRequest request = new SaveStateRequest(STATE_STORE_NAME).setStates(
          new State<>("1", first, null, meta, null),
          new State<>("2", second, null, meta, null),
          new State<>("3", third, null, meta, null),
          new State<>("4", fourth, null, meta, null)
        );
        client.saveBulkState(request).block();
        
        
        // 创建查询和 Query State 请求

        Query query = new Query()
          .setFilter(new EqFilter<>("propertyType", "apartment"))
          .setSort(Arrays.asList(new Sorting("id", Sorting.Order.DESC)));
        QueryStateRequest request = new QueryStateRequest(STATE_STORE_NAME)
          .setQuery(query);

        // 使用预览客户端调用 Query State API
        QueryStateResponse<MyData> result = previewClient.queryState(request, MyData.class).block();
        
        // 查看 Query State 响应 
        System.out.println("Found " + result.getResults().size() + " items.");
        for (QueryStateItem<Listing> item : result.getResults()) {
          System.out.println("Key: " + item.getKey());
          System.out.println("Data: " + item.getValue());
        }
}
```

- 有关 Query State 的完整操作指南，请访问[操作指南：Query State]({{% ref howto-state-query-api.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/querystate)，查看完整的代码示例。
### 分布式锁

```java
package io.dapr.examples.lock.grpc;

import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.LockRequest;
import io.dapr.client.domain.UnlockRequest;
import io.dapr.client.domain.UnlockResponseStatus;
import reactor.core.publisher.Mono;

public class DistributedLockGrpcClient {
  private static final String LOCK_STORE_NAME = "lockstore";

  /**
   * 执行多个方法，以检查不同的 API。
   *
   * @param args 参数
   * @throws Exception 抛出 Exception
   */
  public static void main(String[] args) throws Exception {
    try (DaprPreviewClient client = (new DaprClientBuilder()).buildPreviewClient()) {
      System.out.println("Using preview client...");
      tryLock(client);
      unlock(client);
    }
  }

  /**
   * 尝试获取锁。
   *
   * @param client DaprPreviewClient 对象
   */
  public static void tryLock(DaprPreviewClient client) {
    System.out.println("*******trying to get a free distributed lock********");
    try {
      LockRequest lockRequest = new LockRequest(LOCK_STORE_NAME, "resouce1", "owner1", 5);
      Mono<Boolean> result = client.tryLock(lockRequest);
      System.out.println("Lock result -> " + (Boolean.TRUE.equals(result.block()) ? "SUCCESS" : "FAIL"));
    } catch (Exception ex) {
      System.out.println(ex.getMessage());
    }
  }

  /**
   * 释放锁。
   *
   * @param client DaprPreviewClient 对象
   */
  public static void unlock(DaprPreviewClient client) {
    System.out.println("*******unlock a distributed lock********");
    try {
      UnlockRequest unlockRequest = new UnlockRequest(LOCK_STORE_NAME, "resouce1", "owner1");
      Mono<UnlockResponseStatus> result = client.unlock(unlockRequest);
      System.out.println("Unlock result ->" + result.block().name());
    } catch (Exception ex) {
      System.out.println(ex.getMessage());
    }
  }
}
```

- 有关分布式锁的完整操作指南，请访问[操作指南：使用锁]({{% ref howto-use-distributed-lock.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/lock)，查看完整的代码示例。

### workflow

```java
package io.dapr.examples.workflows;

import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowState;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * 安装与配置说明请参阅 README。
 */
public class DemoWorkflowClient {

  /**
   * 主方法。
   *
   * @param args 输入参数（未使用）。
   * @throws InterruptedException 程序被中断时抛出。
   */
  public static void main(String[] args) throws InterruptedException {
    DaprWorkflowClient client = new DaprWorkflowClient();

    try (client) {
      String separatorStr = "*******";
      System.out.println(separatorStr);
      String instanceId = client.scheduleNewWorkflow(DemoWorkflow.class, "input data");
      System.out.printf("Started new workflow instance with random ID: %s%n", instanceId);

      System.out.println(separatorStr);
      System.out.println("**GetWorkflowMetadata:Running Workflow**");
      WorkflowState workflowMetadata = client.getWorkflowState(instanceId, true);
      System.out.printf("Result: %s%n", workflowMetadata);

      System.out.println(separatorStr);
      System.out.println("**WaitForWorkflowStart**");
      try {
        WorkflowState waitForWorkflowStartResult =
            client.waitForWorkflowStart(instanceId, Duration.ofSeconds(60), true);
        System.out.printf("Result: %s%n", waitForWorkflowStartResult);
      } catch (TimeoutException ex) {
        System.out.printf("waitForWorkflowStart has an exception:%s%n", ex);
      }

      System.out.println(separatorStr);
      System.out.println("**SendExternalMessage**");
      client.raiseEvent(instanceId, "TestEvent", "TestEventPayload");

      System.out.println(separatorStr);
      System.out.println("** Registering parallel Events to be captured by allOf(t1,t2,t3) **");
      client.raiseEvent(instanceId, "event1", "TestEvent 1 Payload");
      client.raiseEvent(instanceId, "event2", "TestEvent 2 Payload");
      client.raiseEvent(instanceId, "event3", "TestEvent 3 Payload");
      System.out.printf("Events raised for workflow with instanceId: %s\n", instanceId);

      System.out.println(separatorStr);
      System.out.println("** Registering Event to be captured by anyOf(t1,t2,t3) **");
      client.raiseEvent(instanceId, "e2", "event 2 Payload");
      System.out.printf("Event raised for workflow with instanceId: %s\n", instanceId);


      System.out.println(separatorStr);
      System.out.println("**waitForWorkflowCompletion**");
      try {
        WorkflowState waitForWorkflowCompletionResult =
            client.waitForWorkflowCompletion(instanceId, Duration.ofSeconds(60), true);
        System.out.printf("Result: %s%n", waitForWorkflowCompletionResult);
      } catch (TimeoutException ex) {
        System.out.printf("waitForWorkflowCompletion has an exception:%s%n", ex);
      }

      System.out.println(separatorStr);
      System.out.println("**purgeWorkflow**");
      boolean purgeResult = client.purgeWorkflow(instanceId);
      System.out.printf("purgeResult: %s%n", purgeResult);

      System.out.println(separatorStr);
      System.out.println("**raiseEvent**");

      String eventInstanceId = client.scheduleNewWorkflow(DemoWorkflow.class);
      System.out.printf("Started new workflow instance with random ID: %s%n", eventInstanceId);
      client.raiseEvent(eventInstanceId, "TestException", null);
      System.out.printf("Event raised for workflow with instanceId: %s\n", eventInstanceId);

      System.out.println(separatorStr);
      String instanceToTerminateId = "terminateMe";
      client.scheduleNewWorkflow(DemoWorkflow.class, null, instanceToTerminateId);
      System.out.printf("Started new workflow instance with specified ID: %s%n", instanceToTerminateId);

      TimeUnit.SECONDS.sleep(5);
      System.out.println("Terminate this workflow instance manually before the timeout is reached");
      client.terminateWorkflow(instanceToTerminateId, null);
      System.out.println(separatorStr);

      String restartingInstanceId = "restarting";
      client.scheduleNewWorkflow(DemoWorkflow.class, null, restartingInstanceId);
      System.out.printf("Started new  workflow instance with ID: %s%n", restartingInstanceId);
      System.out.println("Sleeping 30 seconds to restart the workflow");
      TimeUnit.SECONDS.sleep(30);

      System.out.println("**SendExternalMessage: RestartEvent**");
      client.raiseEvent(restartingInstanceId, "RestartEvent", "RestartEventPayload");

      System.out.println("Sleeping 30 seconds to terminate the eternal workflow");
      TimeUnit.SECONDS.sleep(30);
      client.terminateWorkflow(restartingInstanceId, null);
    }

    System.out.println("Exiting DemoWorkflowClient.");
    System.exit(0);
  }
}
```

- 有关 workflow 的完整指南，请访问：
   - [操作指南：编写 workflow]({{% ref howto-author-workflow.md %}})。
   - [操作指南：管理 workflow]({{% ref howto-manage-workflow.md %}})。
- [了解如何在 Java SDK 中使用 workflow]({{% ref java-workflow.md %}})。

## sidecar API

#### 等待 sidecar
`DaprClient` 还提供了一个辅助方法，用于等待 sidecar 变为健康状态（仅适用于 component）。使用此方法时，请务必以毫秒为单位指定超时时间，并调用 block() 来等待响应式操作的结果。

```java
// 在尝试使用 Dapr component 之前，等待 Dapr sidecar 报告健康状态。
try (DaprClient client = new DaprClientBuilder().build()) {
  System.out.println("Waiting for Dapr sidecar ...");
  client.waitForSidecar(10000).block(); // 以毫秒为单位指定超时时间
  System.out.println("Dapr sidecar is ready.");
  ...
}

// 在此执行 Dapr component 操作，例如获取 secrets 或保存状态。
```

### 关闭 sidecar
```java
try (DaprClient client = new DaprClientBuilder().build()) {
  logger.info("Sending shutdown request.");
  client.shutdown().block();
  logger.info("Ensuring dapr has stopped.");
  ...
}
```

了解更多可添加到 Java 应用程序中的 [Dapr Java SDK 包](https://dapr.github.io/java-sdk/)。

## 安全

### App API 令牌认证

pub/sub、input binding 和 job 等 building blocks 需要 Dapr 向你的应用程序发起传入调用。你可以使用 [Dapr App API 令牌认证]({{% ref app-api-token.md %}}) 来保护这些请求，从而确保只有 Dapr 能够调用你应用程序的端点。

#### 理解两种令牌

Dapr 使用两种不同的令牌来保护通信。有关这两种令牌的详细信息，请参阅[属性]({{% ref properties.md %}})：

- **`DAPR_API_TOKEN`**（你的应用 → Dapr sidecar）：使用 `DaprClient` 时由 Java SDK 自动处理
- **`APP_API_TOKEN`**（Dapr → 你的应用）：需要在你的应用程序中进行服务端校验

下面的示例展示了如何为 `APP_API_TOKEN` 实现服务端校验。

#### 实现服务端令牌校验

使用 gRPC 协议时，需要实现一个服务端拦截器来捕获 metadata。

```java
import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;

public class SubscriberGrpcService extends AppCallbackGrpc.AppCallbackImplBase {
  public static final Context.Key<Metadata> METADATA_KEY = Context.key("grpc-metadata");
  
  // 用于捕获 metadata 的 gRPC 拦截器
  public static class MetadataInterceptor implements ServerInterceptor {
    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
        ServerCall<ReqT, RespT> call,
        Metadata headers,
        ServerCallHandler<ReqT, RespT> next) {
      Context contextWithMetadata = Context.current().withValue(METADATA_KEY, headers);
      return Contexts.interceptCall(contextWithMetadata, call, headers, next);
    }
  }
  
  // 在此处编写你的服务方法……
}
```

在构建 gRPC 服务器时注册该拦截器：

```java
Server server = ServerBuilder.forPort(port)
    .intercept(new SubscriberGrpcService.MetadataInterceptor())
    .addService(new SubscriberGrpcService())
    .build();
server.start();
```

然后，在服务方法中从 metadata 中提取令牌：

```java
@Override
public void onTopicEvent(DaprAppCallbackProtos.TopicEventRequest request,
    StreamObserver<DaprAppCallbackProtos.TopicEventResponse> responseObserver) {
  try {
    // 从上下文中提取 metadata
    Context context = Context.current();
    Metadata metadata = METADATA_KEY.get(context);
    
    if (metadata != null) {
      String apiToken = metadata.get(
          Metadata.Key.of("dapr-api-token", Metadata.ASCII_STRING_MARSHALLER));
      
      // 据此校验令牌
    }
    
    // 处理请求
    // ……
    
  } catch (Throwable e) {
    responseObserver.onError(e);
  }
}
```

#### 在 HTTP 端点中使用

对于基于 HTTP 的端点，请从请求头中提取令牌：

```java
@RestController
public class SubscriberController {
  
  @PostMapping(path = "/endpoint")
  public Mono<Void> handleRequest(
      @RequestBody(required = false) byte[] body,
      @RequestHeader Map<String, String> headers) {
    return Mono.fromRunnable(() -> {
      try {
        // 从请求头中提取令牌
        String apiToken = headers.get("dapr-api-token");
        
        // 据此校验令牌
        
        // 处理请求
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    });
  }
}
```

#### 示例

以下是使用 pub/sub、binding 和 job 的可用示例：
- [pub/sub 与 App API 令牌认证](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/pubsub#app-api-token-authentication-optional)
- [binding 与 App API 令牌认证](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http#app-api-token-authentication-optional)
- [job 与 App API 令牌认证](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/jobs#app-api-token-authentication-optional)

## 相关链接
- [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples)

有关 SDK 属性及其配置方法的完整列表，请访问[属性]({{% ref properties.md %}})。
