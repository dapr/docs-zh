---
type: docs
title: "Dapr Python SDK 与 Databricks Lakeflow 的集成"
linkTitle: "Databricks"
weight: 500000
description: 如何将 Databricks Lakeflow 流式记录转为可持久化的 Dapr Workflow 执行
no_list: true
---

Dapr Python SDK 提供了 Databricks Lakeflow 集成 `dapr.ext.databricks`，它可以将 Lakeflow 流式管道输出的记录，转换为持久的 [Dapr Workflow]({{% ref python-workflow-ext %}}) 执行。

外部副作用（冻结卡片、调用合作方 API、为人工审核开立案件）与数据管道内部的转换，在可靠性要求上有本质区别。与其直接把这类业务逻辑写进 Lakeflow 的 `foreach_batch_sink` 中，不如把记录交给一个 Dapr Workflow，由它独立继续执行，并在流式查询的生命周期之外，借助重试、timer、人在回路等待以及崩溃恢复来完成这些操作。

```text
Databricks Lakeflow
       │
       │ streaming records
       ▼
Dapr Databricks Sink
       │
       ▼
Dapr Workflow
       │
  ┌────┼──────────────┐
  ▼    ▼              ▼
 APIs  SaaS          Humans
       systems
```

## 安装

你可以使用以下命令下载并安装 Dapr Databricks 扩展：

```bash
pip install "dapr[workflow,databricks]"
```

## 示例

```python
from pyspark import pipelines as dp
from dapr.ext.databricks import register_workflow_sink

register_workflow_sink(
    name='order_actions',
    workflow='process_order',
    id_field='order_id',
    namespace='orders',
)

@dp.append_flow(target='order_actions', name='order_actions_flow')
def order_actions_flow():
    return spark.readStream.table('validated_orders')
```

对于标准场景，你无需手动编写，`register_workflow_sink` 会为你注册 `foreach_batch_sink`。每个 workflow instance ID 都由 `namespace`/`name`/`generation` 以及记录自身的业务键（`id_field`，绝不是随机 UUID）确定性地推导得出，因此 Lakeflow 对同一微批次的重试，绝不会为同一条记录再启动一次 workflow 执行。

## 后续步骤

{{< button text="开始使用 Dapr Databricks Python SDK 扩展" page="python-databricks.md" >}}

了解更多：
- [完整的配置参考、组合键以及全量刷新处理](https://github.com/dapr/python-sdk/blob/main/dapr/ext/databricks/README.md)
- [欺诈处置示例](https://github.com/dapr/python-sdk/tree/main/examples/databricks) —— 一份完整、可运行（无需 Databricks 账户）的分步指南
- [Dapr Workflow]({{% ref workflow-overview %}})，每个已调度的实例都基于它运行
