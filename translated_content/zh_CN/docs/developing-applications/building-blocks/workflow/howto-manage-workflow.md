---
type: docs
title: "操作指南：管理 workflow"
linkTitle: "操作指南：管理 workflow"
weight: 6000
description: 管理和运行 workflow
---

现在您已经[在应用程序中编写了 workflow 及其 activity]({{% ref howto-author-workflow.md %}})，可以使用 CLI 或 API 调用来启动、终止、重运行和获取 workflow 信息。

SDK 客户端和 HTTP API 也可以指定位于同一 namespace 中的*另一个*应用程序所拥有的 workflow，方法是在请求中发送该应用程序的 ID。（CLI 的 `--app-id` 标志则不同：它用于选择要连接的 sidecar，因此这些调用仅作用于当前应用程序。）目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许。完整说明请参阅[多应用程序工作流]({{% ref workflow-multi-app.md %}})。

{{< tabpane text=true >}}

<!--CLI-->
{{% tab "CLI" %}}

## 使用 Dapr CLI 管理 workflow

Dapr CLI 提供了在自托管和 Kubernetes 环境中管理 workflow 实例的命令。

另请参阅[workflow 历史保留策略]({{% ref workflow-history-retention-policy.md %}})，了解如何为已完成的 workflow 配置保留策略。

### 基本 workflow 操作

#### 启动 workflow

```bash
# 使用 `orderprocessing` 应用程序，启动一个新的 workflow 实例并传入输入数据
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --input '{"orderId": "12345", "amount": 100.50}'

# 使用特定实例 ID 启动新的 workflow
# 注意：只有现有 workflow 已到达终态后，其实例 ID 才能重新使用；
# 且其所有 child workflow 也都已到达终态；
# 否则请求会被拒绝。Purge workflow 可以释放其实例 ID，
# 且不受上述条件限制。
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --instance-id order-12345 \
  --input '{"orderId": "12345"}'

# 计划在 2024 年 12 月 25 日上午 10:00:00（协调世界时 UTC）启动新的 workflow
dapr workflow run OrderProcessingWorkflow \
  --app-id orderprocessing \
  --start-time "2024-12-25T10:00:00Z"
```

#### 列出 workflow 实例

```bash
# 列出应用的所有 workflow
dapr workflow list

# 按状态筛选
dapr workflow list --filter-status RUNNING

# 按 workflow 名称和应用 ID 筛选
dapr workflow list --app-id orderprocessing --filter-name OrderProcessingWorkflow

# 按时间筛选（过去 24 小时内启动的 workflow）
dapr workflow list --filter-max-age 24h

# 获取详细输出
dapr workflow list -o wide
```

#### 查看 workflow 历史

```bash
# 获取执行历史
dapr workflow history order-12345

# 以 JSON 格式获取特定 App ID 上的历史
dapr workflow history order-12345 --app-id orderprocessing --output json
```

#### 控制 workflow 执行

```bash
# 暂停正在运行的 workflow
dapr workflow suspend order-12345 \
  --app-id orderprocessing \
  --reason "Waiting for manual approval"

# 恢复已暂停的 workflow
dapr workflow resume order-12345 \
  --app-id orderprocessing \
  --reason "Approved by manager"

# 终止 workflow
dapr workflow terminate order-12345 \
  --app-id orderprocessing \
  --output '{"reason": "Cancelled by customer"}'
```

#### 触发 external event

```bash
# 为等待中的 workflow 触发事件
dapr workflow raise-event order-12345/PaymentReceived \
  --app-id orderprocessing \
  --input '{"paymentId": "pay-67890", "amount": 100.50}'
```

#### 重运行 workflow

```bash
# 从头重运行
dapr workflow rerun order-12345

# 从特定事件 ID 重运行（可通过 history 命令查找）
dapr workflow rerun order-12345 --event-id 5

# 使用新指定的实例 ID 重运行
dapr workflow rerun order-12345 --new-instance-id order-12345-retry
```

#### Purge 已完成的 workflow

请注意，从 CLI purging workflow 也会删除所有关联的 Scheduler reminder。

{{% alert title="重要" color="warning" %}}

应用程序中必须运行 workflow 客户端才能执行 purge 操作。

需要 workflow 客户端连接，才能保持 workflow 状态机的完整性并防止数据损坏。
以下错误表明 workflow 客户端未运行：

