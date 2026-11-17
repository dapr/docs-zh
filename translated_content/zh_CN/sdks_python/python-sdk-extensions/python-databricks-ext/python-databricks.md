---
type: docs
title: "Getting started with the Dapr Databricks Python SDK extension"
linkTitle: "Databricks"
weight: 30000
description: 了解如何将 Databricks Lakeflow 流式记录转换为持久的 Dapr Workflow 执行
---

让我们运行一个欺诈补救示例，将模拟的 Databricks Lakeflow 记录转换为持久的 Dapr Workflow 执行。借助[提供的示例](https://github.com/dapr/python-sdk/tree/main/examples/databricks)，你将：

- 运行一个 Dapr Workflow（`fraud_remediation`），它会冻结卡片、通知客户、开启调查、等待分析师的决定，并结案
- 通过 `dapr.ext.databricks` 的批处理句柄，向其输入两个模拟的 Lakeflow 微批次。这一部分无需 Databricks 工作区或 `pyspark`
- 看到重试的微批次不会调度任何重复的 workflow 执行，因为每个实例 ID 都由记录自身的业务键确定性地派生

```text
Databricks Lakeflow identifies a suspicious transaction
                |
         dapr.ext.databricks sink
                |
        FraudRemediationWorkflow
                |
  freeze card -> notify customer -> open investigation
                |
         wait for analyst decision
                |
            resolve case
```

本示例使用 `dapr init` 在[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)下生成的默认配置。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.10+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包](/developing-applications/sdks/python/)、[workflow 扩展]({{% ref python-workflow-ext %}})以及 Databricks 扩展：
  ```bash
  pip install "dapr[workflow,databricks]"
  ```

## 设置环境

克隆 Python SDK 仓库：

```bash
git clone https://github.com/dapr/python-sdk.git
```

在仓库根目录中，进入 Databricks 示例目录：

```bash
cd examples/databricks
```

该示例包含两个文件：

- **`fraud_remediation_workflow.py`**：Dapr Workflow 端，包含 `fraud_remediation` workflow 及其活动。它的 `__main__` 代码块直接使用 `DaprWorkflowBatchHandler` 在进程内模拟一个小型 Lakeflow 微批次（这与 `register_workflow_sink` 内部使用的 building block 相同），然后重试同一批次，以演示不会创建重复的 workflow 执行。下文将运行的就是这个文件。
- **`fraud_remediation_pipeline.py`**：Databricks Lakeflow 端，包含 `register_workflow_sink` 以及为其提供数据的 `@dp.append_flow`。该文件仅作示意：它依赖 `pyspark.pipelines`（由 Databricks Lakeflow 运行时提供，而非 `pip install pyspark`）和 Unity Catalog 表，因此无法在本地运行。若要真正接入该集成，请将其模式复制到实际的 Databricks Lakeflow 流水线中。

## 在本地运行应用

要运行示例，请同时启动 Python 程序和 Dapr sidecar：

```bash
dapr run --app-id fraud-remediation-demo -- python3 fraud_remediation_workflow.py
```

**预期输出**（与 Dapr/durabletask 日志行交错显示）：

```text
*** Lakeflow micro-batch 1: scheduling fraud remediation workflows
*** Micro-batch 1 handed off; each workflow now runs independently
*** Simulating a Lakeflow retry of the same micro-batch
*** Retry complete: no duplicate workflow executions were created
*** Triggered by sink 'fraud_actions', batch 1
*** Freezing card for transaction T-1001 (customer C-1)
*** Notifying customer C-1 about the frozen card
*** Opened investigation CASE-T-1001
*** Resolved CASE-T-1001: CONFIRMED_FRAUD
*** Workflow fraud-fraud_actions-v1-T-1001 completed: {"case_id": "CASE-T-1001", "decision": "CONFIRMED_FRAUD"}
... (and the same for T-1002)
```

请查找结构化的 `dapr.ext.databricks: sink=... outcome=...` 日志行：第一个微批次会为两笔交易报告 `outcome=newly_scheduled`，模拟的重试则会为两笔交易报告 `outcome=already_existed`。同一笔交易绝不会启动第二个欺诈补救 workflow 执行。

完成后，请执行：

```bash
dapr stop --app-id fraud-remediation-demo
```

## 发生了什么？

1. **`register_workflow_sink`**（在示例的批处理句柄中使用，也是你在真实 `@dp.append_flow` 流水线中需要调用的函数）为每条记录计算确定性的 workflow 实例 ID，格式为 `<namespace>-<sink>-<generation>-<business_key>`，而不是随机 UUID。
2. 对于每条记录，句柄会检查该 ID 的 workflow 实例是否已存在。若不存在，则调度一个；若已存在，则将该记录视为已处理。第一个微批次和模拟重试都经过同一检查，因此重试会记录 `outcome=already_existed`，而不会启动第二个 `fraud_remediation` 执行。
3. 调度之后，每个 workflow 实例都独立于创建它的 Lakeflow 批次运行。即使流式微批次已经继续推进，`freeze card -> notify customer -> open investigation -> wait for an analyst decision ->
   resolve case` 这一流程仍会继续执行。
4. 如果“是否存在”的检查或调度调用都无法完成（例如 Dapr 不可用、超时或认证失败），整个微批次都会失败，从而让 Lakeflow 重试它。当某条记录的结果未知时，该 sink 绝不会报告成功。

这属于**可安全重试，但并非恰好一次（retry-safe, not exactly-once）**：它依赖于 Dapr 保留该实例的历史记录与状态。关于这对 workflow 历史保留的影响，以及 `generation` 如何让你在 Lakeflow 流水线的全量刷新之后有意重放业务操作，请参阅扩展参考文档中的[投递语义与全量刷新章节](https://github.com/dapr/python-sdk/blob/main/dapr/ext/databricks/README.md#delivery-semantics)。

## 后续步骤

- 将 `fraud_remediation_pipeline.py` 的模式复制到真实的 Databricks Lakeflow 流水线中，以便对接真实的流式数据。
- 查看[完整配置参考](https://github.com/dapr/python-sdk/blob/main/dapr/ext/databricks/README.md)，了解复合业务键、自定义输入映射、有界并发和可观测性。
- 进一步了解如何编写 workflow 端代码：[Dapr Workflow]({{% ref python-workflow-ext %}})。
