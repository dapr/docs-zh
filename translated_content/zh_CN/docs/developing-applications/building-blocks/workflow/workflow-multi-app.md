---
type: docs
title: 多应用工作流
linkTitle: 多应用工作流
weight: 7000
description: "跨多个应用程序执行工作流"
---

单个工作流通常会跨越多个应用程序、微服务或编程语言。
这时，活动或子工作流会在与托管父工作流不同的应用程序上执行。

以下是一些适用的场景：

- 机器学习（ML）训练活动必须在启用 GPU 的机器上执行，而工作流的其余部分在仅支持 CPU 的编排机器上运行。
- 活动需要访问仅特定身份或区域才能使用的敏感数据或凭据。
- 工作流的不同部分需要在不同的信任区域或网络中执行。
- 由于数据驻留要求，工作流的不同部分需要在不同的地理区域中执行。
- 某个业务流程涉及多个团队或部门，每个团队或部门各自拥有自己的应用程序。
- 基于团队专长或现有代码库，工作流的实现跨越不同的编程语言。
- 不同的团队边界或微服务归属。

下图展示了一个复杂工作流的示例场景，该工作流跨越多个用不同编程语言编写的应用程序进行编排。

{{< diagram workflow-multi-app-complex >}}

各应用程序的主要步骤和活动如下：

• **App1: 主工作流服务** - 协调整个 ML 管道的顶层编排器
- 启动流程
- 调用 App2 上的数据处理活动
- 调用 App3 上的 ML 训练子工作流
- 调用 App4 上的模型部署
- 结束完整的工作流
- **语言：Java**

• **App2: 数据处理管道** - **仅限 GPU 活动**
- 数据摄取活动（GPU 加速）
- 特征工程活动（GPU 加速）
- 向主工作流返回完成信号
- **语言：Go**

• **App3: ML 训练子工作流** - 包含一个子工作流和若干活动
- 子工作流编排：
  - 数据处理活动
  - 模型训练活动（GPU 密集型）
  - 模型验证活动
- 由 App2 的活动完成后触发
- 向主工作流返回完成信号
- **语言：Java**

• **App4: 模型服务** - **高配 GPU 应用**，仅包含活动
- 模型加载活动（GPU 内存密集型）
- 推理设置活动（GPU 加速推理）
- 由 App3 的工作流完成后触发
- 向主工作流返回完成信号
- **语言：Go**

## 多应用工作流

工作流执行的路由基于[托管 Dapr 应用程序的 App ID]({{% ref "security-concept.md#application-identity" %}})。
默认情况下，完整的工作流执行托管在启动该工作流的 App ID 上。该工作流可以在此 App ID 的任意副本上执行，而不仅限于调度该工作流的那一个副本。


可以通过在工作流执行代码中指定目标 App ID 参数，在不同的 App ID 上执行活动和子工作流。
执行时，目标 App ID 会执行该活动或子工作流，并将结果返回给发起方 App ID 的父工作流。

整个工作流执行可以分布在任意数量的 App ID 上，每个活动或子工作流各自指定目标 App ID。
工作流的最终历史记录由托管根（最顶层的父）工作流的 App ID 保存。

{{% alert title="限制" color="primary" %}}
与 Dapr 中的其他 API 构建块和资源一样，工作流的作用域限定在单个命名空间内。
这意味着参与多应用工作流的所有 App ID 必须位于同一命名空间中。
跨命名空间的工作流不受支持：来自不同命名空间的调用方对目标发起的任何工作流或活动调用都会被拒绝。
同样，所有 App ID 必须使用相同的工作流（或 actor）state store。
最后，目标 App ID 必须已定义并注册该活动或子工作流，否则父工作流会无限重试。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
多应用工作流需要 Dapr 运行时 v1.16.0 或更高版本。.NET SDK 从 v1.17.0 开始提供支持。
{{% /alert %}}

{{% alert title="重要限制" color="warning" %}}
**支持多应用工作流的 SDK** - 多应用工作流通过 SDK 使用。
目前支持以下 SDK：
- **Java**（**仅**活动调用）
- **Go**（**同时**支持活动和子工作流调用）
- **Python**（**同时**支持活动和子工作流调用）
- **.NET**（**同时**支持活动和子工作流调用，需要 .NET SDK v1.17.0+）
- JavaScript SDK 计划在未来的版本中提供支持
{{% /alert %}}

## 错误处理

