---
type: docs
title: Workflow 模式
linkTitle: Workflow 模式
weight: 3000
description: "编写不同类型的 workflow 模式"
---

Dapr Workflows 简化了微服务架构中复杂的有状态协调需求。以下各节介绍了几种可以从 Dapr Workflows 中受益的应用程序模式。

## Task chaining

在 task chaining 模式中，workflow 中的多个步骤按顺序运行，一个步骤的输出可以作为下一步的输入传递。Task chaining workflow 通常涉及创建一系列需要对某些数据执行的操作，例如过滤、转换和规约。

{{< diagram name="workflow-task-chaining" width="85" >}}

在某些情况下，workflow 的步骤可能需要跨多个微服务进行编排。为了提高可靠性和可扩展性，您还可能会使用队列来触发各个步骤。

虽然该模式很简单，但其实现中隐藏着许多复杂性。例如：

- 如果某个微服务长时间不可用，会发生什么？
- 失败的步骤能否自动重试？
- 如果不能，如何回滚之前已完成的步骤（如果适用）？
- 抛开实现细节，能否将 workflow 可视化，以便其他工程师理解它的作用和工作原理？

Dapr Workflow 允许您使用所选编程语言，将 task chaining 模式简洁地实现为一个简单的函数，从而解决这些复杂性，如以下示例所示。

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
import dapr.ext.workflow as wf


def task_chain_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    try:
        result1 = yield ctx.call_activity(step1, input=wf_input)
        result2 = yield ctx.call_activity(step2, input=result1)
        result3 = yield ctx.call_activity(step3, input=result2)
    except Exception as e:
        yield ctx.call_activity(error_handler, input=str(e))
        raise
    return [result1, result2, result3]


def step1(ctx, activity_input):
    print(f'Step 1: Received input: {activity_input}.')
    # 在此添加步骤特定的逻辑（例如数据转换）
    return activity_input + 1


def step2(ctx, activity_input):
    print(f'Step 2: Received input: {activity_input}.')
    # 在此添加步骤特定的逻辑（例如数据转换）
    return activity_input * 2


def step3(ctx, activity_input):
    print(f'Step 3: Received input: {activity_input}.')
    # 在此添加步骤特定的逻辑（例如数据转换）
    return activity_input ^ 2


def error_handler(ctx, error):
    print(f'Executing error handler: {error}.')
    # 在此添加撤销部分更改的逻辑（例如释放库存）
```

要重试失败的 activity，请创建一个 `RetryPolicy`，并将其传入 `call_activity` 的 `retry_policy` 参数。Dapr 运行时会在重试间隔之后再次运行该 activity，直到达到最大尝试次数。

```python
from datetime import timedelta
import dapr.ext.workflow as wf


def task_chain_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    retry_policy = wf.RetryPolicy(
        max_number_of_attempts=3,
        first_retry_interval=timedelta(seconds=2),
        backoff_coefficient=2.0,
        max_retry_interval=timedelta(seconds=30),
    )
    result1 = yield ctx.call_activity(step1, input=wf_input, retry_policy=retry_policy)
    result2 = yield ctx.call_activity(step2, input=result1, retry_policy=retry_policy)
    return [result1, result2]
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
import { DaprWorkflowClient, WorkflowActivityContext, WorkflowContext, WorkflowRuntime, TWorkflow } from "@dapr/dapr";

async function start() {
  // 将 gRPC 客户端和工作进程更新为使用本地地址和端口
  const daprHost = "localhost";
  const daprPort = "50001";
  const workflowClient = new DaprWorkflowClient({
    daprHost,
    daprPort,
  });
  const workflowRuntime = new WorkflowRuntime({
    daprHost,
    daprPort,
  });

  const hello = async (_: WorkflowActivityContext, name: string) => {
    return `Hello ${name}!`;
  };

  const sequence: TWorkflow = async function* (ctx: WorkflowContext): any {
    const cities: string[] = [];

    const result1 = yield ctx.callActivity(hello, "Tokyo");
    cities.push(result1);
    const result2 = yield ctx.callActivity(hello, "Seattle");
    cities.push(result2);
    const result3 = yield ctx.callActivity(hello, "London");
    cities.push(result3);

    return cities;
  };

  workflowRuntime.registerWorkflow(sequence).registerActivity(hello);

  // 将工作进程启动包裹在 try-catch 块中，以处理启动期间的任何错误
  try {
    await workflowRuntime.start();
    console.log("Workflow runtime started successfully");
  } catch (error) {
    console.error("Error starting workflow runtime:", error);
  }

  // 调度新的编排
  try {
    const id = await workflowClient.scheduleNewWorkflow(sequence);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // 等待编排完成
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  await workflowRuntime.stop();
  await workflowClient.stop();

  // 停止 Dapr sidecar
  process.exit(0);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
  // 在此添加撤销部分更改的逻辑（例如退款）
});
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
// 能够经受长时间中断的指数退避重试策略
var retryOptions = new WorkflowTaskOptions
{
    RetryPolicy = new WorkflowRetryPolicy(
        firstRetryInterval: TimeSpan.FromMinutes(1),
        backoffCoefficient: 2.0,
        maxRetryInterval: TimeSpan.FromHours(1),
        maxNumberOfAttempts: 10),
};