```
failed to purge orchestration state: rpc error: code = FailedPrecondition desc = failed to purge orchestration state: failed to lookup actor: api error: code = FailedPrecondition desc = did not find address for actor
```

可以使用 `--force` 标志，在**没有** workflow 应用程序运行的情况下 purge workflow；但是，只有在您确定当前没有任何 workflow 实例正在运行时才应使用此标志，否则它**将会**损坏 workflow 状态机。
{{% /alert %}}

```bash
# Purge 特定实例
dapr workflow purge order-12345

# Purge 30 天前已完成的所有 workflow
dapr workflow purge --all-older-than 720h

# 仅 Purge 30 天前的 FAILED workflow
dapr workflow purge --all-older-than 720h --all-filter-status FAILED

# Purge 所有终态 workflow（请谨慎使用！）
dapr workflow purge --app-id orderprocessing --all

# 在没有运行 workflow 客户端的情况下强制 purge（请极其谨慎使用！）
dapr workflow purge order-12345 --force
```

### Kubernetes 操作

所有命令都支持用于 Kubernetes 部署的 `-k` 标志：

```bash
# 在 Kubernetes 中列出 workflow
dapr workflow list \
  --kubernetes \
  --namespace production \
  --app-id orderprocessing

# 在 Kubernetes 中暂停 workflow
dapr workflow suspend order-12345 \
  --kubernetes \
  --namespace production \
  --app-id orderprocessing \
  --reason "Maintenance window"
```

### 列出 workflow

在自托管模式下，只需运行：

```bash
dapr workflow list
```

在 Kubernetes 模式下，请同时指定 `--kubernetes`/`-k` 标志、namespace 和 App ID：

```bash
dapr workflow list -k
```

### workflow 管理最佳实践

1. **监控正在运行的 workflow**：使用筛选列表跟踪长时间运行的实例
   ```bash
   dapr workflow list --app-id orderprocessing --filter-status RUNNING --filter-max-age 24h
   ```

1. **使用实例 ID**：分配有意义的实例 ID，以便更轻松地跟踪
   ```bash
   dapr workflow run OrderWorkflow --app-id orderprocessing --instance-id "order-$(date +%s)"
   ```

1. **导出以供分析**：导出 workflow 数据以供分析
   ```bash
   dapr workflow list --app-id orderprocessing --output json > workflows.json
   ```

### 使用 Dapr Dev Dashboard 管理 workflow

在本地开发时，您可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}})，以可视化方式替代 `dapr workflow list` 和 `dapr workflow history` 命令。该仪表板会列出正在运行的应用中各 workflow 实例及其状态，并显示每个实例的完整事件历史，包括 activity 的输入和输出、timer 以及 external event。Dev Dashboard 仅面向本地开发，不在 Kubernetes 内运行。

<img src="/images/workflow-overview/workflow-diagrid-dashboard.png" width=800 alt="Diagrid Dev Dashboard 显示本地 workflow 执行情况"/><br/>

## 使用 Dapr CLI 管理 workflow reminder

workflow reminder 存储在 Scheduler 中，可以使用 dapr scheduler CLI 进行管理。

#### 列出 workflow reminder

```bash
dapr scheduler list --filter workflow
NAME                                           BEGIN     COUNT  LAST TRIGGER
workflow/my-app/instance1/timer-0-ABC123       +50.0h    0
workflow/my-app/instance2/timer-0-XYZ789       +50.0h    0
```

获取 reminder 详情

```bash
dapr scheduler get workflow/my-app/instance1/timer-0-ABC123 -o yaml
```

#### 删除 workflow reminder

删除单个 reminder：

```bash
dapr scheduler delete workflow/my-app/instance1/timer-0-ABC123
```

删除给定 workflow 应用的所有 reminder"

```bash
dapr scheduler delete-all workflow/my-app
```

删除特定 workflow 实例的所有 reminder：

```bash
dapr scheduler delete-all workflow/my-app/instance1
```

#### 备份和恢复 reminder

导出所有 reminder：

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

