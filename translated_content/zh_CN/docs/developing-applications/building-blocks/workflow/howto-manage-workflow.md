---
type: docs
title: "操作指南：管理工作流"
linkTitle: "操作指南：管理工作流"
weight: 6000
description: 管理和运行工作流
---

现在您已经[在应用程序中编写了工作流及其活动]({{% ref howto-author-workflow.md %}})，可以使用 CLI 或 API 调用来启动、终止、重运行和获取工作流信息。

{{< tabpane text=true >}}

<!--CLI-->
{{% tab "CLI" %}}
## 使用 Dapr CLI 管理工作流

Dapr CLI 提供了在自托管和 Kubernetes 环境中管理工作流实例的命令。

另请参阅[工作流保留策略]({{% ref workflow-history-retention-policy.md %}})了解如何为已完成的工作流配置保留策略。

### 基本工作流操作

#### 启动工作流

```bash
# 使用 `orderprocessing` 应用程序，启动一个新的工作流实例并传入输入数据
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --input '{"orderId": "12345", "amount": 100.50}'

# 使用特定实例 ID 启动新工作流
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --instance-id order-12345 \
  --input '{"orderId": "12345"}'

# 计划在 2024 年 12 月 25 日上午 10:00:00（协调世界时 UTC）启动新工作流
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --start-time "2024-12-25T10:00:00Z"
```

#### 列出工作流实例

```bash
# 列出应用的所有工作流
dapr workflow list

# 按状态筛选
dapr workflow list --filter-status RUNNING

# 按工作流名称和应用 ID 筛选
dapr workflow list --app-id orderprocessing --filter-name OrderProcessingWorkflow

# 按时间筛选（过去 24 小时内启动的工作流）
dapr workflow list --filter-max-age 24h

# 获取详细输出
dapr workflow list -o wide
```

#### 查看工作流历史

```bash
# 获取执行历史
dapr workflow history order-12345

# 在特定应用 ID 上以 JSON 格式获取历史
dapr workflow history order-12345 --app-id orderprocessing --output json
```

#### 控制工作流执行

```bash
# 暂停正在运行的工作流
dapr workflow suspend order-12345 \
  --app-id orderprocessing \
  --reason "Waiting for manual approval"

# 恢复已暂停的工作流
dapr workflow resume order-12345 \
  --app-id orderprocessing \
  --reason "Approved by manager"

# 终止工作流
dapr workflow terminate order-12345 \
  --app-id orderprocessing \
  --output '{"reason": "Cancelled by customer"}'
```

#### 触发外部事件

```bash
# 为等待中的工作流触发事件
dapr workflow raise-event order-12345/PaymentReceived \
  --app-id orderprocessing \
  --input '{"paymentId": "pay-67890", "amount": 100.50}'
```

#### 重运行工作流

```bash
# 从头重运行
dapr workflow rerun order-12345

# 从特定事件 ID 重运行（通过 history 命令发现）
dapr workflow rerun order-12345 --event-id 5

# 使用新的指定实例 ID 重运行
dapr workflow rerun order-12345 --new-instance-id order-12345-retry
```

#### 清理已完成的工作流

请注意，从 CLI 清理工作流也会删除所有关联的 Scheduler 提醒。

{{% alert title="重要" color="warning" %}}

应用程序中必须运行工作流客户端才能执行清理操作。

需要工作流客户端连接才能保持工作流状态机的完整性，防止数据损坏。
以下错误表明工作流客户端未运行：

```
failed to purge orchestration state: rpc error: code = FailedPrecondition desc = failed to purge orchestration state: failed to lookup actor: api error: code = FailedPrecondition desc = did not find address for actor
```

可以使用 `--force` 标志在**没有**工作流应用程序运行的情况下清理工作流；但是，这只应在您确定没有工作流实例正在运行时使用，否则**将会**损坏工作流状态机。
{{% /alert %}}

```bash
# 清理特定实例
dapr workflow purge order-12345

# 清理 30 天前已完成的所有工作流
dapr workflow purge --all-older-than 720h

# 清理所有终结状态的工作流（谨慎使用！）
dapr workflow purge --app-id orderprocessing --all

# 在没有运行工作流客户端的情况下强制清理（极度谨慎使用！）
dapr workflow purge order-12345 --force
```

### Kubernetes 操作

所有命令都支持 Kubernetes 部署的 `-k` 标志：

