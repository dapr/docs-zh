---
type: docs
title: "Dapr Python SDK 与 Dapr 工作流扩展集成"
linkTitle: "Dapr 工作流"
weight: 400000
description: 如何快速上手使用 Dapr 工作流扩展
no_list: true
---

Dapr Python SDK 提供了一个内置的 Dapr 工作流扩展 `dapr.ext.workflow`，用于创建 Dapr 服务。

## 安装

您可以通过以下命令下载并安装 Dapr 工作流扩展：

{{< tabpane text=true >}}

{{% tab header="Stable" %}}
```bash
pip install dapr-ext-workflow
```
{{% /tab %}}

{{% tab header="Development" %}}
{{% alert title="Note" color="warning" %}}
开发版包将包含与 Dapr 运行时预发布版本兼容的功能和行为。在安装 `dapr-dev` 包之前，请确保已卸载任何稳定版本的 Python SDK 扩展。
{{% /alert %}}

```bash
pip install dapr-ext-workflow-dev
```
{{% /tab %}}

{{< /tabpane >}}

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
    # Do some work
    return activity_input + 1


@wfr.activity
def step2(ctx, activity_input):
    print(f'Step 2: Received input: {activity_input}.')
    # Do some work
    return activity_input * 2

@wfr.activity
def error_handler(ctx, error):
    print(f'Executing error handler: {error}.')
    # Do some compensating work


if __name__ == '__main__':
    wfr.start()
    sleep(10)  # wait for workflow runtime to start

    wf_client = wf.DaprWorkflowClient()
    instance_id = wf_client.schedule_new_workflow(workflow=task_chain_workflow, input=42)
    print(f'Workflow started. Instance ID: {instance_id}')
    state = wf_client.wait_for_workflow_completion(instance_id)
    print(f'Workflow completed! Status: {state.runtime_status}')

    wfr.shutdown()
```

- 了解有关编写和管理工作流的更多信息： 
  - [How-To: 编写工作流]({{% ref howto-author-workflow.md %}})。
  - [How-To: 管理工作流]({{% ref howto-manage-workflow.md %}})。
  - 
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow) 获取代码示例和尝试 Dapr 工作流的说明：
  - [简单工作流示例]({{% ref python-workflow.md %}})
  - [任务链示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/task_chaining.py)
  - [Fan-out/Fan-in 示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/fan_out_fan_in.py)
  - [子工作流示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/child_workflow.py)
  - [人工审批示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/human_approval.py)
  - [监控示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/monitor.py)


## 后续步骤

{{< button text="Dapr 工作流 Python SDK 入门" page="python-workflow.md" >}}