在代码中管理 workflow。在[编写 workflow]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的 workflow 示例中，workflow 通过以下 API 注册到代码中：
- **schedule_new_workflow**：启动 workflow 实例
- **get_workflow_state**：获取 workflow 的状态信息
- **pause_workflow**：暂停或挂起 workflow 实例，以便后续恢复
- **resume_workflow**：恢复已暂停的 workflow 实例
- **raise_workflow_event**：在 workflow 上触发事件
- **purge_workflow**：移除与特定 workflow 实例相关的所有 metadata
- **wait_for_workflow_completion**：等待特定 workflow 实例完成

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
from dapr.clients import DaprClient

# 合理的参数
instanceId = "exampleInstanceID"
workflowComponent = "dapr"
workflowName = "hello_world_wf"
eventName = "event1"
eventData = "eventData"

# 启动 workflow
wf_client.schedule_new_workflow(
        workflow=hello_world_wf, input=input_data, instance_id=instance_id
    )

# 获取 workflow 信息
wf_client.get_workflow_state(instance_id=instance_id)

# 暂停 workflow
wf_client.pause_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)

# 恢复 workflow
wf_client.resume_workflow(instance_id=instance_id)

# 在 workflow 上触发事件
wf_client.raise_workflow_event(instance_id=instance_id, event_name=event_name, data=event_data)

# Purge workflow
wf_client.purge_workflow(instance_id=instance_id)