try
{
    var result1 = await context.CallActivityAsync<string>("Step1", wfInput, retryOptions);
    var result2 = await context.CallActivityAsync<byte[]>("Step2", result1, retryOptions);
    var result3 = await context.CallActivityAsync<long[]>("Step3", result2, retryOptions);
    return string.Join(", ", result4);
}
catch (TaskFailedException) // 任务失败以 TaskFailedException 的形式抛出
{
    // 重试已耗尽，应用自定义补偿逻辑
    await context.CallActivityAsync<long[]>("MyCompensation", options: retryOptions);
    throw;
}
```

> **Note** 在上面的示例中，`"Step1"`、`"Step2"`、`"Step3"` 和 `"MyCompensation"` 表示 workflow activity，即实际实现 workflow 步骤的函数。为简洁起见，这些 activity 的实现未包含在此示例中。

{{% /tab %}}

{{% tab "Java" %}}

```java
public class ChainWorkflow extends Workflow {
    @Override
    public WorkflowStub create() {
        return ctx -> {
            StringBuilder sb = new StringBuilder();
            String wfInput = ctx.getInput(String.class);
            String result1 = ctx.callActivity("Step1", wfInput, String.class).await();
            String result2 = ctx.callActivity("Step2", result1, String.class).await();
            String result3 = ctx.callActivity("Step3", result2, String.class).await();
            String result = sb.append(result1).append(',').append(result2).append(',').append(result3).toString();
            ctx.complete(result);
        };
    }
}

    class Step1 implements WorkflowActivity {

        @Override
        public Object run(WorkflowActivityContext ctx) {
            Logger logger = LoggerFactory.getLogger(Step1.class);
            logger.info("Starting Activity: " + ctx.getName());
            // 在此添加步骤特定的逻辑（例如数据转换）
            return null;
        }
    }

    class Step2 implements WorkflowActivity {

        @Override
        public Object run(WorkflowActivityContext ctx) {
            Logger logger = LoggerFactory.getLogger(Step2.class);
            logger.info("Starting Activity: " + ctx.getName());
            // 在此添加步骤特定的逻辑（例如数据转换）
            return null;
        }
    }

    class Step3 implements WorkflowActivity {

        @Override
        public Object run(WorkflowActivityContext ctx) {
            Logger logger = LoggerFactory.getLogger(Step3.class);
            logger.info("Starting Activity: " + ctx.getName());
            // 在此添加步骤特定的逻辑（例如数据转换）
            return null;
        }
    }
```

{{% /tab %}}

{{% tab "Go" %}}

```go
func TaskChainWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	var result1 int
	if err := ctx.CallActivity(Step1, workflow.ActivityInput(input)).Await(&result1); err != nil {
		return nil, err
	}
	var result2 int
	if err := ctx.CallActivity(Step2, workflow.ActivityInput(input)).Await(&result2); err != nil {
		return nil, err
	}
	var result3 int
	if err := ctx.CallActivity(Step3, workflow.ActivityInput(input)).Await(&result3); err != nil {
		return nil, err
	}
	return []int{result1, result2, result3}, nil
}
func Step1(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("Step 1: Received input: %s", input)
	return input + 1, nil
}
func Step2(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("Step 2: Received input: %s", input)
	return input * 2, nil
}
func Step3(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("Step 3: Received input: %s", input)
	return int(math.Pow(float64(input), 2)), nil
}
```

{{% /tab %}}

{{< /tabpane >}}

如您所见，workflow 被表示为您所选编程语言中一系列简单的语句。这使得组织中的任何工程师都可以快速理解端到端的流程，而无需先理解端到端的系统架构。

在幕后，Dapr Workflow runtime 会：

- 负责执行 workflow 并确保其运行至完成。
- 自动保存进度。
- 如果 workflow 进程因任何原因失败，会自动从最后完成的步骤恢复 workflow。
- 支持以目标编程语言自然地表达错误处理，让您可以轻松实现补偿逻辑。
- 提供内置的重试配置原语，简化为 workflow 中各个步骤配置复杂 retry policies 的过程。

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/task-chaining)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/task-chaining) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/task-chaining) 中尝试 task chaining 教程。

## 扇出/扇入

在扇出/扇入设计模式中，您可以跨可能的多个工作进程同时执行多个任务，等待它们全部完成，然后对结果执行某种聚合。

{{< diagram name="workflow-fan-out-fan-in" width="65" >}}

除了[前面的模式]({{% ref "workflow-patterns.md#task-chaining" %}})中提到的挑战之外，手动实现扇出/扇入模式时还需要考虑以下几个重要问题：

- 如何控制并行度？
- 如何知道何时触发后续的聚合步骤？
- 如果并行步骤的数量是动态的，该怎么办？

Dapr Workflow 提供了一种将扇出/扇入模式表示为简单函数的方法，如以下示例所示：

```bash
# 启动 workflow
dapr workflow run DataProcessingWorkflow \
  --app-id processor \
  --input '{"items": ["item1", "item2", "item3"]}'

# 监控并行执行
dapr workflow history <instance-id> --app-id processor --output json
```

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
import time
from typing import List
import dapr.ext.workflow as wf


def batch_processing_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    # 获取一批 N 个待并行处理的工作项
    work_batch = yield ctx.call_activity(get_work_batch, input=wf_input)

    # 调度 N 个并行任务来处理这些工作项，并等待全部完成
    parallel_tasks = [ctx.call_activity(process_work_item, input=work_item) for work_item in work_batch]
    outputs = yield wf.when_all(parallel_tasks)

    # 汇总结果，并将其发送给另一个 activity
    total = sum(outputs)
    yield ctx.call_activity(process_results, input=total)


def get_work_batch(ctx, batch_size: int) -> List[int]:
    return [i + 1 for i in range(batch_size)]


def process_work_item(ctx, work_item: int) -> int:
    print(f'Processing work item: {work_item}.')
    time.sleep(5)
    result = work_item * 2
    print(f'Work item {work_item} processed. Result: {result}.')
    return result


def process_results(ctx, final_result: int):
    print(f'Final result: {final_result}.')
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
import {
  Task,
  DaprWorkflowClient,
  WorkflowActivityContext,
  WorkflowContext,
  WorkflowRuntime,
  TWorkflow,
} from "@dapr/dapr";

// 将整个代码包裹在立即执行的异步函数中
async function start() {
  // 将 gRPC 客户端和工作进程更新为使用本地地址和端口
  const daprHost = "localhost";
  const daprPort = "50001";
  const workflowClient = new DaprWorkflowClient({
    daprHost,
    daprPort,
  });
  const workflowRuntime = new WorkflowRuntime({
    daprHost,
    daprPort,
  });

  function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async function getWorkItemsActivity(_: WorkflowActivityContext): Promise<string[]> {
    const count: number = getRandomInt(2, 10);
    console.log(`generating ${count} work items...`);

    const workItems: string[] = Array.from({ length: count }, (_, i) => `work item ${i}`);
    return workItems;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function processWorkItemActivity(context: WorkflowActivityContext, item: string): Promise<number> {
    console.log(`processing work item: ${item}`);

    // 模拟耗时可变的工作
    const sleepTime = Math.random() * 5000;
    await sleep(sleepTime);

    // 返回该工作项的结果；这里的结果同样是一个随机数
    // 有关 workflow 中随机数的更多信息，请参阅
    // https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-code-constraints?tabpane=csharp#random-numbers
    return Math.floor(Math.random() * 11);
  }

  const workflow: TWorkflow = async function* (ctx: WorkflowContext): any {
    const tasks: Task<any>[] = [];
    const workItems = yield ctx.callActivity(getWorkItemsActivity);
    for (const workItem of workItems) {
      tasks.push(ctx.callActivity(processWorkItemActivity, workItem));
    }
    const results: number[] = yield ctx.whenAll(tasks);
    const sum: number = results.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    return sum;
  };

  workflowRuntime.registerWorkflow(workflow);
  workflowRuntime.registerActivity(getWorkItemsActivity);
  workflowRuntime.registerActivity(processWorkItemActivity);

  // 将工作进程启动包裹在 try-catch 块中，以处理启动期间的任何错误
  try {
    await workflowRuntime.start();
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // 调度新的编排
  try {
    const id = await workflowClient.scheduleNewWorkflow(workflow);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // 等待编排完成
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // 停止工作进程和客户端
  await workflowRuntime.stop();
  await workflowClient.stop();

  // 停止 Dapr sidecar
  process.exit(0);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
// 获取 N 个待并行处理的工作项列表。
object[] workBatch = await context.CallActivityAsync<object[]>("GetWorkBatch", null);

// 调度并行任务，但暂不等待它们完成。
var parallelTasks = new List<Task<int>>(workBatch.Length);
for (int i = 0; i < workBatch.Length; i++)
{
    Task<int> task = context.CallActivityAsync<int>("ProcessWorkItem", workBatch[i]);
    parallelTasks.Add(task);
}

// 所有任务均已调度。在此等待所有并行任务完成。
await Task.WhenAll(parallelTasks);

// 汇总全部 N 个输出并发布结果。
int sum = parallelTasks.Sum(t => t.Result);
await context.CallActivityAsync("PostResults", sum);
```

