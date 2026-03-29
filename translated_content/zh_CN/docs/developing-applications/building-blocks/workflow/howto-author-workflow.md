---
type: docs
title: "方法指南：编写工作流"
linkTitle: "方法指南：编写工作流"
weight: 5000
description: "了解如何开发和编写工作流"
---

本文提供有关如何编写由 Dapr 工作流引擎执行的工作流的高级概述。

{{% alert title="Note" color="primary" %}}
 如果你还没有尝试过，建议先体验一下 [工作流快速入门]({{% ref workflow-quickstart.md %}}) ，快速了解如何使用工作流。

{{% /alert %}}


## 以代码形式编写工作流

Dapr 工作流逻辑使用通用编程语言实现，使你能够：

- 使用你偏好的编程语言（无需学习新的 DSL 或 YAML 模式）。
- 访问语言的标准库。
- 构建你自己的库和抽象。
- 使用调试器并检查局部变量。
- 像应用程序的其他部分一样编写工作流的单元测试。

Dapr 边车不会加载任何工作流定义。相反，边车只是驱动工作流的执行，所有工作流活动都作为应用程序的一部分。

## 编写工作流活动

[工作流活动]({{% ref "workflow-features-concepts.md#workflow-activites" %}}) 是工作流中的基本工作单元，是在业务流程中被编排的任务。

{{< tabpane text=true >}}

{{% tab "Python"落了}}

<!--python-->

定义你希望工作流执行的工作流活动。活动是一个函数定义，可以接受输入和输出。以下示例创建了一个名为 `hello_act` 的计数器（活动），用于通知用户当前的计数器值。`hello_act` 是一个从名为 `WorkflowActivityContext` 的类派生的函数。

```python
@wfr.activity(name='hello_act')
def hello_act(ctx: WorkflowActivityContext, wf_input):
    global counter
    counter += wf_input
    print(f'New counter value is: {counter}!', flush=True)
```

[查看任务链工作流活动的上下文。](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)


