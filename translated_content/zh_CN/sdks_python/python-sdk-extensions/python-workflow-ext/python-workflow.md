---
type: docs
title: "Dapr Workflow Python SDK 入门"
linkTitle: "工作流"
weight: 30000
description: 如何使用 Dapr Python SDK 快速上手工作流
---

让我们创建一个 Dapr 工作流，并通过控制台调用它。借助[提供的工作流示例](https://github.com/dapr/python-sdk/tree/main/examples/workflow/simple.py)，你将：

- 运行一个 [Python 控制台应用程序](https://github.com/dapr/python-sdk/blob/main/examples/workflow/simple.py)，它演示了包含活动、子工作流和外部事件的工作流编排
- 了解如何处理重试、超时以及工作流状态管理
- 使用 Python 工作流 SDK 来启动、暂停、恢复和清除工作流实例

本示例使用[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)下通过 `dapr init` 初始化的默认配置。

在 Python 示例项目中，`simple.py` 文件包含应用程序的设置，包括：
- 工作流定义
- 工作流活动定义
- 工作流和工作流活动的注册

## 前置条件
- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.10+](https://www.python.org/downloads/)
- 已安装 [Dapr Python 包]({{% ref "python#installation" %}})和[工作流扩展]({{% ref "python-workflow/_index.md" %}})
- 确认你使用的是最新的 proto 绑定

## 设置环境

首先克隆 [Python SDK 仓库]。

```bash
git clone https://github.com/dapr/python-sdk.git
```

从 Python SDK 根目录进入 Dapr Workflow 示例。

```bash
cd examples/workflow
```

运行以下命令，安装使用 Dapr Python SDK 运行此工作流示例所需的依赖。

```bash
pip3 install -r workflow/requirements.txt
```

## 在本地运行应用程序

要运行 Dapr 应用程序，你需要启动 Python 程序和一个 Dapr 边车。在终端中运行：

```bash
dapr run --app-id wf-simple-example --dapr-grpc-port 50001 --resources-path components -- python3 simple.py
```

> **注意：** 由于 Windows 上未定义 Python3.exe，你可能需要使用 `python simple.py` 而不是 `python3 simple.py`。


**预期输出**

```
- "== APP == Hi Counter!"
- "== APP == New counter value is: 1!"
- "== APP == New counter value is: 11!"
- "== APP == Retry count value is: 0!"
- "== APP == Retry count value is: 1! This print statement verifies retry"
- "== APP == Appending 1 to child_orchestrator_string!"
- "== APP == Appending a to child_orchestrator_string!"
- "== APP == Appending a to child_orchestrator_string!"
- "== APP == Appending 2 to child_orchestrator_string!"
- "== APP == Appending b to child_orchestrator_string!"
- "== APP == Appending b to child_orchestrator_string!"
- "== APP == Appending 3 to child_orchestrator_string!"
- "== APP == Appending c to child_orchestrator_string!"
- "== APP == Appending c to child_orchestrator_string!"
- "== APP == Get response from hello_world_wf after pause call: Suspended"
- "== APP == Get response from hello_world_wf after resume call: Running"
- "== APP == New counter value is: 111!"
- "== APP == New counter value is: 1111!"
- "== APP == Workflow completed! Result: "Completed"
```

## 发生了什么？

运行应用程序时，会演示几个关键的工作流功能：

1. **工作流和活动注册**：应用程序使用 Python 装饰器自动向运行时注册工作流和活动。这种基于装饰器的方式提供了一种简洁、声明式的方法来定义工作流组件：
   ```python
   @wfr.workflow(name='hello_world_wf')
   def hello_world_wf(ctx: DaprWorkflowContext, wf_input):
       # 工作流定义……

   @wfr.activity(name='hello_act')
   def hello_act(ctx: WorkflowActivityContext, wf_input):
       # 活动定义……
   ```

2. **运行时设置**：应用程序初始化工作流运行时和客户端：
   ```python
   wfr = WorkflowRuntime()
   wfr.start()
   wf_client = DaprWorkflowClient()
   ```

2. **活动执行**：工作流执行一系列活动来递增计数器：
   ```python
   @wfr.workflow(name='hello_world_wf')
   def hello_world_wf(ctx: DaprWorkflowContext, wf_input):
       yield ctx.call_activity(hello_act, input=1)
       yield ctx.call_activity(hello_act, input=10)
   ```

3. **重试逻辑**：工作流使用重试策略演示错误处理：
   ```python
   retry_policy = RetryPolicy(
       first_retry_interval=timedelta(seconds=1),
       max_number_of_attempts=3,
       backoff_coefficient=2,
       max_retry_interval=timedelta(seconds=10),
       retry_timeout=timedelta(seconds=100),
   )
   yield ctx.call_activity(hello_retryable_act, retry_policy=retry_policy)
   ```

4. **子工作流**：子工作流使用其自己的重试策略执行：
   ```python
   yield ctx.call_child_workflow(child_retryable_wf, retry_policy=retry_policy)
   ```

5. **外部事件处理**：工作流等待一个带超时的外部事件：
   ```python
   event = ctx.wait_for_external_event(event_name)
   timeout = ctx.create_timer(timedelta(seconds=30))
   winner = yield when_any([event, timeout])
   ```

6. **工作流生命周期管理**：示例演示如何暂停和恢复工作流：
   ```python
   wf_client.pause_workflow(instance_id=instance_id)
   metadata = wf_client.get_workflow_state(instance_id=instance_id)
   # ……检查状态……
   wf_client.resume_workflow(instance_id=instance_id)
   ```

7. **事件触发**：恢复后，工作流触发一个事件：
   ```python
   wf_client.raise_workflow_event(
       instance_id=instance_id,
       event_name=event_name,
       data=event_data
   )
   ```

8. **完成与清除**：最后，工作流等待完成并进行清除：
   ```python
   state = wf_client.wait_for_workflow_completion(
       instance_id,
       timeout_in_seconds=30
   )
   wf_client.purge_workflow(instance_id=instance_id)
   ```

## 列出、检查和重新运行工作流实例

从 Dapr 1.19 开始，`DaprWorkflowClient` 以及 `dapr.ext.workflow.aio` 中的异步客户端可以列出应用的工作流实例、读取实例的历史记录，并从其历史事件之一重新运行已结束的实例。你可以借此查找实例而无需自行保存其 ID，查看失败的实例停在了哪一步，并从该步骤使用修正后的输入进行重试，而不必从头开始。

```python
import dapr.ext.workflow as wf

wf_client = wf.DaprWorkflowClient()

# 分页列出本应用的实例 ID，每页 100 个
for instance_id in wf_client.iter_workflow_instance_ids(page_size=100):
    print(instance_id)

# 读取实例的历史记录，最早的事件在前
history = wf_client.get_workflow_history('order-123')
for event in history:
    print(event.event_id, event.event_type.name, event.name)

# 从 charge_order 活动的调度处重新运行，并使用新的输入
event_id = next(e.event_id for e in history if e.is_rerunnable and e.name == 'charge_order')
new_instance_id = wf_client.rerun_workflow_from_event('order-123', event_id, input=25)
```

- `list_workflow_instance_ids(page_size=..., continuation_token=...)` 返回一页结果，包含 `instance_ids` 和 `continuation_token`。`iter_workflow_instance_ids()` 会为你逐页获取。列出实例需要一个能够列出键的 Actor 状态存储；否则调用会抛出 `NotImplementedError`。
- `rerun_workflow_from_event` 会启动一个新实例，源实例保持不变。源实例必须处于终止状态，且不能是子工作流。该事件必须是活动的调度、定时器的创建或子工作流的创建，即 `is_rerunnable` 所标示的事件。省略 `input` 时将保留记录的输入；传入 `new_instance_id` 可以指定新实例的 ID。

如需可运行的版本，请参阅[工作流管理示例](https://github.com/dapr/python-sdk/blob/main/examples/workflow/workflow_management.py)。

## 大型工作流负载

默认情况下，工作流 gRPC 通道最多接收 4 MiB 的消息（即 gRPC 的默认值），因此较大的消息（例如较大的工作流输入或输出）会以 `RESOURCE_EXHAUSTED` 失败。要提高发送和接收的上限，请向 `WorkflowRuntime`、`DaprWorkflowClient` 以及异步的 `DaprWorkflowClient` 传入以字节为单位的 `max_grpc_message_length`，或设置 `DAPR_GRPC_MAX_INBOUND_MESSAGE_SIZE_BYTES` 环境变量。参数优先于环境变量。

```python
wfr = wf.WorkflowRuntime(max_grpc_message_length=16 * 1024 * 1024)
wf_client = wf.DaprWorkflowClient(max_grpc_message_length=16 * 1024 * 1024)
```

## Worker 就绪状态

`wfr.start()` 会等待 worker 打开到 Dapr 边车的工作项流，默认等待 30 秒（即 `WorkflowRuntime` 上的 `worker_ready_timeout`）。之后，`wfr.wait_for_worker_ready(timeout=30.0)` 在流已打开时返回 `True`；如果在超时时间内流没有再次打开（例如 worker 在边车重启后重新连接期间），则返回 `False`。在就绪检查中使用它，可以让应用在其 worker 无法接收工作项时报告未就绪。Python SDK 1.19 之前，它在首次连接后会一直返回 `True`。

## 后续步骤
- [了解更多关于 Dapr 工作流]({{% ref workflow-overview.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})
- [尝试实现更复杂的工作流模式](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