{{% /tab %}}

{{% tab "Java" %}}

```java
public class FaninoutWorkflow extends Workflow {
    @Override
    public WorkflowStub create() {
        return ctx -> {
            // 获取 N 个待并行处理的工作项列表。
            Object[] workBatch = ctx.callActivity("GetWorkBatch", Object[].class).await();
            // 调度并行任务，但暂不等待它们完成。
            List<Task<Integer>> tasks = Arrays.stream(workBatch)
                    .map(workItem -> ctx.callActivity("ProcessWorkItem", workItem, int.class))
                    .collect(Collectors.toList());
            // 所有任务均已调度。在此等待所有并行任务完成。
            List<Integer> results = ctx.allOf(tasks).await();
            // 汇总全部 N 个输出并发布结果。
            int sum = results.stream().mapToInt(Integer::intValue).sum();
            ctx.complete(sum);
        };
    }
}
```

{{% /tab %}}

{{% tab "Go" %}}

```go
func BatchProcessingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return 0, err
	}
	var workBatch []int
	if err := ctx.CallActivity(GetWorkBatch, workflow.ActivityInput(input)).Await(&workBatch); err != nil {
		return 0, err
	}
	parallelTasks := workflow.NewTaskSlice(len(workBatch))
	for i, workItem := range workBatch {
		parallelTasks[i] = ctx.CallActivity(ProcessWorkItem, workflow.ActivityInput(workItem))
	}
	var outputs int
	for _, task := range parallelTasks {
		var output int
		err := task.Await(&output)
		if err == nil {
			outputs += output
		} else {
			return 0, err
		}
	}
	if err := ctx.CallActivity(ProcessResults, workflow.ActivityInput(outputs)).Await(nil); err != nil {
		return 0, err
	}
	return 0, nil
}
func GetWorkBatch(ctx workflow.ActivityContext) (any, error) {
	var batchSize int
	if err := ctx.GetInput(&batchSize); err != nil {
		return 0, err
	}
	batch := make([]int, batchSize)
	for i := 0; i < batchSize; i++ {
		batch[i] = i
	}
	return batch, nil
}
func ProcessWorkItem(ctx workflow.ActivityContext) (any, error) {
	var workItem int
	if err := ctx.GetInput(&workItem); err != nil {
		return 0, err
	}
	fmt.Printf("Processing work item: %d\n", workItem)
	time.Sleep(time.Second * 5)
	result := workItem * 2
	fmt.Printf("Work item %d processed. Result: %d\n", workItem, result)
	return result, nil
}
func ProcessResults(ctx workflow.ActivityContext) (any, error) {
	var finalResult int
	if err := ctx.GetInput(&finalResult); err != nil {
		return 0, err
	}
	fmt.Printf("Final result: %d\n", finalResult)
	return finalResult, nil
}
```

{{% /tab %}}

{{< /tabpane >}}

此示例的关键要点如下：

- 扇出/扇入模式可以使用普通的编程构造表示为简单的函数
- 并行任务的数量可以是静态的，也可以是动态的
- workflow 本身能够聚合并行执行的结果

此外，workflow 的执行是持久的。如果一个 workflow 启动了 100 个并行任务执行，而只有 40 个在进程崩溃前完成，workflow 会自动重新启动，并且只调度剩余的 60 个任务。

您还可以进一步使用特定语言的简单构造来限制并发度。下面的示例代码说明了如何将扇出限制为最多 5 个并发的 activity 执行：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp

//沿用前面的示例。
// 获取 N 个待并行处理的工作项列表。
object[] workBatch = await context.CallActivityAsync<object[]>("GetWorkBatch", null);

const int MaxParallelism = 5;
var results = new List<int>();
var inFlightTasks = new HashSet<Task<int>>();
foreach(var workItem in workBatch)
{
  if (inFlightTasks.Count >= MaxParallelism)
  {
    var finishedTask = await Task.WhenAny(inFlightTasks);
    results.Add(finishedTask.Result);
    inFlightTasks.Remove(finishedTask);
  }

  inFlightTasks.Add(context.CallActivityAsync<int>("ProcessWorkItem", workItem));
}
results.AddRange(await Task.WhenAll(inFlightTasks));

