---
type: docs
title: 工作流模式
linkTitle: 工作流模式
weight: 3000
description: "编写不同类型的工作流模式"
---

Dapr 工作流简化了微服务架构中复杂的有状态协调需求。以下各节介绍了几种可以从 Dapr 工作流中受益的应用程序模式。

## 任务链

在任务链模式中，工作流中的多个步骤按顺序运行，一个步骤的输出可以作为下一步的输入传递。任务链工作流通常涉及创建需要对某些数据执行的操作序列，例如过滤、转换和规约。

<img src="/images/workflow-overview/workflows-chaining.png" width=800 alt="显示任务链工作流模式如何工作的示意图">

在某些情况下，工作流的步骤可能需要跨多个微服务进行编排。为了提高可靠性和可扩展性，您可能还会使用队列来触发各个步骤。

虽然该模式很简单，但在实现中隐藏了许多复杂性。例如：

- 如果某个微服务在较长时间内不可用，会发生什么？
- 失败的步骤是否可以自动重试？
- 如果不能，如何方便之前已完成的步骤的回滚（如果适用）？
- 抛开实现细节，是否有方法可视化工作流，以便其他工程师可以理解它的作用和工作原理？

Dapr 工作流通过允许您使用您选择的编程语言将任务链模式简洁地实现为一个简单的函数来解决这些复杂性，如以下示例所示。

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
    # Do some work
    return activity_input + 1


def step2(ctx, activity_input):
    print(f'Step 2: Received input: {activity_input}.')
    # Do some work
    return activity_input * 2


def step3(ctx, activity_input):
    print(f'Step 3: Received input: {activity_input}.')
    # Do some work
    return activity_input ^ 2


def error_handler(ctx, error):
    print(f'Executing error handler: {error}.')
    # Apply some compensating work
```

> **Note** 工作流重试策略将在 Python SDK 的未来版本中提供。

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
import { DaprWorkflowClient, WorkflowActivityContext, WorkflowContext, WorkflowRuntime, TWorkflow } from "@dapr/dapr";

async function start() {
  // Update the gRPC client and worker to use a local address and port
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

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await workflowRuntime.start();
    console.log("Workflow runtime started successfully");
  } catch (error) {
    console.error("Error starting workflow runtime:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await workflowClient.scheduleNewWorkflow(sequence);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // Wait for orchestration completion
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  await workflowRuntime.stop();
  await workflowClient.stop();

  // stop the dapr side car
  process.exit(0);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
 # Apply custom compensation logic
});
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
// Expotential backoff retry policy that survives long outages
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
catch (TaskFailedException) // Task failures are surfaced as TaskFailedException
{
    // Retries expired - apply custom compensation logic
    await context.CallActivityAsync<long[]>("MyCompensation", options: retryOptions);
    throw;
}
```