{{% /tab "%}}

{{% tab "JavaScript"落了}}

<!--javascript-->

定义你希望工作流执行的工作流活动。活动被包装在 `WorkflowActivityContext` 类中，该类实现了工作流活动。 

```javascript
export default class WorkflowActivityContext {
  private readonly _innerContext: ActivityContext;
  constructor(innerContext: ActivityContext) {
    if (!innerContext) {
      throw new Error("ActivityContext cannot be undefined");
    }
    this._innerContext = innerContext;
  }

  public getWorkflowInstanceId(): string {
    return this._innerContext.orchestrationId;
  }

  public getWorkflowActivityId(): number {
    return this._innerContext.taskId;
  }
}
```

[查看工作流活动的上下文。](https://github.com/dapr/js-sdk/blob/main/src/workflow/runtime/WorkflowActivityContext.ts)


{{% /tab "%}}

{{% tab ".NET"落了}}

<!--csharp-->

定义你希望工作流执行的工作流活动。活动是一个类定义，可以接受输入和输出。活动还参与依赖注入，例如绑定到 Dapr 客户端。 

以下示例中调用的活动包括：
- `NotifyActivity`：接收新订单通知。
- `ReserveInventoryActivity`：检查是否有足够的库存来满足新订单。
- `ProcessPaymentActivity`：处理订单付款。包括 `NotifyActivity` 用于发送成功订单通知。

### NotifyActivity

```csharp
public class NotifyActivity : WorkflowActivity<Notification, object>
{
    //...

    public NotifyActivity(ILoggerFactory loggerFactory)
    {
        this.logger = loggerFactory.CreateLogger<NotifyActivity>();
    }

    //...
}
```

[查看完整的 `NotifyActivity.cs` 工作流活动示例。](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Activities/NotifyActivity.cs)

### ReserveInventoryActivity

```csharp
public class ReserveInventoryActivity : WorkflowActivity<InventoryRequest, InventoryResult>
{
    //...

    public ReserveInventoryActivity(ILoggerFactory loggerFactory, DaprClient client)
    {
        this.logger = loggerFactory.CreateLogger<ReserveInventoryActivity>();
        this.client = client;
    }

    //...

}
```
[查看完整的 `ReserveInventoryActivity.cs` 工作流活动示例。](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Activities/ReserveInventoryActivity.cs)

### ProcessPaymentActivity

```csharp
public class ProcessPaymentActivity : WorkflowActivity<PaymentRequest, object>
{
    //...
    public ProcessPaymentActivity(ILoggerFactory loggerFactory)
    {
        this.logger = loggerFactory.CreateLogger<ProcessPaymentActivity>();
    }

    //...

}
```

[查看完整的 `ProcessPaymentActivity.cs` 工作流活动示例。](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Activities/ProcessPaymentActivity.cs)

{{% /tab "%}}

{{% tab "Java"落了}}

<!--java-->

定义你希望工作流执行的工作流活动。活动被包装在公共 `DemoWorkflowActivity` 类中，该类实现了工作流活动。 

```java
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class DemoWorkflowActivity implements WorkflowActivity {

  @Override
  public DemoActivityOutput run(WorkflowActivityContext ctx) {
    Logger logger = LoggerFactory.getLogger(DemoWorkflowActivity.class);
    logger.info("Starting Activity: " + ctx.getName());

    var message = ctx.getInput(DemoActivityInput.class).getMessage();
    var newMessage = message + " World!, from Activity";
    logger.info("Message Received from input: " + message);
    logger.info("Sending message to output: " + newMessage);

    logger.info("Sleeping for 5 seconds to simulate long running operation...");

    try {
      TimeUnit.SECONDS.sleep(5);
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }


    logger.info("Activity finished");

    var output = new DemoActivityOutput(message, newMessage);
    logger.info("Activity returned: " + output);

    return output;
  }
}
```

[查看 Java SDK 工作流活动示例的上下文。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowActivity.java)

{{% /tab "%}}

{{% tab "Go"落了}}

<!--go-->

### 定义工作流活动

定义你希望工作流执行的每个工作流活动。活动输入可以使用 `ctx.GetInput` 从上下文中解组。活动应定义为接受 `ctx workflow.ActivityContext` 参数并返回接口和错误的函数。
 
```go
func BusinessActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	
	// Do something here
	return "result", nil
}
```

### 定义工作流

使用参数 `ctx *workflow.WorkflowContext` 定义工作流函数，并返回 any 和 error。从工作流内部调用你定义的活动。

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	var output string
	if err := ctx.CallActivity(BusinessActivity, workflow.ActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}
	if err := ctx.WaitForExternalEvent("businessEvent", time.Minute*60).Await(&output); err != nil {
		return nil, err
	}
	
	if err := ctx.CreateTimer(time.Second).Await(nil); err != nil {
		return nil, nil
	}
	return output, nil
}
```

### 注册工作流和活动

在你的应用程序可以执行工作流之前，你必须将工作流编排器和其活动注册到工作流注册表中。这确保 Dapr 知道在执行工作流时调用哪些函数。

```go
func main() {
	// Create a workflow registry
	r := workflow.NewRegistry()

	// Register the workflow orchestrator
	if err := r.AddWorkflow(BusinessWorkflow); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessWorkflow registered")

	// Register the workflow activities
	if err := r.AddActivity(BusinessActivity); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessActivity registered")

	// Create workflow client and start worker
	wclient, err := client.NewWorkflowClient()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Worker initialized")

	ctx, cancel := context.WithCancel(context.Background())
	if err = wclient.StartWorker(ctx, r); err != nil {
		log.Fatal(err)
	}
	fmt.Println("runner started")

	// Your application logic continues here...
	// Example: Start a workflow
	instanceID, err := wclient.ScheduleWorkflow(ctx, "BusinessWorkflow", workflow.WithInput(1))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}
	fmt.Printf("workflow started with id: %v\n", instanceID)

	// Stop workflow worker when done
	cancel()
	fmt.Println("workflow worker successfully shutdown")
}
```

**关于注册的关键要点：**
- 使用 `workflow.NewRegistry()` 创建工作流注册表
- 使用 `r.AddWorkflow()` 注册工作流函数
- 使用 `r.AddActivity()` 注册活动函数  
- 使用 `client.NewWorkflowClient()` 创建工作流客户端
- 调用 `wclient.StartWorker()` 开始处理工作流
- 使用 `wclient.ScheduleWorkflow` 调度命名的工作流实例

[查看 Go SDK 工作流活动示例的上下文。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab "%}}

{{< /tabpane >}}

## 编写工作流

接下来，在工作流中注册和调用活动。 

{{< tabpane text=true >}}

{{% tab "Python"落了}}

<!--python-->

`hello_world_wf` 函数是一个从名为 `DaprWorkflowContext` 的类派生的函数，具有输入和输出参数类型。它还包括一个 `yield` 语句，该语句完成工作流的核心逻辑并调用工作流活动。 
 
```python
@wfr.workflow(name='hello_world_wf')
def hello_world_wf(ctx: DaprWorkflowContext, wf_input):
    print(f'{wf_input}')
    yield ctx.call_activity(hello_act, input=1)
    yield ctx.call_activity(hello_act, input=10)
    yield ctx.call_activity(hello_retryable_act, retry_policy=retry_policy)
    yield ctx.call_child_workflow(child_retryable_wf, retry_policy=retry_policy)

    # Change in event handling: Use when_any to handle both event and timeout
    event = ctx.wait_for_external_event(event_name)
    timeout = ctx.create_timer(timedelta(seconds=30))
    winner = yield when_any([event, timeout])

    if winner == timeout:
        print('Workflow timed out waiting for event')
        return 'Timeout'

    yield ctx.call_activity(hello_act, input=100)
    yield ctx.call_activity(hello_act, input=1000)
    return 'Completed'
```

[查看 `hello_world_wf` 工作流的上下文。](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)


{{% /tab "%}}

{{% tab "JavaScript"落了}}

<!--javascript-->

接下来，向 `WorkflowRuntime` 类注册工作流并启动工作流运行时。
 
```javascript
export default class WorkflowRuntime {

  //..
  // Register workflow implementation for handling orchestrations
  public registerWorkflow(workflow: TWorkflow): WorkflowRuntime {
    const name = getFunctionName(workflow);
    const workflowWrapper = (ctx: OrchestrationContext, input: any): any => {
      const workflowContext = new WorkflowContext(ctx);
      return workflow(workflowContext, input);
    };
    this.worker.addNamedOrchestrator(name, workflowWrapper);
    return this;
  }

  // Register workflow activities
  public registerActivity(fn: TWorkflowActivity<TInput, TOutput>): WorkflowRuntime {
    const name = getFunctionName(fn);
    const activityWrapper = (ctx: ActivityContext, input: TInput): TOutput => {
      const wfActivityContext = new WorkflowActivityContext(ctx);
      return fn(wfActivityContext, input);
    };
    this.worker.addNamedActivity(name, activityWrapper);
    return this;
  }

  // Start the workflow runtime processing items and block.
  public async start() {
    await this.worker.start();
  }

}
```

[查看 `WorkflowRuntime` 的上下文。](https://github.com/dapr/js-sdk/blob/main/src/workflow/runtime/WorkflowRuntime.ts)


{{% /tab "%}}

{{% tab ".NET"落了}}

<!--csharp-->

`OrderProcessingWorkflow` 类是从名为 `Workflow` 的基类派生的，具有输入和输出参数类型。它还包括一个 `RunAsync` 方法，该方法完成工作流的核心逻辑并调用工作流活动。 

```csharp
 class OrderProcessingWorkflow : Workflow<OrderPayload, OrderResult>
    {
        public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderPayload order)
        {
            //...

            await context.CallActivityAsync(
                nameof(NotifyActivity),
                new Notification($"Received order {orderId} for {order.Name} at {order.TotalCost:c}"));

            //...

            InventoryResult result = await context.CallActivityAsync<InventoryResult>(
                nameof(ReserveInventoryActivity),
                new InventoryRequest(RequestId: orderId, order.Name, order.Quantity));
            //...
            
            await context.CallActivityAsync(
                nameof(ProcessPaymentActivity),
                new PaymentRequest(RequestId: orderId, order.TotalCost, "USD"));

            await context.CallActivityAsync(
                nameof(NotifyActivity),
                new Notification($"Order {orderId} processed successfully!"));

            // End the workflow with a success result
            return new OrderResult(Processed: true);
        }
    }
```

[查看 `OrderProcessingWorkflow.cs` 中的完整工作流示例。](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Workflows/OrderProcessingWorkflow.cs)


{{% /tab "%}}

{{% tab "Java"落了}}

<!--java-->

接下来，向 `WorkflowRuntimeBuilder` 注册工作流并启动工作流运行时。

```java
public class DemoWorkflowWorker {

  public static void main(String[] args) throws Exception {

    // Register the Workflow with the builder.
    WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder().registerWorkflow(DemoWorkflow.class);
    builder.registerActivity(DemoWorkflowActivity.class);

    // Build and then start the workflow runtime pulling and executing tasks
    try (WorkflowRuntime runtime = builder.build()) {
      System.out.println("Start workflow runtime");
      runtime.start();
    }

    System.exit(0);
  }
}
```

[查看 Java SDK 工作流的上下文。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflowWorker.java)


{{% /tab "%}}

{{% tab "Go"落了}}

<!--go-->

使用参数 `ctx *workflow.WorkflowContext` 定义工作流函数，并返回 any 和 error。从工作流内部调用你定义的活动。

```go
func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	var output string
	if err := ctx.CallActivity(BusinessActivity, workflow.ActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}
	if err := ctx.WaitForExternalEvent("businessEvent", time.Minute*60).Await(&output); err != nil {
		return nil, err
	}
	
	if err := ctx.CreateTimer(time.Second).Await(nil); err != nil {
		return nil, nil
	}
	return output, nil
}
```

[查看 Go SDK 工作流的上下文。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab "%}}

{{< /tabpane >}}

## 编写应用程序

最后，使用工作流编写应用程序。

{{< tabpane text=true >}}

{{% tab "Python"落了}}

<!--python-->

[在以下示例中](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)，对于使用 Python SDK 的基本 Python hello world 应用程序，你的项目代码应包括：

- 一个名为 `DaprClient` 的 Python 包，用于接收 Python SDK 功能。
- 一个带有扩展的构建器：
  - `WorkflowRuntime`：允许你注册工作流运行时。 
  - `DaprWorkflowContext`：允许你 [创建工作流]({{% ref "#write-the-workflow" %}})
  - `WorkflowActivityContext`：允许你 [创建工作流活动]({{% ref "#write-the-workflow-activities" %}})
- API 调用。在以下示例中，这些调用启动、暂停、恢复、清除和完成工作流。
 
```python
from datetime import timedelta
from time import sleep
from dapr.ext.workflow import (
    WorkflowRuntime,
    DaprWorkflowContext,
    WorkflowActivityContext,
    RetryPolicy,
    DaprWorkflowClient,
    when_any,
)
from dapr.conf import Settings
from dapr.clients.exceptions import DaprInternalError

settings = Settings()

counter = 0
retry_count = 0
child_orchestrator_count = 0
child_orchestrator_string = ''
child_act_retry_count = 0
instance_id = 'exampleInstanceID'
child_instance_id = 'childInstanceID'
workflow_name = 'hello_world_wf'
child_workflow_name = 'child_wf'
input_data = 'Hi Counter!'
event_name = 'event1'
event_data = 'eventData'
non_existent_id_error = 'no such instance exists'

retry_policy = RetryPolicy(
    first_retry_interval=timedelta(seconds=1),
    max_number_of_attempts=3,
    backoff_coefficient=2,
    max_retry_interval=timedelta(seconds=10),
    retry_timeout=timedelta(seconds=100),
)

wfr = WorkflowRuntime()


@wfr.workflow(name='hello_world_wf')
def hello_world_wf(ctx: DaprWorkflowContext, wf_input):
    print(f'{wf_input}')
    yield ctx.call_activity(hello_act, input=1)
    yield ctx.call_activity(hello_act, input=10)
    yield ctx.call_activity(hello_retryable_act, retry_policy=retry_policy)
    yield ctx.call_child_workflow(child_retryable_wf, retry_policy=retry_policy)

    # Change in event handling: Use when_any to handle both event and timeout
    event = ctx.wait_for_external_event(event_name)
    timeout = ctx.create_timer(timedelta(seconds=30))
    winner = yield when_any([event, timeout])

    if winner == timeout:
        print('Workflow timed out waiting for event')
        return 'Timeout'

    yield ctx.call_activity(hello_act, input=100)
    yield ctx.call_activity(hello_act, input=1000)
    return 'Completed'


@wfr.activity(name='hello_act')
def hello_act(ctx: WorkflowActivityContext, wf_input):
    global counter
    counter += wf_input
    print(f'New counter value is: {counter}!', flush=True)


@wfr.activity(name='hello_retryable_act')
def hello_retryable_act(ctx: WorkflowActivityContext):
    global retry_count
    if (retry_count % 2) == 0:
        print(f'Retry count value is: {retry_count}!', flush=True)
        retry_count += 1
        raise ValueError('Retryable Error')
    print(f'Retry count value is: {retry_count}! This print statement verifies retry', flush=True)
    retry_count += 1


@wfr.workflow(name='child_retryable_wf')
def child_retryable_wf(ctx: DaprWorkflowContext):
    global child_orchestrator_string, child_orchestrator_count
    if not ctx.is_replaying:
        child_orchestrator_count += 1
        print(f'Appending {child_orchestrator_count} to child_orchestrator_string!', flush=True)
        child_orchestrator_string += str(child_orchestrator_count)
    yield ctx.call_activity(
        act_for_child_wf, input=child_orchestrator_count, retry_policy=retry_policy
    )
    if child_orchestrator_count < 3:
        raise ValueError('Retryable Error')


@wfr.activity(name='act_for_child_wf')
def act_for_child_wf(ctx: WorkflowActivityContext, inp):
    global child_orchestrator_string, child_act_retry_count
    inp_char = chr(96 + inp)
    print(f'Appending {inp_char} to child_orchestrator_string!', flush=True)
    child_orchestrator_string += inp_char
    if child_act_retry_count % 2 == 0:
        child_act_retry_count += 1
        raise ValueError('Retryable Error')
    child_act_retry_count += 1


def main():
    wfr.start()
    wf_client = DaprWorkflowClient()

    print('==========Start Counter Increase as per Input:==========')
    wf_client.schedule_new_workflow(
        workflow=hello_world_wf, input=input_data, instance_id=instance_id
    )

    wf_client.wait_for_workflow_start(instance_id)

    # Sleep to let the workflow run initial activities
    sleep(12)

    assert counter == 11
    assert retry_count == 2
    assert child_orchestrator_string == '1aa2bb3cc'

    # Pause Test
    wf_client.pause_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)
    print(f'Get response from {workflow_name} after pause call: {metadata.runtime_status.name}')

    # Resume Test
    wf_client.resume_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)
    print(f'Get response from {workflow_name} after resume call: {metadata.runtime_status.name}')

    sleep(2)  # Give the workflow time to reach the event wait state
    wf_client.raise_workflow_event(instance_id=instance_id, event_name=event_name, data=event_data)

    print('========= Waiting for Workflow completion', flush=True)
    try:
        state = wf_client.wait_for_workflow_completion(instance_id, timeout_in_seconds=30)
        if state.runtime_status.name == 'COMPLETED':
            print('Workflow completed! Result: {}'.format(state.serialized_output.strip('"')))
        else:
            print(f'Workflow failed! Status: {state.runtime_status.name}')
    except TimeoutError:
        print('*** Workflow timed out!')

    wf_client.purge_workflow(instance_id=instance_id)
    try:
        wf_client.get_workflow_state(instance_id=instance_id)
    except DaprInternalError as err:
        if non_existent_id_error in err._message:
            print('Instance Successfully Purged')

    sleep(10000)
    wfr.shutdown()


if __name__ == '__main__':
    main()
```

{{% /tab "%}}

{{% tab "JavaScript"落了}}

<!--javascript-->

[以下示例](https://github.com/dapr/js-sdk/blob/main/src/workflow/client/DaprWorkflowClient.ts) 是使用 JavaScript SDK 的基本 JavaScript 应用程序。与此示例一样，你的项目代码应包括：

- 一个带有扩展的构建器：
  - `WorkflowRuntime`：允许你注册工作流和工作流活动
  - `DaprWorkflowContext`：允许你 [创建工作流]({{% ref "#write-the-workflow" %}})
  - `WorkflowActivityContext`：允许你 [创建工作流活动]({{% ref "#write-the-workflow-activities" %}})
- API 调用。以下示例是一个使用工作流 API 的简单项目：

```bash
mkdir my-wf && cd my-wf
npm init -y
npm i @dapr/dapr @microsoft/durabletask-js
npm i -D typescript ts-node @types/node
```

创建以下 `tsconfig.json` 文件：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建以下 `src/app.ts` 文件：

```typescript
import {
  WorkflowRuntime,
  WorkflowActivityContext,
  WorkflowContext,
  DaprWorkflowClient,
  TWorkflow
} from "@dapr/dapr";

const workflowClient = new DaprWorkflowClient();
const workflowRuntime = new WorkflowRuntime();

// simple activity
const hello = async (_: WorkflowActivityContext, name: string) => `Hello ${name}!`;

// simple workflow: call the activity 3 times
const sequence: TWorkflow = async function* (ctx: WorkflowContext): any {
  const out: string[] = [];
  out.push(yield ctx.callActivity(hello, "Tokyo"));
  out.push(yield ctx.callActivity(hello, "Seattle"));
  out.push(yield ctx.callActivity(hello, "London"));
  out.push(yield ctx.waitForExternalEvent("continue"));
  return out;
};

async function main() {
  workflowRuntime.registerWorkflow(sequence).registerActivity(hello);
  await workflowRuntime.start();

  const id = await workflowClient.scheduleNewWorkflow(sequence);
  console.log("Scheduled:", id);

  workflowClient.raiseEvent(id, "continue", "Go go go!");

  const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);
  console.log("Done:", state?.runtimeStatus, "output:", state?.serializedOutput);

  await new Promise(f => setTimeout(f, 100000));

  await workflowRuntime.stop();
  await workflowClient.stop();

}

main().catch((e) => { console.error(e); });
```

{{% /tab "%}}

{{% tab ".NET"落了}}

<!--csharp-->

[在以下 `Program.cs` 示例中](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Program.cs)，对于使用 .NET SDK 的基本 ASP.NET 订单处理应用程序，你的项目代码应包括：

- 一个名为 `Dapr.Workflow` 的 NuGet 包，用于接收 .NET SDK 功能
- 一个带有扩展方法 `AddDaprWorkflow` 的构建器
  - 这允许你注册工作流和工作流活动（工作流可以调度的任务）
- HTTP API 调用
  - 一个用于提交新订单
  - 一个用于检查现有订单的状态

```csharp
using Dapr.Workflow;
//...

// Dapr Workflows are registered as part of the service configuration
builder.Services.AddDaprWorkflow(options =>
{
    // Note that it's also possible to register a lambda function as the workflow
    // or activity implementation instead of a class.
    options.RegisterWorkflow<OrderProcessingWorkflow>();

    // These are the activities that get invoked by the workflow(s).
    options.RegisterActivity<NotifyActivity>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<ProcessPaymentActivity>();
});

WebApplication app = builder.Build();

// POST starts new order workflow instance
app.MapPost("/orders", async (DaprWorkflowClient client, [FromBody] OrderPayload orderInfo) =>
{
    if (orderInfo?.Name == null)
    {
        return Results.BadRequest(new
        {
            message = "Order data was missing from the request",
            example = new OrderPayload("Paperclips", 99.95),
        });
    }

//...
});

// GET fetches state for order workflow to report status
app.MapGet("/orders/{orderId}", async (string orderId, DaprWorkflowClient client) =>
{
    WorkflowState state = await client.GetWorkflowStateAsync(orderId, true);
    if (!state.Exists)
    {
        return Results.NotFound($"No order with ID = '{orderId}' was found.");
    }

    var httpResponsePayload = new
    {
        details = state.ReadInputAs<OrderPayload>(),
        status = state.RuntimeStatus.ToString(),
        result = state.ReadOutputAs<OrderResult>(),
    };

//...
}).WithName("GetOrderInfoEndpoint");

app.Run();
```

{{% /tab "%}}

{{% tab "Java"落了}}

<!--java-->

[如以下示例所示](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflow.java)，使用 Java SDK 和 Dapr Workflow 的 hello-world 应用程序应包括：

- 一个名为 `io.dapr.workflows.client` 的 Java 包，用于接收 Java SDK 客户端功能。
- 导入 `io.dapr.workflows.Workflow`
- `DemoWorkflow` 类，它扩展了 `Workflow`
- 使用输入和输出创建工作流。
- API 调用。在以下示例中，这些调用启动并调用工作流活动。
 
```java
package io.dapr.examples.workflows;

import com.microsoft.durabletask.CompositeTaskFailedException;
import com.microsoft.durabletask.Task;
import com.microsoft.durabletask.TaskCanceledException;
import io.dapr.workflows.Workflow;
import io.dapr.workflows.WorkflowStub;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

/**
 * Implementation of the DemoWorkflow for the server side.
 */
public class DemoWorkflow extends Workflow {
  @Override
  public WorkflowStub create() {
    return ctx -> {
      ctx.getLogger().info("Starting Workflow: " + ctx.getName());
      // ...
      ctx.getLogger().info("Calling Activity...");
      var input = new DemoActivityInput("Hello Activity!");
      var output = ctx.callActivity(DemoWorkflowActivity.class.getName(), input, DemoActivityOutput.class).await();
      // ...
    };
  }
}
```

[查看完整的 Java SDK 工作流示例的上下文。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/DemoWorkflow.java)

{{% /tab "%}}

{{% tab "Go"落了}}

<!--go-->

[如以下示例所示](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)，使用 Go SDK 和 Dapr Workflow 的 hello-world 应用程序应包括：

- 一个名为 `client` 的 Go 包，用于接收 Go SDK 客户端功能。
- `BusinessWorkflow` 方法
- 使用输入和输出创建工作流。
- API 调用。在以下示例中，这些调用启动并调用工作流活动。


```go
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/dapr/durabletask-go/workflow"
	"github.com/dapr/go-sdk/client"
)

var stage = 0
var failActivityTries = 0

func main() {
	r := workflow.NewRegistry()

	if err := r.AddWorkflow(BusinessWorkflow); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessWorkflow registered")

	if err := r.AddActivity(BusinessActivity); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessActivity registered")

	if err := r.AddActivity(FailActivity); err != nil {
		log.Fatal(err)
	}
	fmt.Println("FailActivity registered")

	wclient, err := client.NewWorkflowClient()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Worker initialized")

	ctx, cancel := context.WithCancel(context.Background())
	if err = wclient.StartWorker(ctx, r); err != nil {
		log.Fatal(err)
	}
	fmt.Println("runner started")

	// Start workflow test
	// Set the start time to the current time to not wait for the workflow to
	// "start". This is useful for increasing the throughput of creating
	// workflows.
	// workflow.WithStartTime(time.Now())
	instanceID, err := wclient.ScheduleWorkflow(ctx, "BusinessWorkflow", workflow.WithInstanceID("a7a4168d-3a1c-41da-8a4f-e7f6d9c718d9"), workflow.WithInput("1"))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}
	fmt.Printf("workflow started with id: %v\n", instanceID)

	// Pause workflow test
	err = wclient.SuspendWorkflow(ctx, instanceID, "")
	if err != nil {
		log.Fatalf("failed to pause workflow: %v", err)
	}

	respFetch, err := wclient.FetchWorkflowMetadata(ctx, instanceID, workflow.WithFetchPayloads(true))
	if err != nil {
		log.Fatalf("failed to fetch workflow: %v", err)
	}

	if respFetch.RuntimeStatus != workflow.StatusSuspended {
		log.Fatalf("workflow not paused: %s: %v", respFetch.RuntimeStatus, respFetch)
	}

	fmt.Printf("workflow paused\n")

	// Resume workflow test
	err = wclient.ResumeWorkflow(ctx, instanceID, "")
	if err != nil {
		log.Fatalf("failed to resume workflow: %v", err)
	}

	respFetch, err = wclient.FetchWorkflowMetadata(ctx, instanceID, workflow.WithFetchPayloads(true))
	if err != nil {
		log.Fatalf("failed to get workflow: %v", err)
	}

	if respFetch.RuntimeStatus != workflow.StatusRunning {
		log.Fatalf("workflow not running")
	}

	fmt.Println("workflow resumed")

	fmt.Printf("stage: %d\n", stage)

	// Raise Event
	err = wclient.RaiseEvent(ctx, instanceID, "businessEvent", workflow.WithEventPayload("testData"))
	if err != nil {
		fmt.Printf("failed to raise event: %v", err)
	}

	fmt.Println("workflow event raised")

	time.Sleep(time.Second) // allow workflow to advance

	fmt.Printf("stage: %d\n", stage)

	_, err = wclient.WaitForWorkflowCompletion(ctx, instanceID)
	if err != nil {
		log.Fatalf("failed to wait for workflow: %v", err)
	}

	fmt.Printf("fail activity executions: %d\n", failActivityTries)

	respFetch, err = wclient.FetchWorkflowMetadata(ctx, instanceID, workflow.WithFetchPayloads(true))
	if err != nil {
		log.Fatalf("failed to get workflow: %v", err)
	}

	fmt.Printf("workflow status: %v\n", respFetch.String())

	// Purge workflow test
	err = wclient.PurgeWorkflowState(ctx, instanceID)
	if err != nil {
		log.Fatalf("failed to purge workflow: %v", err)
	}

	respFetch, err = wclient.FetchWorkflowMetadata(ctx, instanceID, workflow.WithFetchPayloads(true))
	if err == nil || respFetch != nil {
		log.Fatalf("failed to purge workflow: %v", err)
	}

	fmt.Println("workflow purged")

	fmt.Printf("stage: %d\n", stage)

	// Terminate workflow test
	id, err := wclient.ScheduleWorkflow(ctx, "BusinessWorkflow", workflow.WithInstanceID("a7a4168d-3a1c-41da-8a4f-e7f6d9c718d9"), workflow.WithInput("1"))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}
	fmt.Printf("workflow started with id: %v\n", instanceID)

	metadata, err := wclient.WaitForWorkflowStart(ctx, id)
	if err != nil {
		log.Fatalf("failed to get workflow: %v", err)
	}
	fmt.Printf("workflow status: %s\n", metadata.String())

	err = wclient.TerminateWorkflow(ctx, id)
	if err != nil {
		log.Fatalf("failed to terminate workflow: %v", err)
	}
	fmt.Println("workflow terminated")

	err = wclient.PurgeWorkflowState(ctx, id)
	if err != nil {
		log.Fatalf("failed to purge workflow: %v", err)
	}
	fmt.Println("workflow purged")

	<-ctx.Done()
	cancel()

	fmt.Println("workflow worker successfully shutdown")
}

func BusinessWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input string
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	var output string
	if err := ctx.CallActivity(BusinessActivity, workflow.WithActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}

	err := ctx.WaitForExternalEvent("businessEvent", time.Minute*60).Await(&output)
	if err != nil {
		return nil, err
	}

	if err := ctx.CallActivity(BusinessActivity, workflow.WithActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}

	if err := ctx.CallActivity(FailActivity, workflow.WithActivityRetryPolicy(&workflow.RetryPolicy{
		MaxAttempts:          3,
		InitialRetryInterval: 100 * time.Millisecond,
		BackoffCoefficient:   2,
		MaxRetryInterval:     1 * time.Second,
	})).Await(nil); err == nil {
		return nil, fmt.Errorf("unexpected no error executing fail activity")
	}

	return output, nil
}

func BusinessActivity(ctx workflow.ActivityContext) (any, error) {
	var input string
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	iinput, err := strconv.Atoi(input)
	if err != nil {
		return "", err
	}

	stage += iinput

	return fmt.Sprintf("Stage: %d", stage), nil
}

func FailActivity(ctx workflow.ActivityContext) (any, error) {
	failActivityTries += 1
	return nil, errors.New("dummy activity error")
}
```

[查看完整的 Go SDK 工作流示例的上下文。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab "%}}

{{< /tabpane >}}


{{% alert title="重要提示" color="warning" %}}
由于基于重放的工作流的执行方式，你需要在**活动内部**编写执行 I/O 和与系统交互等逻辑的代码。同时，**工作流方法**仅用于编排这些活动。

{{% /alert "%}}

## 运行工作流并使用 Diagrid Dashboard 检查工作流执行

通过你的 IDE 或 Dapr CLI 启动工作流应用程序（如果你想启动多个应用程序，请使用 [Dapr 多应用运行]({{%  ref multi-app-overview.md %}})；如果只启动一个应用程序，请使用常规 [Dapr run 命令](#testing-the-workflow-via-the-dapr-cli)），然后调度一个新的工作流实例。

使用本地 [Diagrid Dashboard](https://diagrid.ws/diagrid-dashboard-docs) 可视化和检查你的工作流状态，并深入查看详细的工作流执行历史。仪表板作为容器运行，连接到 Dapr 工作流使用的状态存储（默认情况下是本地 Redis 实例）。

<img src="/images/workflow-overview/workflow-diagrid-dashboard.png" width=800 alt="Diagrid Dashboard showing local workflow executions"/><br/>

使用 Docker 启动 Diagrid Dashboard 容器：

```bash
docker run -p 8080:8080 ghcr.io/diagridio/diagrid-dashboard:latest
```

{{% alert title="Note" color="primary" %}}
如果你使用的状态存储不是默认的 Redis 实例，你需要提供一些额外的参数来运行容器，请参阅 [Diagrid Dashboard 参考文档](https://diagrid.ws/diagrid-dashboard-docs)。
{{% /alert "%}}

<!-- IGNORE_LINKS -->
在浏览器中打开仪表板，地址为 [http://localhost:8080](http://localhost:8080)。
<!-- END_IGNORE -->

## 通过 Dapr CLI 测试工作流

编写工作流后，你可以使用 Dapr CLI 进行测试：

{{< tabpane text=true >}}

{{% tab "Python"落了}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app python3 app.py
```
确保应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run hello_world_wf --app-id workflow-app --input 'hello world' --instance-id test-run
```

#### 检查工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 查看已完成的工作流
```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

