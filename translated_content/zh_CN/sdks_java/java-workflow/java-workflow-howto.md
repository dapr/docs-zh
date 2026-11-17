---
type: docs
title: "操作指南：在 Java SDK 中编写和管理 Dapr Workflow"
linkTitle: "操作指南：编写和管理 workflow"
weight: 20000
description: 如何使用 Dapr Java SDK 快速上手 workflow
---

让我们创建一个 Dapr Workflow，并通过控制台调用它。借助[提供的 workflow 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)，你将：

- 使用 [Java workflow worker](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowWorker.java) 执行 workflow instance
- 利用 Java Workflow Client 和 API 调用，[启动和终止 workflow instance](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowClient.java)

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
- 确认你使用的是最新的 proto binding

## 设置环境

克隆 Java SDK 仓库并进入该目录。

```bash
git clone https://github.com/dapr/java-sdk.git
cd java-sdk
```

运行以下命令，安装使用 Dapr Java SDK 运行此 workflow 示例所需的依赖。

```bash
mvn clean install
```

在 Java SDK 根目录下，进入 Dapr Workflow 示例目录。

```bash
cd examples
```

## 运行 `DemoWorkflowWorker`

`DemoWorkflowWorker` 类在 Dapr 的 workflow runtime 引擎中注册 `DemoWorkflow` 的实现。在 `DemoWorkflowWorker.java` 文件中，你可以找到 `DemoWorkflowWorker` 类和 `main` 方法：

```java
public class DemoWorkflowWorker {

  public static void main(String[] args) throws Exception {
    // 向运行时注册 workflow。
    WorkflowRuntime.getInstance().registerWorkflow(DemoWorkflow.class);
    System.out.println("Start workflow runtime");
    WorkflowRuntime.getInstance().startAndBlock();
    System.exit(0);
  }
}
```

在上述代码中：
- `WorkflowRuntime.getInstance().registerWorkflow()` 将 `DemoWorkflow` 注册为 Dapr Workflow 运行时中的一个 workflow。
- `WorkflowRuntime.getInstance().start()` 在 Dapr Workflow 运行时中构建并启动引擎。

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

`DemoWorkflowClient` 用于启动已在 Dapr 中注册的 workflow instance。

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

在第二个终端窗口中，运行以下命令启动 workflow：

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

1. 当你运行 `dapr run` 时，workflow worker 将 workflow（`DemoWorkflow`）及其 activity 注册到 Dapr Workflow 引擎。
1. 当你运行 `java` 时，Workflow Client 启动了 workflow instance，其中包含以下 activity。你可以对照运行 `dapr run` 的终端输出进行跟踪。
   1. workflow 启动后，触发三个并行任务，并等待它们完成。
   1. Workflow Client 调用该 activity，并将 "Hello Activity" 消息发送到控制台。
   1. workflow 超时并被清除。
   1. Workflow Client 以随机 ID 启动一个新的 workflow instance；再使用名为 `terminateMe` 的 workflow instance 将其终止，并以名为 `restarting` 的 workflow instance 重新启动它。
   1. Workflow Client 随后退出。

## 后续步骤
- [了解有关 Dapr Workflow 的更多信息]({{% ref workflow-overview.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})

## 高级功能

### 任务执行键

任务执行键是由 durabletask-java 库生成的唯一标识符。它们存储在 `WorkflowActivityContext` 中，可用于跟踪和管理 workflow activity 的执行。它们特别适用于以下场景：

1. **幂等性**：确保同一任务的 activity 不会被多次执行
2. **State Management**：跟踪 activity 执行的状态
3. **错误处理**：以可控的方式管理重试与失败

以下示例展示了如何在 workflow activity 中使用任务执行键：

```java
public class TaskExecutionKeyActivity implements WorkflowActivity {
  @Override
  public Object run(WorkflowActivityContext ctx) {
    // 获取该 activity 的任务执行键
    String taskExecutionKey = ctx.getTaskExecutionKey();
    
    // 使用该键实现幂等性或 State Management
    // 例如，检查该任务是否已经执行过
    if (isTaskAlreadyExecuted(taskExecutionKey)) {
      return getPreviousResult(taskExecutionKey);
    }
    
    // 执行 activity 逻辑
    Object result = executeActivityLogic();
    
    // 使用任务执行键存储结果
    storeResult(taskExecutionKey, result);
    
    return result;
  }
}
```

### stateful workflow 历史

从 Dapr 1.19 开始，workflow worker 会在内存中保存每个 workflow instance 的历史，因此 Dapr sidecar 每轮只发送新事件。此功能默认开启。若要将其关闭（例如 worker 内存有限时），可在 `WorkflowRuntimeBuilder` 上调用 `withStatefulHistoryDisabled(true)`：

```java
WorkflowRuntime runtime = new WorkflowRuntimeBuilder()
    .registerWorkflow(DemoWorkflow.class)
    .withStatefulHistoryDisabled(true)
    .build();
```

该构建器还提供了 `withHistoryCacheTtl`、`withHistoryCacheMaxInstances` 和 `withHistoryCacheMaxBytes` 方法，用于调整历史缓存。更多信息请参阅[stateful workflow 客户端]({{% ref workflow-stateful-client.md %}})。

### 处理重复的 workflow instance ID

从 Dapr 1.19 开始，当运行时因已存在具有该 ID 的 workflow instance 而拒绝某个实例 ID 时，`DaprWorkflowClient.scheduleNewWorkflow` 会抛出 `WorkflowInstanceAlreadyExistsException`。

哪些已存在的实例会导致拒绝，取决于 `NewWorkflowOptions.setEnforceUniqueInstanceId(boolean)`：

- 默认情况下（该选项禁用），运行时只会拒绝属于**活跃**实例的实例 ID。若使用已达到终态（已完成、失败或已终止）的 workflow 的实例 ID 进行调度，则会成功，并以全新状态重新运行该 workflow。
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

### 列出、检查和重新运行 workflow instance

从 Dapr 1.19 开始，`DaprWorkflowClient` 可以列出应用的 workflow instance ID、读取实例的历史，并从其某个历史事件重新运行已结束的实例。你可以借助这些功能在无需自行保存实例 ID 的情况下查找实例、查看失败实例停止的位置，并使用新输入从该步骤重试，而不必从头开始。

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

// 使用新输入，从第一个已调度的 activity 重新运行
int eventId = history.stream()
    .filter(event -> event.getEventType() == WorkflowHistoryEventType.TASK_SCHEDULED)
    .mapToInt(WorkflowHistoryEvent::getEventId)
    .findFirst()
    .orElseThrow();
String newInstanceId = client.rerunWorkflowFromEvent(instanceId, eventId,
    new RerunWorkflowFromEventOptions().setInput("new input").setOverwriteInput(true));
```

`rerunWorkflowFromEvent` 会创建一个新的 workflow instance，返回其 ID，并保持源实例不变。源实例必须处于终态，且不能是 child workflow。该事件必须是 activity 的调度、timer 的创建或 child workflow 的创建。若要替换输入，请同时调用 `setOverwriteInput(true)` 和 `setInput`。若要为新实例选择 ID，请调用 `setNewInstanceId`。

如需可直接运行的版本，请参阅[workflow 管理示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows/management)。
