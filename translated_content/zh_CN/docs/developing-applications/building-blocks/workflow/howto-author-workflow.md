---
type: docs
title: "方法指南：编写工作流"
linkTitle: "方法指南：编写工作流"
weight: 5000
description: "了解如何开发和编写工作流"
---

本文提供有关如何编写由 Dapr 工作流引擎执行的工作流的高级概述。

{{% alert title="Note" color="primary" %}}
如果你还没有尝试过，建议先体验一下 [工作流快速入门]({{% ref workflow-quickstart.md %}})，快速了解如何使用工作流。

{{% /alert %}}


## 以代码形式编写工作流

Dapr 工作流逻辑使用通用编程语言实现，使你能够：

- 使用你偏好的编程语言（无需学习新的 DSL 或 YAML 模式）。
- 访问语言的标准库。
- 构建你自己的库和抽象。
- 使用调试器并检查局部变量。
- 像应用程序的其他部分一样，为工作流编写单元测试。

Dapr 边车不会加载任何工作流定义。相反，边车只是驱动工作流的执行，所有工作流活动都作为应用程序的一部分。

## 编写工作流活动

[工作流活动]({{% ref "workflow-features-concepts.md#workflow-activites" %}})是工作流中的基本工作单元，也是在业务流程中被编排的任务。

{{< tabpane text=true >}}

{{% tab "Python" %}}

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


{{% /tab %}}

{{% tab "JavaScript" %}}

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