> **Note** 在上面的示例中，`"Step1"`、`"Step2"`、`"Step3"` 和 `"MyCompensation"` 表示工作流活动，这些是实际实现工作流步骤的代码中的函数。为简洁起见，这些活动的实现未包含在此示例中。

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
            // Do some work
            return null;
        }
    }

    class Step2 implements WorkflowActivity {

        @Override
        public Object run(WorkflowActivityContext ctx) {
            Logger logger = LoggerFactory.getLogger(Step2.class);
            logger.info("Starting Activity: " + ctx.getName());
            // Do some work
            return null;
        }
    }

    class Step3 implements WorkflowActivity {

        @Override
        public Object run(WorkflowActivityContext ctx) {
            Logger logger = LoggerFactory.getLogger(Step3.class);
            logger.info("Starting Activity: " + ctx.getName());
            // Do some work
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

如您所见，工作流被表示为您选择的编程语言中的一系列简单语句。这使得组织中的任何工程师都可以快速理解端到端流程，而无需一定理解端到端系统架构。

在幕后，Dapr 工作流运行时：

- 负责执行工作流并确保其运行完成。
- 自动保存进度。
- 如果工作流进程因任何原因失败，会自动从最后完成的步骤恢复工作流。
- 允许用目标编程语言自然地表达错误处理，使您可以轻松实现补偿逻辑。
- 提供内置的重试配置原语，以简化为工作流中的各个步骤配置复杂重试策略的过程。

## 扇出/扇入

在扇出/扇入设计模式中，您跨多个工作器同时执行多个任务，等待它们完成，然后对结果执行某种聚合。

<img src="/images/workflow-overview/workflows-fanin-fanout.png" width=800 alt="显示扇出/扇入工作流模式如何工作的示意图">

除了[前面模式]({{% ref "workflow-patterns.md#task-chaining" %}})中提到的挑战之外，手动实现扇出/扇入模式时还有几个重要问题需要考虑：

- 您如何控制并行度？
- 您如何知道何时触发后续聚合步骤？
- 如果并行步骤的数量是动态的怎么办？

Dapr 工作流提供了一种将扇出/扇入模式表示为简单函数的方法，如以下示例所示：

```bash
# Start the workflow
dapr workflow run DataProcessingWorkflow \
  --app-id processor \
  --input '{"items": ["item1", "item2", "item3"]}'

# Monitor parallel execution
dapr workflow history <instance-id> --app-id processor --output json
```

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
import time
from typing import List
import dapr.ext.workflow as wf


def batch_processing_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    # get a batch of N work items to process in parallel
    work_batch = yield ctx.call_activity(get_work_batch, input=wf_input)

    # schedule N parallel tasks to process the work items and wait for all to complete
    parallel_tasks = [ctx.call_activity(process_work_item, input=work_item) for work_item in work_batch]
    outputs = yield wf.when_all(parallel_tasks)

    # aggregate the results and send them to another activity
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

// Wrap the entire code in an immediately-invoked async function
async function start() {
  // Update the gRPC client and worker to use a local address and port
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

    // Simulate some work that takes a variable amount of time
    const sleepTime = Math.random() * 5000;
    await sleep(sleepTime);

    // Return a result for the given work item, which is also a random number in this case
    // For more information about random numbers in workflow please check
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

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await workflowRuntime.start();
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await workflowClient.scheduleNewWorkflow(workflow);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // Wait for orchestration completion
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // stop worker and client
  await workflowRuntime.stop();
  await workflowClient.stop();

  // stop the dapr side car
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
// Get a list of N work items to process in parallel.
object[] workBatch = await context.CallActivityAsync<object[]>("GetWorkBatch", null);

// Schedule the parallel tasks, but don't wait for them to complete yet.
var parallelTasks = new List<Task<int>>(workBatch.Length);
for (int i = 0; i < workBatch.Length; i++)
{
    Task<int> task = context.CallActivityAsync<int>("ProcessWorkItem", workBatch[i]);
    parallelTasks.Add(task);
}

// Everything is scheduled. Wait here until all parallel tasks have completed.
await Task.WhenAll(parallelTasks);

// Aggregate all N outputs and publish the result.
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
            // Get a list of N work items to process in parallel.
            Object[] workBatch = ctx.callActivity("GetWorkBatch", Object[].class).await();
            // Schedule the parallel tasks, but don't wait for them to complete yet.
            List<Task<Integer>> tasks = Arrays.stream(workBatch)
                    .map(workItem -> ctx.callActivity("ProcessWorkItem", workItem, int.class))
                    .collect(Collectors.toList());
            // Everything is scheduled. Wait here until all parallel tasks have completed.
            List<Integer> results = ctx.allOf(tasks).await();
            // Aggregate all N outputs and publish the result.
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

此示例的关键要点是：

- 扇出/扇入模式可以使用普通编程构造表示为简单的函数
- 并行任务的数量可以是静态的或动态的
- 工作流本身能够聚合并行执行的结果

此外，工作流的执行是持久的。如果一个工作流启动 100 个并行任务执行，并且在进程崩溃之前只完成了 40 个，工作流会自动重新启动，并且只安排剩余的 60 个任务。

您可以进一步使用简单的特定语言构造来限制并发度。下面的示例代码说明了如何将扇出度限制为仅 5 个并发活动执行：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp

//Revisiting the earlier example...
// Get a list of N work items to process in parallel.
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

您可以通过使用 `WorkflowContext` 上的以下扩展方法来并行处理工作流活动，同时对并发性设置上限：

{{< tabpane text=true >}}

{{% tab header=".NET" %}}

```csharp
//Revisiting the earlier example...
// Get a list of work items to process
var workBatch = await context.CallActivityAsync<object[]>("GetWorkBatch", null);

// Process deterministically in parallel with an upper cap of 5 activities at a time
var results = await context.ProcessInParallelAsync(workBatch, workItem => context.CallActivityAsync<int>("ProcessWorkItem", workItem), maxConcurrency: 5);

var sum = results.Sum(t => t);
await context.CallActivityAsync("PostResults", sum);
```

{{% /tab %}}

{{< /tabpane >}}

以这种方式限制并发度对于限制对共享资源的争用非常有用。例如，如果活动需要调用具有自己并发限制的外部资源（如数据库或外部 API），确保不超过指定数量的活动同时调用该资源会很有用。

## 异步 HTTP API

异步 HTTP API 通常使用[异步请求-回复模式](https://learn.microsoft.com/azure/architecture/patterns/async-request-reply)来实现。传统实现此模式涉及以下内容：

1. 客户端向 HTTP API 端点发送请求（_启动 API_）
1. _启动 API_ 将消息写入后端队列，触发长时间运行操作的开始
1. 在安排后端操作后，_启动 API_ 立即向客户端返回 HTTP 202 响应，其中包含可用于轮询状态的标识符
1. _状态 API_ 查询包含长时间运行操作状态的数据库
1. 客户端重复轮询 _状态 API_，直到某个超时过期或收到"完成"响应

端到端流程如下图所示。

<img src="/images/workflow-overview/workflow-async-request-response.png" width=800 alt="显示异步请求-回复模式如何工作的示意图"/>

实现异步请求-回复模式的挑战在于它涉及使用多个 API 和状态存储。它还涉及正确实现协议，以便客户端知道如何自动轮询状态并了解操作何时完成。

Dapr 工作流 HTTP API 开箱即用地支持异步请求-回复模式，无需您编写任何代码或进行任何状态管理。

以下 `curl` 命令说明了工作流 API 如何支持此模式。

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=12345678 -d '{"Name":"Paperclips","Quantity":1,"TotalCost":9.95}'
```

前面的命令将产生以下响应 JSON：

```json
{"instanceID":"12345678"}
```

然后，HTTP 客户端可以使用工作流实例 ID 构造状态查询 URL，并重复轮询它，直到在有效负载中看到"COMPLETE"、"FAILURE"或"TERMINATED"状态。

```bash
curl http://localhost:3500/v1.0/workflows/dapr/12345678
```

以下是正在进行中的工作流状态可能看起来像的示例。

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

从上一个示例中可以看出，工作流的运行时状态是 `RUNNING`，这让客户端知道应该继续轮询。

如果工作流已完成，状态可能如下所示。

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

从上一个示例中可以看出，工作流的运行时状态现在是 `COMPLETED`，这意味着客户端可以停止轮询更新。

## 监视器

监视器模式是一个循环过程，通常：

1. 检查系统状态
1. 根据该状态采取某些操作 - 例如，发送通知
1. 休眠一段时间
1. 重复

下图大致说明了此模式。

<img src="/images/workflow-overview/workflow-monitor-pattern.png" width=800 alt="显示监视器模式如何工作的示意图"/>

根据业务需求，可能只有一个监视器，也可能有多个监视器，每个业务实体一个（例如，股票）。此外，根据情况，休眠的时间可能需要更改。这些要求使得使用基于 cron 的调度系统变得不切实际。

Dapr 工作流通过允许您实现_永久工作流_来原生支持此模式。无需编写无限 while 循环（[这是一种反模式]({{% ref "workflow-features-concepts.md#infinite-loops-and-eternal-workflows" %}})），Dapr 工作流公开了一个 _continue-as-new_ API，工作流作者可以使用它从头开始使用新输入重新启动工作流函数。

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
    # poll a status endpoint associated with this job
    status = yield ctx.call_activity(check_status, input=job)
    if not ctx.is_replaying:
        print(f"Job '{job.job_id}' is {status}.")

    if status == "healthy":
        job.is_healthy = True
        next_sleep_interval = 60  # check less frequently when healthy
    else:
        if job.is_healthy:
            job.is_healthy = False
            ctx.call_activity(send_alert, input=f"Job '{job.job_id}' is unhealthy!")
        next_sleep_interval = 5  # check more frequently when unhealthy

    yield ctx.create_timer(fire_at=ctx.current_utc_datetime + timedelta(minutes=next_sleep_interval))

    # restart from the beginning with a new JobStatus input
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
      // Check less frequently when in a healthy state
      // set duration to 1 hour
      duration = 60 * 60;
    } else {
      yield ctx.callActivity(alertActivity, "job unhealthy");
      // Check more frequently when in an unhealthy state
      // set duration to 5 minutes
      duration = 5 * 60;
    }

    // Put the workflow to sleep until the determined time
    ctx.createTimer(duration);

    // Restart from the beginning with the updated state
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

        // Check less frequently when in a healthy state
        nextSleepInterval = TimeSpan.FromMinutes(60);
    }
    else
    {
        if (myEntityState.IsHealthy)
        {
            myEntityState.IsHealthy = false;
            await context.CallActivityAsync("SendAlert", myEntityState);
        }

        // Check more frequently when in an unhealthy state
        nextSleepInterval = TimeSpan.FromMinutes(5);
    }

    // Put the workflow to sleep until the determined time
    await context.CreateTimer(nextSleepInterval);

    // Restart from the beginning with the updated state
    context.ContinueAsNew(myEntityState);
    return null;
}
```

> 此示例假设您有一个预定义的 `MyEntityState` 类，其中包含布尔 `IsHealthy` 属性。

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
        // Check less frequently when in a healthy state
        nextSleepInterval = Duration.ofMinutes(60);
      } else {

        ctx.callActivity(DemoWorkflowAlertActivity.class.getName()).await();

        // Check more frequently when in an unhealthy state
        nextSleepInterval = Duration.ofMinutes(5);
      }

      // Put the workflow to sleep until the determined time
      try {
        ctx.createTimer(nextSleepInterval);
      } catch (InterruptedException e) {
        throw new RuntimeException(e);
      }

      // Restart from the beginning with the updated state
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

实现监视器模式的工作流可以永远循环，也可以通过不调用 _continue-as-new_ 来优雅地终止自己。

{{% alert title="Note" color="primary" %}}
此模式也可以使用 actor 和提醒来实现。区别在于此工作流表示为单个函数，输入和状态存储在局部变量中。如果必要，工作流还可以以更强的可靠性保证执行一系列操作。
{{% /alert %}}

## 外部系统交互

在某些情况下，工作流可能需要暂停并等待外部系统执行某些操作。例如，工作流可能需要暂停并等待收到付款。在这种情况下，支付系统可能会在收到付款时向发布/订阅主题发布事件，并且该主题上的侦听器可以使用[引发事件工作流 API]({{% ref "howto-manage-workflow.md#raise-an-event" %}})向工作流引发事件。

另一个非常常见的场景是工作流需要暂停并等待人员，例如在批准采购订单时。Dapr 工作流通过[外部事件]({{% ref "workflow-features-concepts.md#external-events" %}})功能支持此事件模式。

以下是涉及人员的采购订单的工作流示例：

1. 收到采购订单时触发工作流。
1. 工作流中的规则确定需要人员执行某些操作。例如，采购订单成本超过某个自动批准阈值。
1. 工作流发送请求人员操作的通知。例如，它向指定的批准者发送包含批准链接的电子邮件。
1. 工作流暂停并等待人员通过单击链接来批准或拒绝订单。
1. 如果在指定时间内未收到批准，工作流将恢复并执行某些补偿逻辑，例如取消订单。

下图说明了此流程。

<img src="/images/workflow-overview/workflow-human-interaction-pattern.png" width=800 alt="显示涉及人员的外部系统交互模式如何工作的示意图"/>

以下示例代码显示了如何使用 Dapr 工作流实现此模式。

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
    # Orders under $1000 are auto-approved
    if order.cost < 1000:
        return "Auto-approved"

    # Orders of $1000 or more require manager approval
    yield ctx.call_activity(send_approval_request, input=order)

    # Approvals must be received within 24 hours or they will be canceled.
    approval_event = ctx.wait_for_external_event("approval_received")
    timeout_event = ctx.create_timer(timedelta(hours=24))
    winner = yield wf.when_any([approval_event, timeout_event])
    if winner == timeout_event:
        return "Cancelled"

    # The order was approved
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

// Wrap the entire code in an immediately-invoked async function
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

  // Update the gRPC client and worker to use a local address and port
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

  // Activity function that sends an approval request to the manager
  const sendApprovalRequest = async (_: WorkflowActivityContext, order: Order) => {
    // Simulate some work that takes an amount of time
    await sleep(3000);
    console.log(`Sending approval request for order: ${order.product}`);
  };

  // Activity function that places an order
  const placeOrder = async (_: WorkflowActivityContext, order: Order) => {
    console.log(`Placing order: ${order.product}`);
  };

  // Orchestrator function that represents a purchase order workflow
  const purchaseOrderWorkflow: TWorkflow = async function* (ctx: WorkflowContext, order: Order): any {
    // Orders under $1000 are auto-approved
    if (order.cost < 1000) {
      return "Auto-approved";
    }

    // Orders of $1000 or more require manager approval
    yield ctx.callActivity(sendApprovalRequest, order);

    // Approvals must be received within 24 hours or they will be cancled.
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

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await workflowRuntime.start();
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const cost = readlineSync.questionInt("Cost of your order:");
    const approver = readlineSync.question("Approver of your order:");
    const timeout = readlineSync.questionInt("Timeout for your order in seconds:");
    const order = new Order(cost, "MyProduct", 1);
    const id = await workflowClient.scheduleNewWorkflow(purchaseOrderWorkflow, order);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // prompt for approval asynchronously
    promptForApproval(approver, workflowClient, id);

    // Wait for orchestration completion
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, timeout + 2);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // stop worker and client
  await workflowRuntime.stop();
  await workflowClient.stop();

  // stop the dapr side car
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
    // ...(other steps)...

    // Require orders over a certain threshold to be approved
    if (order.TotalCost > OrderApprovalThreshold)
    {
        try
        {
            // Request human approval for this order
            await context.CallActivityAsync(nameof(RequestApprovalActivity), order);

            // Pause and wait for a human to approve the order
            ApprovalResult approvalResult = await context.WaitForExternalEventAsync<ApprovalResult>(
                eventName: "ManagerApproval",
                timeout: TimeSpan.FromDays(3));
            if (approvalResult == ApprovalResult.Rejected)
            {
                // The order was rejected, end the workflow here
                return new OrderResult(Processed: false);
            }
        }
        catch (TaskCanceledException)
        {
            // An approval timeout results in automatic order cancellation
            return new OrderResult(Processed: false);
        }
    }

    // ...(other steps)...

    // End the workflow with a success result
    return new OrderResult(Processed: true);
}
```

> **Note** 在上面的示例中，`RequestApprovalActivity` 是要调用的工作流活动的名称，而 `ApprovalResult` 是由工作流应用定义的枚举。为简洁起见，这些定义未包含在示例代码中。

{{% /tab %}}

{{% tab "Java" %}}

```java
public class ExternalSystemInteractionWorkflow extends Workflow {
    @Override
    public WorkflowStub create() {
        return ctx -> {
            // ...other steps...
            Integer orderCost = ctx.getInput(int.class);
            // Require orders over a certain threshold to be approved
            if (orderCost > ORDER_APPROVAL_THRESHOLD) {
                try {
                    // Request human approval for this order
                    ctx.callActivity("RequestApprovalActivity", orderCost, Void.class).await();
                    // Pause and wait for a human to approve the order
                    boolean approved = ctx.waitForExternalEvent("ManagerApproval", Duration.ofDays(3), boolean.class).await();
                    if (!approved) {
                        // The order was rejected, end the workflow here
                        ctx.complete("Process reject");
                    }
                } catch (TaskCanceledException e) {
                    // An approval timeout results in automatic order cancellation
                    ctx.complete("Process cancel");
                }
            }
            // ...other steps...

            // End the workflow with a success result
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
	// Orders under $1000 are auto-approved
	if order.Cost < 1000 {
		return "Auto-approved", nil
	}
	// Orders of $1000 or more require manager approval
	if err := ctx.CallActivity(SendApprovalRequest, workflow.ActivityInput(order)).Await(nil); err != nil {
		return "", err
	}
	// Approvals must be received within 24 hours or they will be cancelled
	var approval Approval
	if err := ctx.WaitForExternalEvent("approval_received", time.Hour*24).Await(&approval); err != nil {
		// Assuming that a timeout has taken place - in any case; an error.
		return "error/cancelled", err
	}
	// The order was approved
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

向等待的工作流实例传递事件以恢复工作流执行的代码在工作流外部。可以使用[引发事件]({{% ref "howto-manage-workflow.md#raise-an-event" %}})工作流管理 API 将工作流事件传递给等待的工作流实例，如以下示例所示：

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
// Raise the workflow event to the waiting workflow
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

外部事件不必直接由人员触发。它们也可以由其他系统触发。例如，工作流可能需要暂停并等待收到付款。在这种情况下，支付系统可能会在收到付款时向发布/订阅主题发布事件，并且该主题上的侦听器可以使用引发事件工作流 API 向工作流引发事件。

## 补偿

补偿模式（也称为 Saga 模式）提供了一种在工作流中途失败时回滚或撤销已执行操作的机制。此模式对于跨越多个微服务且传统数据库事务不可行的长时间运行的工作流特别重要。

在分布式微服务架构中，您通常需要跨多个服务协调操作。当这些操作无法包含在单个事务中时，补偿模式通过为工作流中的每个步骤定义补偿操作来提供一种保持一致性的方法。

补偿模式解决了几个关键挑战：

- **分布式事务管理**：当工作流跨越多个微服务时，每个微服务都有自己的数据存储，传统的 ACID 事务是不可能的。补偿模式通过确保操作要么全部成功完成，要么通过补偿全部撤销来提供事务一致性。
- **部分故障恢复**：如果工作流在某些步骤成功完成后失败，补偿模式允许您优雅地撤销这些已完成的步骤。
- **业务流程完整性**：确保业务流程可以在故障时正确回滚，从而保持业务操作的完整性。
- **长时间运行的流程**：对于可能运行数小时、数天或更长时间的工作流，传统的锁定机制是不切实际的。补偿提供了一种在这些场景中处理故障的方法。

补偿模式的常见用例包括：

- **电子商务订单处理**：预留库存、处理付款和发货订单。如果发货失败，您需要释放库存并退还付款。
- **金融交易**：在转账中，如果贷记目标账户失败，您需要回滚对源账户的借记。
- **资源预配**：在跨多个提供程序预配云资源时，如果某个步骤失败，您需要清理所有以前预配的资源。
- **多步骤业务流程**：任何涉及多个不可逆步骤的业务流程，这些步骤可能需要在后续失败时撤销。

Dapr 工作流提供对补偿模式的支持，允许您为每个步骤注册补偿活动，并在需要时以相反的顺序执行它们。

以下是电子商务流程的工作流示例：

1. 收到订单时触发工作流。
1. 在库存中为订单进行预留。
1. 处理付款。
1. 发货订单。
1. 如果上述任何操作导致错误，则使用另一个操作进行补偿：
   - 取消发货。
   - 退还付款。
   - 释放库存预留。

下图说明了此流程。

<img src="/images/workflow-overview/workflows-compensation.png" width=600 alt="显示补偿模式的示意图。"/>

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
                // Step 1: Reserve inventory
                String reservationId = ctx.callActivity(ReserveInventoryActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Inventory reserved: {}", reservationId);
                compensations.add("ReleaseInventory");

                // Step 2: Process payment
                String paymentId = ctx.callActivity(ProcessPaymentActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Payment processed: {}", paymentId);
                compensations.add("RefundPayment");

                // Step 3: Ship order
                String shipmentId = ctx.callActivity(ShipOrderActivity.class.getName(), orderId, String.class).await();
                ctx.getLogger().info("Order shipped: {}", shipmentId);
                compensations.add("CancelShipment");

            } catch (TaskFailedException e) {
                ctx.getLogger().error("Activity failed: {}", e.getMessage());

                // Execute compensations in reverse order
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

			// Step 4: Send confirmation
			ctx.callActivity(SendConfirmationActivity.class.getName(), orderId, Void.class).await();
            ctx.getLogger().info("Confirmation sent for order: {}", orderId);

            ctx.complete("Order processed successfully: " + orderId);
        };
    }
}

// Example activities
class ReserveInventoryActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // Logic to reserve inventory
        String reservationId = "reservation_" + orderId;
        System.out.println("Reserved inventory for order: " + orderId);
        return reservationId;
    }
}

class ReleaseInventoryActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String reservationId = ctx.getInput(String.class);
        // Logic to release inventory reservation
        System.out.println("Released inventory reservation: " + reservationId);
        return "Released: " + reservationId;
    }
}

class ProcessPaymentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // Logic to process payment
        String paymentId = "payment_" + orderId;
        System.out.println("Processed payment for order: " + orderId);
        return paymentId;
    }
}

class RefundPaymentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String paymentId = ctx.getInput(String.class);
        // Logic to refund payment
        System.out.println("Refunded payment: " + paymentId);
        return "Refunded: " + paymentId;
    }
}

class ShipOrderActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // Logic to ship order
        String shipmentId = "shipment_" + orderId;
        System.out.println("Shipped order: " + orderId);
        return shipmentId;
    }
}

class CancelShipmentActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String shipmentId = ctx.getInput(String.class);
        // Logic to cancel shipment
        System.out.println("Canceled shipment: " + shipmentId);
        return "Canceled: " + shipmentId;
    }
}

class SendConfirmationActivity implements WorkflowActivity {
    @Override
    public Object run(WorkflowActivityContext ctx) {
        String orderId = ctx.getInput(String.class);
        // Logic to send confirmation
        System.out.println("Sent confirmation for order: " + orderId);
        return null;
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

使用 Dapr 工作流补偿模式的主要好处包括：

- **补偿控制**：您可以完全控制何时以及如何执行补偿活动。
- **灵活配置**：您可以实现自定义逻辑来确定要运行哪些补偿。
- **错误处理**：根据您的特定业务需求处理补偿失败。
- **简单实现**：无需额外的框架依赖 - 只需标准的工作流活动和异常处理。

补偿模式确保您的分布式工作流可以保持一致性并从故障中优雅地恢复，使其成为构建可靠微服务架构的重要工具。

## 后续步骤

{{< button text="工作流架构 >>" page="workflow-architecture.md" >}}

## 相关链接

- [使用快速入门试用 Dapr 工作流]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