# 等待 workflow 完成
wf_client.wait_for_workflow_completion(instance_id, timeout_in_seconds=30)
```

#### 指定其他应用程序

向上述任一操作传入 `app_id`，即可对另一个应用程序所拥有的 workflow 执行操作。目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许：

```python
wf_client.terminate_workflow(instance_id=instance_id, app_id='app2')
```

{{% /tab %}}

<!--JavaScript-->
{{% tab "JavaScript" %}}

在代码中管理 workflow。在[编写 workflow]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的 workflow 示例中，workflow 通过以下 API 注册到代码中：
- **client.workflow.start**：启动 workflow 实例
- **client.workflow.get**：获取 workflow 的状态信息
- **client.workflow.pause**：暂停或挂起 workflow 实例，以便后续恢复
- **client.workflow.resume**：恢复已暂停的 workflow 实例
- **client.workflow.purge**：移除与特定 workflow 实例相关的所有 metadata
- **client.workflow.terminate**：终止或停止 workflow 的特定实例

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

  // 启动新的 workflow 实例
  const instanceId = await client.workflow.start("OrderProcessingWorkflow", {
    Name: "Paperclips",
    TotalCost: 99.95,
    Quantity: 4,
  });
  console.log(`Started workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 暂停 workflow 实例
  await client.workflow.pause(instanceId);
  console.log(`Paused workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 恢复 workflow 实例
  await client.workflow.resume(instanceId);
  console.log(`Resumed workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 终止 workflow 实例
  await client.workflow.terminate(instanceId);
  console.log(`Terminated workflow instance ${instanceId}`);
  await printWorkflowStatus(client, instanceId);

  // 等待 workflow 完成，30 秒！
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await printWorkflowStatus(client, instanceId);

  // Purge workflow 实例
  await client.workflow.purge(instanceId);
  console.log(`Purged workflow instance ${instanceId}`);
  // 这会抛出错误，因为 workflow 实例已不存在
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

在代码中管理 workflow。在[编写 workflow]({{% ref "howto-author-workflow.md#write-the-application" %}})指南的 `OrderProcessingWorkflow` 示例中，workflow 已注册到代码中。现在您可以启动、终止并获取正在运行的 workflow 的信息：

```csharp
string orderId = "exampleOrderId";
OrderPayload input = new OrderPayload("Paperclips", 99.95);
Dictionary<string, string> workflowOptions; // 这是一个可选参数

// 使用 orderId 作为 workflow ID 启动 workflow。这将返回一个字符串，其中包含该 workflow 实例的实例 ID，无论是我们自行提供还是由系统生成
await daprWorkflowClient.ScheduleNewWorkflowAsync(nameof(OrderProcessingWorkflow), orderId, input, workflowOptions);

// 获取 workflow 信息。此响应包含 workflow 的状态、启动时间等信息！
WorkflowState currentState = await daprWorkflowClient.GetWorkflowStateAsync(orderId, orderId);

// 终止 workflow
await daprWorkflowClient.TerminateWorkflowAsync(orderId);

// 触发一个事件（传入的采购订单），您的 workflow 将等待该事件
await daprWorkflowClient.RaiseEventAsync(orderId, "incoming-purchase-order", input);

// 暂停
await daprWorkflowClient.SuspendWorkflowAsync(orderId);

// 恢复
await daprWorkflowClient.ResumeWorkflowAsync(orderId);

// Purge workflow，从关联实例中移除所有收件箱和历史信息
await daprWorkflowClient.PurgeInstanceAsync(orderId);
```

#### 指定其他应用程序

传入 `targetAppId`，即可对另一个应用程序所拥有的 workflow 执行操作。目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许：

```csharp
await client.TerminateWorkflowAsync(instanceId, null, "app2");
```

{{% /tab %}}

<!--Java-->
{{% tab "Java" %}}

在代码中管理 workflow。[在 Java SDK 的 workflow 示例中](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/)，workflow 通过以下 API 注册到代码中：

- **scheduleNewWorkflow**：启动新的 workflow 实例
- **getInstanceState**：获取 workflow 的状态信息
- **waitForInstanceStart**：暂停或挂起 workflow 实例，以便后续恢复
- **raiseEvent**：为正在运行的 workflow 实例触发事件/任务
- **waitForInstanceCompletion**：等待 workflow 完成其任务
- **purgeInstance**：移除与特定 workflow 实例相关的所有 metadata
- **terminateWorkflow**：终止 workflow
- **purgeInstance**：移除与特定 workflow 相关的所有 metadata

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
      // 启动 workflow
      String instanceId = client.scheduleNewWorkflow(DemoWorkflow.class, "input data");
      
      // 获取 workflow 的状态信息
      WorkflowInstanceStatus workflowMetadata = client.getInstanceState(instanceId, true);

      // 等待或暂停，直到 workflow 实例启动
      try {
        WorkflowInstanceStatus waitForInstanceStartResult =
            client.waitForInstanceStart(instanceId, Duration.ofSeconds(60), true);
      }

      // 为 workflow 触发事件；您可以并行触发多个事件
      client.raiseEvent(instanceId, "TestEvent", "TestEventPayload");
      client.raiseEvent(instanceId, "event1", "TestEvent 1 Payload");
      client.raiseEvent(instanceId, "event2", "TestEvent 2 Payload");
      client.raiseEvent(instanceId, "event3", "TestEvent 3 Payload");

      // 等待 workflow 完成所有任务的运行
      try {
        WorkflowInstanceStatus waitForInstanceCompletionResult =
            client.waitForInstanceCompletion(instanceId, Duration.ofSeconds(60), true);
      } 

      // Purge workflow 实例，移除与其关联的所有 metadata
      boolean purgeResult = client.purgeInstance(instanceId);

      // 终止 workflow 实例
      client.terminateWorkflow(instanceToTerminateId, null);

    System.exit(0);
  }
}
```

#### 指定其他应用程序

传入目标应用程序的 ID，即可对其拥有的 workflow 执行操作。目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许：

```java
client.terminateWorkflow(instanceId, null, "app2");
```

{{% /tab %}}

<!--Go-->
{{% tab "Go" %}}

在代码中管理 workflow。[在 Go SDK 的 workflow 示例中](https://github.com/dapr/go-sdk/tree/main/examples/workflow)，workflow 通过以下 API 注册到代码中：

- **StartWorkflow**：启动新的 workflow 实例
- **GetWorkflow**：获取 workflow 的状态信息
- **PauseWorkflow**：暂停或挂起 workflow 实例，以便后续恢复
- **RaiseEventWorkflow**：为正在运行的 workflow 实例触发事件/任务
- **ResumeWorkflow**：等待 workflow 完成其任务
- **PurgeWorkflow**：移除与特定 workflow 实例相关的所有 metadata
- **TerminateWorkflow**：终止 workflow

```go
// 启动 workflow
type StartWorkflowRequest struct {
	InstanceID        string // 可选的实例 ID
	WorkflowComponent string
	WorkflowName      string
	Options           map[string]string // 可选的 metadata
	Input             any               // 可选的输入
	SendRawInput      bool              // 设置为 True 以禁用输入上的序列化
}

type StartWorkflowResponse struct {
	InstanceID string
}

// 获取 workflow 状态
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

// Purge workflow
type PurgeWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 终止 workflow
type TerminateWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 暂停 workflow
type PauseWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 恢复 workflow
type ResumeWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
}

