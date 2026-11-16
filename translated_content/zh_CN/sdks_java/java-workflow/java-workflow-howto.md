---
type: docs
title: "操作指南：在 Java SDK 中编写和管理 Dapr Workflow"
linkTitle: "操作指南：编写和管理工作流"
weight: 20000
description: 如何使用 Dapr Java SDK 快速上手工作流
---

让我们创建一个 Dapr 工作流，并通过控制台调用它。借助[提供的工作流示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)，你将：

- 使用 [Java 工作流 worker](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowWorker.java) 执行工作流实例
- 利用 Java 工作流客户端和 API 调用，[启动和终止工作流实例](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowClient.java)

本示例使用 `dapr init` 的默认配置，运行于[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)。

## 前提条件

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 确认你使用的是最新的 proto 绑定

## 设置环境

克隆 Java SDK 仓库并进入该目录。

```bash
git clone https://github.com/dapr/java-sdk.git
cd java-sdk
```

运行以下命令，安装使用 Dapr Java SDK 运行此工作流示例所需的依赖。

```bash
mvn clean install
```

在 Java SDK 根目录下，进入 Dapr Workflow 示例目录。

```bash
cd examples
```

## 运行 `DemoWorkflowWorker`

`DemoWorkflowWorker` 类在 Dapr 的工作流运行时引擎中注册 `DemoWorkflow` 的实现。在 `DemoWorkflowWorker.java` 文件中，你可以找到 `DemoWorkflowWorker` 类和 `main` 方法：

```java
public class DemoWorkflowWorker {

  public static void main(String[] args) throws Exception {
    // 向运行时注册工作流。
    WorkflowRuntime.getInstance().registerWorkflow(DemoWorkflow.class);
    System.out.println("Start workflow runtime");
    WorkflowRuntime.getInstance().startAndBlock();
    System.exit(0);
  }
}
```

在上述代码中：
- `WorkflowRuntime.getInstance().registerWorkflow()` 将 `DemoWorkflow` 注册为 Dapr 工作流运行时中的一个工作流。
- `WorkflowRuntime.getInstance().start()` 在 Dapr 工作流运行时中构建并启动引擎。

在终端中执行以下命令，启动 `DemoWorkflowWorker`：

```sh
dapr run --app-id demoworkflowworker --resources-path ./components/workflows --dapr-grpc-port 50001 -- java -jar target/dapr-java-sdk-examples-exec.jar io.dapr.examples.workflows.DemoWorkflowWorker
```

**预期输出**

```
You're up and running! Both Dapr and your app logs will appear here.

...

== APP == Start workflow runtime
== APP == Sep 13, 2023 9:02:03 AM com.microsoft.durabletask.DurableTaskGrpcWorker startAndBlock
== APP == INFO: Durable Task worker is connecting to sidecar at 127.0.0.1:50001.
```

## 运行 `DemoWorkflowClient`

`DemoWorkflowClient` 用于启动已在 Dapr 中注册的工作流实例。

