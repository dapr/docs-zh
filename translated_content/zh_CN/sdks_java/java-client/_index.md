---
type: docs
title: "Dapr 客户端 Java SDK 入门"
linkTitle: "Client"
weight: 3000
description: 如何开始使用 Dapr Java SDK
---

Dapr 客户端包允许您从 Java 应用程序与其他 Dapr 应用程序进行交互。

{{% alert title="注意" color="primary" %}}
如果您还没有，请[尝试其中一个快速入门]({{% ref quickstarts %}})，快速了解如何将 Dapr Java SDK 与 API 构建块一起使用。

{{% /alert %}}

## 前置条件

[完成初始设置并将 Java SDK 导入您的项目]({{% ref java %}})

## 初始化客户端

您可以像这样初始化 Dapr 客户端：

```java
DaprClient client = new DaprClientBuilder().build()
```

这将连接到默认的 Dapr gRPC 端点 `localhost:50001`。有关使用环境变量和系统属性配置客户端的信息，请参阅[属性]({{% ref properties.md %}})。

#### 错误处理

最初，Dapr 中的错误遵循标准 gRPC 错误模型。然而，为了提供更详细和有信息量的错误消息，在 1.13 版本中引入了增强的错误模型，该模型与 gRPC 更丰富的错误模型保持一致。作为响应，Java SDK 扩展了 DaprException 以包含 Dapr 中添加的错误详细信息。

使用 Dapr Java SDK 时处理 DaprException 并使用错误详细信息的示例：

```java
...
      try {
        client.publishEvent("unknown_pubsub", "mytopic", "mydata").block();
      } catch (DaprException exception) {
        System.out.println("Dapr exception's error code: " + exception.getErrorCode());
        System.out.println("Dapr exception's message: " + exception.getMessage());
        // DaprException 现在包含 `getStatusDetails()` 以包含有关 Dapr 运行时错误的更多详细信息。
        System.out.println("Dapr exception's reason: " + exception.getStatusDetails().get(
        DaprErrorDetails.ErrorDetailType.ERROR_INFO,
            "reason",
        TypeRef.STRING));
      }
...
```

## 构建块

Java SDK 允许您与所有 [Dapr 构建块]({{% ref building-blocks %}}) 进行交互。

### 调用服务

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  // 调用 'GET' 方法 (HTTP)，跳过序列化：使用 Mono<byte[]> 返回类型
  // 对于 gRPC，请在下面设置 HttpExtension.NONE 参数
  response = client.invokeMethod(SERVICE_TO_INVOKE, METHOD_TO_INVOKE, "{\"name\":\"World!\"}", HttpExtension.GET, byte[].class).block();

  // 调用 'POST' 方法 (HTTP)，跳过序列化：使用 Mono<byte[]> 返回类型     
  response = client.invokeMethod(SERVICE_TO_INVOKE, METHOD_TO_INVOKE, "{\"id\":\"100\", \"FirstName\":\"Value\", \"LastName\":\"Value\"}", HttpExtension.POST, byte[].class).block();

  System.out.println(new String(response));

  // 调用 'POST' 方法 (HTTP)，使用序列化：使用 Mono<Employee> 返回类型      
  Employee newEmployee = new Employee("Nigel", "Guitarist");
  Employee employeeResponse = client.invokeMethod(SERVICE_TO_INVOKE, "employees", newEmployee, HttpExtension.POST, Employee.class).block();
}
```

- 有关服务调用的完整指南，请访问[如何：调用服务]({{% ref howto-invoke-discover-services.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/invoke)获取代码示例和尝试服务调用的说明

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

- 有关状态操作的完整列表，请访问[如何：获取和保存状态]({{% ref howto-get-save-state.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/state)获取代码示例和尝试状态管理的说明

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

##### 批量发布消息

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

      // 使用批量发布 API 发布消息列表
      BulkPublishResponse<String> res = client.publishEvents(PUBSUB_NAME, TOPIC_NAME, "text/plain", messages).block()
    }
  }
}
```

- 有关发布消息和订阅主题的完整指南，请访问[如何：发布和订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/pubsub/http)获取代码示例和尝试发布订阅的说明

