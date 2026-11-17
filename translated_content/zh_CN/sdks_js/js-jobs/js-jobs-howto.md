---
type: docs
title: "操作指南：使用 JavaScript SDK 编写和管理 Dapr Jobs"
linkTitle: "操作指南：编写和管理 job"
weight: 51000
description: 了解如何使用 JavaScript 调度一次性和周期性 job 并处理其回调
---

下面我们注册一个端点来接收 job 通知，然后在同一个应用中调度该 job。本指南使用 `DaprServer.jobs` 处理回调，并使用其嵌入式的 `DaprClient.jobs` 管理 job。无需另外安装单独的 Jobs 客户端包。

## 先决条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}}),其中 **Dapr runtime 为 1.16 或更高版本**,并且 [Scheduler service]({{% ref "concepts/dapr-services/scheduler.md" %}}) 正在运行
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，**版本为 3.19.0 或更高**

在你的应用目录中，如有需要请先初始化 npm 项目，然后安装 SDK:

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 `.mjs` 文件中的 JavaScript ES 模块，因此无需 TypeScript 编译器。同样的 API 也可用于 TypeScript。

## 注册处理程序并调度周期性 job

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprServer } from "@dapr/dapr";

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "50002",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  clientOptions: {
    daprHost: "127.0.0.1",
    daprPort: "50001",
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  },
});

const jobName = "daily-report";

try {
  await server.jobs.listen(jobName, async (data) => {
    console.log(`Received ${jobName}:`, data);
  });

  await server.start();

  await server.client.jobs.schedule(jobName, {
    schedule: "@every 10s",
    repeats: 3,
    data: { report: "daily", format: "csv" },
    failurePolicy: { type: "constant", interval: "1s", maxRetries: 3 },
    overwrite: true,
  });

  const job = await server.client.jobs.get(jobName);
  console.log("Scheduled:", job.name, job.schedule, job.data);
  console.log("Waiting for callbacks. Press Ctrl+C to stop.");

  await new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
} finally {
  try {
    await server.stop();
  } finally {
    await server.client.stop();
  }
}
```

使用以下命令启动应用和 sidecar：

```sh
dapr run --app-id jobs-example --app-port 50002 --app-protocol grpc --dapr-grpc-port 50001 --dapr-http-port 3500 -- node app.mjs
```

应用监听端口 `50002`；其客户端则将管理请求发送到端口 `50001` 上的 sidecar。该 job 每隔十秒触发一次，共触发三次。回调接收到的是负载本身，而不是 job 信封或 job 名称。如有需要，可在处理程序的闭包中捕获 job 名称。

调用 `server.start()` **之前**注册处理程序。在处理程序中等待所有工作完成；处理失败时抛出错误或拒绝其 Promise,以便 Dapr 应用该 job 的失败策略。投递语义为至少一次，因此请让处理程序具备幂等性。

示例中特意使用了 `overwrite: true`，以便在同名 job 仍然存在时可以重复运行。若不设置此选项，调度一个已存在的名称会失败。覆盖会替换已有的 job，包括其时间与重复设置；不要在每个副本启动时都盲目重置生产环境中的调度。

job 归属于调度它的 sidecar 所在的应用 ID 和 namespace。回调会发送到该应用，而不是任意的目标应用。请在每个可能接收回调的副本上注册处理程序。处理程序中可以使用其他 Dapr API 来调用另一个服务或发布事件。

停止 Node.js 服务器并不会删除存储在 Scheduler 中的 job。示例还显式停止了嵌入式客户端，因为 `server.stop()` 只会停止回调服务器。

## 改用 HTTP

对于 JSON 负载，管理请求和回调都可以使用 HTTP。将服务器的 `communicationProtocol` 改为 `CommunicationProtocolEnum.HTTP`，并将其 `clientOptions` 改为：

```javascript
clientOptions: {
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
},
```

使用匹配的应用协议运行：

```sh
dapr run --app-id jobs-example --app-port 50002 --app-protocol http --dapr-grpc-port 50001 --dapr-http-port 3500 -- node app.mjs
```

SDK 会注册 HTTP 回调路由 `POST /job/:name`；你无需自行实现此路由。客户端与回调所使用的协议也可以不同，参见[协议指南]({{% ref js-jobs-client-usage.md %}})。

## 调度一次性 job

对于一次性 job，提供 `dueTime` 而不提供 `schedule`：

```javascript
await server.client.jobs.schedule("send-notification", {
  dueTime: "30s",
  data: { recipientId: "customer-123" },
});
```

若要使用绝对时间，请传入 RFC3339 时间戳：

```javascript
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

await server.client.jobs.schedule("send-notification-tomorrow", {
  dueTime: tomorrow.toISOString(),
  data: { recipientId: "customer-123" },
});
```

这些代码片段复用了示例中正在运行的 `server`。若要接收这些额外的 job，需在启动服务器之前为每个名称注册对应的 `server.jobs.listen(...)` 处理程序。其余的调度示例遵循相同的模式。

## 限制周期性 job 的生命周期

将 `schedule` 与 `dueTime` 结合使用，可以延迟周期性 job 生效的时间。使用 `repeats` 限制调度触发的次数，使用 `ttl` 设置过期时间，或两者同时使用：

```javascript
await server.client.jobs.schedule("hourly-cleanup", {
  schedule: "@every 1h",
  dueTime: "10m",
  repeats: 5,
  ttl: "6h",
});
```

省略 `repeats` 时，周期性 job 会一直运行，直到过期或被删除。相对的 `dueTime` 和 `ttl` 值从 job 创建时开始计算，而不是从上一次回调开始计算。可接受的时间格式参见[选项参考]({{% ref js-jobs-client-usage.md %}})。

若要基于日历进行调度，请使用六字段的 cron 字符串，或使用 [`CronExpressionBuilder`]({{% ref js-jobs-cron.md %}}):

```javascript
await server.client.jobs.schedule("morning-report", {
  schedule: "CRON_TZ=America/New_York 0 30 9 * * 1-5",
  data: { report: "daily" },
});
```

## 获取或删除 job

按名称获取已存储的配置：

```javascript
const job = await server.client.jobs.get("hourly-cleanup");
console.log(job.name, job.schedule, job.dueTime, job.ttl, job.repeats);
console.log(job.data, job.failurePolicy);
```

若要停止后续触发，请删除该 job：

```javascript
await server.client.jobs.delete("hourly-cleanup");
```

删除 job 不会取消已在运行的回调工作，也不会注销应用中内存里的处理程序。若要修改已存储的 job，请使用其名称、替换后的选项以及 `overwrite: true` 调用 `schedule`。

## 后续步骤

阅读[客户端与回调用法指南]({{% ref js-jobs-client-usage.md %}}),了解负载、重试、校验和运行时兼容性等内容；或阅读[cron 构建器指南]({{% ref js-jobs-cron.md %}}),了解链式调度的用法。