var sum = results.Sum(t => t);
await context.CallActivityAsync("PostResults", sum);
```

{{% /tab %}}

{{< /tabpane >}}

通过使用 `WorkflowContext` 上的以下扩展方法，您可以并行处理 activity，同时为并发数设置上限：

{{< tabpane text=true >}}

{{% tab header=".NET" %}}

```csharp
//沿用前面的示例。
// 获取要处理的工作项列表
var workBatch = await context.CallActivityAsync<object[]>("GetWorkBatch", null);

// 以确定性的方式并行处理，同时最多同时运行 5 个 activity
var results = await context.ProcessInParallelAsync(workBatch, workItem => context.CallActivityAsync<int>("ProcessWorkItem", workItem), maxConcurrency: 5);

var sum = results.Sum(t => t);
await context.CallActivityAsync("PostResults", sum);
```

{{% /tab %}}

{{< /tabpane >}}

以这种方式限制并发度，有助于限制对共享资源的争用。例如，如果 activity 需要调用具有自身并发限制的外部资源（如数据库或外部 API），那么确保同时调用该资源的 activity 数量不超过指定值会很有用。

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/fan-out-fan-in)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/fan-out-fan-in) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/fan-out-fan-in) 中尝试扇出/扇入教程。

## 异步 HTTP API

异步 HTTP API 通常使用[异步请求-回复模式](https://learn.microsoft.com/azure/architecture/patterns/async-request-reply)来实现。传统上，实现此模式涉及以下步骤：

1. 客户端向 HTTP API 端点发送请求（_启动 API_）
1. _启动 API_ 将消息写入后端队列，以触发长时间运行操作的启动
1. 在调度后端操作之后，_启动 API_ 立即向客户端返回 HTTP 202 响应，其中包含一个可用于轮询状态的标识符
1. _状态 API_ 查询包含长时间运行操作状态的数据库
1. 客户端反复轮询 _状态 API_，直到超时到期或收到“完成”响应

端到端流程如下图所示。

{{< diagram name="workflow-async-http" width="80" >}}

实现异步请求-回复模式的挑战在于，它涉及使用多个 API 和 state store。此外，还需要正确实现该协议，使客户端知道如何自动轮询状态，以及何时操作完成。

Dapr workflow HTTP API 开箱即用地支持异步请求-回复模式，无需您编写任何代码或进行任何状态管理。

以下 `curl` 命令说明了 workflow API 如何支持此模式。

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=12345678 -d '{"Name":"Paperclips","Quantity":1,"TotalCost":9.95}'
```

前面的命令将返回以下响应 JSON：

```json
{"instanceID":"12345678"}
```

然后，HTTP 客户端可以使用 workflow 实例 ID 构造状态查询 URL，并反复轮询它，直到在响应负载中看到“COMPLETE”、“FAILURE”或“TERMINATED”状态。

```bash
curl http://localhost:3500/v1.0/workflows/dapr/12345678
```

以下是进行中的 workflow 状态可能的样子。

```json
{
  "instanceID": "12345678",
  "workflowName": "OrderProcessingWorkflow",
  "createdAt": "2023-05-03T23:22:11.143069826Z",
  "lastUpdatedAt": "2023-05-03T23:22:22.460025267Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"Name\":\"Paperclips\",\"Quantity\":1,\"TotalCost\":9.95}"
  }
}
```

从上一个示例可以看出，workflow 的运行时状态为 `RUNNING`，这告诉客户端应继续轮询。

如果 workflow 已完成，状态可能如下所示。

```json
{
  "instanceID": "12345678",
  "workflowName": "OrderProcessingWorkflow",
  "createdAt": "2023-05-03T23:30:11.381146313Z",
  "lastUpdatedAt": "2023-05-03T23:30:52.923870615Z",
  "runtimeStatus": "COMPLETED",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"Name\":\"Paperclips\",\"Quantity\":1,\"TotalCost\":9.95}",
    "dapr.workflow.output": "{\"Processed\":true}"
  }
}
```

从上一个示例可以看出，workflow 的运行时状态现在为 `COMPLETED`，这意味着客户端可以停止轮询更新。

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/workflow-management)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/workflow-management) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/workflow-management) 中尝试 workflow 管理教程，该教程会启动一个 workflow 并读取其状态。

## 监控模式

监控模式（monitor pattern）是一个循环过程，通常会：

1. 检查系统的状态
1. 根据该状态采取某些操作，例如发送通知
1. 休眠一段时间
1. 重复

下图大致说明了此模式。

{{< diagram workflow-monitor >}}

根据业务需求，可能只有一个监控器，也可能为每个业务实体（例如一只股票）各设置一个监控器。此外，根据具体情况，休眠时间可能需要变化。这些要求使得基于 Cron 的调度系统变得不切实际。

Dapr Workflow 通过允许您实现 _eternal workflows_ 原生支持此模式。与编写无限的 while 循环（[这是一种反模式]({{% ref "workflow-features-concepts.md#infinite-loops-and-eternal-workflows" %}})）不同，Dapr Workflow 公开了一个 _continue-as-new_ API，workflow 作者可以使用它以新的输入从头重新启动 workflow 函数。

{{% alert title="Note" color="primary" %}}
Continue-as-new 会立即重新启动 workflow，并丢弃任何未完成任务的结果，包括已启动但尚未等待的 activity、timer 和 child workflow。
{{% /alert %}}


