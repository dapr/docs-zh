---
type: docs
title: "操作指南：使用 JavaScript SDK 编写并运行工作流"
linkTitle: "编写并运行工作流"
weight: 1000
description: 注册工作流与活动，协调持久任务，并处理重试与事件
---

工作流是生成器函数，它们 **yield SDK 任务**。运行时将任务结果记录到历史中，并通过重放生成器来重建其状态。活动是普通函数，可以是异步的，用于执行 I/O 或其他位于确定性工作流之外的工作。

## 前提条件

- Node.js 18 或更高版本，以及 `@dapr/dapr` **3.19.0 或更高版本**。
- 已初始化的[自托管 Dapr 环境]({{% ref install-dapr-selfhost.md %}})，运行时版本为 **1.19 或更高版本**。
- 工作流基础设施：actor 状态存储、placement 与调度器。默认的 `dapr init` 环境可为本地开发提供这些组件。

## 注册并运行工作流

在应用目录中安装该包：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

将这个完整示例保存为 `app.mjs`。它使用 JavaScript ES 模块；TypeScript 中同样可以使用相同的 API。

```javascript
import {
  DaprWorkflowClient,
  WorkflowRuntime,
  WorkflowRuntimeStatus,
} from "@dapr/dapr";

async function hello(_ctx, name) {
  return `Hello ${name}!`;
}

function* sequence(ctx) {
  const cities = [];
  for (const city of ["Tokyo", "Seattle", "London"]) {
    cities.push(yield ctx.callActivity(hello, city));
  }
  ctx.logger.info("Greeting sequence completed");
  return cities;
}

const options = { daprHost: "127.0.0.1", daprPort: "50001" };
const runtime = new WorkflowRuntime(options);
const client = new DaprWorkflowClient(options);
runtime.registerWorkflow(sequence).registerActivity(hello);

try {
  await runtime.start();
  const id = await client.scheduleNewWorkflow(sequence);
  const state = await client.waitForWorkflowCompletion(id, true, 30);
  if (!state || state.runtimeStatus !== WorkflowRuntimeStatus.COMPLETED) {
    throw new Error(
      state?.workflowFailureDetails?.getErrorMessage() ?? "Workflow did not complete successfully",
    );
  }
  console.log(state.getOutput());
} finally {
  await runtime.stop();
  await client.stop();
}
```

使用边车运行它：

```sh
dapr run --app-id sequence-workflow --dapr-grpc-port 50001 -- node app.mjs
```

输出中会包含 `["Hello Tokyo!", "Hello Seattle!", "Hello London!"]`。

### 注册名称

`registerWorkflow(fn)` 与 `registerActivity(fn)` 使用函数名作为持久的注册名称。若要使用显式且稳定的名称，请使用：

```javascript
runtime.registerWorkflowByName("greeting-v1", sequence);
runtime.registerActivityWithName("hello-v1", hello);
```

请通过字符串调用这些注册，例如 `ctx.callActivity("hello-v1", city)` 或 `client.scheduleNewWorkflow("greeting-v1")`。在各次部署之间以及代码压缩之后，都应保持名称稳定。`registerWorkflowWithName` 是 `registerWorkflowByName` 的已弃用别名。

## 保持工作流执行的确定性

将网络调用、数据库操作、文件系统访问以及非确定性计算放在活动中。使用 `yield` 搭配 `ctx.callActivity`、定时器、事件等待和任务组合辅助函数；不要用 `await` 或 `Promise.all` 替代持久任务。同步生成器与异步生成器都受支持，但异步生成器并不会使任意 I/O 具备重放安全性。

| 需求 | 工作流 API |
| --- | --- |
| 当前时间 | `ctx.getCurrentUtcDateTime()`，而不是 `new Date()` 或 `Date.now()` |
| 生成的标识符 | `ctx.newGuid()`，而不是随机 UUID |
| 实例或注册名称 | `ctx.getWorkflowInstanceId()`、`ctx.getWorkflowName()` |
| 不产生重复重放消息的日志 | `ctx.logger.info(...)`、`.warn(...)`、`.error(...)` 或 `.debug(...)` |
| 有条件的重放处理 | `ctx.isReplaying()` |
| 对外可见的进度 | `ctx.setCustomStatus({ step: "processing" })` |

活动可能会被投递多次，因此请让外部副作用保持幂等。活动接收一个 `WorkflowActivityContext`，其中包含 `getWorkflowInstanceId()`、`getWorkflowActivityId()` 和 `getTaskExecutionId()`。执行 ID 是持久化的活动键，也会以 `task.executionId` 的形式出现在工作流的活动任务上，并在 SDK 重试尝试之间复用。对于旧版历史记录或未提供该值的运行时，它可能为 `undefined`；不要假定它始终存在，也不要假定它能保证恰好一次投递。