#### 查看工作流历史
```bash
dapr workflow history --app-id workflow-app test-run
```

{{% /tab "%}}

{{% tab "JavaScript"落了}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app npx ts-node src/app.ts
```
确保应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run sequence --app-id workflow-app --input 'hello world' --instance-id test-run
```

#### 检查工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发等待的外部事件
```bash
dapr workflow raise-event --app-id workflow-app test-run/businessEvent
```

#### 查看已完成的工作流
```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

#### 查看工作流历史
```bash
dapr workflow history --app-id workflow-app test-run
```

{{% /tab "%}}

{{% tab ".NET"落了}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app dotnet run
```
确保应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run OrderProcessingWorkflow --app-id workflow-app  --instance-id test-run --input '{"name": "Paperclips", "totalCost": 99.95}'
```

#### 检查工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发等待的外部事件
```bash
dapr workflow raise-event --app-id workflow-app test-run/incoming-purchase-order --input '{"name": "Paperclips", "totalCost": 99.95}'
```

#### 查看已完成的工作流
```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

#### 查看工作流历史
```bash
dapr workflow history --app-id workflow-app test-run
```

{{% /tab "%}}

{{% tab "Java"落了}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app -- java -jar target/WorkflowService-0.0.1-SNAPSHOT.jar
```

确保应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run DemoWorkflow --app-id workflow-app  --instance-id test-run --input "input data"
```

#### 检查工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发等待的外部事件
```bash
dapr workflow raise-event --app-id workflow-app test-run/TestEvent --input 'TestEventPayload'
dapr workflow raise-event --app-id workflow-app test-run/event1 --input 'TestEvent 1 Payload'
dapr workflow raise-event --app-id workflow-app test-run/event2 --input 'TestEvent 2 Payload'
dapr workflow raise-event --app-id workflow-app test-run/event3 --input 'TestEvent 3 Payload'
```

#### 查看已完成的工作流
```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

#### 查看工作流历史
```bash
dapr workflow history --app-id workflow-app test-run
```

{{% /tab "%}}

{{% tab "Go"落了}}

#### 运行工作流应用程序
```bash
dapr run --app-id workflow-app go run main.go
```

确保应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run BusinessWorkflow --app-id workflow-app --input '1' --instance-id test-run
```

#### 检查工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发等待的外部事件
```bash
dapr workflow raise-event --app-id workflow-app test-run/businessEvent
```

#### 查看已完成的工作流
```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

#### 查看工作流历史
```bash
dapr workflow history test-run --app-id workflow-app
```

{{% /tab "%}}

{{< /tabpane >}}


### 监控工作流执行

```bash
dapr workflow list --app-id workflow-app --filter-status RUNNING -o wide
```

```bash
dapr workflow list --app-id workflow-app --filter-status FAILED -o wide
```

```bash
dapr workflow list --app-id workflow-app --filter-status COMPLETED -o wide
```

### 测试外部事件

```bash
# 触发你的工作流正在等待的事件
dapr workflow raise-event <instance-id>/ApprovalReceived \
  --app-id workflow-app \
  --input '{"approved": true, "approver": "manager@company.com"}'
```

### 调试失败的工作流

```bash
# 列出失败的工作流
dapr workflow list --app-id workflow-app --filter-status FAILED --output wide

# 获取失败工作流的详细历史
dapr workflow history <failed-instance-id> --app-id workflow-app --output json

# 修复问题后重新运行工作流
dapr workflow rerun <failed-instance-id> --app-id workflow-app --input '<new-input-json-data>'
```

## 下一步

现在你已经编写了一个工作流，学习如何管理它。

{{< button text="管理工作流 >>" page="howto-manage-workflow.md" >}}

## 相关链接
- [工作流概述]({{% ref workflow-overview.md %}})
- 尝试完整的 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
