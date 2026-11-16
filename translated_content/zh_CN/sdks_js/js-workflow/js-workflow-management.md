---
type: docs
title: "使用 JavaScript SDK 管理工作流实例"
linkTitle: "管理工作流实例"
weight: 1100
description: 使用 DaprWorkflowClient 调度、查看、控制、列出和重新运行工作流实例
---

请从应用或管理代码中使用 `DaprWorkflowClient`，不要在工作流生成器函数内部使用。本指南适用于 `@dapr/dapr` **3.19.0 或更高版本**以及运行时 **1.19 或更高版本**。

```javascript
import { DaprWorkflowClient, WorkflowRuntimeStatus } from "@dapr/dapr";

const client = new DaprWorkflowClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
});
```

后续代码片段复用 `client`。工作流名称必须已在目标工作进程上注册。应用关闭时调用 `await client.stop()`。

## 选择管理客户端

`DaprWorkflowClient` 与 `DaprClient.workflow` 是两个独立的对象，后者即[基础工作流 API]({{% ref "developing-applications/sdks/js/js-client/_index.md" %}}#workflow-api)。基础 API 支持通过 HTTP 或 gRPC 使用 `scheduleNewWorkflow`、`getWorkflowState`、`raiseEvent`、`pause`、`resume`、`terminate` 和 `purge`。其旧的 `start`、`get` 和 `raise` 名称是已弃用的别名。它返回带有 `properties` 的普通 `WorkflowGetResponseType`，而不是本文所述的 `WorkflowState`。

需要持久的启动或完成等待、列出实例、获取历史、重新运行以及集成的负载引用处理时，请使用 `DaprWorkflowClient`。它的方法和选项与基础 API 并不通用：例如，它使用 `suspendWorkflow` 而不是 `pause`，并且 `getWorkflowState` 需要 `getInputsAndOutputs` 参数。

## 调度并等待

```javascript
const instanceId = await client.scheduleNewWorkflow(
  "orderWorkflow",
  { orderId: "order-123" },
  "order-123",
  new Date(Date.now() + 60_000),
);

await client.waitForWorkflowStart(instanceId, false, 120);
const state = await client.waitForWorkflowCompletion(instanceId, true, 300);
if (!state) throw new Error(`Workflow ${instanceId} was not found`);

if (state.runtimeStatus === WorkflowRuntimeStatus.COMPLETED) {
  console.log(state.getOutput());
} else {
  console.error(state.runtimeStatus, state.workflowFailureDetails);
}
```

位置参数依次为 `(workflow, input?, instanceId?, startAt?, signal?)`。`workflow` 可以是已注册的名称，也可以是函数；省略实例 ID 时会自动生成。`startAt` 是可选的绝对 `Date`。这里使用挂钟时间是安全的，因为这是客户端代码，而不是会被重放的工作流代码。

两个等待方法都接受 `(instanceId, fetchPayloads = true, timeoutInSeconds = 60, signal?)`。等待超时或 RPC 失败会使 Promise 被拒绝。工作流到达失败或已终止状态时，等待可能返回一个状态而不抛出异常：应检查 `runtimeStatus`，而不能只看等待是否成功完成。

## 查看状态与失败详情

`await client.getWorkflowState(instanceId, true)` 返回一个 `WorkflowState` 快照；若实例不存在，则返回 `undefined`。只需要元数据时，传入 `false` 可省略输入和输出。

| 成员 | 含义 |
| --- | --- |
| `name`、`instanceId`、`exists` | 注册名称、实例 ID，以及实例是否存在（返回的状态对象中为 `true`）。 |
| `runtimeStatus` | 与 `WorkflowRuntimeStatus.RUNNING`、`COMPLETED`、`CONTINUED_AS_NEW`、`FAILED`、`CANCELED`、`TERMINATED`、`PENDING`、`SUSPENDED` 或 `STALLED` 比较。 |
| `createdAt`、`lastUpdatedAt` | JavaScript `Date` 值。 |
| `getInput()`、`getOutput()`、`getCustomStatus()` | 使用客户端配置的序列化器反序列化；TypeScript 调用方可以提供泛型结果类型。 |
| `serializedInput`、`serializedOutput`、`customStatus` | 序列化后的字符串，而不是已解析的对象。启用负载支持时，会在可能的情况下预先准备好已解析的字符串。 |
| `workflowFailureDetails` | `getErrorType()`、`getErrorMessage()`、`getStackTrace()`、`isNonRetriable`，以及用于获取嵌套详情的 `getInnerFailure()`。`innerFailure` 暴露嵌套的原始 protobuf 值。 |
| `getInputReference()`、`getOutputReference()`、`getCustomStatusReference()` | 原始的顶层二进制存储引用（如果存在）。参见[数据引用]({{% ref js-workflow-data-references.md %}}#read-client-results)。 |

类型化的 getter 不会校验应用的模式，也不会自动重建类实例。缺失的负载字段返回 `undefined`。二进制存储对象缺失或完整性校验失败属于错误，而不是“工作流未找到”。

## 发送事件并控制执行

| 方法 | 行为 |
| --- | --- |
| `raiseEvent(id, eventName, payload?, signal?)` | 将事件投递到工作流的持久事件等待点。 |
| `suspendWorkflow(id, reason?, signal?)` | 挂起实例的执行。 |
| `resumeWorkflow(id, reason?, signal?)` | 恢复已挂起的实例。 |
| `terminateWorkflow(id, output?, signal?)` | 请求终止，可附带可选输出；不会执行应用的补偿逻辑。 |
| `purgeWorkflow(id, signal?)` | 清除保留的实例状态和历史；返回是否删除了某个实例。受运行时的资格检查约束。 |

例如：

```javascript
await client.suspendWorkflow(instanceId, "Investigating an order");
await client.resumeWorkflow(instanceId, "Investigation complete");
await client.raiseEvent(instanceId, "approval", { approved: true });
```

不要把挂起或终止当作撤销活动副作用的手段。被取消的客户端请求也不会终止实例。清除历史**不会**删除二进制存储中的负载。

### 取消客户端请求

调度、状态读取、等待、事件投递、挂起和恢复、终止以及清除都接受一个可选的 `AbortSignal`，作为其最后一个参数：

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
try {
  await client.waitForWorkflowCompletion(instanceId, true, 60, controller.signal);
} finally {
  clearTimeout(timeout);
}
```

中止会停止该请求以及相关的负载 I/O（如果支持），但不会停止持久的工作流。请求在取消之前可能已经被运行时接受。列出、获取历史和重新运行在本版本中都不接受 `AbortSignal` 参数。

## 列出实例

`listWorkflowInstanceIds(continuationToken?, pageSize?)` 返回 `{ instanceIds, continuationToken }`。持续翻页，直到不再返回延续令牌：

```javascript
let token;
do {
  const page = await client.listWorkflowInstanceIds(token, 100);
  for (const id of page.instanceIds) {
    console.log(id);
  }
  token = page.continuationToken;
} while (token);
```

SDK 会将 `pageSize` 校验为 `1` 到 `4294967295` 之间的整数；运行时可能还有其他限制。响应仅包含 ID，而不包含状态快照或过滤后的查询结果。

## 获取执行历史

```javascript
const history = await client.getWorkflowHistory(instanceId);
for (const event of history) {
  console.log(event.eventId, event.eventType.case);
}
```

这会使用 SDK 的 protobuf 类型返回完整的 `HistoryEvent[]`。负载字段仍保持序列化的传输数据，包括所有引用信封；获取历史并不会自动还原负载。实例不存在及其他运行时错误会照常抛出。

## 从事件重新运行

先检查源历史，选择运行时可接受的事件 ID，然后创建新实例：

```javascript
const rerunId = await client.rerunWorkflowFromEvent(instanceId, eventId, {
  newInstanceId: "order-123-rerun",
  input: { correctedAmount: 125 },
});
```

`eventId` 是历史事件 ID，**不是**数组索引，并且必须是无符号 32 位整数。此操作会创建一个新实例，不会修改源实例。替换用的 `input` 作用于**该事件所指向的活动**，而不是原始工作流输入。

`newInstanceId` 是可选的，但不能为空。提供 `input` 时，`overwriteInput` 默认为 `true`；将其设为 `false` 可保留原始活动输入。运行时决定哪些历史和事件符合条件，并对实例不存在或事件无效的情况抛出错误。重新运行可能会重复副作用：请检查幂等性，并保留复制的历史中仍被引用的所有二进制对象。

## 后续步骤

- [编写工作流]({{% ref js-workflow-authoring.md %}})
- [保留和清理已存储的负载]({{% ref js-workflow-data-references.md %}}#retention-and-cleanup)