### 与输出绑定交互

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  // 使用消息发送类；BINDING_OPERATION="create"
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, myClass).block();

  // 发送纯字符串
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, message).block();
}
```

- 有关输出绑定的完整指南，请访问[如何：输出绑定]({{% ref howto-bindings.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http)获取代码示例和尝试输出绑定的说明。

### 与输入绑定交互

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

- 有关输入绑定的完整指南，请访问[如何：输入绑定]({{% ref howto-triggers %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http)获取代码示例和尝试输入绑定的说明。

### 获取密钥

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

- 有关密钥的完整指南，请访问[如何：检索密钥]({{% ref howto-secrets.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/secrets)获取代码示例和尝试检索密钥的说明

### Actor
Actor 是一个隔离的、独立的计算和状态单元，具有单线程执行。Dapr 提供基于[虚拟 Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/)的 actor 实现，该模式提供单线程编程模型，其中 actor 在不使用时会被垃圾回收。使用 Dapr 的实现，您可以根据 Actor 模型编写 Dapr actor，Dapr 利用底层平台提供的可扩展性和可靠性。

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

- 有关 actor 的完整指南，请访问[如何：在 Dapr 中使用虚拟 actor]({{% ref howto-actors.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/actors)获取代码示例和尝试 actor 的说明

### 获取和订阅应用程序配置

> 请注意，这是一个预览 API，因此只能通过 DaprPreviewClient 接口访问，而不能通过普通的 DaprClient 接口访问

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

  // 订阅配置更改
  Flux<SubscribeConfigurationResponse> outFlux = client.subscribeConfiguration(CONFIG_STORE_NAME, CONFIG_KEY_1, CONFIG_KEY_2);
  outFlux.subscribe(configItems -> configItems.forEach(...));

  // 取消订阅配置更改
  Mono<UnsubscribeConfigurationResponse> unsubscribe = client.unsubscribeConfiguration(SUBSCRIPTION_ID, CONFIG_STORE_NAME)
}
```