```java
public class DemoWorkflowClient {

  // ...
  public static void main(String[] args) throws InterruptedException {
    DaprWorkflowClient client = new DaprWorkflowClient();

    try (client) {
      String separatorStr = "*******";
      System.out.println(separatorStr);
      String instanceId = client.scheduleNewWorkflow(DemoWorkflow.class, "input data");
      System.out.printf("Started new workflow instance with random ID: %s%n", instanceId);

      System.out.println(separatorStr);
      System.out.println("**GetInstanceMetadata:Running Workflow**");
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

在第二个终端窗口中，运行以下命令启动工作流：

```sh
java -jar target/dapr-java-sdk-examples-exec.jar io.dapr.examples.workflows.DemoWorkflowClient
```

**预期输出**

```
*******
Started new workflow instance with random ID: 0b4cc0d5-413a-4c1c-816a-a71fa24740d4
*******
**GetInstanceMetadata:Running Workflow**
Result: [Name: 'io.dapr.examples.workflows.DemoWorkflow', ID: '0b4cc0d5-413a-4c1c-816a-a71fa24740d4', RuntimeStatus: RUNNING, CreatedAt: 2023-09-13T13:02:30.547Z, LastUpdatedAt: 2023-09-13T13:02:30.699Z, Input: '"input data"', Output: '']
*******
**WaitForWorkflowStart**
Result: [Name: 'io.dapr.examples.workflows.DemoWorkflow', ID: '0b4cc0d5-413a-4c1c-816a-a71fa24740d4', RuntimeStatus: RUNNING, CreatedAt: 2023-09-13T13:02:30.547Z, LastUpdatedAt: 2023-09-13T13:02:30.699Z, Input: '"input data"', Output: '']
*******
**SendExternalMessage**
*******
** Registering parallel Events to be captured by allOf(t1,t2,t3) **
Events raised for workflow with instanceId: 0b4cc0d5-413a-4c1c-816a-a71fa24740d4
*******
** Registering Event to be captured by anyOf(t1,t2,t3) **
Event raised for workflow with instanceId: 0b4cc0d5-413a-4c1c-816a-a71fa24740d4
*******
**WaitForWorkflowCompletion**
Result: [Name: 'io.dapr.examples.workflows.DemoWorkflow', ID: '0b4cc0d5-413a-4c1c-816a-a71fa24740d4', RuntimeStatus: FAILED, CreatedAt: 2023-09-13T13:02:30.547Z, LastUpdatedAt: 2023-09-13T13:02:55.054Z, Input: '"input data"', Output: '']
*******
**purgeWorkflow**
purgeResult: true
*******
**raiseEvent**
Started new workflow instance with random ID: 7707d141-ebd0-4e54-816e-703cb7a52747
Event raised for workflow with instanceId: 7707d141-ebd0-4e54-816e-703cb7a52747
*******
Started new workflow instance with specified ID: terminateMe
Terminate this workflow instance manually before the timeout is reached
*******
Started new  workflow instance with ID: restarting
Sleeping 30 seconds to restart the workflow
**SendExternalMessage: RestartEvent**
Sleeping 30 seconds to terminate the eternal workflow
Exiting DemoWorkflowClient.
```

## 发生了什么？

1. 当你运行 `dapr run` 时，工作流 worker 将工作流（`DemoWorkflow`）及其活动注册到 Dapr 工作流引擎。
1. 当你运行 `java` 时，工作流客户端启动了工作流实例，其中包含以下活动。你可以对照运行 `dapr run` 的终端输出进行跟踪。
   1. 工作流启动后，触发三个并行任务，并等待它们完成。
   1. 工作流客户端调用该活动，并将 "Hello Activity" 消息发送到控制台。
   1. 工作流超时并被清除。
   1. 工作流客户端以随机 ID 启动一个新的工作流实例；再使用名为 `terminateMe` 的工作流实例将其终止，并以名为 `restarting` 的工作流实例重新启动它。
   1. 工作流客户端随后退出。

## 后续步骤
- [了解有关 Dapr 工作流的更多信息]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})

## 高级功能

### 任务执行键

任务执行键是由 durabletask-java 库生成的唯一标识符。它们存储在 `WorkflowActivityContext` 中，可用于跟踪和管理工作流活动的执行。它们特别适用于以下场景：

1. **幂等性**：确保同一任务的活动不会被多次执行
2. **状态管理**：跟踪活动执行的状态
3. **错误处理**：以可控的方式管理重试与失败

以下示例展示了如何在工作流活动中使用任务执行键：

```java
public class TaskExecutionKeyActivity implements WorkflowActivity {
  @Override
  public Object run(WorkflowActivityContext ctx) {
    // 获取该活动的任务执行键
    String taskExecutionKey = ctx.getTaskExecutionKey();
    
    // 使用该键实现幂等性或状态管理
    // 例如，检查该任务是否已经执行过
    if (isTaskAlreadyExecuted(taskExecutionKey)) {
      return getPreviousResult(taskExecutionKey);
    }
    
    // 执行活动逻辑
    Object result = executeActivityLogic();
    
    // 使用任务执行键存储结果
    storeResult(taskExecutionKey, result);
    
    return result;
  }
}
```

### 有状态工作流历史

从 Dapr 1.19 开始，工作流 worker 会在内存中保存每个工作流实例的历史，因此 Dapr 边车每轮只发送新事件。此功能默认开启。若要将其关闭（例如 worker 内存有限时），可在 `WorkflowRuntimeBuilder` 上调用 `withStatefulHistoryDisabled(true)`：

```java
WorkflowRuntime runtime = new WorkflowRuntimeBuilder()
    .registerWorkflow(DemoWorkflow.class)
    .withStatefulHistoryDisabled(true)
    .build();