{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
from dataclasses import dataclass
from datetime import timedelta
import random
import dapr.ext.workflow as wf


@dataclass
class JobStatus:
    job_id: str
    is_healthy: bool


def status_monitor_workflow(ctx: wf.DaprWorkflowContext, job: JobStatus):
    # 轮询与此作业关联的状态端点
    status = yield ctx.call_activity(check_status, input=job)
    if not ctx.is_replaying:
        print(f"Job '{job.job_id}' is {status}.")

    if status == "healthy":
        job.is_healthy = True
        next_sleep_interval = 60  # 健康时降低检查频率
    else:
        if job.is_healthy:
            job.is_healthy = False
            ctx.call_activity(send_alert, input=f"Job '{job.job_id}' is unhealthy!")
        next_sleep_interval = 5  # 不健康时提高检查频率

    yield ctx.create_timer(fire_at=ctx.current_utc_datetime + timedelta(minutes=next_sleep_interval))

    # 以新的 JobStatus 输入从头重新启动
    ctx.continue_as_new(job)


def check_status(ctx, _) -> str:
    return random.choice(["healthy", "unhealthy"])


def send_alert(ctx, message: str):
    print(f'*** Alert: {message}')
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
const statusMonitorWorkflow: TWorkflow = async function* (ctx: WorkflowContext): any {
    let duration;
    const status = yield ctx.callActivity(checkStatusActivity);
    if (status === "healthy") {
      // 处于健康状态时降低检查频率
      duration = 60 * 60;
    } else {
      yield ctx.callActivity(alertActivity, "job unhealthy");
      // 处于不健康状态时提高检查频率
      duration = 5 * 60;
    }

    // 让 workflow 休眠到确定的时间
    ctx.createTimer(duration);

    // 使用更新后的状态从头重新启动
    ctx.continueAsNew();
  };
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
public override async Task<object> RunAsync(WorkflowContext context, MyEntityState myEntityState)
{
    TimeSpan nextSleepInterval;

    var status = await context.CallActivityAsync<string>("GetStatus");
    if (status == "healthy")
    {
        myEntityState.IsHealthy = true;

        // 处于健康状态时降低检查频率
        nextSleepInterval = TimeSpan.FromMinutes(60);
    }
    else
    {
        if (myEntityState.IsHealthy)
        {
            myEntityState.IsHealthy = false;
            await context.CallActivityAsync("SendAlert", myEntityState);
        }

        // 处于不健康状态时提高检查频率
        nextSleepInterval = TimeSpan.FromMinutes(5);
    }

    // 让 workflow 休眠到确定的时间
    await context.CreateTimer(nextSleepInterval);

    // 使用更新后的状态从头重新启动
    context.ContinueAsNew(myEntityState);
    return null;
}
```

> 此示例假设您已有一个预定义的 `MyEntityState` 类，其中包含布尔类型的 `IsHealthy` 属性。

{{% /tab %}}

{{% tab "Java" %}}

```java
public class MonitorWorkflow extends Workflow {

  @Override
  public WorkflowStub create() {
    return ctx -> {

      Duration nextSleepInterval;

      var status = ctx.callActivity(DemoWorkflowStatusActivity.class.getName(), DemoStatusActivityOutput.class).await();
      var isHealthy = status.getIsHealthy();

      if (isHealthy) {
        // 处于健康状态时降低检查频率
        nextSleepInterval = Duration.ofMinutes(60);
      } else {

        ctx.callActivity(DemoWorkflowAlertActivity.class.getName()).await();

        // 处于不健康状态时提高检查频率
        nextSleepInterval = Duration.ofMinutes(5);
      }

      // 让 workflow 休眠到确定的时间
      try {
        ctx.createTimer(nextSleepInterval);
      } catch (InterruptedException e) {
        throw new RuntimeException(e);
      }

      // 使用更新后的状态从头重新启动
      ctx.continueAsNew();
    }
  }
}
```

{{% /tab %}}

{{% tab "Go" %}}

```go
type JobStatus struct {
	JobID     string `json:"job_id"`
	IsHealthy bool   `json:"is_healthy"`
}
func StatusMonitorWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var sleepInterval time.Duration
	var job JobStatus
	if err := ctx.GetInput(&job); err != nil {
		return "", err
	}
	var status string
	if err := ctx.CallActivity(CheckStatus, workflow.ActivityInput(job)).Await(&status); err != nil {
		return "", err
	}
	if status == "healthy" {
		job.IsHealthy = true
		sleepInterval = time.Minutes * 60
	} else {
		if job.IsHealthy {
			job.IsHealthy = false
			err := ctx.CallActivity(SendAlert, workflow.ActivityInput(fmt.Sprintf("Job '%s' is unhealthy!", job.JobID))).Await(nil)
			if err != nil {
				return "", err
			}
		}
		sleepInterval = time.Minutes * 5
	}
	if err := ctx.CreateTimer(sleepInterval).Await(nil); err != nil {
		return "", err
	}
	ctx.ContinueAsNew(job, false)
	return "", nil
}
func CheckStatus(ctx workflow.ActivityContext) (any, error) {
	statuses := []string{"healthy", "unhealthy"}
	return statuses[rand.Intn(1)], nil
}
func SendAlert(ctx workflow.ActivityContext) (any, error) {
	var message string
	if err := ctx.GetInput(&message); err != nil {
		return "", err
	}
	fmt.Printf("*** Alert: %s", message)
	return "", nil
}
```

{{% /tab %}}

{{< /tabpane >}}

实现监控模式的 workflow 可以无限循环，也可以通过不调用 _continue-as-new_ 来优雅地终止自身。

{{% alert title="Note" color="primary" %}}
此模式也可以使用 Actor 和 reminder 来实现。区别在于，此 workflow 被表示为单个函数，其输入和状态都存储在局部变量中。如有必要，workflow 还可以以更强的可靠性保证执行一系列操作。
{{% /alert %}}

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/monitor-pattern)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/monitor-pattern) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/monitor-pattern) 中尝试监控模式教程。

## 外部系统交互

在某些情况下，workflow 可能需要暂停并等待外部系统执行某些操作。例如，workflow 可能需要暂停并等待收到付款。在这种情况下，支付系统可能会在收到付款时向 pub/sub topic 发布一个事件，而该 topic 上的监听器可以通过 [raise event workflow API]({{% ref "howto-manage-workflow.md#raise-an-event" %}}) 向 workflow 发送事件。

另一种非常常见的场景是 workflow 需要暂停并等待人工操作，例如审批采购订单。Dapr Workflow 通过 [external events]({{% ref "workflow-features-concepts.md#external-events" %}}) 功能支持此事件模式。

以下是一个涉及人工参与的采购订单 workflow 示例：

1. 收到采购订单时触发 workflow。
1. workflow 中的一条规则判定需要人工执行某些操作。例如，采购订单金额超过某个自动审批阈值。
1. workflow 发送通知，请求人工操作。例如，它向指定的审批人发送包含审批链接的电子邮件。
1. workflow 暂停，并等待人工通过点击链接批准或拒绝订单。
1. 如果在指定时间内未收到审批，workflow 将恢复执行并进行某些补偿逻辑，例如取消订单。

下图说明了此流程。

{{< diagram name="workflow-external-system" width="85" >}}

以下示例代码展示了如何使用 Dapr Workflow 实现此模式。

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
from dataclasses import dataclass
from datetime import timedelta
import dapr.ext.workflow as wf


@dataclass
class Order:
    cost: float
    product: str
    quantity: int

    def __str__(self):
        return f'{self.product} ({self.quantity})'


@dataclass
class Approval:
    approver: str

    @staticmethod
    def from_dict(dict):
        return Approval(**dict)


def purchase_order_workflow(ctx: wf.DaprWorkflowContext, order: Order):
    # 金额低于 $1000 的订单自动批准
    if order.cost < 1000:
        return "Auto-approved"

    # 金额为 $1000 或以上的订单需要经理审批
    yield ctx.call_activity(send_approval_request, input=order)

    # 必须在 24 小时内收到审批，否则订单将被取消。
    approval_event = ctx.wait_for_external_event("approval_received")
    timeout_event = ctx.create_timer(timedelta(hours=24))
    winner = yield wf.when_any([approval_event, timeout_event])
    if winner == timeout_event:
        return "Cancelled"

    # 订单已获批准
    yield ctx.call_activity(place_order, input=order)
    approval_details = Approval.from_dict(approval_event.get_result())
    return f"Approved by '{approval_details.approver}'"


def send_approval_request(_, order: Order) -> None:
    print(f'*** Sending approval request for order: {order}')


def place_order(_, order: Order) -> None:
    print(f'*** Placing order: {order}')
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
import {
  Task,
  DaprWorkflowClient,
  WorkflowActivityContext,
  WorkflowContext,
  WorkflowRuntime,
  TWorkflow,
} from "@dapr/dapr";
import * as readlineSync from "readline-sync";

// 将整个代码包裹在立即执行的异步函数中
async function start() {
  class Order {
    cost: number;
    product: string;
    quantity: number;
    constructor(cost: number, product: string, quantity: number) {
      this.cost = cost;
      this.product = product;
      this.quantity = quantity;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 将 gRPC 客户端和工作进程更新为使用本地地址和端口
  const daprHost = "localhost";
  const daprPort = "50001";
  const workflowClient = new DaprWorkflowClient({
    daprHost,
    daprPort,
  });
  const workflowRuntime = new WorkflowRuntime({
    daprHost,
    daprPort,
  });

  // 向经理发送审批请求的 activity 函数
  const sendApprovalRequest = async (_: WorkflowActivityContext, order: Order) => {
    // 模拟耗时的工作
    await sleep(3000);
    console.log(`Sending approval request for order: ${order.product}`);
  };

  // 下单的 activity 函数
  const placeOrder = async (_: WorkflowActivityContext, order: Order) => {
    console.log(`Placing order: ${order.product}`);
  };

  // 表示采购订单 workflow 的编排器函数
  const purchaseOrderWorkflow: TWorkflow = async function* (ctx: WorkflowContext, order: Order): any {
    // 低于 $1000 的订单自动批准
    if (order.cost < 1000) {
      return "Auto-approved";
    }

    // $1000 或以上的订单需要经理审批
    yield ctx.callActivity(sendApprovalRequest, order);

    // 必须在 24 小时内收到审批，否则订单将被取消。
    const tasks: Task<any>[] = [];
    const approvalEvent = ctx.waitForExternalEvent("approval_received");
    const timeoutEvent = ctx.createTimer(24 * 60 * 60);
    tasks.push(approvalEvent);
    tasks.push(timeoutEvent);
    const winner = ctx.whenAny(tasks);

    if (winner == timeoutEvent) {
      return "Cancelled";
    }

    yield ctx.callActivity(placeOrder, order);
    const approvalDetails = approvalEvent.getResult();
    return `Approved by ${approvalDetails.approver}`;
  };

  workflowRuntime
    .registerWorkflow(purchaseOrderWorkflow)
    .registerActivity(sendApprovalRequest)
    .registerActivity(placeOrder);

  // 将工作进程启动包裹在 try-catch 块中，以处理启动期间的任何错误
  try {
    await workflowRuntime.start();
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // 调度新的编排
  try {
    const cost = readlineSync.questionInt("Cost of your order:");
    const approver = readlineSync.question("Approver of your order:");
    const timeout = readlineSync.questionInt("Timeout for your order in seconds:");
    const order = new Order(cost, "MyProduct", 1);
    const id = await workflowClient.scheduleNewWorkflow(purchaseOrderWorkflow, order);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // 异步提示审批
    promptForApproval(approver, workflowClient, id);

    // 等待编排完成
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, timeout + 2);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // 停止工作进程和客户端
  await workflowRuntime.stop();
  await workflowClient.stop();

  // 停止 Dapr sidecar
  process.exit(0);
}

async function promptForApproval(approver: string, workflowClient: DaprWorkflowClient, id: string) {
  if (readlineSync.keyInYN("Press [Y] to approve the order... Y/yes, N/no")) {
    const approvalEvent = { approver: approver };
    await workflowClient.raiseEvent(id, "approval_received", approvalEvent);
  } else {
    return "Order rejected";
  }
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderPayload order)
{
    // 初始业务逻辑（例如库存检查）

    // 要求超过特定阈值的订单需要审批
    if (order.TotalCost > OrderApprovalThreshold)
    {
        try
        {
            // 为此订单请求人工审批
            await context.CallActivityAsync(nameof(RequestApprovalActivity), order);

            // 暂停并等待人工批准此订单
            ApprovalResult approvalResult = await context.WaitForExternalEventAsync<ApprovalResult>(
                eventName: "ManagerApproval",
                timeout: TimeSpan.FromDays(3));
            if (approvalResult == ApprovalResult.Rejected)
            {
                // 订单被拒绝，在此结束 workflow
                return new OrderResult(Processed: false);
            }
        }
        catch (TaskCanceledException)
        {
            // 审批超时将自动取消订单
            return new OrderResult(Processed: false);
        }
    }

    // 最终业务逻辑（例如发货确认）

    // 以成功结果结束 workflow
    return new OrderResult(Processed: true);
}
```