```bash
# 在 Kubernetes 中列出工作流
dapr workflow list \
  --kubernetes \
  --namespace production \
  --app-id orderprocessing

# 在 Kubernetes 中暂停工作流
dapr workflow suspend order-12345 \
  --kubernetes \
  --namespace production \
  --app-id orderprocessing \
  --reason "Maintenance window"
```

### 列出工作流

在自托管模式下，只需运行：

```bash
dapr workflow list
```

在 Kubernetes 模式下，需要指定 `--kubernetes`/`-k` 标志以及命名空间和应用 ID：

```bash
dapr workflow list -k
```

### 工作流管理最佳实践

1. **监控正在运行的工作流**：使用筛选列表跟踪长期运行的实例
   ```bash
   dapr workflow list --app-id orderprocessing --filter-status RUNNING --filter-max-age 24h
   ```

1. **使用实例 ID**：分配有意义的实例 ID 以便更轻松地跟踪
   ```bash
   dapr workflow run OrderWorkflow --app-id orderprocessing --instance-id "order-$(date +%s)"
   ```

1. **导出以供分析**：导出工作流数据以供分析
   ```bash
   dapr workflow list --app-id orderprocessing --output json > workflows.json
   ```

## 使用 Dapr CLI 管理工作流提醒

工作流提醒存储在 Scheduler 中，可以使用 dapr scheduler CLI 进行管理。

#### 列出工作流提醒

```bash
dapr scheduler list --filter workflow
NAME                                           BEGIN     COUNT  LAST TRIGGER
workflow/my-app/instance1/timer-0-ABC123       +50.0h    0
workflow/my-app/instance2/timer-0-XYZ789       +50.0h    0
```

获取提醒详情

```bash
dapr scheduler get workflow/my-app/instance1/timer-0-ABC123 -o yaml
```

#### 删除工作流提醒

删除单个提醒：

```bash
dapr scheduler delete workflow/my-app/instance1/timer-0-ABC123
```

删除给定工作流应用的所有提醒：

```bash
dapr scheduler delete-all workflow/my-app
```

删除特定工作流实例的所有提醒：

```bash
dapr scheduler delete-all workflow/my-app/instance1
```

#### 备份和恢复提醒

导出所有提醒：

```bash
dapr scheduler export -o workflow-reminders-backup.bin
```

从备份文件恢复：

```bash
dapr scheduler import -f workflow-reminders-backup.bin
```

{{% /tab %}}

<!--Python-->
{{% tab "Python" %}}

在代码中管理工作流。在[编写工作流]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的工作流示例中，工作流使用以下 API 注册到代码中：
- **schedule_new_workflow**：启动工作流实例
- **get_workflow_state**：获取工作流状态信息
- **pause_workflow**：暂停或挂起工作流实例，以便后续恢复
- **resume_workflow**：恢复已暂停的工作流实例
- **raise_workflow_event**：向工作流触发事件
- **purge_workflow**：移除与特定工作流实例相关的所有元数据
- **wait_for_workflow_completion**：等待特定工作流实例完成

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
from dapr.clients import DaprClient

# 合理的参数
instanceId = "exampleInstanceID"
workflowComponent = "dapr"
workflowName = "hello_world_wf"
eventName = "event1"
eventData = "eventData"

# 启动工作流
wf_client.schedule_new_workflow(
        workflow=hello_world_wf, input=input_data, instance_id=instance_id
    )

# 获取工作流信息
wf_client.get_workflow_state(instance_id=instance_id)

# 暂停工作流
wf_client.pause_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)

# 恢复工作流
wf_client.resume_workflow(instance_id=instance_id)

# 向工作流触发事件
wf_client.raise_workflow_event(instance_id=instance_id, event_name=event_name, data=event_data)

# 清理工作流
wf_client.purge_workflow(instance_id=instance_id)

# 等待工作流完成
wf_client.wait_for_workflow_completion(instance_id, timeout_in_seconds=30)
```

{{% /tab %}}

<!--JavaScript-->
{{% tab "JavaScript" %}}

在代码中管理工作流。在[编写工作流]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的工作流示例中，工作流使用以下 API 注册到代码中：
- **client.workflow.start**：启动工作流实例
- **client.workflow.get**：获取工作流状态信息
- **client.workflow.pause**：暂停或挂起工作流实例，以便后续恢复
- **client.workflow.resume**：恢复已暂停的工作流实例
- **client.workflow.purge**：移除与特定工作流实例相关的所有元数据
- **client.workflow.terminate**：终止或停止工作流的特定实例

```javascript
import { DaprClient } from "@dapr/dapr";