## 并行运行活动

在 yield `whenAll` 之前先创建所有任务：

```javascript
function* parallelGreetings(ctx, cities) {
  const tasks = cities.map((city) => ctx.callActivity("hello", city));
  return yield ctx.whenAll(tasks);
}
```

`whenAll` 按输入顺序返回结果，并且在任一任务失败时失败。`whenAny` 返回**第一个完成的任务**，而不是其结果，并且不会取消其他任务。请 yield 获胜的任务，或调用其 `getResult()`，以观察其结果或错误。

## 重试活动与子工作流

在活动或子工作流选项中传入 `retryPolicy`：

```javascript
function* resilientGreeting(ctx, name) {
  return yield ctx.callActivity("hello", name, {
    retryPolicy: {
      firstRetryInterval: 1,
      maxNumberOfAttempts: 4,
      backoffCoefficient: 2,
      maxRetryInterval: 30,
      retryTimeout: 120,
    },
  });
}
```

所有间隔均以**秒**为单位。`maxNumberOfAttempts` 包含初始调用；`backoffCoefficient` 默认为 `1`。首个间隔以及可选的限制值必须为正的有限数；尝试次数必须为正整数，退避系数必须至少为 `1`。不可重试的失败会停止重试。`retryTimeout` 限制的是继续调度新尝试的时间窗口，它并不是中断正在运行的活动的超时。失败会在 `yield` 处抛入生成器，你可以在那里捕获它们，并调度补偿活动。

## 等待外部事件

外部事件允许另一个进程向某个实例发送信号。SDK 以不区分大小写的方式匹配事件名称，并会缓存在等待创建之前到达的事件。

```javascript
import { TaskTimeoutError } from "@dapr/dapr";

function* approval(ctx) {
  ctx.setCustomStatus({ step: "awaiting-approval" });
  try {
    const decision = yield ctx.waitForExternalEvent("approval", {
      timeoutInSeconds: 3600,
    });
    return decision;
  } catch (error) {
    if (!(error instanceof TaskTimeoutError)) throw error;
    return { approved: false, reason: "Approval deadline expired" };
  }
}
```

从客户端调用 `await client.raiseEvent(instanceId, "approval", { approved: true })`。在同一应用中的另一个工作流内，使用 `ctx.sendEvent(instanceId, "approval", { approved: true })`；`sendEvent` 不返回任务，也不需要 yield。不要在工作流代码中暴露客户端，也不要在其中发起客户端 RPC。

## 使用持久定时器与取消

`ctx.createTimer(60)` 会等待工作流时间中的 60 **秒**。你也可以提供一个由 `ctx.getCurrentUtcDateTime()` 计算出的绝对 `Date`。不要使用 `setTimeout` 实现持久延迟。

若要让事件与定时器竞争：

```javascript
function* approvalRace(ctx) {
  const event = ctx.waitForExternalEvent("approval");
  const timer = ctx.createTimer(3600);
  const winner = yield ctx.whenAny([event, timer]);
  if (winner === event) {
    timer.cancel();
    return event.getResult();
  }
  event.cancel();
  timer.getResult();
  return { approved: false, reason: "Approval deadline expired" };
}
```

定时器与事件等待实现了 `CancellableTask`，暴露 `cancel()` 和 `isCanceled`。取消会停止 SDK 的本地等待，并以 `TaskCanceledError` 拒绝它；它**不会**取消运行时侧的工作、活动或整个工作流。竞争结束后，请显式取消未使用的等待。

## 继续作为新

对于长时间运行的循环，请在同一实例 ID 下启动一个新的历史代：

```javascript
function* batchLoop(ctx, input) {
  const next = yield ctx.callActivity("processBatch", input);
  ctx.continueAsNew(next, true);
  return;
}
```

请在 `continueAsNew` 之后立即返回。第二个参数 `saveEvents` 默认为 `true`，会保留未消费的外部事件；将其设为 `false` 则会丢弃这些事件。请求继续之后，不要再调度更多工作。在启动工作进程之前，请注册此示例中使用的活动。

## 后续步骤

- [管理工作流实例]({{% ref js-workflow-management.md %}})
- [调用子工作流与分离工作流]({{% ref js-workflow-multi-app.md %}})
- [安全地演进工作流代码]({{% ref js-workflow-versioning.md %}})