```

该构建器还提供了 `withHistoryCacheTtl`、`withHistoryCacheMaxInstances` 和 `withHistoryCacheMaxBytes` 方法，用于调整历史缓存。更多信息请参阅[有状态工作流客户端]({{% ref workflow-stateful-client.md %}})。

### 处理重复的工作流实例 ID

从 Dapr 1.19 开始，当运行时因已存在具有该 ID 的工作流实例而拒绝某个实例 ID 时，`DaprWorkflowClient.scheduleNewWorkflow` 会抛出 `WorkflowInstanceAlreadyExistsException`。

哪些已存在的实例会导致拒绝，取决于 `NewWorkflowOptions.setEnforceUniqueInstanceId(boolean)`：

- 默认情况下（该选项禁用），运行时只会拒绝属于**活跃**实例的实例 ID。若使用已达到终态（已完成、失败或已终止）的工作流的实例 ID 进行调度，则会成功，并以全新状态重新运行该工作流。
- 启用该选项后，只要存在具有该 ID 的实例（无论处于何种状态，包括终态），运行时就会拒绝该实例 ID。现有实例保持不变。

```java
NewWorkflowOptions options = new NewWorkflowOptions()
    .setInstanceId("order-123")
    .setInput("input data")
    .setEnforceUniqueInstanceId(true);

try {
  client.scheduleNewWorkflow(DemoWorkflow.class, options);
} catch (WorkflowInstanceAlreadyExistsException e) {
  System.out.printf("Workflow instance already exists: %s%n", e.getInstanceId());
}
```

### 列出、检查和重新运行工作流实例

从 Dapr 1.19 开始，`DaprWorkflowClient` 可以列出应用的工作流实例 ID、读取实例的历史，并从其某个历史事件重新运行已结束的实例。你可以借助这些功能在无需自行保存实例 ID 的情况下查找实例、查看失败实例停止的位置，并使用新输入从该步骤重试，而不必从头开始。

```java
// 列出第一页的实例 ID，每页最多 100 个。
// 将 page.getContinuationToken() 传给 listInstanceIds 以读取下一页。
WorkflowInstancePage page = client.listInstanceIds(null, 100);
for (String id : page.getInstanceIds()) {
  System.out.println(id);
}

// 读取实例的完整历史
List<WorkflowHistoryEvent> history = client.getInstanceHistory(instanceId);
for (WorkflowHistoryEvent event : history) {
  System.out.printf("eventId=%d type=%s%n", event.getEventId(), event.getEventType());
}

// 使用新输入，从第一个已调度的活动重新运行
int eventId = history.stream()
    .filter(event -> event.getEventType() == WorkflowHistoryEventType.TASK_SCHEDULED)
    .mapToInt(WorkflowHistoryEvent::getEventId)
    .findFirst()
    .orElseThrow();
String newInstanceId = client.rerunWorkflowFromEvent(instanceId, eventId,
    new RerunWorkflowFromEventOptions().setInput("new input").setOverwriteInput(true));
```

`rerunWorkflowFromEvent` 会创建一个新的工作流实例，返回其 ID，并保持源实例不变。源实例必须处于终态，且不能是子工作流。该事件必须是活动的调度、定时器的创建或子工作流的创建。若要替换输入，请同时调用 `setOverwriteInput(true)` 和 `setInput`。若要为新实例选择 ID，请调用 `setNewInstanceId`。

如需可直接运行的版本，请参阅[工作流管理示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows/management)。
