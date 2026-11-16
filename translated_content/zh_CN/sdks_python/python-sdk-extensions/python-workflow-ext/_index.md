---
type: docs
title: "Dapr Python SDK 与 Dapr Workflow 扩展集成"
linkTitle: "Dapr Workflow"
weight: 400000
description: 如何快速上手 Dapr Workflow 扩展
no_list: true
---

Dapr Python SDK 提供了一个内置的 Dapr Workflow 扩展 `dapr.ext.workflow`，用于创建 Dapr 服务。

## 安装

你可以通过以下命令下载并安装 Dapr Workflow 扩展：

{{< tabpane text=true >}}

{{% tab header="Stable" %}}
```bash
pip install "dapr[workflow]"
```
{{% /tab %}}

{{% tab header="Development" %}}
{{% alert title="注意" color="warning" %}}
开发版本将包含与 Dapr 运行时预发布版本兼容的功能和行为。只有带标签的发布版本会发布到 PyPI，因此请从 GitHub 仓库安装开发版本。在安装之前，请确保卸载所有稳定版本的 Python SDK。
{{% /alert %}}

```bash
pip install "dapr[workflow] @ git+https://github.com/dapr/python-sdk.git@main"
```
{{% /tab %}}

{{< /tabpane >}}

从 Dapr 1.19 开始，此扩展是 `dapr` 包的一个可选依赖组（extra）。`dapr-ext-workflow` 包不再发布。如果你之前安装过它，请按照[升级步骤]({{% ref "python#install-extensions" %}})迁移到该可选依赖组。导入路径保持不变。

## 示例

```python
from time import sleep

import dapr.ext.workflow as wf


wfr = wf.WorkflowRuntime()


@wfr.workflow(name='random_workflow')
def task_chain_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    try:
        result1 = yield ctx.call_activity(step1, input=wf_input)
        result2 = yield ctx.call_activity(step2, input=result1)
    except Exception as e:
        yield ctx.call_activity(error_handler, input=str(e))
        raise
    return [result1, result2]


@wfr.activity(name='step1')
def step1(ctx, activity_input):
    print(f'Step 1: Received input: {activity_input}.')
    # 执行一些工作
    return activity_input + 1


@wfr.activity
def step2(ctx, activity_input):
    print(f'Step 2: Received input: {activity_input}.')
    # 执行一些工作
    return activity_input * 2

@wfr.activity
def error_handler(ctx, error):
    print(f'Executing error handler: {error}.')
    # 执行一些补偿性工作


if __name__ == '__main__':
    wfr.start()
    sleep(10)  # 等待工作流运行时启动

    wf_client = wf.DaprWorkflowClient()
    instance_id = wf_client.schedule_new_workflow(workflow=task_chain_workflow, input=42)
    print(f'Workflow started. Instance ID: {instance_id}')
    state = wf_client.wait_for_workflow_completion(instance_id, timeout_in_seconds=60)
    print(f'Workflow completed! Status: {state.runtime_status}')

    wfr.shutdown()
```

- 了解有关编写和管理工作流的更多信息：
  - [How-To: 编写工作流]({{% ref howto-author-workflow.md %}})。
  - [How-To: 管理工作流]({{% ref howto-manage-workflow.md %}})。
  - 
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow)，获取代码示例以及尝试 Dapr Workflow 的说明：
  - [简单工作流示例]({{% ref python-workflow.md %}})
  - [任务链示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/task_chaining.py)
  - [Fan-out/Fan-in 示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/fan_out_fan_in.py)
  - [子工作流示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/child_workflow.py)
  - [人工审批示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/human_approval.py)
  - [监控示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/monitor.py)


## 有状态工作流历史

从 Dapr 1.19 开始，工作流工作进程会在内存中保存每个工作流实例的历史记录，因此 Dapr 边车在每一轮只发送新事件。此功能默认启用。若要关闭它（例如在工作进程内存有限时），请在 `WorkflowRuntime` 上设置 `disable_stateful_history=True`：

```python
import dapr.ext.workflow as wf

wfr = wf.WorkflowRuntime(disable_stateful_history=True)
```

了解更多信息，请参阅[有状态工作流客户端]({{% ref workflow-stateful-client.md %}})。

## 等待工作流

`wait_for_workflow_start` 和 `wait_for_workflow_completion` 会忽略 `DAPR_API_TIMEOUT_SECONDS` 环境变量。如果不传 `timeout_in_seconds` 参数，它们会无限期等待。传入 `timeout_in_seconds` 可限制调用的等待时长。超过时限后，调用会抛出 `TimeoutError`：

```python
state = wf_client.wait_for_workflow_completion(instance_id, timeout_in_seconds=60)
```

## 后续步骤

{{< button text="Dapr Workflow Python SDK 入门" page="python-workflow.md" >}}
