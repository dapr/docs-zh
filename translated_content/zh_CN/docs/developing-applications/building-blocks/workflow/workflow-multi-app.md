---
type: docs
title: multi-application workflow
linkTitle: multi-application workflow
weight: 7000
description: "跨多个应用程序执行 workflow"
---

单个 workflow 通常会跨越多个应用程序、微服务或编程语言。
这时，activity 或 child workflow 会在与托管父 workflow 不同的应用程序上执行。

以下是一些适用的场景：

- 机器学习（ML）训练 activity 必须在启用 GPU 的机器上执行，而 workflow 的其余部分在仅支持 CPU 的编排机器上运行。
- activity 需要访问仅特定身份或区域才能使用的敏感数据或凭据。
- workflow 的不同部分需要在不同的信任区域或网络中执行。
- 由于数据驻留要求，workflow 的不同部分需要在不同的地理区域中执行。
- 某个业务流程涉及多个团队或部门，每个团队或部门各自拥有自己的应用程序。
- 基于团队专长或现有代码库，workflow 的实现跨越不同的编程语言。
- 不同的团队边界或微服务归属。

下图展示了一个复杂 workflow 的示例场景，该 workflow 跨越多个用不同编程语言编写的应用程序进行编排。

{{< diagram workflow-multi-app-complex >}}

各应用程序的主要步骤和 activity 如下：

• **App1: 主 workflow 服务** - 协调整个 ML 管道的顶层编排器
- 启动流程
- 调用 App2 上的数据处理 activity
- 调用 App3 上的 ML 训练 child workflow
- 调用 App4 上的模型部署
- 结束完整的 workflow
- **语言：Java**

• **App2: 数据处理管道** - **仅限 GPU activity**
- 数据摄取 activity（GPU 加速）
- 特征工程 activity（GPU 加速）
- 向主 workflow 返回完成信号
- **语言：Go**

• **App3: ML 训练 child workflow** - 包含一个 child workflow 和若干 activity
- child workflow 编排：
  - 数据处理 activity
  - 模型训练 activity（GPU 密集型）
  - 模型验证 activity
- 由 App2 的 activity 完成后触发
- 向主 workflow 返回完成信号
- **语言：Java**

• **App4: 模型服务** - **高配 GPU 应用**，仅包含 activity
- 模型加载 activity（GPU 内存密集型）
- 推理设置 activity（GPU 加速推理）
- 由 App3 的 workflow 完成后触发
- 向主 workflow 返回完成信号
- **语言：Go**

## multi-application workflow

workflow 执行的路由基于[托管 Dapr 应用程序的 App ID]({{% ref "security-concept.md#application-identity" %}})。
默认情况下，完整的 workflow 执行托管在启动该 workflow 的 App ID 上。该 workflow 可以在此 App ID 的任意副本上执行，而不仅限于调度该 workflow 的那一个副本。


可以通过在 workflow 执行代码中指定目标 App ID 参数，在不同的 App ID 上执行 activity 和 child workflow。
执行时，目标 App ID 会执行该 activity 或 child workflow，并将结果返回给发起方 App ID 的父 workflow。

整个 workflow 执行可以分布在任意数量的 App ID 上，每个 activity 或 child workflow 各自指定目标 App ID。
workflow 的最终历史记录由托管根（最顶层的父）workflow 的 App ID 保存。

{{% alert title="限制" color="primary" %}}
与 Dapr 中的其他 API building block 和资源一样，workflow 的作用域限定在单个 namespace 内。
这意味着参与 multi-application workflow 的所有 App ID 必须位于同一 namespace 中。
跨 namespace 的 workflow 不受支持：来自不同 namespace 的调用方对目标发起的任何 workflow 或 activity 调用都会被拒绝。
同样，所有 App ID 必须使用相同的 workflow（或 actor）state store。
最后，目标 App ID 必须已定义并注册该 activity 或 child workflow，否则父 workflow 会无限重试。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
multi-application workflow 需要 Dapr runtime v1.16.0 或更高版本。.NET SDK 从 v1.17.0 开始提供支持。
{{% /alert %}}

{{% alert title="重要限制" color="warning" %}}
**支持 multi-application workflow 的 SDK** - multi-application workflow 通过 SDK 使用。
目前支持以下 SDK：
- **Java**（**仅** activity 调用）
- **Go**（**同时**支持 activity 和 child workflow 调用）
- **Python**（**同时**支持 activity 和 child workflow 调用）
- **.NET**（**同时**支持 activity 和 child workflow 调用，需要 .NET SDK v1.17.0+）
- JavaScript SDK 计划在未来的版本中提供支持
{{% /alert %}}

