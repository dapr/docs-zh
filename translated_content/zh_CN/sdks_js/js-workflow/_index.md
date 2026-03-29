---
type: docs
title: "如何：在 JavaScript SDK 中编写和管理 Dapr 工作流"
linkTitle: "如何：编写和管理工作流"
weight: 20000
description: 如何使用 Dapr JavaScript SDK 快速上手工作流
---

让我们创建一个 Dapr 工作流并通过控制台调用它。借助[提供的工作流示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)，你将：

- 使用 [JavaScript 工作流 worker](https://github.com/dapr/js-sdk/tree/main/src/workflow/runtime/WorkflowRuntime.ts) 执行工作流实例
- 利用 JavaScript 工作流客户端与 API 调用来[启动和终止工作流实例](https://github.com/dapr/js-sdk/tree/main/src/workflow/client/DaprWorkflowClient.ts)

本示例使用了在[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)下通过 `dapr init` 获得的默认配置。

## 前提条件

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Node.js 和 npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)。
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- 验证你正在使用最新的 proto 绑定

## 设置环境

克隆 JavaScript SDK 仓库并进入该目录。

```bash
git clone https://github.com/dapr/js-sdk
cd js-sdk
```

从 JavaScript SDK 根目录进入 Dapr Workflow 示例。

```bash
cd examples/workflow/authoring
```

运行以下命令以安装使用 Dapr JavaScript SDK 运行此工作流示例所需的所有依赖。

```bash
npm install
```

## 运行 `activity-sequence.ts`

`activity-sequence` 文件向 Dapr Workflow 运行时注册了一个工作流和一个 activity。该工作流是按顺序执行的多个 activity 组成的序列。我们使用 DaprWorkflowClient 调度新的工作流实例并等待其完成。

```typescript
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

// 将 worker 启动包装在 try-catch 块中以处理启动期间的任何错误
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
```

在以上代码中：

- `workflowRuntime.registerWorkflow(sequence)` 将 `sequence` 注册为 Dapr Workflow 运行时中的一个工作流。
- `await workflowRuntime.start();` 在 Dapr Workflow 运行时中构建并启动引擎。
- `await workflowClient.scheduleNewWorkflow(sequence)` 向 Dapr Workflow 运行时调度一个新的工作流实例。
- `await workflowClient.waitForWorkflowCompletion(id, undefined, 30)` 等待工作流实例完成。

在终端中执行以下命令以启动 `activity-sequence.ts`：

```sh
npm run start:dapr:activity-sequence
```

**预期输出**

```
You're up and running! Both Dapr and your app logs will appear here.

...

== APP == Orchestration scheduled with ID: dc040bea-6436-4051-9166-c9294f9d2201
== APP == Waiting 30 seconds for instance dc040bea-6436-4051-9166-c9294f9d2201 to complete...
== APP == Received "Orchestrator Request" work item with instance id 'dc040bea-6436-4051-9166-c9294f9d2201'
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Rebuilding local state with 0 history event...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, EXECUTIONSTARTED=1]
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Waiting for 1 task(s) and 0 event(s) to complete...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Returning 1 action(s)
== APP == Received "Activity Request" work item
== APP == Activity hello completed with output "Hello Tokyo!" (14 chars)
== APP == Received "Orchestrator Request" work item with instance id 'dc040bea-6436-4051-9166-c9294f9d2201'
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Rebuilding local state with 3 history event...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Waiting for 1 task(s) and 0 event(s) to complete...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Returning 1 action(s)
== APP == Received "Activity Request" work item
== APP == Activity hello completed with output "Hello Seattle!" (16 chars)
== APP == Received "Orchestrator Request" work item with instance id 'dc040bea-6436-4051-9166-c9294f9d2201'
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Rebuilding local state with 6 history event...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Waiting for 1 task(s) and 0 event(s) to complete...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Returning 1 action(s)
== APP == Received "Activity Request" work item
== APP == Activity hello completed with output "Hello London!" (15 chars)
== APP == Received "Orchestrator Request" work item with instance id 'dc040bea-6436-4051-9166-c9294f9d2201'
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Rebuilding local state with 9 history event...
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Orchestration completed with status COMPLETED
== APP == dc040bea-6436-4051-9166-c9294f9d2201: Returning 1 action(s)
INFO[0006] dc040bea-6436-4051-9166-c9294f9d2201: 'sequence' completed with a COMPLETED status.  app_id=activity-sequence-workflow instance=kaibocai-devbox scope=wfengine.backend type=log ver=1.12.3
== APP == Instance dc040bea-6436-4051-9166-c9294f9d2201 completed
== APP == Orchestration completed! Result: ["Hello Tokyo!","Hello Seattle!","Hello London!"]
```

## 后续步骤

- [详细了解 Dapr 工作流]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