> **Note** 在上面的示例中，`RequestApprovalActivity` 是要调用的 workflow activity 的名称，`ApprovalResult` 是由 workflow 应用定义的枚举。为简洁起见，这些定义未包含在示例代码中。

{{% /tab %}}

{{% tab "Java" %}}

```java
public class ExternalSystemInteractionWorkflow extends Workflow {
    @Override
    public WorkflowStub create() {
        return ctx -> {
            // 初始业务逻辑（例如库存检查）
            Integer orderCost = ctx.getInput(int.class);
            // 要求超过特定阈值的订单需要审批
            if (orderCost > ORDER_APPROVAL_THRESHOLD) {
                try {
                    // 为此订单请求人工审批
                    ctx.callActivity("RequestApprovalActivity", orderCost, Void.class).await();
                    // 暂停并等待人工批准此订单
                    boolean approved = ctx.waitForExternalEvent("ManagerApproval", Duration.ofDays(3), boolean.class).await();
                    if (!approved) {
                        // 订单被拒绝，在此结束 workflow
                        ctx.complete("Process reject");
                    }
                } catch (TaskCanceledException e) {
                    // 审批超时将自动取消订单
                    ctx.complete("Process cancel");
                }
            }
            // 最终业务逻辑（例如发货确认）

            // 以成功结果结束 workflow
            ctx.complete("Process approved");
        };
    }
}
```