async function printWorkflowStatus(client: DaprClient, instanceId: string) {
  const workflow = await client.workflow.get(instanceId);
  console.log(
    `Workflow ${workflow.workflowName}, created at ${workflow.createdAt.toUTCString()}, has status ${
      workflow.runtimeStatus
    }`,
  );
  console.log(`Additional properties: ${JSON.stringify(workflow.properties)}`);
  console.log("--------------------------------------------------\n\n");
}

async function start() {
  const client = new DaprClient();

  // 启动新的工作流实例
  const instanceId = await client.workflow.start("OrderProcessingWorkflow", {
    Name: "Paperclips",
    TotalCost: 99.95,
    Quantity: 4,
  });
  console.log(`Started workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 暂停工作流实例
  await client.workflow.pause(instanceId);
  console.log(`Paused workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 恢复工作流实例
  await client.workflow.resume(instanceId);
  console.log(`Resumed workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 终止工作流实例
  await client.workflow.terminate(instanceId);
  console.log(`Terminated workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 等待工作流完成，30 秒！
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await printWorkflowStatus(client, instanceId);

  // 清理工作流实例
  await client.workflow.purge(instanceId);
  console.log(`Purged workflow instance ${instanceId}`);
  // 这会抛出错误，因为工作流实例已不存在
  await printWorkflowStatus(client, instanceId);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

{{% /tab %}}

<!--NET-->
{{% tab ".NET" %}}

在代码中管理工作流。在[编写工作流]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的 `OrderProcessingWorkflow` 示例中，工作流已注册到代码中。现在您可以启动、终止和获取运行中工作流的信息：

```csharp
string orderId = "exampleOrderId";
OrderPayload input = new OrderPayload("Paperclips", 99.95);
Dictionary<string, string> workflowOptions; // 这是一个可选参数

// 使用 orderId 作为工作流 ID 启动工作流。这返回一个字符串，包含特定工作流实例的实例 ID，无论我们是自行提供还是由系统生成
await daprWorkflowClient.ScheduleNewWorkflowAsync(nameof(OrderProcessingWorkflow), orderId, input, workflowOptions);

// 获取工作流信息。此响应包含工作流状态、启动时间等信息！
WorkflowState currentState = await daprWorkflowClient.GetWorkflowStateAsync(orderId, orderId);

// 终止工作流
await daprWorkflowClient.TerminateWorkflowAsync(orderId);

// 触发事件（传入的采购订单），工作流将等待该事件
await daprWorkflowClient.RaiseEventAsync(orderId, "incoming-purchase-order", input);

// 暂停
await daprWorkflowClient.SuspendWorkflowAsync(orderId);

// 恢复
await daprWorkflowClient.ResumeWorkflowAsync(orderId);

// 清理工作流，从关联实例中移除所有收件箱和历史信息
await daprWorkflowClient.PurgeInstanceAsync(orderId);
```

{{% /tab %}}

<!--Java-->
{{% tab "Java" %}}

在代码中管理工作流。[在 Java SDK 的工作流示例中](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/)，工作流使用以下 API 注册到代码中：

- **scheduleNewWorkflow**：启动新的工作流实例
- **getInstanceState**：获取工作流状态信息
- **waitForInstanceStart**：暂停或挂起工作流实例，以便后续恢复
- **raiseEvent**：为运行中的工作流实例触发事件/任务
- **waitForInstanceCompletion**：等待工作流完成任务
- **purgeInstance**：移除与特定工作流实例相关的所有元数据
- **terminateWorkflow**：终止工作流
- **purgeInstance**：移除与特定工作流相关的所有元数据

```java
package io.dapr.examples.workflows;

import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowInstanceStatus;

// ...
public class DemoWorkflowClient {

  // ...
  public static void main(String[] args) throws InterruptedException {
    DaprWorkflowClient client = new DaprWorkflowClient();

    try (client) {
      // 启动工作流
      String instanceId = client.scheduleNewWorkflow(DemoWorkflow.class, "input data");
      
      // 获取工作流的状态信息
      WorkflowInstanceStatus workflowMetadata = client.getInstanceState(instanceId, true);

      // 等待或暂停工作流实例启动
      try {
        WorkflowInstanceStatus waitForInstanceStartResult =
            client.waitForInstanceStart(instanceId, Duration.ofSeconds(60), true);
      }

      // 为工作流触发事件；您可以并行触发多个事件
      client.raiseEvent(instanceId, "TestEvent", "TestEventPayload");
      client.raiseEvent(instanceId, "event1", "TestEvent 1 Payload");
      client.raiseEvent(instanceId, "event2", "TestEvent 2 Payload");
      client.raiseEvent(instanceId, "event3", "TestEvent 3 Payload");

      // 等待工作流完成任务
      try {
        WorkflowInstanceStatus waitForInstanceCompletionResult =
            client.waitForInstanceCompletion(instanceId, Duration.ofSeconds(60), true);
      } 

      // 清理工作流实例，移除与其关联的所有元数据
      boolean purgeResult = client.purgeInstance(instanceId);

      // 终止工作流实例
      client.terminateWorkflow(instanceToTerminateId, null);

    System.exit(0);
  }
}
```

{{% /tab %}}

<!--Go-->
{{% tab "Go" %}}

在代码中管理工作流。[在 Go SDK 的工作流示例中](https://github.com/dapr/go-sdk/tree/main/examples/workflow)，工作流使用以下 API 注册到代码中：

- **StartWorkflow**：启动新的工作流实例
- **GetWorkflow**：获取工作流状态信息
- **PauseWorkflow**：暂停或挂起工作流实例，以便后续恢复
- **RaiseEventWorkflow**：为运行中的工作流实例触发事件/任务
- **ResumeWorkflow**：等待工作流完成任务
- **PurgeWorkflow**：移除与特定工作流实例相关的所有元数据
- **TerminateWorkflow**：终止工作流

```go
// 启动工作流
type StartWorkflowRequest struct {
	InstanceID        string // 可选的实例标识符
	WorkflowComponent string
	WorkflowName      string
	Options           map[string]string // 可选的元数据
	Input             any               // 可选的输入
	SendRawInput      bool              // 设置为 True 以禁用输入上的序列化
}

type StartWorkflowResponse struct {
	InstanceID string
}

// 获取工作流状态
type GetWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

type GetWorkflowResponse struct {
	InstanceID    string
	WorkflowName  string
	CreatedAt     time.Time
	LastUpdatedAt time.Time
	RuntimeStatus string
	Properties    map[string]string
}

// 清理工作流
type PurgeWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 终止工作流
type TerminateWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 暂停工作流
type PauseWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 恢复工作流
type ResumeWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 为运行中的工作流触发事件
type RaiseEventWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
	EventName         string
	EventData         any
	SendRawData       bool // 设置为 True 以禁用数据上的序列化
}
```

{{% /tab %}}

<!--HTTP-->
{{% tab "HTTP" %}}

使用 HTTP 调用管理工作流。下面的示例将[编写工作流示例]({{% ref "howto-author-workflow.md#write-the-workflow" %}})中的属性与随机实例 ID 结合使用。

### 启动工作流

使用 ID `12345678` 启动工作流，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=12345678"
```

请注意，工作流实例 ID 只能包含字母数字字符、下划线和破折号。

### 终止工作流

使用 ID `12345678` 终止工作流，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/terminate"
```

### 触发事件

对于支持订阅外部事件的工作流组件（如 Dapr Workflow engine），您可以使用以下"触发事件" API 将命名事件传递到特定的工作流实例。

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/<workflowComponentName>/<instanceID>/raiseEvent/<eventName>"
```

> `eventName` 可以是任意函数。

### 暂停或恢复工作流

为了计划停机时间、等待输入等，您可以暂停然后恢复工作流。使用 ID `12345678` 暂停工作流直到触发恢复，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/pause"
```

使用 ID `12345678` 恢复工作流，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/resume"
```

### 清理工作流

清理 API 可用于从底层状态存储中永久删除工作流元数据，包括所有存储的输入、输出和工作流历史记录。这通常有助于实现数据保留策略和释放资源。

只有处于 COMPLETED、FAILED 或 TERMINATED 状态的工作流实例才能被清理。如果工作流处于任何其他状态，调用清理将返回错误。

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/purge"
```

### 获取工作流信息

使用 ID `12345678` 获取工作流信息（输出和输入），运行：

```shell
curl -X GET "http://localhost:3500/v1.0/workflows/dapr/12345678"
```
{{% /tab %}}

{{< /tabpane >}}

## 下一步

现在您已了解如何管理工作流，学习如何在多个应用程序中执行工作流

{{< button text="多应用程序工作流>>" page="workflow-multi-app.md" >}}

## 相关链接

- [试用工作流快速入门]({{% ref workflow-quickstart.md %}})
- 试用完整 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/blob/master/examples/demo_workflow/app.py)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow)