[查看上下文中的工作流活动。](https://github.com/dapr/js-sdk/blob/main/src/workflow/runtime/WorkflowActivityContext.ts)


{{% /tab %}}

{{% tab ".NET" %}}

<!--csharp-->

定义你希望工作流执行的工作流活动。活动是一个类定义，可以接受输入和输出。活动也参与依赖注入，例如 binding 到 Dapr 客户端。

下面示例中调用的活动包括：
- `NotifyActivity`：接收新订单的通知。
- `ReserveInventoryActivity`：检查库存是否足以满足新订单。
- `ProcessPaymentActivity`：为订单处理付款。其中包含 `NotifyActivity`，用于发送订单处理成功的通知。

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

{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

定义你希望工作流执行的工作流活动。活动被包装在公共类 `DemoWorkflowActivity` 中，该类实现了工作流活动。

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

[查看上下文中的 Java SDK 工作流活动示例。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/chain/ToUpperCaseActivity.java)

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

### 定义工作流活动

定义你希望工作流执行的每个工作流活动。活动的输入可以通过 `ctx.GetInput` 从上下文中反序列化。活动应定义为接受一个 `ctx workflow.ActivityContext` 参数，并返回一个接口和一个错误。

```go
func BusinessActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	
	// 在此处执行一些操作
	return "result", nil
}
```

### 定义工作流

使用参数 `ctx *workflow.WorkflowContext` 定义工作流函数，并返回任意类型和一个错误。在工作流中调用你定义的活动。

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

在应用程序能够执行工作流之前，必须将工作流编排器及其活动一同注册到工作流注册表中。这样可以确保 Dapr 知道在执行工作流时应调用哪些函数。

```go
func main() {
	// 创建工作流注册表
	r := workflow.NewRegistry()

	// 注册工作流编排器
	if err := r.AddWorkflow(BusinessWorkflow); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessWorkflow registered")

	// 注册工作流活动
	if err := r.AddActivity(BusinessActivity); err != nil {
		log.Fatal(err)
	}
	fmt.Println("BusinessActivity registered")

	// 创建工作流客户端并启动工作器
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

	// 应用程序的其余逻辑在此继续...
	// 示例：启动工作流
	instanceID, err := wclient.ScheduleWorkflow(ctx, "BusinessWorkflow", workflow.WithInput(1))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}
	fmt.Printf("workflow started with id: %v\n", instanceID)

	// 完成后停止工作流工作器
	cancel()
	fmt.Println("workflow worker successfully shutdown")
}
```

**注册要点：**
- 使用 `workflow.NewRegistry()` 创建工作流注册表
- 使用 `r.AddWorkflow()` 注册工作流函数
- 使用 `r.AddActivity()` 注册活动函数
- 使用 `client.NewWorkflowClient()` 创建工作流客户端
- 调用 `wclient.StartWorker()` 开始处理工作流
- 使用 `wclient.ScheduleWorkflow` 调度工作流的一个命名实例

[查看上下文中的 Go SDK 工作流活动示例。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab %}}

{{< /tabpane >}}

## 编写工作流

接下来，在工作流中注册并调用这些活动。

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

`hello_world_wf` 函数是一个从名为 `DaprWorkflowContext` 的类派生的函数，带有输入和输出参数类型。它还包含 `yield` 语句，负责工作流的主要逻辑并调用工作流活动。

```python
@wfr.workflow(name='hello_world_wf')
def hello_world_wf(ctx: DaprWorkflowContext, wf_input):
    print(f'{wf_input}')
    yield ctx.call_activity(hello_act, input=1)
    yield ctx.call_activity(hello_act, input=10)
    yield ctx.call_activity(hello_retryable_act, retry_policy=retry_policy)
    yield ctx.call_child_workflow(child_retryable_wf, retry_policy=retry_policy)

    # 事件处理的变化：使用 when_any 同时处理事件与超时
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

[查看上下文中的 `hello_world_wf` 工作流。](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)


{{% /tab %}}

{{% tab "JavaScript" %}}

<!--javascript-->

接下来，使用 `WorkflowRuntime` 类注册工作流，并启动工作流运行时。

```javascript
export default class WorkflowRuntime {

  //..
  // 注册用于处理编排的工作流实现
  public registerWorkflow(workflow: TWorkflow): WorkflowRuntime {
    const name = getFunctionName(workflow);
    const workflowWrapper = (ctx: OrchestrationContext, input: any): any => {
      const workflowContext = new WorkflowContext(ctx);
      return workflow(workflowContext, input);
    };
    this.worker.addNamedOrchestrator(name, workflowWrapper);
    return this;
  }

  // 注册工作流活动
  public registerActivity(fn: TWorkflowActivity<TInput, TOutput>): WorkflowRuntime {
    const name = getFunctionName(fn);
    const activityWrapper = (ctx: ActivityContext, input: TInput): TOutput => {
      const wfActivityContext = new WorkflowActivityContext(ctx);
      return fn(wfActivityContext, input);
    };
    this.worker.addNamedActivity(name, activityWrapper);
    return this;
  }

  // 启动工作流运行时以处理条目，并保持阻塞。
  public async start() {
    await this.worker.start();
  }

}
```

[查看上下文中的 `WorkflowRuntime`。](https://github.com/dapr/js-sdk/blob/main/src/workflow/runtime/WorkflowRuntime.ts)


{{% /tab %}}

{{% tab ".NET" %}}

<!--csharp-->

`OrderProcessingWorkflow` 类派生自名为 `Workflow` 的基类，带有输入和输出参数类型。它还包含 `RunAsync` 方法，负责工作流的主要逻辑并调用工作流活动。

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

            // 以成功结果结束工作流
            return new OrderResult(Processed: true);
        }
    }
```

[查看 `OrderProcessingWorkflow.cs` 中的完整工作流示例。](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Workflows/OrderProcessingWorkflow.cs)


{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

接下来，使用 `WorkflowRuntimeBuilder` 注册工作流，并启动工作流运行时。

```java
public class DemoWorkflowWorker {

  public static void main(String[] args) throws Exception {

    // 向构建器注册工作流
    WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder().registerWorkflow(DemoWorkflow.class);
    builder.registerActivity(DemoWorkflowActivity.class);

    // 构建并启动工作流运行时，拉取并执行任务
    try (WorkflowRuntime runtime = builder.build()) {
      System.out.println("Start workflow runtime");
      runtime.start();
    }

    System.exit(0);
  }
}
```

[查看上下文中的 Java SDK 工作流示例。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/chain/DemoChainWorker.java)


{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

使用参数 `ctx *workflow.WorkflowContext` 定义工作流函数，并返回任意类型和一个错误。在工作流中调用你定义的活动。

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

[查看上下文中的 Go SDK 工作流示例。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab %}}

{{< /tabpane >}}

## 编写应用程序

最后，使用该工作流组装应用程序。

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

[以下示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)是一个使用 Python SDK 的基础 Python Hello World 应用程序。对于该示例，你的项目代码将包括：

- 一个名为 `DaprClient` 的 Python 包，用于获取 Python SDK 的各项能力。
- 一组构建器扩展，包括：
  - `WorkflowRuntime`：允许你注册工作流运行时。
  - `DaprWorkflowContext`：允许你[创建工作流]({{% ref "#write-the-workflow" %}})。
  - `WorkflowActivityContext`：允许你[创建工作流活动]({{% ref "#write-the-workflow-activities" %}})。
- API 调用。在下面的示例中，这些调用用于启动、暂停、恢复、清除以及完成工作流。

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

    # 事件处理的变化：使用 when_any 同时处理事件与超时
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

    # 休眠，让工作流运行初始活动
    sleep(12)

    assert counter == 11
    assert retry_count == 2
    assert child_orchestrator_string == '1aa2bb3cc'

    # 暂停测试
    wf_client.pause_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)
    print(f'Get response from {workflow_name} after pause call: {metadata.runtime_status.name}')

    # 恢复测试
    wf_client.resume_workflow(instance_id=instance_id)
    metadata = wf_client.get_workflow_state(instance_id=instance_id)
    print(f'Get response from {workflow_name} after resume call: {metadata.runtime_status.name}')

    sleep(2)  # 留出时间，让工作流到达事件等待状态
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

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--javascript-->

[以下示例](https://github.com/dapr/js-sdk/blob/main/src/workflow/client/DaprWorkflowClient.ts)是一个使用 JavaScript SDK 的基础 JavaScript 应用程序。与此示例一样，你的项目代码将包括：

- 一组构建器扩展，包括：
  - `WorkflowRuntime`：允许你注册工作流和工作流活动
  - `DaprWorkflowContext`：允许你[创建工作流]({{% ref "#write-the-workflow" %}})
  - `WorkflowActivityContext`：允许你[创建工作流活动]({{% ref "#write-the-workflow-activities" %}})
- API 调用。以下示例是一个调用工作流 API 的简单项目：

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

// 简单活动
const hello = async (_: WorkflowActivityContext, name: string) => `Hello ${name}!`;

// 简单工作流：调用活动 3 次
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

{{% /tab %}}

{{% tab ".NET" %}}

<!--csharp-->

[在下面的 `Program.cs` 示例中](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Program.cs)，对于一个使用 .NET SDK 的基础 ASP.NET 订单处理应用程序，你的项目代码将包括：

- 一个名为 `Dapr.Workflow` 的 NuGet 包，用于获取 .NET SDK 的各项能力
- 一个带有扩展方法 `AddDaprWorkflow` 的构建器
  - 这将允许你注册工作流和工作流活动（工作流可以调度的任务）
- HTTP API 调用
  - 一个用于提交新订单
  - 一个用于查询现有订单的状态

```csharp
using Dapr.Workflow;
//...

// Dapr 工作流作为服务配置的一部分进行注册
builder.Services.AddDaprWorkflow(options =>
{
    // 注意，也可以将 lambda 函数注册为工作流，
    // 或活动的实现，而不是使用类。
    options.RegisterWorkflow<OrderProcessingWorkflow>();

    // 以下是由工作流调用的活动。
    options.RegisterActivity<NotifyActivity>();
    options.RegisterActivity<ReserveInventoryActivity>();
    options.RegisterActivity<ProcessPaymentActivity>();
});

WebApplication app = builder.Build();

// POST 启动新的订单工作流实例
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

// GET 获取订单工作流的状态以报告进度
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

{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

[如下示例](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/chain/DemoChainWorkflow.java)所示，一个使用 Java SDK 和 Dapr 工作流的 hello-world 应用程序将包括：

- 一个名为 `io.dapr.workflows.client` 的 Java 包，用于获取 Java SDK 客户端的能力。
- 导入 `io.dapr.workflows.Workflow`
- 扩展 `Workflow` 的 `DemoWorkflow` 类
- 创建带有输入和输出的工作流。
- API 调用。在下面的示例中，这些调用用于启动工作流并调用工作流活动。

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
 * 服务器端 DemoWorkflow 的实现。
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

[查看上下文中的完整 Java SDK 工作流示例。](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/workflows/chain/DemoChainWorkflow.java)

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

[如下示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)所示，一个使用 Go SDK 和 Dapr 工作流的 hello-world 应用程序将包括：

- 一个名为 `client` 的 Go 包，用于获取 Go SDK 客户端的能力。
- `BusinessWorkflow` 方法
- 创建带有输入和输出的工作流。
- API 调用。在下面的示例中，这些调用用于启动工作流并调用工作流活动。


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

	// 启动工作流测试
	// 将开始时间设置为当前时间，以免等待工作流“启动”。
	// 这有助于提高创建
	// 工作流的吞吐量。
	// workflow.WithStartTime(time.Now())
	instanceID, err := wclient.ScheduleWorkflow(ctx, "BusinessWorkflow", workflow.WithInstanceID("a7a4168d-3a1c-41da-8a4f-e7f6d9c718d9"), workflow.WithInput("1"))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}
	fmt.Printf("workflow started with id: %v\n", instanceID)

	// 暂停工作流测试
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

	// 恢复工作流测试
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

	// 触发事件
	err = wclient.RaiseEvent(ctx, instanceID, "businessEvent", workflow.WithEventPayload("testData"))
	if err != nil {
		fmt.Printf("failed to raise event: %v", err)
	}

	fmt.Println("workflow event raised")

	time.Sleep(time.Second) // 留出时间，让工作流继续推进

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

	// 清除工作流测试
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

	// 终止工作流测试
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

[查看上下文中的完整 Go SDK 工作流示例。](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="Important" color="warning" %}}
由于基于重放的工作流的执行方式，你需要把 I/O 以及与系统交互之类的逻辑编写在**活动内部**。而**工作流方法**仅用于编排这些活动。

{{% /alert %}}

## 运行工作流并使用 Diagrid Dev Dashboard 检查工作流执行情况

通过 IDE 或 Dapr CLI 启动工作流应用程序，并调度一个新的工作流实例。如果要同时启动多个应用程序，请使用 [Dapr multi-app run]({{%  ref multi-app-overview.md %}})；如果只启动一个应用程序，请使用常规的 [Dapr run 命令](#通过-dapr-cli-测试工作流)。

使用本地的 [Diagrid Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 可视化并检查工作流状态，还可以深入查看详细的工作流执行历史。该仪表板作为独立工具运行，并从 Dapr 工作流所使用的 state store 中读取工作流（默认为本地 Redis 实例）。Redis、PostgreSQL、SQLite 和 MongoDB 会被直接读取；其他 state store 则通过边车的工作流 API 读取，这需要 Dapr 1.17 或更高版本。

<img src="/images/workflow-overview/workflow-diagrid-dashboard.png" width=800 alt="Diagrid Dev Dashboard 显示本地工作流执行情况"/><br/>

{{< tabpane text=true >}}

通过终端下载并安装仪表板：

{{% tab "Linux/MacOS" %}}

```bash
curl -sSL https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.sh | sh
```

{{% /tab %}}

{{% tab "Windows" %}}

```bash
iwr -useb https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.ps1 | iex
```

{{% /tab %}}

{{< /tabpane >}}

使用以下命令启动 Diagrid Dev Dashboard：

```bash
diagrid-dev-dashboard
```

<!-- IGNORE_LINKS -->
仪表板会在浏览器中打开 [http://localhost:9090](http://localhost:9090)。前往 Workflows 页面以检查工作流。
<!-- END_IGNORE -->

## 通过 Dapr CLI 测试工作流

编写工作流之后，你可以使用 Dapr CLI 对其进行测试：

{{< tabpane text=true >}}

{{% tab "Python" %}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app python3 app.py
```
确认应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run hello_world_wf --app-id workflow-app --input 'hello world' --instance-id test-run
```

#### 查看工作流状态
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

{{% /tab %}}

{{% tab "Javascript" %}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app npx ts-node src/app.ts
```
确认应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run sequence --app-id workflow-app --input 'hello world' --instance-id test-run
```

#### 查看工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发正在等待的外部事件
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

{{% /tab %}}

{{% tab ".NET" %}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app dotnet run
```
确认应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run OrderProcessingWorkflow --app-id workflow-app  --instance-id test-run --input '{"name": "Paperclips", "totalCost": 99.95}'
```

#### 查看工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发正在等待的外部事件
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

{{% /tab %}}

{{% tab "Java" %}}

#### 运行工作流应用程序

```bash
dapr run --app-id workflow-app -- java -jar target/WorkflowService-0.0.1-SNAPSHOT.jar
```

确认应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run DemoWorkflow --app-id workflow-app  --instance-id test-run --input "input data"
```

#### 查看工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发正在等待的外部事件
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

{{% /tab %}}

{{% tab "Go" %}}

#### 运行工作流应用程序
```bash
dapr run --app-id workflow-app go run main.go
```

确认应用程序正在运行：

```bash
dapr list
```

#### 运行工作流
```bash
dapr workflow run BusinessWorkflow --app-id workflow-app --input '1' --instance-id test-run
```

#### 查看工作流状态
```bash
dapr workflow list --app-id workflow-app -o wide
```

#### 触发正在等待的外部事件
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

{{% /tab %}}

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
# 触发工作流正在等待的事件
dapr workflow raise-event <instance-id>/ApprovalReceived \
  --app-id workflow-app \
  --input '{"approved": true, "approver": "manager@company.com"}'
```

### 调试失败的工作流

```bash
# 列出失败的工作流
dapr workflow list --app-id workflow-app --filter-status FAILED --output wide

# 获取失败工作流的详细历史记录
dapr workflow history <failed-instance-id> --app-id workflow-app --output json

# 修复问题后重新运行工作流
dapr workflow rerun <failed-instance-id> --app-id workflow-app --input '<new-input-json-data>'
```

## 后续步骤

你已经编写了一个工作流，接下来了解如何管理它。若要运行每种工作流模式的示例，请参阅 Quickstarts 仓库中的[工作流教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow)。

{{< button text="管理工作流 >>" page="howto-manage-workflow.md" >}}

## 相关链接
- [工作流概述]({{% ref workflow-overview.md %}})
- Quickstarts 仓库中的[工作流教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow)
- 试用完整的 SDK 示例：
  - [Python 示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
  - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
  - [.NET 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
  - [Java 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
  - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