{{% /tab %}}

{{% tab "Go" %}}

```go
type Order struct {
	Cost     float64 `json:"cost"`
	Product  string  `json:"product"`
	Quantity int     `json:"quantity"`
}
type Approval struct {
	Approver string `json:"approver"`
}
func PurchaseOrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var order Order
	if err := ctx.GetInput(&order); err != nil {
		return "", err
	}
	// 低于 $1000 的订单自动批准
	if order.Cost < 1000 {
		return "Auto-approved", nil
	}
	// $1000 或以上的订单需要经理审批
	if err := ctx.CallActivity(SendApprovalRequest, workflow.ActivityInput(order)).Await(nil); err != nil {
		return "", err
	}
	// 必须在 24 小时内收到审批，否则订单将被取消
	var approval Approval
	if err := ctx.WaitForExternalEvent("approval_received", time.Hour*24).Await(&approval); err != nil {
		// 假设已发生超时，无论如何都视为错误。
		return "error/cancelled", err
	}
	// 订单已获批准
	if err := ctx.CallActivity(PlaceOrder, workflow.ActivityInput(order)).Await(nil); err != nil {
		return "", err
	}
	return fmt.Sprintf("Approved by %s", approval.Approver), nil
}
func SendApprovalRequest(ctx workflow.ActivityContext) (any, error) {
	var order Order
	if err := ctx.GetInput(&order); err != nil {
		return "", err
	}
	fmt.Printf("*** Sending approval request for order: %v\n", order)
	return "", nil
}
func PlaceOrder(ctx workflow.ActivityContext) (any, error) {
	var order Order
	if err := ctx.GetInput(&order); err != nil {
		return "", err
	}
	fmt.Printf("*** Placing order: %v", order)
	return "", nil
}
```

{{% /tab %}}

{{< /tabpane >}}

向等待中的 workflow 实例传递事件以恢复其执行的代码位于 workflow 外部。可以使用 [raise event]({{% ref "howto-manage-workflow.md#raise-an-event" %}}) workflow 管理 API 将 workflow 事件传递给等待中的 workflow 实例，如以下示例所示：

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
from dapr.clients import DaprClient
from dataclasses import asdict

with DaprClient() as d:
    d.raise_workflow_event(
        instance_id=instance_id,
        workflow_component="dapr",
        event_name="approval_received",
        event_data=asdict(Approval("Jane Doe")))
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
import { DaprClient } from "@dapr/dapr";

  public async raiseEvent(workflowInstanceId: string, eventName: string, eventPayload?: any) {
    this._innerClient.raiseOrchestrationEvent(workflowInstanceId, eventName, eventPayload);
  }
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
// 向等待中的 workflow 引发事件
await daprClient.RaiseWorkflowEventAsync(
    instanceId: orderId,
    workflowComponent: "dapr",
    eventName: "ManagerApproval",
    eventData: ApprovalResult.Approved);
```

{{% /tab %}}

{{% tab "Java" %}}

```java
System.out.println("**SendExternalMessage: RestartEvent**");
client.raiseEvent(restartingInstanceId, "RestartEvent", "RestartEventPayload");
```

{{% /tab %}}

{{% tab "Go" %}}

```go
func raiseEvent() {
  daprClient, err := client.NewClient()
  if err != nil {
    log.Fatalf("failed to initialize the client")
  }
  err = daprClient.RaiseEventWorkflow(context.Background(), &client.RaiseEventWorkflowRequest{
    InstanceID: "instance_id",
    WorkflowComponent: "dapr",
    EventName: "approval_received",
    EventData: Approval{
      Approver: "Jane Doe",
    },
  })
  if err != nil {
    log.Fatalf("failed to raise event on workflow")
  }
  log.Println("raised an event on specified workflow")
}
```

{{% /tab %}}

{{< /tabpane >}}

外部事件不必由人工直接触发，也可以由其他系统触发。例如，workflow 可能需要暂停并等待收到付款。在这种情况下，支付系统可能会在收到付款时向 pub/sub topic 发布一个事件，而该 topic 上的监听器可以通过 raise event workflow API 向 workflow 发送事件。

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/external-system-interaction)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/external-system-interaction) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/external-system-interactions) 中尝试外部系统交互教程。

## 补偿

compensation pattern（也称为 saga pattern）提供了一种机制，用于在 workflow 中途失败时回滚或撤销已执行的操作。此模式对于跨多个微服务、且传统数据库事务不可行的长时间运行的 workflow 尤为重要。

在分布式微服务架构中，您通常需要跨多个服务协调操作。当这些操作无法包含在单个事务中时，compensation pattern 通过为 workflow 中的每个步骤定义补偿操作，提供了一种保持一致性的方法。

compensation pattern 解决了几个关键挑战：

- **分布式事务管理**：当 workflow 跨越多个微服务（每个微服务都有各自的数据存储）时，传统的 ACID 事务是不可能实现的。compensation pattern 通过确保操作要么全部成功完成，要么全部通过补偿撤销，提供事务一致性。
- **部分故障恢复**：如果 workflow 在某些步骤已成功完成后失败，compensation pattern 可让您优雅地撤销这些已完成的步骤。
- **业务流程完整性**：确保业务流程在发生故障时能够正确回滚，从而维护业务操作的完整性。
- **长时间运行的流程**：对于可能运行数小时、数天甚至更久的 workflow，传统的锁定机制并不实用。补偿为这些场景中的故障处理提供了一种方法。

compensation pattern 的常见用例包括：

- **电子商务订单处理**：预留库存、处理付款并发货。如果发货失败，您需要释放库存并退还付款。
- **金融交易**：在转账中，如果向目标账户入账失败，您需要回滚从源账户的扣款。
- **资源预配**：在跨多个提供商预配云资源时，如果某个步骤失败，您需要清理之前已预配的所有资源。
- **多步骤业务流程**：任何涉及多个不可逆步骤、且可能需要在后续失败时撤销的业务流程。

Dapr Workflow 为 compensation pattern 提供支持，允许您为每个步骤注册补偿 activity，并在需要时以相反的顺序执行它们。

以下是一个电子商务流程的 workflow 示例：

1. 收到订单时触发 workflow。
1. 在库存中为订单预留商品。
1. 处理付款。
1. 发货。
1. 如果上述任何操作产生错误，则通过另一个操作进行补偿：
   - 取消发货。
   - 退还付款。
   - 释放库存预留。

下图说明了此流程。

{{< diagram name="workflow-compensation" width="75" >}}

{{< tabpane text=true >}}

{{% tab "Java" %}}

```java
public class PaymentProcessingWorkflow implements Workflow {

