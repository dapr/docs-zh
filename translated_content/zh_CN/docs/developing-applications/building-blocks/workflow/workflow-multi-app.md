---
type: docs
title: 多应用工作流
linkTitle: 多应用工作流
weight: 7000
description: "跨多个应用程序执行工作流"
---

单个工作流通常跨越多个应用程序、微服务或编程语言。
在这种情况下，活动或子工作流将在与托管父工作流不同的应用程序上执行。

这非常有用的一些场景包括：

- 机器学习（ML）训练活动必须在启用 GPU 的机器上执行，而工作流的其余部分在仅支持 CPU 的编排机器上运行。
- 活动需要访问仅对特定身份或区域可用的敏感数据或凭据。
- 工作流的不同部分需要在不同的信任区域或网络中执行。
- 由于数据驻留要求，工作流的不同部分需要在不同的地理区域中执行。
- 涉及的业务流程跨越多个团队或部门，每个团队或部门拥有自己的应用程序。
- 基于团队专业知识或现有代码库，工作流的实现跨越不同的编程语言。
- 不同的团队边界或微服务所有权。

<img src="/images/workflow-overview/workflow-multi-app-complex.png" width=800 alt="Diagram showing multi-application complex workflow">

下图显示了一个复杂工作流的示例场景，该工作流跨多个用不同语言编写的应用程序进行编排。每个应用程序的主要步骤和活动包括：

• **App1: 主工作流服务** - 协调整个 ML 管道的顶级编排器
- 启动流程
- 调用 App2 上的数据处理活动
- 调用 App3 上的 ML 训练子工作流
- 调用 App4 上的模型部署
- 结束完整工作流
- **语言: Java**

• **App2: 数据处理管道** - **仅限 GPU 活动**
- 数据摄取活动（GPU 加速）
- 特征工程活动（GPU 加速）
- 向主工作流返回完成信号
- **语言: Go**

• **App3: ML 训练子工作流** - 包含子工作流和活动
- 子工作流编排：
  - 数据处理活动
  - 模型训练活动（GPU 密集型）
  - 模型验证活动
- 由 App2 的活动完成触发
- 向主工作流返回完成信号
- **语言: Java**

• **App4: 模型服务** - **强大的 GPU 应用程序**，仅包含活动
- 模型加载活动（GPU 内存密集型）
- 推理设置活动（GPU 加速推理）
- 由 App3 的工作流完成触发
- 向主工作流返回完成信号
- **语言: Go**

## 多应用工作流

工作流执行路由基于[托管 Dapr 应用程序的 App ID]({{% ref "security-concept.md#application-identity" %}})。
默认情况下，完整的工作流执行托管在启动该工作流的 App ID 上。该工作流可以在该 App ID 的任何副本上执行，而不仅仅是调度该工作流的单个副本。


可以通过在工作流执行代码中指定目标 App ID 参数，在不同的 App ID 上执行活动和子工作流。
执行时，目标 App ID 执行活动或子工作流，并将结果返回给原始 App ID 的父工作流。

整个工作流执行可以分布在多个 App ID 上，没有限制，每个活动或子工作流都可以指定目标 App ID。
工作流的最终历史记录将由托管最顶层父工作流（或可将其视为根工作流）的 App ID 保存。

{{% alert title="限制" color="primary" %}}
与 Dapr 中的其他 API 构建块和资源一样，工作流限定在单个命名空间内。
这意味着参与多应用工作流的所有 App ID 必须位于同一命名空间中。
同样，所有 App ID 必须使用相同的工作流（或 actor）状态存储。
最后，目标 App ID 必须定义并注册该活动或子工作流，否则父工作流将无限重试。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
多应用工作流需要 Dapr 运行时 v1.16.0 或更高版本。.NET SDK 支持从 v1.17.0 开始可用。
{{% /alert %}}

{{% alert title="重要限制" color="warning" %}}
**支持多应用工作流的 SDK** - 多应用工作流通过 SDK 使用。
目前支持以下 SDK：
- **Java**（**仅**活动调用）
- **Go**（**同时**支持活动和子工作流调用）
- **Python**（**同时**支持活动和子工作流调用）
- **.NET**（**同时**支持活动和子工作流调用，需要 .NET SDK v1.17.0+）
- JavaScript SDK 支持计划在未来的版本中提供
{{% /alert %}}

## 错误处理

调用多应用活动或子工作流时：
- 如果目标应用程序不存在，将使用提供的重试策略重试调用。
- 如果目标应用程序存在但不包含指定的活动或工作流，调用将返回错误。
- 标准工作流重试策略适用于多应用调用。

拥有不同 App ID 的团队之间必须进行协调，以确保活动和子工作流在需要时已定义并可用，这一点至关重要。

## 持久活动结果

活动通常需要一定的时间来完成，或者在资源或美元成本上执行起来很昂贵。
因此，即使在异常路径中，也不希望对同一轮次执行这些活动超过一次。
在 1.17 之前的多应用场景中，活动会通过网络调用将响应发布给托管拥有工作流的其他应用程序。
在托管工作流应用程序关闭或无法访问的情况下，结果将丢失，活动将被重试，从而导致活动的重复执行。

在 1.17 中，启用 [`WorkflowsRemoteActivityReminder feature gate]({{% ref "support-preview-features.md" %}}) 将使活动结果在托管工作流应用程序处于离线或无法访问时，通过[提醒]({{% ref "workflow-features-concepts.md#durable-timers" %}})发送给拥有该工作流的应用程序，从而确保结果不会丢失并避免重复执行。
在所有应用程序上使用 Dapr 1.17 版本的所有用户都应启用此选项。
为了在 Dapr 版本之间保持向后兼容性，该选项默认处于 _**禁用**_ 状态，但将在未来的版本中默认启用。

## 多应用活动示例

<img src="/images/workflow-overview/workflow-multi-app-callactivity.png" width=800 alt="Diagram showing multi-application call activity workflow pattern">

以下示例展示如何在目标应用程序 `App2` 上执行活动 `ActivityA`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallActivity("ActivityA",
		workflow.WithActivityInput("my-input"),
		workflow.WithActivityAppID("App2"), // 这里我们设置将执行此活动的目标 App ID。
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
                  new WorkflowTaskOptions("App2"), // 这里我们设置将执行此活动的目标 App ID。
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

<img src="/images/workflow-overview/workflow-multi-app-child-workflow.png" width=800 alt="Diagram showing multi-application child workflow pattern">

以下示例展示如何在目标应用程序 `App2` 上执行子工作流 `Workflow2`。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	err := ctx.CallChildWorkflow("Workflow2",
		workflow.WithChildWorkflowInput("my-input"),
		workflow.WithChildWorkflowAppID("App2"), // 这里我们设置将执行此子工作流的目标 App ID。
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

## 相关链接

- [使用快速入门尝试 Dapr 工作流]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- [.NET 中的多应用工作流]({{% ref "dotnet-workflow-multi-app.md" %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
