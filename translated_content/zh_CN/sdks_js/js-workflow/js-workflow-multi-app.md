---
type: docs
title: "JavaScript SDK 中的多应用 workflow 与历史传播"
linkTitle: "多应用 workflow 与历史"
weight: 1200
description: 协调远程 activity、child workflow 和 detached workflow，并检查祖先历史
---

使用 `targetAppId` 将 activity 和 workflow 调用路由到另一个 Dapr 应用。本指南使用 `@dapr/dapr` **3.19.0 或更高版本**，以及 Dapr runtime **1.19 或更高版本**。
参见[multi-application workflow]({{% ref workflow-multi-app.md %}})了解运行时架构与约束。

## 要求

参与的应用必须运行在同一个 namespace 中，并使用相同的 workflow actor state store。每个目标应用都必须注册被调用的名称，并运行 workflow 工作进程。进行本地调用时省略 `targetAppId`。对于跨语言调用，需要事先就名称、输入/输出的架构和序列化方式达成一致。

## 调用 activity 或 child workflow

```javascript
import { HistoryPropagationScope } from "@dapr/dapr";

function* orderWorkflow(ctx, order) {
  const payment = yield ctx.callActivity("chargePayment", order, {
    targetAppId: "payments",
    retryPolicy: { firstRetryInterval: 2, maxNumberOfAttempts: 3 },
    propagationScope: HistoryPropagationScope.OWN_HISTORY,
  });

  return yield ctx.callChildWorkflow(
    "fulfillmentWorkflow",
    { order, payment },
    undefined,
    {
      targetAppId: "fulfillment",
      propagationScope: HistoryPropagationScope.LINEAGE,
    },
  );
}
```

调用 activity 会返回 activity 的结果；调用 child workflow 会等待 child workflow 完成，并返回其输出。失败会在对应的 `yield` 处抛出。`callSubWorkflow` 是 `callChildWorkflow` 的别名。child workflow 的位置参数为 `(workflow, input?, instanceId?, options?)`；若省略 child workflow ID，则由 SDK 推导。重试策略既可以重试 child workflow，也可以重试 activity。自定义的 child workflow ID 只应用于第一次尝试；之后的重试会获得自动生成的 child workflow ID。

## 调度独立的 detached workflow

detached workflow 需要 Dapr runtime **1.19 或更高版本**：

```javascript
function* dispatchWorkflow(ctx, input) {
  const startAt = new Date(ctx.getCurrentUtcDateTime().getTime() + 60_000);
  const detachedId = yield ctx.scheduleNewDetachedWorkflow(
    "notificationWorkflow",
    input,
    undefined,
    startAt,
    { targetAppId: "notifications" },
  );
  return { detachedId };
}
```

该任务返回的是 detached workflow 的**实例 ID**，而不是其输出。该 workflow 独立运行：它的完成或失败不会回传给调用方。若要查看返回的 ID，请使用客户端通过目标应用的 sidecar 进行查询。参数为 `(workflow, input?, instanceId?, startAt?, options?)`。分离选项支持 `targetAppId` 和 `allowPayloadReferences`，但**不支持重试或 history propagation**。务必 yield 调度任务，以便 workflow 记录这一调度操作。

## 检查 propagated history

activity 和 child workflow 的选项接受以下取值：

| `HistoryPropagationScope` | 与被调用方共享的历史 |
| --- | --- |
| `NONE` | 不进行 history propagation；默认值。 |
| `OWN_HISTORY` | 调用方 workflow 自身的历史。 |
| `LINEAGE` | 调用方的历史，连同其继承的祖先历史。 |

在 workflow 或 activity 中调用 `ctx.getPropagatedHistory()`。若未提供历史，它返回 `undefined`；否则返回只读的 `PropagatedHistoryView`：

```javascript
async function auditActivity(ctx, input) {
  const history = ctx.getPropagatedHistory();
  if (history) {
    console.log(history.appIDs);
    for (const ancestor of history.workflows) {
      console.log(ancestor.workflowName, ancestor.instanceId, ancestor.eventCount);
    }
  }
  return input;
}
```

| 成员 | 含义 |
| --- | --- |
| `scope`、`chunks` | 请求的作用域与祖先块，最早的祖先在前，直接父级在最后。 |
| `events`、`appIDs` | 展平后的事件，以及跨块去重后的应用 ID。 |
| `workflows` | 块的列表，包含展平视图中的 `startEventIndex` 和 `eventCount`。 |
| `getWorkflowByName(name)` | 最早匹配的祖先，若无则为 `null`。 |
| `getEventsByAppID(id)`、`getEventsByInstanceID(id)` | 与某个应用或实例匹配的事件。 |
| `getEventsByWorkflowName(name)` | 来自所有匹配的 workflow instance 的事件，而不仅是第一个匹配项。 |

每个块包含 `appId`、`instanceId`、`workflowName`、解码后的 `events`，以及原始的 `rawEvents`、`rawSignatures` 和 `signingCertChains`。SDK 会保留这些字节，但**不验证签名**。请勿将此视图视为经 SDK 验证的证据。历史中的负载仍保持序列化状态；此视图不会自动解析引用信封。

history propagation 会增加传给被调用方的数据量，并可能暴露祖先的输入、输出和事件。请选择所需的最窄作用域。这与不受支持的 stateful Workflow Client 不同。

## 跨应用数据引用

启用[Binary Store 负载支持]({{% ref js-workflow-data-references.md %}})后，跨应用的 activity、child workflow 和 detached workflow 输入**默认内联**。仅当目标端理解引用契约并能访问相同的存储对象时，才设置 `allowPayloadReferences: true`。

JavaScript SDK 与 .NET SDK 共享版本 1 的引用信封。要实现互操作，需要兼容的序列化器、契约和存储访问；JavaScript 并未实现 .NET 的负载阶段逆转。内联仅适用于**顶层调用输入**：结果、事件、嵌套引用和 propagated history 不会因该默认行为而变得兼容。在多应用拓扑中启用卸载之前，请参见[跨应用引用处理]({{% ref js-workflow-data-references.md %}}#cross-app-and-cross-language-calls)。