    @Override
    public WorkflowStub create() {
        return ctx -> {
            ctx.getLogger().info("Starting Workflow: " + ctx.getName());
            var orderId = ctx.getInput(String.class);
            List<String> compensations = new ArrayList<>();

            try {
                // 第 1 步：预留库存
                String reservationId = ctx.callActivity(ReserveInventoryActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Inventory reserved: {}", reservationId);
                compensations.add("ReleaseInventory");

                // 第 2 步：处理付款
                String paymentId = ctx.callActivity(ProcessPaymentActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Payment processed: {}", paymentId);
                compensations.add("RefundPayment");

                // 第 3 步：发货
                String shipmentId = ctx.callActivity(ShipOrderActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Order shipped: {}", shipmentId);
                compensations.add("CancelShipment");

            } catch (TaskFailedException e) {
                ctx.getLogger().error("Activity failed: {}", e.getMessage());

                // 按相反顺序执行补偿
                Collections.reverse(compensations);
                for (String compensation : compensations) {
                    try {
                        switch (compensation) {
                            case "CancelShipment":
                                String shipmentCancelResult = ctx.callActivity(
                                    CancelShipmentActivity.class.getName(),
                                    orderId,
                                    String.class).await();
                                ctx.getLogger().info("Shipment cancellation completed: {}", shipmentCancelResult);
                                break;

                            case "RefundPayment":
                                String refundResult = ctx.callActivity(
                                    RefundPaymentActivity.class.getName(),
                                    orderId,
                                    String.class).await();
                                ctx.getLogger().info("Payment refund completed: {}", refundResult);
                                break;

                            case "ReleaseInventory":
                                String releaseResult = ctx.callActivity(
                                    ReleaseInventoryActivity.class.getName(),
                                    orderId,
                                    String.class).await();
                                ctx.getLogger().info("Inventory release completed: {}", releaseResult);
                                break;
                        }
                    } catch (TaskFailedException ex) {
                        ctx.getLogger().error("Compensation activity failed: {}", ex.getMessage());
                    }
                }
                ctx.complete("Order processing failed, compensation applied");
            }

			// 第 4 步：发送确认
			ctx.callActivity(SendConfirmationActivity.class.getName(), orderId, Void.class).await();
            ctx.getLogger().info("Confirmation sent for order: {}", orderId);

            ctx.complete("Order processed successfully: " + orderId);
        };
    }
}

// 示例 activity
class ReserveInventoryActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // 预留库存的逻辑
        String reservationId = "reservation_" + orderId;
        System.out.println("Reserved inventory for order: " + orderId);
        return reservationId;
    }
}

class ReleaseInventoryActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String reservationId = ctx.getInput(String.class);
        // 释放库存预留的逻辑
        System.out.println("Released inventory reservation: " + reservationId);
        return "Released: " + reservationId;
    }
}

class ProcessPaymentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // 处理付款的逻辑
        String paymentId = "payment_" + orderId;
        System.out.println("Processed payment for order: " + orderId);
        return paymentId;
    }
}

class RefundPaymentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String paymentId = ctx.getInput(String.class);
        // 退款的逻辑
        System.out.println("Refunded payment: " + paymentId);
        return "Refunded: " + paymentId;
    }
}

class ShipOrderActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // 发货的逻辑
        String shipmentId = "shipment_" + orderId;
        System.out.println("Shipped order: " + orderId);
        return shipmentId;
    }
}

class CancelShipmentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String shipmentId = ctx.getInput(String.class);
        // 取消发货的逻辑
        System.out.println("Canceled shipment: " + shipmentId);
        return "Canceled: " + shipmentId;
    }
}

class SendConfirmationActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // 发送确认的逻辑
        System.out.println("Sent confirmation for order: " + orderId);
        return null;
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

使用 Dapr Workflow compensation pattern 的主要好处包括：

- **补偿控制**：您可以完全控制补偿 activity 何时以及如何执行。
- **灵活配置**：您可以实现自定义逻辑，以确定要运行哪些补偿。
- **错误处理**：根据您的具体业务需求处理补偿失败。
- **简单实现**：无需额外的框架依赖，只需标准的 workflow activity 和异常处理。

compensation pattern 确保分布式 workflow 能够保持一致性，并从故障中优雅地恢复，使其成为构建可靠微服务架构的重要工具。

要运行此模式，请在 [Python](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/python/resiliency-and-compensation)、[.NET](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp/resiliency-and-compensation) 或 [Java](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/java/resiliency-and-compensation) 中尝试 resiliency and compensation 教程，该教程还展示了 retry policies。

## 后续步骤

{{< button text="workflow 架构 >>" page="workflow-architecture.md" >}}

## 相关链接

- [使用快速入门试用 Dapr Workflows]({{% ref workflow-quickstart.md %}})
- [workflow 概述]({{% ref workflow-overview.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})
- 在 Quickstarts 仓库中运行 [workflow 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow)，其中为本页的每种模式提供了可运行的示例
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