调用多应用活动或子工作流时：
- 如果目标应用程序不存在，将使用所提供的重试策略重试该调用。
- 如果目标应用程序存在，但不包含指定的活动或工作流，调用将返回错误。
- 标准工作流重试策略同样适用于多应用调用。

目标应用（无论本地还是远程）没有连接任何工作流工作进程时，[客户端操作](#跨应用管理工作流)会立即失败，错误信息为 `no workflow worker is connected for app '<app-id>'`。该错误提示你需要启动应用，或等待其工作进程连接，而不是返回类似 `did not find address for actor` 的 actor 路由错误。启动工作流在这种情况下不再重试，因此错误会比以前提前约 20 秒返回。原始错误仍被包装在其中，因此现有的错误代码检查依然有效。

至关重要的是，负责不同 App ID 的团队之间必须相互协调，确保活动和子工作流在需要时已经定义并可用。

## 持久化活动结果

活动通常需要一定时间才能完成，或者在资源或金钱成本上执行起来较为昂贵。
因此，即使在异常路径下，也不希望同一轮次的活动被执行多次。
在 1.17 之前的多应用场景中，活动会通过网络调用将响应发布给托管所属工作流的其他应用程序。
如果托管工作流的应用程序宕机或无法访问，结果就会丢失，活动随之被重试，从而导致活动被重复执行。

在 1.17 中，启用 [`WorkflowsRemoteActivityReminder` 特性门控]({{% ref "support-preview-features.md" %}})后，活动结果会通过[提醒]({{% ref "workflow-features-concepts.md#durable-timers" %}})发送给所属的工作流应用程序。即使该应用程序离线或无法访问，结果也不会丢失，从而避免重复执行。
所有应用程序都运行 Dapr 1.17 或更高版本的用户，都应启用此选项。
从 1.18 开始，该特性门控_**默认启用**_。在 1.17 中，为了保持 Dapr 版本之间的向后兼容性，它默认处于禁用状态，可以通过该特性门控主动开启。

## 多应用活动示例

{{< diagram name="workflow-multi-app-activity" width="75" >}}

以下示例展示如何在目标应用 `App2` 上执行活动 `ActivityA`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallActivity("ActivityA",
		workflow.WithActivityInput("my-input"),
		workflow.WithActivityAppID("App2"), // 在这里设置将执行该活动的目标 App ID。
	).Await(&output)

	if err != nil {
		return nil, err
	}

	return output, nil
}
```

{{% /tab %}}

{{% tab "Java" %}}

```java
public class BusinessWorkflow implements Workflow {
  @Override
  public WorkflowStub create() {
      return ctx -> {
          String output = ctx.callActivity(
                  ActivityA.class.getName(),
                  "my-input",
                  new WorkflowTaskOptions("App2"), // 在这里设置将执行该活动的目标 App ID。
                  String.class
          ).await();

          ctx.complete(output);
      };
  }
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
@wfr.workflow
def app1_workflow(ctx: wf.DaprWorkflowContext):
  output = yield ctx.call_activity('ActivityA', input='my-input', app_id='App2')
  return output
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
public sealed class BusinessWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string input)
    {
        var options = new WorkflowTaskOptions { TargetAppId = "App2" };
        var output = await context.CallActivityAsync<string>(nameof(ActivityA), input, options);
        return output;
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

## 多应用子工作流示例

{{< diagram name="workflow-multi-app-child-workflow" width="70" >}}

以下示例展示如何在目标应用 `App2` 上执行子工作流 `Workflow2`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallChildWorkflow("Workflow2",
		workflow.WithChildWorkflowInput("my-input"),
		workflow.WithChildWorkflowAppID("App2"), // 在这里设置将执行该子工作流的目标 App ID。
	).Await(&output)

	if err != nil {
		return nil, err
	}

	return output, nil
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
@wfr.workflow
def workflow1(ctx: wf.DaprWorkflowContext):
  output = yield ctx.call_child_workflow(workflow='Workflow2', input='my-input', app_id='App2')
  return output
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
public sealed class BusinessWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string input)
    {
        var options = new ChildWorkflowTaskOptions { TargetAppId = "App2" };
        var output = await context.CallChildWorkflowAsync<string>(nameof(Workflow2), input, options);
        return output;
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

## 跨应用管理工作流

上面的示例是在一个正在运行的工作流*内部*组合跨应用的工作。[客户端级别的操作]({{% ref howto-manage-workflow.md %}})同样可以跨应用进行：只持有工作流客户端、本身不在工作流内部的应用程序，可以启动、查询和控制同一命名空间中其他应用所拥有的工作流实例。

这意味着，拥有工作流的应用无需为其他团队构建并维护专门的 API 来驱动它。运维工具可以通过实例 ID 终止卡住的订单，支持工具可以对它引发审批事件，前端服务也可以启动一个并非由自己托管的工作流，所有这些都通过标准的工作流 API 完成。拥有者应用始终掌握控制权：其[工作流访问策略]({{% ref workflow-access-policy.md %}})决定哪些调用方可以对哪个工作流执行哪些操作。策略资源的格式请参阅 [WorkflowAccessPolicy 规范]({{% ref workflow-access-policy-schema.md %}})。

### 适用场景

- **客户端级别的操作（本节）**：调用方不在工作流内部。例如 HTTP 处理程序、针对已知实例 ID 的运维工具，或启动自己并不托管的工作的服务。
- **[子工作流和活动](#多应用活动示例)**：调用方*本身就是*一个工作流，它将另一个应用的工作组合进自己的执行过程，并等待其结果。

### 工作原理

以应用 `app-a` 为例，它要终止由 `app-b` 拥有的工作流实例 `order-1`：

{{< diagram workflow-cross-app-client >}}

`app-a` 本身不托管任何工作流代码。它只需指明拥有者应用，其边车会完成其余工作：边车会将 `app-a` 标记为调用方，`app-b` 的边车则会先根据自身的[访问策略]({{% ref workflow-access-policy.md %}})检查该身份，然后才把操作交给实例。只有 `app-b` 会执行工作流。

由于策略是根据调用方身份进行评估的，因此要实现跨应用强制执行，必须启用 [mTLS]({{% ref mtls.md %}})。如果加载了策略但未启用 mTLS，目标端无法验证调用方身份，会拒绝该请求。

将应用 ID 留空，或将其设为调用方自身的应用 ID，即为普通的本地操作。对于早于此功能的运行时，应用 ID 会被忽略，操作只作用于本地应用。

启动、获取、引发事件、暂停、恢复、终止、清除和重新运行都可以指向另一个应用。重新运行（rerun）仅可通过 SDK 工作流客户端使用，HTTP 或 gRPC 工作流 API 不支持。列出实例 ID 和读取实例历史始终作用于本地应用。

### HTTP

在[工作流 API 参考]({{% ref workflow_api.md %}})的任意调用上添加 `appID` 查询参数：

```bash
# 启动由 app2 托管的工作流
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/OrderWF/start?appID=app2&instanceID=order-1"

# 在 app2 上查询它、引发事件并终止它
curl "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1?appID=app2"
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1/raiseEvent/approval?appID=app2" -d '"approved"'
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1/terminate?appID=app2"
```

### gRPC

在工作流请求消息上设置 `app_id` 字段（JSON 名称为 `appID`）：`StartWorkflowRequest`、`GetWorkflowRequest`、`TerminateWorkflowRequest`、`RaiseEventWorkflowRequest`、`PauseWorkflowRequest`、`ResumeWorkflowRequest` 和 `PurgeWorkflowRequest`。每一项都对应[工作流 API 参考]({{% ref workflow_api.md %}})中的一个操作：[启动]({{% ref "workflow_api.md#start-workflow-request" %}})、[获取]({{% ref "workflow_api.md#get-workflow-request" %}})、[终止]({{% ref "workflow_api.md#terminate-workflow-request" %}})、[引发事件]({{% ref "workflow_api.md#raise-event-request" %}})、[暂停]({{% ref "workflow_api.md#pause-workflow-request" %}})、[恢复]({{% ref "workflow_api.md#resume-workflow-request" %}})和[清除]({{% ref "workflow_api.md#purge-workflow-request" %}})。

### SDK

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

`app_id` 是每个客户端操作上的仅关键字参数。

```python
instance_id = client.schedule_new_workflow(workflow=order_wf, app_id='app2')

state = client.get_workflow_state(instance_id, app_id='app2')
client.raise_workflow_event(instance_id, 'approval', data='approved', app_id='app2')
client.pause_workflow(instance_id, app_id='app2')
client.resume_workflow(instance_id, app_id='app2')
client.terminate_workflow(instance_id, app_id='app2')
client.purge_workflow(instance_id, app_id='app2')
```

`dapr.ext.workflow.aio` 中的异步客户端接受相同的参数。[请参阅 Python 工作流示例。](https://github.com/dapr/python-sdk/tree/main/examples/workflow)

{{% /tab %}}

{{% tab ".NET" %}}

<!--dotnet-->

调度时通过 `StartWorkflowOptions` 指定目标；其他操作则通过 `targetAppId` 参数指定。

```csharp
var options = new StartWorkflowOptionsBuilder().WithTargetAppId("app2").Build();
var instanceId = await client.ScheduleNewWorkflowAsync("OrderWF", input: null, options: options);

var state = await client.GetWorkflowStateAsync(instanceId, "app2");
await client.RaiseEventAsync(instanceId, "approval", "approved", "app2");
await client.SuspendWorkflowAsync(instanceId, null, "app2");
await client.ResumeWorkflowAsync(instanceId, null, "app2");
await client.TerminateWorkflowAsync(instanceId, null, "app2");
await client.PurgeInstanceAsync(instanceId, "app2");
```

{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

调度时通过 `NewWorkflowOptions` 指定目标；其他操作则提供了末尾带 `appId` 参数的重载。

```java
NewWorkflowOptions options = new NewWorkflowOptions().setAppId("app2");
String instanceId = client.scheduleNewWorkflow(OrderWorkflow.class, options);

WorkflowState state = client.getWorkflowState(instanceId, true, "app2");
client.raiseEvent(instanceId, "approval", "approved", "app2");
client.suspendWorkflow(instanceId, null, "app2");
client.resumeWorkflow(instanceId, null, "app2");
client.terminateWorkflow(instanceId, null, "app2");
client.purgeWorkflow(instanceId, "app2");
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

每个操作都有各自的 App ID 选项。

```go
instanceID, err := client.ScheduleWorkflow(ctx, "OrderWF", workflow.WithAppID("app2"))

meta, err := client.FetchWorkflowMetadata(ctx, instanceID, workflow.WithFetchAppID("app2"))
err = client.RaiseEvent(ctx, instanceID, "approval", workflow.WithRaiseEventAppID("app2"))
err = client.SuspendWorkflow(ctx, instanceID, "", workflow.WithSuspendAppID("app2"))
err = client.ResumeWorkflow(ctx, instanceID, "", workflow.WithResumeAppID("app2"))
err = client.TerminateWorkflow(ctx, instanceID, workflow.WithTerminateAppID("app2"))
err = client.PurgeWorkflowState(ctx, instanceID, workflow.WithPurgeAppID("app2"))
```

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="SDK 可用性" color="warning" %}}
客户端级别的跨应用操作需要 Dapr 运行时 v1.19 或更高版本，以及随之发布的 SDK 支持。上面所示的参数和选项在较早的 SDK 版本中并不存在：在使用这些代码片段之前，请确认你的 SDK 版本已包含它们。

JavaScript SDK 不支持跨应用的客户端操作。
{{% /alert %}}

目标应用的[工作流访问策略]({{% ref workflow-access-policy.md %}})会按操作和工作流名称，依据 [WorkflowAccessPolicy 规范]({{% ref workflow-access-policy-schema.md %}})中定义的规则，决定每项操作是否被允许。不支持跨命名空间指定目标。

## 安全：工作流访问策略

使用多应用工作流时，你可能希望限制哪些应用程序可以在目标应用上调度活动或子工作流。Dapr 为此提供了 `WorkflowAccessPolicy` 资源。

策略是纯粹的允许列表，且对自身的调用始终被允许，因此目标应用无需在 `callers` 中列出自己，即可执行自己的活动。下面的示例工作流访问策略应用于 `ml-worker` 应用。所有指向给定 appID（本例中为 `ml-worker`）的策略，都会在应用实例化时由边车加载。

此策略允许 `orchestrator-app` 应用在 `ml-worker` 应用上调度 `TrainModel` 和 `ValidateModel` 活动。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: ml-worker-policy
  namespace: production
scopes:
  - ml-worker
spec:
  rules:
    - callers:
        - appID: orchestrator-app
      activities:
        - name: TrainModel
        - name: ValidateModel
```

请阅读[如何应用工作流访问策略]({{% ref workflow-access-policy %}})，了解更多示例以及跨应用强制执行模型的详细信息。

## 相关链接

- [使用快速入门体验 Dapr 工作流]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- [.NET 中的多应用工作流]({{% ref "dotnet-workflow-multi-app.md" %}})
- 试试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