## 错误处理

调用多应用 activity 或 child workflow 时：
- 如果目标应用程序不存在，将使用所提供的重试策略重试该调用。
- 如果目标应用程序存在，但不包含指定的 activity 或 workflow，调用将返回错误。
- 标准 workflow 重试策略同样适用于多应用调用。

目标应用（无论本地还是远程）没有连接任何 workflow 工作进程时，[客户端操作](#跨应用管理-workflow)会立即失败，错误信息为 `no workflow worker is connected for app '<app-id>'`。该错误提示你需要启动应用，或等待其工作进程连接，而不是返回类似 `did not find address for actor` 的 actor 路由错误。启动 workflow 在这种情况下不再重试，因此错误会比以前提前约 20 秒返回。原始错误仍被包装在其中，因此现有的错误代码检查依然有效。

至关重要的是，负责不同 App ID 的团队之间必须相互协调，确保 activity 和 child workflow 在需要时已经定义并可用。

## 持久化 activity 结果

activity 通常需要一定时间才能完成，或者在资源或金钱成本上执行起来较为昂贵。
因此，即使在异常路径下，也不希望同一轮次的 activity 被执行多次。
在 1.17 之前的多应用场景中，activity 会通过网络调用将响应发布给托管所属 workflow 的其他应用程序。
如果托管 workflow 的应用程序宕机或无法访问，结果就会丢失，activity 随之被重试，从而导致 activity 被重复执行。

在 1.17 中，启用 [`WorkflowsRemoteActivityReminder` feature gate]({{% ref "support-preview-features.md" %}})后，activity 结果会通过[reminder]({{% ref "workflow-features-concepts.md#durable-timers" %}})发送给所属的 workflow 应用程序。即使该应用程序离线或无法访问，结果也不会丢失，从而避免重复执行。
所有应用程序都运行 Dapr 1.17 或更高版本的用户，都应启用此选项。
从 1.18 开始，该 feature gate_**默认启用**_。在 1.17 中，为了保持 Dapr 版本之间的向后兼容性，它默认处于禁用状态，可以通过该 feature gate 主动开启。

## 多应用 activity 示例

{{< diagram name="workflow-multi-app-activity" width="75" >}}

以下示例展示如何在目标应用 `App2` 上执行 activity `ActivityA`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallActivity("ActivityA",
		workflow.WithActivityInput("my-input"),
		workflow.WithActivityAppID("App2"), // 在这里设置将执行该 activity 的目标 App ID。
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
                  new WorkflowTaskOptions("App2"), // 在这里设置将执行该 activity 的目标 App ID。
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

## 多应用 child workflow 示例

{{< diagram name="workflow-multi-app-child-workflow" width="70" >}}

以下示例展示如何在目标应用 `App2` 上执行 child workflow `Workflow2`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallChildWorkflow("Workflow2",
		workflow.WithChildWorkflowInput("my-input"),
		workflow.WithChildWorkflowAppID("App2"), // 在这里设置将执行该 child workflow 的目标 App ID。
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

## 跨应用管理 workflow

上面的示例是在一个正在运行的 workflow*内部*组合跨应用的工作。[客户端级别的操作]({{% ref howto-manage-workflow.md %}})同样可以跨应用进行：只持有 Workflow Client、本身不在 workflow 内部的应用程序，可以启动、查询和控制同一 namespace 中其他应用所拥有的 workflow instance。

这意味着，拥有 workflow 的应用无需为其他团队构建并维护专门的 API 来驱动它。运维工具可以通过实例 ID 终止卡住的订单，支持工具可以对它引发审批事件，前端服务也可以启动一个并非由自己托管的 workflow，所有这些都通过标准的 workflow API 完成。拥有者应用始终掌握控制权：其[workflow access policy]({{% ref workflow-access-policy.md %}})决定哪些调用方可以对哪个 workflow 执行哪些操作。策略资源的格式请参阅 [WorkflowAccessPolicy 规范]({{% ref workflow-access-policy-schema.md %}})。

### 适用场景

- **客户端级别的操作（本节）**：调用方不在 workflow 内部。例如 HTTP 处理程序、针对已知实例 ID 的运维工具，或启动自己并不托管的工作的服务。
- **[child workflow 和 activity](#多应用-activity-示例)**：调用方*本身就是*一个 workflow，它将另一个应用的工作组合进自己的执行过程，并等待其结果。

### 工作原理

以应用 `app-a` 为例，它要终止由 `app-b` 拥有的 workflow instance `order-1`：

{{< diagram workflow-cross-app-client >}}

`app-a` 本身不托管任何 workflow 代码。它只需指明拥有者应用，其 sidecar 会完成其余工作：sidecar 会将 `app-a` 标记为调用方，`app-b` 的 sidecar 则会先根据自身的[访问策略]({{% ref workflow-access-policy.md %}})检查该身份，然后才把操作交给实例。只有 `app-b` 会执行 workflow。

由于策略是根据调用方身份进行评估的，因此要实现跨应用强制执行，必须启用 [mTLS]({{% ref mtls.md %}})。如果加载了策略但未启用 mTLS，目标端无法验证调用方身份，会拒绝该请求。

将应用 ID 留空，或将其设为调用方自身的应用 ID，即为普通的本地操作。对于早于此功能的运行时，应用 ID 会被忽略，操作只作用于本地应用。

启动、获取、引发事件、暂停、恢复、终止、清除和重新运行都可以指向另一个应用。重新运行（rerun）仅可通过 SDK Workflow Client 使用，HTTP 或 gRPC workflow API 不支持。列出实例 ID 和读取实例历史始终作用于本地应用。

### HTTP

在[workflow API 参考]({{% ref workflow_api.md %}})的任意调用上添加 `appID` 查询参数：

```bash
# 启动由 app2 托管的 workflow
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/OrderWF/start?appID=app2&instanceID=order-1"

# 在 app2 上查询它、引发事件并终止它
curl "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1?appID=app2"
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1/raiseEvent/approval?appID=app2" -d '"approved"'
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/order-1/terminate?appID=app2"
```

### gRPC

在 workflow 请求消息上设置 `app_id` 字段（JSON 名称为 `appID`）：`StartWorkflowRequest`、`GetWorkflowRequest`、`TerminateWorkflowRequest`、`RaiseEventWorkflowRequest`、`PauseWorkflowRequest`、`ResumeWorkflowRequest` 和 `PurgeWorkflowRequest`。每一项都对应[workflow API 参考]({{% ref workflow_api.md %}})中的一个操作：[启动]({{% ref "workflow_api.md#start-workflow-request" %}})、[获取]({{% ref "workflow_api.md#get-workflow-request" %}})、[终止]({{% ref "workflow_api.md#terminate-workflow-request" %}})、[引发事件]({{% ref "workflow_api.md#raise-event-request" %}})、[暂停]({{% ref "workflow_api.md#pause-workflow-request" %}})、[恢复]({{% ref "workflow_api.md#resume-workflow-request" %}})和[清除]({{% ref "workflow_api.md#purge-workflow-request" %}})。

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

`dapr.ext.workflow.aio` 中的异步客户端接受相同的参数。[请参阅 Python workflow 示例。](https://github.com/dapr/python-sdk/tree/main/examples/workflow)

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
客户端级别的跨应用操作需要 Dapr runtime v1.19 或更高版本，以及随之发布的 SDK 支持。上面所示的参数和选项在较早的 SDK 版本中并不存在：在使用这些代码片段之前，请确认你的 SDK 版本已包含它们。

JavaScript SDK 不支持跨应用的客户端操作。
{{% /alert %}}

目标应用的[workflow access policy]({{% ref workflow-access-policy.md %}})会按操作和 workflow 名称，依据 [WorkflowAccessPolicy 规范]({{% ref workflow-access-policy-schema.md %}})中定义的规则，决定每项操作是否被允许。不支持跨 namespace 指定目标。

## 安全：workflow access policy

使用 multi-application workflow 时，你可能希望限制哪些应用程序可以在目标应用上调度 activity 或 child workflow。Dapr 为此提供了 `WorkflowAccessPolicy` 资源。

策略是纯粹的允许列表，且对自身的调用始终被允许，因此目标应用无需在 `callers` 中列出自己，即可执行自己的 activity。下面的示例 workflow access policy 应用于 `ml-worker` 应用。所有指向给定 appID（本例中为 `ml-worker`）的策略，都会在应用实例化时由 sidecar 加载。

此策略允许 `orchestrator-app` 应用在 `ml-worker` 应用上调度 `TrainModel` 和 `ValidateModel` activity。

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

请阅读[如何应用 workflow access policy]({{% ref workflow-access-policy %}})，了解更多示例以及跨应用强制执行模型的详细信息。

## 相关链接

- [使用 Quickstart 体验 Dapr Workflow]({{% ref workflow-quickstart.md %}})
- [workflow 概述]({{% ref workflow-overview.md %}})
- [workflow API 参考]({{% ref workflow_api.md %}})
- [.NET 中的 multi-application workflow]({{% ref "dotnet-workflow-multi-app.md" %}})
- 试试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