// 为正在运行的 workflow 触发事件
type RaiseEventWorkflowRequest struct {
	InstanceID        string
	WorkflowComponent string
	EventName         string
	EventData         any
	SendRawData       bool // 设置为 True 以禁用数据上的序列化
}
```

#### 指定其他应用程序

传入对应的 App ID 选项，即可对另一个应用程序所拥有的 workflow 执行操作。目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许：

```go
err = client.TerminateWorkflow(ctx, instanceID, workflow.WithTerminateAppID("app2"))
```

{{% /tab %}}

<!--HTTP-->
{{% tab "HTTP" %}}

使用 HTTP 调用管理 workflow。下面的示例将[编写 workflow 示例]({{% ref "howto-author-workflow.md#write-the-workflow" %}})中的属性与随机实例 ID 结合使用。

### 启动 workflow

使用 ID `12345678` 启动 workflow，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=12345678"
```

请注意，workflow 实例 ID 只能包含字母数字字符、下划线和破折号。

{{% alert title="重要" color="warning" %}}
强烈建议为每次执行分配新的实例 ID，而不要复用旧的实例 ID。参见[实例 ID 复用的影响]({{% ref "workflow-features-concepts.md#implications-of-instance-id-reuse" %}})。只有当具有该 ID 的现有 workflow，以及它创建的每个 child workflow（会递归检查），都已到达终态（`COMPLETED`、`FAILED` 或 `TERMINATED`）后，实例 ID 才能重新使用。否则请求将失败，返回 HTTP `500` 和错误代码 `ERR_START_WORKFLOW`。SDK workflow 客户端则会收到 gRPC `AlreadyExists` 状态码。若要无条件释放实例 ID，请先使用[purge API]({{% ref "workflow_api.md#purge-workflow-request" %}})purge 现有 workflow，或配置[保留策略]({{% ref workflow-history-retention-policy.md %}})。
{{% /alert %}}

拥有该 workflow 的应用程序必须处于运行状态，且其 workflow 工作进程已连接到其 Dapr sidecar。否则，启动请求会立即失败并返回 `no workflow worker is connected for app '<app-id>'`，而不会重试后再返回 actor routing 错误。

### 终止 workflow

使用 ID `12345678` 终止 workflow，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/terminate"
```

### 触发事件

对于支持订阅 external event 的 workflow 组件（例如 Dapr Workflow 引擎），您可以使用以下"触发事件" API，将命名事件传递给特定的 workflow 实例。

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/<workflowComponentName>/<instanceID>/raiseEvent/<eventName>"
```

> `eventName` 可以是任意函数。

### 暂停或恢复 workflow

为了规划停机时间、等待输入等场景，您可以暂停然后恢复 workflow。使用 ID `12345678` 暂停 workflow，直到触发恢复，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/pause"
```

使用 ID `12345678` 恢复 workflow，运行：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/resume"
```

### Purge workflow

purge API 可用于从底层 state store 中永久删除 workflow metadata，包括所有已存储的输入、输出和 workflow 历史记录。这通常有助于实现数据保留策略和释放资源。

只有处于 COMPLETED、FAILED 或 TERMINATED 状态的 workflow 实例才能被 purge。如果 workflow 处于任何其他状态，调用 purge 将返回错误。

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/purge"
```

### 获取 workflow 信息

使用 ID `12345678` 获取 workflow 信息（输出和输入），运行：

```shell
curl -X GET "http://localhost:3500/v1.0/workflows/dapr/12345678"
```
### 指定其他应用程序

在上述任一调用中添加 `appID` 查询参数，即可对另一个应用程序所拥有的 workflow 执行操作。[workflow API 参考]({{% ref workflow_api.md %}})中的每个操作都接受该参数，目标应用程序的[workflow access policy]({{% ref workflow-access-policy.md %}})决定该调用是否被允许：

```shell
curl -X POST "http://localhost:3500/v1.0/workflows/dapr/12345678/terminate?appID=app2"
```

{{% /tab %}}

{{< /tabpane >}}

## 下一步

现在您已了解如何管理 workflow，接下来学习如何在多个应用程序中执行 workflow

{{< button text="多应用程序工作流>>" page="workflow-multi-app.md" >}}

## 相关链接
- [试用 workflow 快速入门]({{% ref workflow-quickstart.md %}})
- [操作指南：应用 workflow access policy]({{% ref workflow-access-policy.md %}})
- 试用完整的 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow)
