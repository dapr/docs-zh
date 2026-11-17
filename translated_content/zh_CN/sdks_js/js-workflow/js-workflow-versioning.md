---
type: docs
title: "Workflow versioning in the JavaScript SDK"
linkTitle: "workflow versioning"
weight: 1300
description: 使用可安全重放的具名补丁演进 workflow 代码
---

workflow 代码在重放已有实例时，必须重现历史记录中的任务序列。
更改 activity 顺序、添加持久任务，或在没有迁移策略的情况下更改分支，都可能导致非确定性的重放失败。

使用 `@dapr/dapr` **3.19.0 或更高版本** 时，对具名的代码变更请使用 `ctx.isPatched(patchName)`。
补丁的求值由 Dapr runtime 进行校验；本文档中的示例使用运行时 **1.19 或更高版本**。
有关运行时层面的概念，请参阅 [workflow versioning]({{% ref workflow-versioning.md %}})。

## 引入补丁

假设一个已有 workflow 直接调用 `chargePayment`，而新的部署必须先校验订单：

```javascript
function* orderWorkflow(ctx, order) {
  if (ctx.isPatched("validate-order-before-charge")) {
    yield ctx.callActivity("validateOrder", order);
  }
  return yield ctx.callActivity("chargePayment", order);
}
```

在重放过程中首次遇到未记录的补丁时，`isPatched` 返回 `false`，从而保持旧的执行路径不变。在重放之外，或当该补丁已被记录时，它返回 `true`。SDK 会记录已求值的补丁，用于运行时版本校验。

名称区分大小写，且不能为空或仅包含空白字符。每个逻辑变更都应使用独有的名称；切勿将某个名称复用于无关的变更，也不要由非确定性的值计算名称。

## 保留旧的执行路径

在所有需要该历史记录的实例全部结束、且不再有资格被重放或重跑之前，请保留原有的分支与补丁检查。不要仅因为新部署已经开始，就调整补丁检查的顺序或将其删除。规划下线时，需要考虑保留的历史记录、已挂起的实例、child workflow 以及管理员发起的重跑。

对于规模较大的契约变更，请注册一个新的 workflow 名称，并将新实例发送至该名称，同时为已有实例保留旧的实现。修补不会转换已持久化的序列化数据，也不会把不兼容的负载结构变为兼容。

## 后续步骤

- [workflow 序列化]({{% ref js-workflow-serialization.md %}})
- [迁移到显式数据引用]({{% ref js-workflow-data-references.md %}}#adopt-references-in-existing-applications)
