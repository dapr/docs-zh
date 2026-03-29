---
type: docs
title: "工作流版本控制"
linkTitle: "工作流版本控制"
weight: 2500
description: "在代码演进时安全地为工作流进行版本控制"
---

## 版本控制

在许多场景中，需要在工作流活跃运行时引入对工作流代码的更改。在这些更改具有非确定性的情况下，需要采用版本控制策略，以便现有工作流可以继续使用原始代码执行，而新工作流则使用更新后的版本。

工作流可以使用两种互补的方法进行版本控制，这两种方法旨在结合使用。它们是：
- [修补](#patching)
- [命名工作流版本控制](#named-workflow-versioning)

{{% alert title="注意" color="primary" %}}

在任一版本控制策略中，工作流都可能达到 `stalled`（停滞）状态。这通常发生在滚动部署期间，此时新旧版本的工作流代码同时运行。

当工作流在新副本上启动，但后续尝试在旧副本上重放时，版本化的工作流将变为停滞状态。

工作流可能会在整个滚动部署期间保持停滞状态，直到只有新副本可用为止。一旦停滞的工作流被调度到新副本上，它将继续执行。

如果工作流从未继续，则表示导致停滞的条件仍然存在，需要解决。请参阅下面每种版本控制方法中导致停滞的具体原因。
{{% /alert %}}

### 版本控制解决了什么问题？

为了最好地理解版本控制如何工作以及如何有效地使用它，首先了解它解决了什么以及为什么需要版本控制会很有帮助。工作流必须是确定性的，这意味着每次运行时，它们都会产生与上次完全相同的输出。

这是一个关键概念，因为 Dapr 工作流实现使用事件溯源方法来持久化工作流状态。当在工作流中执行活动和子工作流时，Dapr 会维护一个历史记录，记录这些边界执行的输入和输出。当每个活动完成时，我们会持久化更新后的事件历史，然后从顶部重新调用工作流（这称为"重放"）。这一次，当它遇到这些活动或子工作流之一时，它会替换已实现的输出并跳过重新执行，然后重复。

因此，至关重要的是，在工作流运行期间不得随意引入代码，因为当引擎重放工作流时，您的更改可能会导致工作流不再与其历史记录匹配并失败。

### 修补

修补是我们的两种版本控制方法中的第一种，它允许您在保持重放之间确定性的同时引入对工作流的更改。它的工作原理是允许您通过 `if` 语句插入与命名标识符关联的分支逻辑。工作流历史记录会在重放工作流时跟踪这些命名标识符的观察位置，从而确保在重放之间遵循一致的逻辑路径。

这使您能够仅对需要调整的特定位置对工作流代码进行有针对性的更改。

要添加补丁，请选择一个稳定的唯一名称来标识该补丁。这可以是描述性的内容，如 `use-sms`，它描述了补丁更改的内容，也可以是本质不同的内容，如当前时间戳或日期。您使用的具体值并不重要，只要不使用已部署到生产环境中的标识符即可。您将通过添加一个 `if` 语句来插入补丁，该语句评估工作流是否已应用此补丁——如果是，则使用补丁的代码；如果不是，则采用原始代码路径。

补丁标识符的唯一性要求仅扩展到此工作流；不会评估工作流之间的补丁，因此可以在多个工作流中使用重复的标识符而不会产生冲突。

以下示例演示了这一点，通过检查此工作流实例是否已应用 `use-sms` 补丁。如果是，则执行 `SendSMS` 活动；否则，它回退到原始路径并使用 `SendEmail` 活动。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
public sealed class MyWorkflow : Workflow<string, object?>
{
    public overrride async Task<object?> RunAsync(WorkflowContext context, string input)
    {
        // ...
        if (context.IsPatched("use-sms"))
        {
            // 修补后的代码
            await context.CallActivityAsync(nameof(SendSMS), input);
        }
        else {
            // 原始代码
            await context.CallActivityAsync(nameof(SendEmail), input);
        }
        return null;
    }
}
```

{{% /tab %}}

{{% tab "Go" %}}

```go
import "github.com/dapr/durabletask-go/workflow"

func Workflow(ctx *workflow.WorkflowContext) error {
  // ...
  if ctx.IsPatched("use-sms") {
    if err := ctx.CallActivity("SendSMS", ctx.GetInput()).Await(); err != nil {
      return err
    }
  } else {
    if err := ctx.CallActivity("SendEmail", ctx.GetInput()).Await(); err != nil {
      return err
    }
  }
  // ...
}

```

{{% /tab %}}

{{% tab "Python" %}}

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowRuntime

wfr = WorkflowRuntime()

@wfr.workflow
def my_workflow(ctx: DaprWorkflowContext, wf_input: str):
  # ...
  if ctx.is_patched("use-sms"):
    yield ctx.call_activity(send_sms)
  else:
    yield ctx.call_activity(send_email)
  # ...
```

{{% /tab %}}

{{< /tabpane >}}

使用这种方法，新的工作流实例将采用修补后的代码路径，但在引入补丁时正在运行的现有工作流将继续使用原始代码路径。补丁检查在首次评估时会记录在工作流实例历史记录中，这意味着可以在工作流的不同位置安全地使用相同的标识符。

同样，至关重要的是，一旦修补后的工作流在生产环境中运行，您就不应再重新使用该标识符。部署后，应假设引擎将以确定性方式处理工作流，但使用以前使用的标识符添加新补丁会破坏该契约：如果您的新代码插入位置早于正在运行的工作流实例评估到的位置，当它重放时，它将采用您的补丁分支，但您的更改可能不再与现有工作流历史记录匹配，并导致工作流无限期停滞（至少直到您删除新补丁或更新它以使用不同的唯一标识符）。

应用于工作流的补丁列表存储在工作流的历史记录中，因此重要的是要注意，您使用的补丁越多，工作流状态历史记录就越大。这将越来越对工作流性能产生负面影响，因为每次重放都需要检索它，并且随着状态的增长，这会增加检索和解析开销。

#### 验证停滞

除了上述重新使用标识符外，使用补丁时还有其他几个原因导致工作流停滞：
- 删除（或重命名）补丁标识符
- 更改补丁的顺序

您可以使用 [Dapr CLI 中的工作流命令]({{% ref dapr-workflow %}}) 来检查停滞的工作流。例如，以下是当工作流停滞时 `dapr workflow list` 命令的显示结果：
```bash
> dapr workflow list
NAME           ID          STATUS     AGE
workflow       <ID>        STALLED    9m39s
```

以下是当工作流停滞时 `dapr workflow history` 命令的显示结果：
```bash
> dapr workflow history <ID> -k -o wide
PLAY  TYPE                 NAME      TIMESTAMP    ELAPSED    STATUS   DETAILS        ROUTER     EXECUTION ID  ATTRS
0     ExecutionStarted     workflow  <TIMESTAMP>  Age:15.8h  RUNNING  workflowStart  workflows  <EXEC_ID>     input=2026-01-22T14:44:02.728101
1     OrchestratorStarted            <TIMESTAMP>  25.3ms     RUNNING  replay                                  versionName=workflow_v1
1     ExecutionStalled               <TIMESTAMP>  8.9m       STALLED                                          reason=VERSION_NAME_MISMATCH;description=Version not available: workflow_v1
```

#### 修补最佳实践

以下代表一些额外的建议，应考虑这些建议以消除因使用补丁而导致工作流停滞或失败的可能性：
- 应用补丁时，原始代码必须保持可用且不变，以便正在运行的工作流能够以相同的方式评估它。
- 补丁应以增量方式应用，这意味着一旦添加了补丁并部署了应用程序，就不应在工作流中移动或删除它们。它们必须存在以保持正在运行的工作流的确定性。
- 如上所述，您不得重新使用以前部署中使用的补丁标识符，因为这将破坏确定性保证。但是，您可以在同一部署中的多个位置使用相同的标识符，而无需在不同工作流之间担心冲突。
- 如果您可以在应用补丁时避免使用 `else` 分支，将使应用未来的补丁更容易。虽然替换现有代码时通常无法避免这种情况，但如果您只是向工作流添加新逻辑，这当然是可以管理的。
- 如果必须嵌套补丁，则必须在现有补丁内进行。例如，您的新补丁不能在 `else` 分支中包装现有的补丁。否则，正在运行的工作流将无法访问原始代码，从而破坏确定性保证。

### 命名工作流版本控制

命名工作流版本控制代表我们的第二种方法，有助于以确定性安全的方式对工作流进行版本控制。在此方法中，您通过复制现有工作流并为其分配一个新的"版本化"名称来引入新的工作流版本。因为您可以从头开始重构工作流逻辑以删除任何补丁并引入您想要的任何其他更改，所以这种方法提供了与以前工作流版本的干净断开。

虽然实现此目的的具体细节取决于您使用的语言 SDK，但通常，您将复制最新的工作流，为其分配一个反映较新版本的唯一名称，并向您的 SDK 注册它。将为每个工作流构建一个注册表，以便在运行时，Dapr 将使用工作流名称进行调用，SDK 将路由到旧工作流（如果正在运行）或较新版本。

请注意，在所有 SDK 中，运行时不会在版本之间顺序迁移工作流。相反，当 SDK 收到运行新工作流的请求时，它选择运行最新版本，而不仅仅是"下一个"版本，因此无需处理版本之间的任何补偿逻辑。

语言 SDK 可能会公开一种在使用相同工作流名称时注册版本的方法，但这因 SDK 而异，因此请参阅特定 SDK 的文档以获取更多信息。例如，某些可能使用一种机制，您可以在其中显式提供 `is_latest` 标志来指示哪个版本是最新版本。

当 SDK 收到运行未注册版本的工作流的请求时，工作流将停滞。这可能在应用程序滚动部署期间自然发生，但也可能在某个版本被删除而某些工作流实例仍在使用它时发生。建议是，除非您已独立确认没有未完成的（正在运行或休眠的）工作流实例正在针对该版本运行，否则不应删除较旧的命名工作流版本。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

.NET 使用源生成器自动识别和注册您的工作流版本，因此无需手动注册工作流（活动需要注册）。默认情况下，.NET 使用内置的可配置数字版本控制策略，其中版本作为名称的后缀提供。有关如何更改版本控制策略或配置以及如何在应用程序中设置版本控制，请参阅 [.NET SDK 文档]({{% ref dotnet-workflow-versioning %}})。

由于 .NET 应用程序不允许存在多个具有相同名称的类型，因此这不是此 SDK 中的选项。

要创建新的命名工作流版本，请复制现有工作流并修改类的名称以使用相同的前缀，但更改后缀中的版本标识符以反映较新的版本。重新构建应用程序，SDK 将自动处理其余部分。

{{% /tab %}}

{{% tab "Go" %}}

给定以下工作流定义：

```go
import "github.com/dapr/durabletask-go/workflow"

func WorkflowV1(ctx *workflow.WorkflowContext) error {
  // ...
  return nil
}

func WorkflowV2(ctx *workflow.WorkflowContext) error {
  // ...
  return nil
}
```

这是您注册这两个工作流的方式：

```go
import "github.com/dapr/durabletask-go/workflow"

registry := workflow.NewRegistry()
// 这是以前的工作流版本，因此 `isLatest` 为 false
registry.AddVersionedWorkflow("Workflow", false, WorkflowV1)
// 这是最新的工作流版本，因此 `isLatest` 为 true
registry.AddVersionedWorkflow("Workflow", true, WorkflowV2)

```

这是相同的示例，但显式设置版本名称：

```go
import "github.com/dapr/durabletask-go/workflow"

registry := workflow.NewRegistry()
// 这是以前的工作流版本，因此 `isLatest` 为 false
registry.AddVersionedWorkflow("Workflow", "WorkflowV1", false, WorkflowV1)
// 这是最新的工作流版本，因此 `isLatest` 为 true
registry.AddVersionedWorkflow("Workflow", "WorkflowV2", true, WorkflowV2)
```

**注意**：`AddVersionedOrchestrator` 和 `AddVersionedOrchestratorN` 的布尔参数指示工作流是否是最新版本。

{{% /tab %}}

{{% tab "Python" %}}

这是使用不同版本的工作流：

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowRuntime

wfr = WorkflowRuntime()

@wfr.versioned_workflow(name="workflow")
def workflow_v1(ctx: DaprWorkflowContext, wf_input: str):
  # ...

@wfr.versioned_workflow(name="workflow", is_latest=True)
def workflow_v2(ctx: DaprWorkflowContext, wf_input: str):
  # ...

```

这是相同的示例，但显式设置版本名称：

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowRuntime

wfr = WorkflowRuntime()

@wfr.versioned_workflow(name="workflow", version_name="workflow_v1")
def workflow_v1(ctx: DaprWorkflowContext, wf_input: str):
  # ...

@wfr.versioned_workflow(name="workflow", version_name="workflow_v2", is_latest=True)
def workflow_v2(ctx: DaprWorkflowContext, wf_input: str):
  # ...
```

{{% /tab %}}

{{< /tabpane >}}

### 版本控制流程指导

由于命名工作流与补丁完全兼容，因此该方法是对工作流的更改最初通过向现有工作流逻辑应用补丁来进行的。最终，在应用了几个补丁后，您将遇到以下问题之一：
- 由于应用的补丁数量，您担心工作流状态历史记录的开销；
- 很难遵循工作流逻辑的黄金路径；
- 您需要进行另一个工作流调整，但无法弄清楚如何应用不破坏确定性保证的补丁。

此时，建议您引入工作流的命名版本。复制现有工作流，更改其名称以反映您在 SDK 中使用的任何版本控制策略，并重构以删除所有补丁，仅保留预期的"最新"逻辑。应用您的新更改（此处无需补丁——这是一个新的工作流）并部署它。

在这里，根据需要再次应用补丁以解决未来的更改，并在必要时引入另一个命名工作流版本并继续。无限重复此过程。

建议您保留旧的工作流版本，直到您完全确信没有任何正在运行的（包括使用长期运行计时器延迟的）使用任何旧工作流版本的内容。

工作流版本控制不解决更改工作流本身的输入和输出类型的问题。作为一般指导，建议要么返回序列化值（如字符串），使输出的使用者能够随着时间的推移反序列化不同的输出，要么采用包含可选属性的复杂类型以包含新的预期输出值。