- 有关配置操作的完整列表，请访问[如何：从存储管理配置]({{% ref howto-manage-configuration.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/configuration)获取代码示例和尝试不同配置操作的说明。

### 查询已保存的状态

> 请注意，这是一个预览 API，因此只能通过 DaprPreviewClient 接口访问，而不能通过普通的 DaprClient 接口访问

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
        
        
        // 创建查询和查询状态请求

        Query query = new Query()
          .setFilter(new EqFilter<>("propertyType", "apartment"))
          .setSort(Arrays.asList(new Sorting("id", Sorting.Order.DESC)));
        QueryStateRequest request = new QueryStateRequest(STATE_STORE_NAME)
          .setQuery(query);

        // 使用预览客户端调用查询状态 API
        QueryStateResponse<MyData> result = previewClient.queryState(request, MyData.class).block();
        
        // 查看查询状态响应 
        System.out.println("Found " + result.getResults().size() + " items.");
        for (QueryStateItem<Listing> item : result.getResults()) {
          System.out.println("Key: " + item.getKey());
          System.out.println("Data: " + item.getValue());
        }
}
```

- 有关查询状态的完整说明，请访问[如何：查询状态]({{% ref howto-state-query-api.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/querystate)获取完整的代码示例。
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
   * 执行各种方法以检查不同的 API。
   *
   * @param args 参数
   * @throws Exception 抛出异常
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
   * 解锁。
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

- 有关分布式锁的完整说明，请访问[如何：使用锁]({{% ref howto-use-distributed-lock.md %}})
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/lock)获取完整的代码示例。

### 工作流

```java
package io.dapr.examples.workflows;

import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowState;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * 有关设置说明，请参阅 README。
 */
public class DemoWorkflowClient {

  /**
   * 主方法。
   *
   * @param args 输入参数（未使用）。
   * @throws InterruptedException 如果程序已中断。
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

- 有关工作流的完整指南，请访问：
   - [如何：编写工作流]({{% ref howto-author-workflow.md %}})。
   - [如何：管理工作流]({{% ref howto-manage-workflow.md %}})。
- [了解有关如何将 Java SDK 与工作流一起使用的更多信息]({{% ref java-workflow.md %}})。

## 边车 API

#### 等待边车
`DaprClient` 还提供了一个辅助方法来等待边车变得健康（仅限组件）。使用此方法时，请务必指定超时时间（以毫秒为单位）并使用 block() 来等待响应式操作的结果。

```java
// 在尝试使用 Dapr 组件之前，等待 Dapr 边车报告健康。
try (DaprClient client = new DaprClientBuilder().build()) {
  System.out.println("Waiting for Dapr sidecar ...");
  client.waitForSidecar(10000).block(); // 以毫秒为单位指定超时时间
  System.out.println("Dapr sidecar is ready.");
  ...
}

// 在此处执行 Dapr 组件操作，例如获取密钥或保存状态。
```

### 关闭边车
```java
try (DaprClient client = new DaprClientBuilder().build()) {
  logger.info("Sending shutdown request.");
  client.shutdown().block();
  logger.info("Ensuring dapr has stopped.");
  ...
}
```

了解更多有关[可添加到 Java 应用程序的 Dapr Java SDK 包](https://dapr.github.io/java-sdk/)的信息。

## 安全

### 应用 API 令牌身份验证

像发布订阅、输入绑定或作业这样的构建块需要 Dapr 向您的应用程序发出传入调用，您可以使用 [Dapr 应用 API 令牌身份验证]({{% ref app-api-token.md %}})来保护这些请求。这确保只有 Dapr 可以调用您应用程序的端点。

#### 了解两种令牌

Dapr 使用两种不同的令牌来保护通信。有关这两种令牌的详细信息，请参阅[属性]({{% ref properties.md %}})：

- **`DAPR_API_TOKEN`**（您的应用 → Dapr 边车）：使用 `DaprClient` 时由 Java SDK 自动处理
- **`APP_API_TOKEN`**（Dapr → 您的应用）：需要在应用程序中进行服务器端验证

下面的示例展示如何为 `APP_API_TOKEN` 实施服务器端验证。

#### 实施服务器端令牌验证

使用 gRPC 协议时，实施服务器拦截器来捕获元数据。

```java
import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;

public class SubscriberGrpcService extends AppCallbackGrpc.AppCallbackImplBase {
  public static final Context.Key<Metadata> METADATA_KEY = Context.key("grpc-metadata");
  
  // gRPC 拦截器来捕获元数据
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
  
  // 您的服务方法放在这里...
}
```

在构建 gRPC 服务器时注册拦截器：

```java
Server server = ServerBuilder.forPort(port)
    .intercept(new SubscriberGrpcService.MetadataInterceptor())
    .addService(new SubscriberGrpcService())
    .build();
server.start();
```

然后，在您的服务方法中，从元数据中提取令牌：

```java
@Override
public void onTopicEvent(DaprAppCallbackProtos.TopicEventRequest request,
    StreamObserver<DaprAppCallbackProtos.TopicEventResponse> responseObserver) {
  try {
    // 从上下文中提取元数据
    Context context = Context.current();
    Metadata metadata = METADATA_KEY.get(context);
    
    if (metadata != null) {
      String apiToken = metadata.get(
          Metadata.Key.of("dapr-api-token", Metadata.ASCII_STRING_MARSHALLER));
      
      // 相应地验证令牌
    }
    
    // 处理请求
    // ...
    
  } catch (Throwable e) {
    responseObserver.onError(e);
  }
}
```

#### 与 HTTP 端点一起使用

对于基于 HTTP 的端点，从标头中提取令牌：

```java
@RestController
public class SubscriberController {
  
  @PostMapping(path = "/endpoint")
  public Mono<Void> handleRequest(
      @RequestBody(required = false) byte[] body,
      @RequestHeader Map<String, String> headers) {
    return Mono.fromRunnable(() -> {
      try {
        // 从标头中提取令牌
        String apiToken = headers.get("dapr-api-token");
        
        // 相应地验证令牌
        
        // 处理请求
      } catch (Exception e) {
        throw new RuntimeException(e);
      }
    });
  }
}
```

#### 示例

有关使用发布订阅、绑定和作业的工作示例：
- [使用应用 API 令牌身份验证的发布订阅](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/pubsub#app-api-token-authentication-optional)
- [使用应用 API 令牌身份验证的绑定](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http#app-api-token-authentication-optional)
- [使用应用 API 令牌身份验证的作业](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/jobs#app-api-token-authentication-optional)

## 相关链接
- [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples)

有关 SDK 属性的完整列表以及如何配置它们，请访问[属性]({{% ref properties.md %}})。
