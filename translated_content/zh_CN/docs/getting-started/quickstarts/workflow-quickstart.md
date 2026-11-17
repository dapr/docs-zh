---
type: docs
title: "Quickstart：workflow"
linkTitle: workflow
weight: 73
description: 开始使用 Dapr workflow building block
---

{{% alert title="注意" color="primary" %}}
Redis 目前在 Quickstart 中被用作 workflow 的 state store component。但是，Redis 不支持事务回滚，因此不应在生产环境中用作 actor state store。

要在不使用 Docker 和 Redis 的情况下运行 Quickstart，请使用示例提供的 SQLite 运行文件。每个示例的 README 中都有一个“Run without Docker”部分：[Python](https://github.com/dapr/quickstarts/tree/master/workflows/python/sdk#run-without-docker)、[JavaScript](https://github.com/dapr/quickstarts/tree/master/workflows/javascript/sdk#run-without-docker)、[.NET](https://github.com/dapr/quickstarts/tree/master/workflows/csharp/sdk#run-without-docker)、[Java](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk#run-without-docker) 和 [Go](https://github.com/dapr/quickstarts/tree/master/workflows/go/sdk#run-without-docker)。
{{% /alert %}}

让我们来看看 Dapr 的[workflow building block]({{% ref workflow-overview.md %}})。在本 Quickstart 中，你将创建一个简单的控制台应用程序，演示 Dapr 的 workflow 编程模型以及 workflow 管理 API。

在本指南中，你将：

- 运行 `order-processor` 应用。
- 启动 workflow，并观察 workflow activity/任务的执行。
- 查看 workflow 逻辑、workflow activity，以及它们在代码中的表示方式。

<img src="/images/workflow-quickstart-overview.png" width=800 style="padding-bottom:15px;">

该 workflow 包含以下 activity：

- `NotifyActivity`：使用日志记录器在整个 workflow 中输出消息。
- `VerifyInventoryActivity`：检查 state store，确保有足够的库存可供购买。
- `RequestApprovalActivity`：对超过特定成本阈值的订单请求批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从 state store 中移除所请求的商品，并使用新的剩余库存值更新存储。

该 workflow 还包含以下业务逻辑：
- 如果库存不足，workflow 将不会继续处理付款。
- 当订单总成本大于 5000 时，workflow 将调用 `RequestApprovalActivity` 并等待外部审批事件。
- 如果订单未获批准或审批超时，workflow 将不会继续处理付款。

<img src="/images/workflow-quickstart-controlflow.png" width=800 style="padding-bottom:15px;">

在继续 Quickstart 之前，请选择你偏好的特定语言 Dapr SDK。
{{< tabpane text=true >}}

 <!-- Python -->
{{% tab "Python" %}}

`order-processor` 控制台应用会启动并管理 `order_processing_workflow`，它模拟从商店购买商品的过程。该 workflow 由五个独立的 workflow activity（即任务）组成：

- `notify_activity`：在整个 workflow 中输出消息。这些消息会在以下情况下通知你：
  - 库存不足
  - 付款无法处理，等等
- `verify_inventory_activity`：检查 state store，确保有足够的库存可供购买。
- `request_approval_activity`：对超过特定成本阈值的订单请求批准。
- `process_payment_activity`：处理并授权付款。
- `update_inventory_activity`：从 state store 中移除所请求的商品，并使用新的剩余库存值更新存储。

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即示例所使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在执行 `git clone` 的文件夹中，进入 `python/sdk` 目录：

```bash
cd quickstarts/workflows/python/sdk
```

使用 `uv` 安装示例的依赖项，包括 Dapr Python SDK：

```bash
uv sync
```

### 步骤 3：运行 order processor 应用

在终端中，使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 将 order processor 应用与 Dapr sidecar 一起启动。在 `python/sdk` 目录中运行以下命令：

```bash
uv run dapr run -f .
```

这会使用唯一的 workflow ID 启动 `order-processor` 应用，并运行 workflow activity。

预期输出：

```text
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == item: InventoryItem(item_name=Paperclip, per_item_cost=5, quantity=100)
== APP - order-processor == item: InventoryItem(item_name=Cars, per_item_cost=5000, quantity=10)
== APP - order-processor == item: InventoryItem(item_name=Computers, per_item_cost=500, quantity=100)
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == Starting order workflow, purchasing 1 of cars
== APP - order-processor == Received order 0a8c4d9b59094191bf77e111c38a5e55 for 1 cars at $5000 !
== APP - order-processor == Verifying inventory for order 0a8c4d9b59094191bf77e111c38a5e55 of 1 cars
== APP - order-processor == There are 10 Cars available for purchase
== APP - order-processor == Processing payment: 0a8c4d9b59094191bf77e111c38a5e55 for 1 cars at 5000 USD
== APP - order-processor == Payment for request ID 0a8c4d9b59094191bf77e111c38a5e55 processed successfully
== APP - order-processor == Checking inventory for order 0a8c4d9b59094191bf77e111c38a5e55 for 1 cars
== APP - order-processor == There are now 9 cars left in stock
== APP - order-processor == Order 0a8c4d9b59094191bf77e111c38a5e55 has completed!
== APP - order-processor == Workflow completed! Result: {"processed": true, "__durabletask_autoobject__": true}
```

### (可选) 步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果该容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看 workflow 的追踪 span（通常位于 `http://localhost:9411/zipkin/`）：

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建一个包含一辆汽车的 OrderPayload。
2. 为 workflow 生成唯一的订单 ID（在上面的示例中为 `0a8c4d9b59094191bf77e111c38a5e55`），并调度该 workflow。
3. `notify_activity` workflow activity 发送通知，表示已收到一辆汽车的订单。
4. `verify_inventory_activity` workflow activity 检查库存数据，确定能否供应所订购的商品，并返回库存中汽车的数量。库存充足，因此 workflow 继续执行。
5. 订单的总成本为 5000，因此 workflow 不会调用 `request_approval_activity` activity。
6. `process_payment_activity` workflow activity 开始处理订单 `0a8c4d9b59094191bf77e111c38a5e55` 的付款，并确认是否成功。
7. `update_inventory_activity` workflow activity 在订单处理完成后，使用当前可用的汽车数量更新库存。
8. `notify_activity` workflow activity 发送通知，表示订单 `0a8c4d9b59094191bf77e111c38a5e55` 已完成。
9. workflow 以已完成状态终止，OrderResult 被设置为 processed。

#### `order-processor/app.py`

在应用程序的程序文件中：

- 生成唯一的 workflow 订单 ID
- 调度 workflow
- 获取 workflow 状态
- 注册 workflow 及其调用的 workflow activity

```python
from datetime import datetime
from time import sleep

from dapr.clients import DaprClient
from dapr.conf import settings
from dapr.ext.workflow import DaprWorkflowClient, WorkflowStatus

from workflow import wfr, order_processing_workflow
from model import InventoryItem, OrderPayload

store_name = "statestore"
workflow_name = "order_processing_workflow"
default_item_name = "cars"

class WorkflowConsoleApp:    
    def main(self):
        print("*** Welcome to the Dapr Workflow console app sample!", flush=True)
        print("*** Using this app, you can place orders that start workflows.", flush=True)
        
        wfr.start()
        # 等待 sidecar 可用
        sleep(5)

        wfClient = DaprWorkflowClient()

        baseInventory = {
            "paperclip": InventoryItem("Paperclip", 5, 100),
            "cars": InventoryItem("Cars", 5000, 10),
            "computers": InventoryItem("Computers", 500, 100),
        }


        daprClient = DaprClient(address=f'{settings.DAPR_RUNTIME_HOST}:{settings.DAPR_GRPC_PORT}')
        self.restock_inventory(daprClient, baseInventory)

        print("==========Begin the purchase of item:==========", flush=True)
        item_name = default_item_name
        order_quantity = 1
        total_cost = int(order_quantity) * baseInventory[item_name].per_item_cost
        order = OrderPayload(item_name=item_name, quantity=int(order_quantity), total_cost=total_cost)

        print(f'Starting order workflow, purchasing {order_quantity} of {item_name}', flush=True)
        instance_id = wfClient.schedule_new_workflow(
            workflow=order_processing_workflow, input=order.to_json())

        try:
            state = wfClient.wait_for_workflow_completion(instance_id=instance_id, timeout_in_seconds=30)
            if not state:
                print("Workflow not found!")
            elif state.runtime_status.name == 'COMPLETED':
                print(f'Workflow completed! Result: {state.serialized_output}')
            else:
                print(f'Workflow failed! Status: {state.runtime_status.name}')  # 不应出现
        except TimeoutError:
            print('*** Workflow timed out!')

        wfr.shutdown()

    def restock_inventory(self, daprClient: DaprClient, baseInventory):
        for key, item in baseInventory.items():
            print(f'item: {item}')
            item_str = f'{{"name": "{item.item_name}", "quantity": {item.quantity},\
                          "per_item_cost": {item.per_item_cost}}}'
            daprClient.save_state(store_name, key, item_str)

if __name__ == '__main__':
    app = WorkflowConsoleApp()
    app.main()
```

#### `order-processor/workflow.py`

在 `workflow.py` 中，该 workflow 被定义为一个类，其所有相关任务（由 workflow activity 确定）都包含在该类中。

```python
from datetime import timedelta
import json

from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext, WorkflowRuntime, when_any
from dapr.clients import DaprClient
from dapr.conf import settings

from model import InventoryItem, Notification, InventoryRequest, OrderPayload, OrderResult,\
    PaymentRequest, InventoryResult

store_name = "statestore"

wfr = WorkflowRuntime()


@wfr.workflow(name="order_processing_workflow")
def order_processing_workflow(ctx: DaprWorkflowContext, order_payload_str: str):
    """Defines the order processing workflow.
    When the order is received, the inventory is checked to see if there is enough inventory to
    fulfill the order. If there is enough inventory, the payment is processed and the inventory is
    updated. If there is not enough inventory, the order is rejected.
    If the total order is greater than $5,000, the order is sent to a manager for approval.
    """
    order_id = ctx.instance_id
    order_payload=json.loads(order_payload_str)
    yield ctx.call_activity(notify_activity, 
                            input=Notification(message=('Received order ' +order_id+ ' for '
                                               +f'{order_payload["quantity"]}' +' ' +f'{order_payload["item_name"]}'
                                               +' at $'+f'{order_payload["total_cost"]}' +' !')))
    result = yield ctx.call_activity(verify_inventory_activity,
                                     input=InventoryRequest(request_id=order_id,
                                                            item_name=order_payload["item_name"],
                                                            quantity=order_payload["quantity"]))
    if not result.success:
        yield ctx.call_activity(notify_activity,
                                input=Notification(message='Insufficient inventory for '
                                                   +f'{order_payload["item_name"]}'+'!'))
        return OrderResult(processed=False)
    
    if order_payload["total_cost"] > 5000:
        yield ctx.call_activity(request_approval_activity, input=order_payload)
        approval_task = ctx.wait_for_external_event("approval_event")
        timeout_event = ctx.create_timer(timedelta(seconds=30))
        winner = yield when_any([approval_task, timeout_event])
        if winner == timeout_event:
            yield ctx.call_activity(notify_activity, 
                                    input=Notification(message='Order '+order_id
                                                       +' has been cancelled due to approval timeout.'))
            return OrderResult(processed=False)
        approval_result = yield approval_task
        if approval_result == False:
            yield ctx.call_activity(notify_activity, input=Notification(
                message=f'Order {order_id} was not approved'))
            return OrderResult(processed=False)    
    
    yield ctx.call_activity(process_payment_activity, input=PaymentRequest(
        request_id=order_id, item_being_purchased=order_payload["item_name"],
        amount=order_payload["total_cost"], quantity=order_payload["quantity"]))

    try:
        yield ctx.call_activity(update_inventory_activity, 
                                input=PaymentRequest(request_id=order_id,
                                                     item_being_purchased=order_payload["item_name"],
                                                     amount=order_payload["total_cost"],
                                                     quantity=order_payload["quantity"]))
    except Exception:
        yield ctx.call_activity(notify_activity, 
                                input=Notification(message=f'Order {order_id} Failed!'))
        return OrderResult(processed=False)

    yield ctx.call_activity(notify_activity, input=Notification(
        message=f'Order {order_id} has completed!'))
    return OrderResult(processed=True)

@wfr.activity(name="notify_activity")
def notify_activity(ctx: WorkflowActivityContext, input: Notification):
    """Defines Notify Activity. This is used by the workflow to send out a notification"""
    print(input.message, flush=True)


@wfr.activity(name="process_payment_activity")
def process_payment_activity(ctx: WorkflowActivityContext, input: PaymentRequest):
    """Defines Process Payment Activity.This is used by the workflow to process a payment"""
    print(f'Processing payment: {input.request_id} for {input.quantity} {input.item_being_purchased} at {input.amount} USD', flush=True)
    print(f'Payment for request ID {input.request_id} processed successfully', flush=True)


@wfr.activity(name="verify_inventory_activity")
def verify_inventory_activity(ctx: WorkflowActivityContext,
                              input: InventoryRequest) -> InventoryResult:
    """Defines Verify Inventory Activity. This is used by the workflow to verify if inventory
    is available for the order"""
    print(f'Verifying inventory for order {input.request_id} of {input.quantity} {input.item_name}', flush=True)
    with DaprClient(f'{settings.DAPR_RUNTIME_HOST}:{settings.DAPR_GRPC_PORT}') as client:
        result = client.get_state(store_name, input.item_name)
    if result.data is None:
        return InventoryResult(False, None)
    res_json=json.loads(str(result.data.decode('utf-8')))
    print(f'There are {res_json["quantity"]} {res_json["name"]} available for purchase', flush=True)
    inventory_item = InventoryItem(item_name=input.item_name,
                                  per_item_cost=res_json['per_item_cost'],
                                  quantity=res_json['quantity'])

    if res_json['quantity'] >= input.quantity:
        return InventoryResult(True, inventory_item)
    return InventoryResult(False, None)



@wfr.activity(name="update_inventory_activity")
def update_inventory_activity(ctx: WorkflowActivityContext,
                              input: PaymentRequest) -> InventoryResult:
    """Defines Update Inventory Activity. This is used by the workflow to check if inventory
    is sufficient to fulfill the order and updates inventory by reducing order quantity from
    inventory."""
    print(f'Checking inventory for order {input.request_id} for {input.quantity} {input.item_being_purchased}', flush=True)
    with DaprClient(f'{settings.DAPR_RUNTIME_HOST}:{settings.DAPR_GRPC_PORT}') as client:
        result = client.get_state(store_name, input.item_being_purchased)
        res_json=json.loads(str(result.data.decode('utf-8')))
        new_quantity = res_json['quantity'] - input.quantity
        per_item_cost = res_json['per_item_cost']
        if new_quantity < 0:
            raise ValueError('Inventory update for request ID '+f'{input.item_being_purchased}'
                             +' could not be processed. Insufficient inventory.')
        new_val = f'{{"name": "{input.item_being_purchased}", "quantity": {str(new_quantity)}, "per_item_cost": {str(per_item_cost)}}}'
        client.save_state(store_name, input.item_being_purchased, new_val)
        print(f'There are now {new_quantity} {input.item_being_purchased} left in stock', flush=True)



@wfr.activity(name="request_approval_activity")
def request_approval_activity(ctx: WorkflowActivityContext,
                             input: OrderPayload):
    """Defines Request Approval Activity. This is used by the workflow to request approval
    for payment of an order. This activity is used only if the order total cost is greater than
    a particular threshold"""
    print(f'Requesting approval for payment of {input["total_cost"]} USD for {input["quantity"]} {input["item_name"]}', flush=True)
```
{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

`order-processor` 控制台应用会启动并管理订单处理 workflow 的生命周期，该 workflow 会在 state store 中存取数据。该 workflow 包含五个 workflow activity（即任务）：

- `notifyActivity`：使用日志记录器在整个 workflow 中输出消息。这些消息会告知用户库存不足、付款无法处理等情况。
- `verifyInventoryActivity`：检查 state store，确保有足够的库存可供购买。
- `requestApprovalActivity`：对超过特定阈值的订单请求批准。
- `processPaymentActivity`：处理并授权付款。
- `updateInventoryActivity`：使用新的剩余库存值更新 state store。

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Node.js 20 或更高版本](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/javascript/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在执行 `git clone` 的文件夹中，进入 `javascript/sdk` 目录：

```bash
cd quickstarts/workflows/javascript/sdk
```

安装锁定的依赖项并构建 TypeScript 应用：

```bash
npm ci
npm run build
```

### 步骤 3：运行 order processor 应用

在终端中，使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 将 order processor 应用与 Dapr sidecar 一起启动。在 `javascript/sdk` 目录中运行以下命令：

```bash
dapr run -f .
```

这会使用唯一的 workflow ID 启动 `order-processor` 应用，并运行 workflow activity。

预期输出：

```log
== APP - order-processor == 2026-10-23T23:46:11.983Z INFO [Workflow, TaskHubWorker] Connected to sidecar. Waiting for work items...
== APP - order-processor == Workflow runtime started successfully
== APP - order-processor == 2026-10-23T23:46:11.989Z INFO [HTTPClient, HTTPClient] Sidecar Started
== APP - order-processor == 2026-10-23T23:46:11.991Z INFO [Workflow, TaskHubClient] Starting new orderProcessingWorkflow instance with ID = 5c26fcd3-f05e-4dc1-9a15-11eeb5445236
== APP - order-processor == 2026-10-23T23:46:12.005Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.008Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.008Z INFO [Workflow, orderProcessingWorkflow, 5c26fcd3-f05e-4dc1-9a15-11eeb5445236] Processing order 5c26fcd3-f05e-4dc1-9a15-11eeb5445236...
== APP - order-processor == 2026-10-23T23:46:12.008Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == 2026-10-23T23:46:12.008Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == 2026-10-23T23:46:12.013Z INFO [Workflow, TaskHubWorker] Received "Activity Request" work item
== APP - order-processor == Received order 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 for 1 car at a total cost of 5000
== APP - order-processor == Workflow scheduled with ID: 5c26fcd3-f05e-4dc1-9a15-11eeb5445236
== APP - order-processor == 2026-10-23T23:46:12.017Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.017Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.018Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == 2026-10-23T23:46:12.018Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == Workflow started with the expected order
== APP - order-processor == 2026-10-23T23:46:12.019Z INFO [Workflow, TaskHubClient] Waiting 60 seconds for instance 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 to complete...
== APP - order-processor == 2026-10-23T23:46:12.021Z INFO [Workflow, TaskHubWorker] Received "Activity Request" work item
== APP - order-processor == Verifying inventory for 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 of 1 car
== APP - order-processor == There are 10 car in stock
== APP - order-processor == 2026-10-23T23:46:12.025Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.025Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.025Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == 2026-10-23T23:46:12.025Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == 2026-10-23T23:46:12.028Z INFO [Workflow, TaskHubWorker] Received "Activity Request" work item
== APP - order-processor == Payment of 5000 for 1 car processed successfully
== APP - order-processor == 2026-10-23T23:46:12.033Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.033Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.033Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == 2026-10-23T23:46:12.033Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == 2026-10-23T23:46:12.036Z INFO [Workflow, TaskHubWorker] Received "Activity Request" work item
== APP - order-processor == Inventory updated for 5c26fcd3-f05e-4dc1-9a15-11eeb5445236, there are now 9 car in stock
== APP - order-processor == 2026-10-23T23:46:12.040Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.041Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.041Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == 2026-10-23T23:46:12.041Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == 2026-10-23T23:46:12.047Z INFO [Workflow, TaskHubWorker] Received "Activity Request" work item
== APP - order-processor == Order 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 processed successfully!
== APP - order-processor == 2026-10-23T23:46:12.052Z INFO [Workflow, TaskHubWorker] Received "Orchestrator Request" work item with instance id '5c26fcd3-f05e-4dc1-9a15-11eeb5445236'
== APP - order-processor == 2026-10-23T23:46:12.052Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Processing 2 new history event(s)
== APP - order-processor == 2026-10-23T23:46:12.052Z INFO [Workflow, orderProcessingWorkflow, 5c26fcd3-f05e-4dc1-9a15-11eeb5445236] Order 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 has completed
== APP - order-processor == 2026-10-23T23:46:12.052Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Orchestration completed with status COMPLETED
== APP - order-processor == 2026-10-23T23:46:12.052Z INFO [Workflow, OrchestrationExecutor] 5c26fcd3-f05e-4dc1-9a15-11eeb5445236: Returning 1 action(s)
== APP - order-processor == 2026-10-23T23:46:12.053Z INFO [Workflow, TaskHubClient] Instance 5c26fcd3-f05e-4dc1-9a15-11eeb5445236 completed
== APP - order-processor == Workflow Status: COMPLETED
== APP - order-processor == Workflow result: {"processed":true}
```

### (可选) 步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果该容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看 workflow 的追踪 span（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 为 workflow 生成唯一的订单 ID（在上面的示例中为 `5c26fcd3-f05e-4dc1-9a15-11eeb5445236`），并调度该 workflow。
2. `notifyActivity` workflow activity 发送通知，表示已收到一个包含 1 辆汽车的订单。
3. `verifyInventoryActivity` workflow activity 检查库存数据，确定能否供应所订购的商品，并返回库存中汽车的数量。
4. 你的 workflow 开始运行，应用确认 workflow 具有预期的订单。
5. 订单的总成本为 5000，因此 workflow 不会调用 `requestApprovalActivity` activity。
6. `processPaymentActivity` workflow activity 开始处理订单 `5c26fcd3-f05e-4dc1-9a15-11eeb5445236` 的付款，并确认是否成功。
7. `updateInventoryActivity` workflow activity 在订单处理完成后，使用当前可用的汽车数量更新库存。
8. `notifyActivity` workflow activity 发送通知，表示订单 `5c26fcd3-f05e-4dc1-9a15-11eeb5445236` 已完成并已处理。
9. workflow 以已完成并已处理的状态终止。

#### `order-processor/app.ts`

在应用程序文件中：

- 使用 workflow 及其调用的 workflow activity 创建 workflow runtime
- 启动 workflow runtime
- `processOrder` 函数运行订单
- 订单完成后，停止 workflow runtime 和客户端

```typescript
import { DaprWorkflowClient } from "@dapr/dapr";
import { createWorkflowRuntime, processOrder } from "./orderProcessor";
import { daprClient } from "./orderProcessingWorkflow";

async function start() {
  const workflowWorker = createWorkflowRuntime();
  const workflowClient = new DaprWorkflowClient();
  try {
    await workflowWorker.start();
    console.log("Workflow runtime started successfully");
    await processOrder(workflowClient);
  } finally {
    await workflowWorker.stop();
    await workflowClient.stop();
    await daprClient.stop();
  }
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

#### `order-processor/orderProcessor.ts`

在 `orderProcessor.ts` 中：

- 注册 workflow 及其调用的 workflow activity
- 将库存保存到 state store
- 生成唯一的 workflow 订单 ID 并调度 workflow
- 应用等待 workflow 启动和完成，然后获取 workflow 状态和结果

```typescript
import { DaprWorkflowClient, WorkflowRuntime, WorkflowRuntimeStatus } from "@dapr/dapr";
import { InventoryItem, OrderPayload, OrderResult } from "./model";
import { daprClient, storeName, notifyActivity, orderProcessingWorkflow, processPaymentActivity, requestApprovalActivity, verifyInventoryActivity, updateInventoryActivity } from "./orderProcessingWorkflow";

export function createWorkflowRuntime(): WorkflowRuntime {
  return new WorkflowRuntime()
    .registerWorkflow(orderProcessingWorkflow)
    .registerActivity(notifyActivity)
    .registerActivity(verifyInventoryActivity)
    .registerActivity(requestApprovalActivity)
    .registerActivity(processPaymentActivity)
    .registerActivity(updateInventoryActivity);
}

export async function processOrder(workflowClient: DaprWorkflowClient): Promise<string> {
  const inventory = new InventoryItem("car", 5000, 10);
  await daprClient.state.save(storeName, [{ key: inventory.itemName, value: inventory }]);

  const order = new OrderPayload("car", 5000, 1);
  const id = await workflowClient.scheduleNewWorkflow(orderProcessingWorkflow, order);
  console.log(`Workflow scheduled with ID: ${id}`);

  const started = await workflowClient.waitForWorkflowStart(id, true, 30);
  if (!started) {
    throw new Error(`Workflow ${id} did not start`);
  }
  const input = started.getInput<OrderPayload>();
  if (input?.itemName !== order.itemName || input.quantity !== order.quantity || input.totalCost !== order.totalCost) {
    throw new Error(`Workflow ${id} input did not match the order`);
  }
  console.log("Workflow started with the expected order");

  const completed = await workflowClient.waitForWorkflowCompletion(id, true, 60);
  if (!completed || completed.runtimeStatus !== WorkflowRuntimeStatus.COMPLETED) {
    throw new Error(`Workflow ${id} did not complete successfully: ${completed?.workflowFailureDetails?.getErrorMessage() ?? completed?.runtimeStatus}`);
  }
  console.log(`Workflow Status: ${WorkflowRuntimeStatus[completed.runtimeStatus]}`);

  const output = completed.getOutput<OrderResult>();
  if (output?.processed !== true) {
    throw new Error(`Order ${id} was not processed`);
  }
  const result = `Workflow result: ${JSON.stringify(output)}`;
  console.log(result);
  return result;
}
```

#### `order-processor/orderProcessingWorkflow.ts`

在 `orderProcessingWorkflow.ts` 中，该 workflow 被定义为一个类，其所有相关任务（由 workflow activity 确定）都包含在该类中。

```typescript
import { Task, WorkflowActivityContext, WorkflowContext, DaprClient } from "@dapr/dapr";
import { ApprovalResponse, InventoryItem, InventoryRequest, InventoryResult, OrderNotification, OrderPayload, OrderPaymentRequest, OrderResult } from "./model";

export const daprClient = new DaprClient();
export const storeName = "statestore";

async function getInventory(itemName: string): Promise<InventoryItem | undefined> {
  const result = await daprClient.state.get(storeName, itemName);
  if (result == null || result === "") {
    return undefined;
  }
  if (typeof result !== "object" || typeof result.itemName !== "string" ||
      typeof result.perItemCost !== "number" || typeof result.quantity !== "number") {
    throw new Error(`Invalid inventory for ${itemName}`);
  }
  return new InventoryItem(result.itemName, result.perItemCost, result.quantity);
}

export const notifyActivity = async (_: WorkflowActivityContext, notification: OrderNotification) => {
  console.log(notification.message);
};

export const verifyInventoryActivity = async (_: WorkflowActivityContext, request: InventoryRequest) => {
  console.log(`Verifying inventory for ${request.requestId} of ${request.quantity} ${request.itemName}`);
  const inventory = await getInventory(request.itemName);
  if (!inventory) {
    console.log(`No inventory found for ${request.itemName}`);
    return new InventoryResult(false, undefined);
  }
  console.log(`There are ${inventory.quantity} ${inventory.itemName} in stock`);
  return new InventoryResult(inventory.quantity >= request.quantity, inventory);
};

export const requestApprovalActivity = async (_: WorkflowActivityContext, order: OrderPayload) => {
  console.log(`Requesting approval for ${order.quantity} ${order.itemName} at a total cost of ${order.totalCost}`);
};

export const processPaymentActivity = async (_: WorkflowActivityContext, request: OrderPaymentRequest) => {
  console.log(`Payment of ${request.amount} for ${request.quantity} ${request.itemBeingPurchased} processed successfully`);
};

export const updateInventoryActivity = async (_: WorkflowActivityContext, request: InventoryRequest) => {
  const inventory = await getInventory(request.itemName);
  if (!inventory || inventory.quantity < request.quantity) {
    throw new Error(`Insufficient inventory for order ${request.requestId}`);
  }
  inventory.quantity -= request.quantity;
  await daprClient.state.save(storeName, [{ key: request.itemName, value: inventory }]);
  console.log(`Inventory updated for ${request.requestId}, there are now ${inventory.quantity} ${inventory.itemName} in stock`);
};

export function* orderProcessingWorkflow(
  ctx: WorkflowContext,
  order: OrderPayload,
): Generator<Task<unknown>, OrderResult, unknown> {
  const orderId = ctx.getWorkflowInstanceId();
  ctx.logger.info(`Processing order ${orderId}...`);

  yield ctx.callActivity(notifyActivity, {
    message: `Received order ${orderId} for ${order.quantity} ${order.itemName} at a total cost of ${order.totalCost}`,
  });

  const inventoryRequest = new InventoryRequest(orderId, order.itemName, order.quantity);
  const inventoryTask = ctx.callActivity<InventoryResult>(verifyInventoryActivity, inventoryRequest);
  yield inventoryTask;

  if (!inventoryTask.getResult().success) {
    yield ctx.callActivity(notifyActivity, { message: `Insufficient inventory for order ${orderId}` });
    return new OrderResult(false);
  }

  if (order.totalCost > 5000) {
    yield ctx.callActivity(requestApprovalActivity, order);
    const approvalTask = ctx.waitForExternalEvent<ApprovalResponse>("ApprovalEvent", { timeoutInSeconds: 30 });
    yield approvalTask;
    if (!approvalTask.getResult().isApproved) {
      yield ctx.callActivity(notifyActivity, { message: `Order ${orderId} was not approved` });
      return new OrderResult(false);
    }
  }

  yield ctx.callActivity(processPaymentActivity,
    new OrderPaymentRequest(orderId, order.itemName, order.totalCost, order.quantity));

  const updateTask = ctx.callActivity(updateInventoryActivity, inventoryRequest);
  try {
    yield updateTask;
  } catch (error) {
    // 只补偿 activity 失败，不补偿与 activity 无关的 workflow 错误。
    if (!updateTask.isFailed) {
      throw error;
    }
    ctx.logger.error(`Inventory update failed for order ${orderId}`, error);
    yield ctx.callActivity(notifyActivity, { message: `Order ${orderId} failed! You are now getting a refund` });
    return new OrderResult(false);
  }

  yield ctx.callActivity(notifyActivity, { message: `Order ${orderId} processed successfully!` });
  ctx.logger.info(`Order ${orderId} has completed`);
  return new OrderResult(true);
}
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

`order-processor` 控制台应用会启动并管理订单处理 workflow 的生命周期，该 workflow 会在 state store 中存取数据。该 workflow 包含五个 workflow activity（即任务）：

- `NotifyActivity`：使用日志记录器在整个 workflow 中输出消息
- `VerifyInventoryActivity`：检查 state store，确保有足够的库存可供购买。
- `RequestApprovalActivity`：对超过特定阈值的订单请求批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从 state store 中移除所请求的商品，并使用新的剩余库存值更新存储。

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)已安装。示例使用了需要 .NET 10 SDK 中编译器的源生成器，较早的 SDK 无法构建该示例。
- [.NET 8 运行时](https://dotnet.microsoft.com/download/dotnet/8.0)已安装。示例以 `net8.0` 为目标框架，因此需要该运行时才能运行。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/csharp/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在执行 `git clone` 的文件夹中，进入 `order-processor` 目录：

```bash
cd quickstarts/workflows/csharp/sdk/order-processor
```

安装依赖项：

```bash
dotnet restore
dotnet build
```

返回 `csharp/sdk` 目录：

```bash
cd ..
```

### 步骤 3：运行 order processor 应用

在终端中，使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 将 order processor 应用与 Dapr sidecar 一起启动。在 `csharp/sdk` 目录中运行以下命令：

```bash
dapr run -f .
```

这会使用唯一的 workflow ID 启动 `order-processor` 应用，并运行 workflow activity。

预期输出：

```text
== APP - order-processor == info: Microsoft.Hosting.Lifetime[0]
== APP - order-processor ==       Application started. Press Ctrl+C to shut down.
== APP - order-processor == info: Dapr.Workflow.Worker.WorkflowWorker[1748650618]
== APP - order-processor ==       Starting Dapr Workflow Worker
== APP - order-processor == info: Microsoft.Hosting.Lifetime[0]
== APP - order-processor ==       Hosting environment: Production
== APP - order-processor == info: Microsoft.Hosting.Lifetime[0]
== APP - order-processor ==       Content root path: /work/quickstarts/workflows/csharp/sdk/order-processor
== APP - order-processor == info: Dapr.Workflow.Worker.Grpc.GrpcProtocolHandler[154403261]
== APP - order-processor ==       Starting gRPC bidirectional stream with Dapr sidecar
== APP - order-processor == info: Dapr.Workflow.Worker.Grpc.GrpcProtocolHandler[406645761]
== APP - order-processor ==       Established gRPC bidirectional stream with Dapr sidecar
== APP - order-processor == Starting workflow 87743053 purchasing 1 Cars
== APP - order-processor == info: Dapr.Workflow.Client.WorkflowGrpcClient[430660008]
== APP - order-processor ==       Scheduled workflow 'OrderProcessingWorkflow' with instance ID '87743053'
== APP - order-processor == info: WorkflowConsoleApp.Activities.NotifyActivity[1985924262]
== APP - order-processor ==       Presenting notification Notification { Message = Received order 87743053 for 1 Cars at $5000 }
== APP - order-processor == Your workflow has started. Here is the status of the workflow: Running
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[2013970020]
== APP - order-processor ==       Received request ID '87743053' for 1 Cars at $5000
== APP - order-processor == info: WorkflowConsoleApp.Activities.VerifyInventoryActivity[1478802116]
== APP - order-processor ==       Reserving inventory for order request ID '87743053' of 1 Cars
== APP - order-processor == info: WorkflowConsoleApp.Activities.VerifyInventoryActivity[1130866279]
== APP - order-processor ==       There are: 10 Cars available for purchase
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[1162731597]
== APP - order-processor ==       Checked inventory for request ID 'InventoryRequest { RequestId = 87743053, ItemName = Cars, Quantity = 1 }'
== APP - order-processor == info: WorkflowConsoleApp.Activities.ProcessPaymentActivity[340284070]
== APP - order-processor ==       Processing payment: request ID '87743053' for 1 Cars at $5000
== APP - order-processor == info: WorkflowConsoleApp.Activities.ProcessPaymentActivity[1851315765]
== APP - order-processor ==       Payment for request ID '87743053' processed successfully
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[340284070]
== APP - order-processor ==       Processed payment request as there's sufficient inventory to proceed: PaymentRequest { RequestId = 87743053, ItemBeingPurchased = Cars, Amount = 1, Currency = 5000 }
== APP - order-processor == info: WorkflowConsoleApp.Activities.UpdateInventoryActivity[2144991393]
== APP - order-processor ==       Checking inventory for request ID '87743053' for 1 Cars
== APP - order-processor == info: WorkflowConsoleApp.Activities.UpdateInventoryActivity[1901852920]
== APP - order-processor ==       There are now 9 Cars left in stock
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[96138418]
== APP - order-processor ==       Updating available inventory for PaymentRequest { RequestId = 87743053, ItemBeingPurchased = Cars, Amount = 1, Currency = 5000 }
== APP - order-processor == info: WorkflowConsoleApp.Activities.NotifyActivity[1985924262]
== APP - order-processor ==       Presenting notification Notification { Message = Order 87743053 has completed! }
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[510392223]
== APP - order-processor ==       Order 87743053 has completed
== APP - order-processor == info: Dapr.Workflow.Worker.WorkflowWorker[1120267106]
== APP - order-processor ==       Workflow execution completed: Name='OrderProcessingWorkflow', InstanceId='87743053'
== APP - order-processor == Workflow Status: Completed
== APP - order-processor == info: Grpc.Net.Client.Internal.GrpcCall[3]
== APP - order-processor ==       Call failed with gRPC error status. Status code: 'Cancelled', Message: 'Call canceled by the client.'.
== APP - order-processor ==       System.OperationCanceledException: The operation was canceled.
== APP - order-processor == info: Dapr.Workflow.Worker.Grpc.GrpcProtocolHandler[1917588177]
== APP - order-processor ==       Workflow worker gRPC stream canceled during shutdown (expected)
```

### (可选) 步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果该容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看 workflow 的追踪 span（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建一个包含一辆汽车的 OrderPayload。
2. 为 workflow 生成唯一的订单 ID（在上面的示例中为 `87743053`），并调度该 workflow。
3. `NotifyActivity` workflow activity 发送通知，表示已收到一辆汽车的订单。
4. `VerifyInventoryActivity` workflow activity 检查库存数据，确定能否供应所订购的商品，并返回库存中汽车的数量。库存充足，因此 workflow 继续执行。
5. 订单的总成本为 5000，因此 workflow 不会调用 `RequestApprovalActivity` activity。
6. `ProcessPaymentActivity` workflow activity 开始处理订单 `87743053` 的付款，并确认是否成功。
7. `UpdateInventoryActivity` workflow activity 在订单处理完成后，使用当前可用的汽车数量更新库存。
8. `NotifyActivity` workflow activity 发送通知，表示订单 `87743053` 已完成。
9. workflow 以已完成状态终止，OrderResult 被设置为 processed。

#### `order-processor/Program.cs`

在应用程序的程序文件中：

- 生成唯一的 workflow 订单 ID
- 通过 `IInventoryStore` 客户端将库存保存到 state store
- 调度 workflow
- 获取 workflow 状态

该程序文件不注册 workflow 及其 activity。.NET 10 SDK 中的源生成器会在应用构建时注册它们。

```csharp
using Dapr.StateManagement.Extensions;
using Dapr.Workflow;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using WorkflowConsoleApp.Models;
using WorkflowConsoleApp.Models.State;
using WorkflowConsoleApp.Workflows;

// workflow 宿主是一个后台服务，通过 gRPC 连接到 sidecar
using var host = Host.CreateDefaultBuilder(args).ConfigureServices(services =>
{
    services.AddDaprStateManagementClient()
        .WithInventoryStore();
    services.AddDaprWorkflow();
}).Build();

// 启动应用，此时连接到 Dapr sidecar
host.Start();

var workflowClient = host.Services.GetRequiredService<DaprWorkflowClient>();

// 为 workflow 生成唯一 ID
var orderId = Guid.NewGuid().ToString()[..8];
const string itemToPurchase = "Cars";
const int amountToPurchase = 1;

// 向存储中填充商品
var stateStore = host.Services.GetRequiredService<IInventoryStore>();
await stateStore.SaveStateAsync(itemToPurchase, new OrderPayload(Name: itemToPurchase, TotalCost: 50000, Quantity: 10));

// 构造订单
var orderInfo = new OrderPayload(itemToPurchase, 5000, amountToPurchase);

// 启动 workflow
Console.WriteLine($"Starting workflow {orderId} purchasing {amountToPurchase} {itemToPurchase}");

await workflowClient.ScheduleNewWorkflowAsync(
    name: nameof(OrderProcessingWorkflow),
    instanceId: orderId,
    input: orderInfo);

// 等待 workflow 启动并确认输入
var state = await workflowClient.WaitForWorkflowStartAsync(
    instanceId: orderId);

Console.WriteLine($"Your workflow has started. Here is the status of the workflow: {Enum.GetName(typeof(WorkflowRuntimeStatus), state.RuntimeStatus)}");

// 等待 workflow 完成
state = await workflowClient.WaitForWorkflowCompletionAsync(
    instanceId: orderId);

Console.WriteLine("Workflow Status: {0}", Enum.GetName(typeof(WorkflowRuntimeStatus), state.RuntimeStatus));
```

#### `order-processor/Workflows/OrderProcessingWorkflow.cs`

在 `OrderProcessingWorkflow.cs` 中，该 workflow 被定义为一个类，其所有相关任务（由单独文件中的 workflow activity 确定）都包含在该类中。

```csharp
namespace WorkflowConsoleApp.Workflows;

using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Dapr.Workflow;
using Activities;
using Models;

internal sealed partial class OrderProcessingWorkflow : Workflow<OrderPayload, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderPayload order)
    {
        var logger = context.CreateReplaySafeLogger<OrderProcessingWorkflow>();
        var orderId = context.InstanceId;

        // 通知用户订单已提交
        await context.CallActivityAsync(nameof(NotifyActivity),
            new Notification($"Received order {orderId} for {order.Quantity} {order.Name} at ${order.TotalCost}"));
        LogOrderReceived(logger, orderId, order.Quantity, order.Name, order.TotalCost);

        // 通过检查库存，确定是否有足够的商品可供购买
        var inventoryRequest = new InventoryRequest(RequestId: orderId, order.Name, order.Quantity);
        var result = await context.CallActivityAsync<InventoryResult>(
            nameof(VerifyInventoryActivity), inventoryRequest);
        LogCheckInventory(logger, inventoryRequest);
            
        // 库存不足时失败，并告知用户 
        if (!result.Success)
        {
            // 由于库存不足，在此结束 workflow
            await context.CallActivityAsync(nameof(NotifyActivity),
                new Notification($"Insufficient inventory for {order.Name}"));
            LogInsufficientInventory(logger, order.Name);
            return new OrderResult(Processed: false);
        }

        if (order.TotalCost > 5000)
        {
            await context.CallActivityAsync(nameof(RequestApprovalActivity),
                new ApprovalRequest(orderId, order.Name, order.Quantity, order.TotalCost));

            var approvalResponse = await context.WaitForExternalEventAsync<ApprovalResponse>(
                eventName: "ApprovalEvent",
                timeout: TimeSpan.FromSeconds(30));
            if (!approvalResponse.IsApproved)
            {
                await context.CallActivityAsync(nameof(NotifyActivity),
                    new Notification($"Order {orderId} was not approved"));
                LogOrderNotApproved(logger, orderId);
                return new OrderResult(Processed: false);
            }
        }

        // 库存充足，用户可以购买商品，处理其付款
        var processPaymentRequest = new PaymentRequest(RequestId: orderId, order.Name, order.Quantity, order.TotalCost);
        await context.CallActivityAsync(nameof(ProcessPaymentActivity),processPaymentRequest);
        LogPaymentProcessing(logger, processPaymentRequest);

        try
        {
            // 更新可用库存
            var paymentRequest = new PaymentRequest(RequestId: orderId, order.Name, order.Quantity, order.TotalCost); 
            await context.CallActivityAsync(nameof(UpdateInventoryActivity), paymentRequest);
            LogInventoryUpdate(logger, paymentRequest);
        }
        catch (WorkflowTaskFailedException)
        {
            // 告知用户其付款已处理，但库存不足，因此将获得退款
            await context.CallActivityAsync(nameof(NotifyActivity),
                new Notification($"Order {orderId} Failed! You are now getting a refund"));
            LogRefund(logger, orderId);
            return new OrderResult(Processed: false);
        }

        // 告知用户其付款已处理
        await context.CallActivityAsync(nameof(NotifyActivity), new Notification($"Order {orderId} has completed!"));
        LogSuccessfulOrder(logger, orderId);

        // 以成功结果结束 workflow
        return new OrderResult(Processed: true);
    }

    [LoggerMessage(LogLevel.Information, "Received request ID '{request}' for {quantity} {name} at ${totalCost}")]
    static partial void LogOrderReceived(ILogger logger, string request, int quantity, string name, double totalCost);
    
    [LoggerMessage(LogLevel.Information, "Checked inventory for request ID '{request}'")]
    static partial void LogCheckInventory(ILogger logger, InventoryRequest request);
    
    [LoggerMessage(LogLevel.Information, "Insufficient inventory for order {orderName}")]
    static partial void LogInsufficientInventory(ILogger logger, string orderName);
    
    [LoggerMessage(LogLevel.Information, "Order {orderName} was not approved")]
    static partial void LogOrderNotApproved(ILogger logger, string orderName);

    [LoggerMessage(LogLevel.Information, "Processed payment request as there's sufficient inventory to proceed: {request}")]
    static partial void LogPaymentProcessing(ILogger logger, PaymentRequest request);

    [LoggerMessage(LogLevel.Information, "Updating available inventory for {request}")]
    static partial void LogInventoryUpdate(ILogger logger, PaymentRequest request);

    [LoggerMessage(LogLevel.Information, "Order {orderId} failed due to insufficient inventory - processing refund")]
    static partial void LogRefund(ILogger logger, string orderId);

    [LoggerMessage(LogLevel.Information, "Order {orderId} has completed")]
    static partial void LogSuccessfulOrder(ILogger logger, string orderId);
}
```

#### `order-processor/Activities` 目录

`Activities` 目录包含 workflow 使用的五个 workflow activity，它们定义在以下文件中：

- `NotifyActivity.cs`
- `VerifyInventoryActivity.cs`
- `RequestApprovalActivity.cs`
- `ProcessPaymentActivity.cs`
- `UpdateInventoryActivity.cs`

## 观看演示

观看[此视频，了解 Dapr Workflow .NET 演示的操作步骤](https://youtu.be/BxiKpEmchgQ?t=2564)：

{{< youtube id=BxiKpEmchgQ start=2564 >}}

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

`order-processor` 控制台应用会启动并管理订单处理 workflow 的生命周期，该 workflow 会在 state store 中存取数据。该 workflow 包含五个 workflow activity（即任务）：

- `NotifyActivity`：使用日志记录器在整个 workflow 中输出消息。
- `RequestApprovalActivity`：对超过特定成本阈值的订单请求批准。
- `VerifyInventoryActivity`：检查 state store，确保有足够的库存可供购买。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从 state store 中移除所请求的商品，并使用新的剩余库存值更新存储。

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
    - [Microsoft JDK 17](https://docs.microsoft.com/java/openjdk/download#openjdk-17)
    - [Oracle JDK 17](https://www.oracle.com/technetwork/java/javase/downloads/index.html#JDK17)
    - [OpenJDK 17](https://jdk.java.net/17/)
- [Apache Maven](https://maven.apache.org/install.html) 3.x 版本。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

进入 `order-processor` 目录：

```bash
cd quickstarts/workflows/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

返回 `java/sdk` 目录：

```bash
cd ..
```

### 步骤 3：运行 order processor 应用

在终端中，使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 将 order processor 应用与 Dapr sidecar 一起启动。在 `java/sdk` 目录中运行以下命令：

```bash
dapr run -f .
```

这会使用唯一的 workflow ID 启动 `order-processor` 应用，并运行 workflow activity。

预期输出：

```text
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == Start workflow runtime
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == Starting order workflow, purchasing 1 of cars
== APP - order-processor == Scheduled new workflow instance of OrderProcessingWorkflow with instance ID: b2b99d81-30ec-4673-80ae-6b2609172837
== APP - order-processor == Workflow instance b2b99d81-30ec-4673-80ae-6b2609172837 started
== APP - order-processor == there are now 9 cars left in stock
== APP - order-processor == Workflow instance completed, out is: {"processed":true}
```

Dapr Java SDK 还会在这些行之间写入日志行。你看到的日志取决于应用的日志配置。

### (可选) 步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果该容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看 workflow 的追踪 span（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建一个包含一辆汽车的 OrderPayload。
2. 为 workflow 生成唯一的订单 ID（在上面的示例中为 `b2b99d81-30ec-4673-80ae-6b2609172837`），并调度该 workflow。
3. `NotifyActivity` workflow activity 发送通知，表示已收到一辆汽车的订单。
4. `VertifyInventoryActivity` workflow activity 检查库存数据，确定能否供应所订购的商品，并返回库存中汽车的数量。库存充足，因此 workflow 继续执行。
5. 订单的总成本为 5000，因此 workflow 不会调用 `RequestApprovalActivity` activity。
6. `ProcessPaymentActivity` workflow activity 开始处理订单 `b2b99d81-30ec-4673-80ae-6b2609172837` 的付款，并确认是否成功。
7. `UpdateInventoryActivity` workflow activity 在订单处理完成后，使用当前可用的汽车数量更新库存。
8. `NotifyActivity` workflow activity 发送通知，表示订单 `b2b99d81-30ec-4673-80ae-6b2609172837` 已完成。
9. workflow 以已完成状态终止，orderResult 被设置为 processed。

#### `order-processor/WorkflowConsoleApp.java`

在应用程序的程序文件中：
- 生成唯一的 workflow 订单 ID
- 调度 workflow
- 获取 workflow 状态
- 注册 workflow 及其调用的 workflow activity

```java
/*
 * Copyright 2023 The Dapr Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

package io.dapr.quickstarts.workflows;

import java.time.Duration;
import java.util.concurrent.TimeoutException;

import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.quickstarts.workflows.activities.NotifyActivity;
import io.dapr.quickstarts.workflows.activities.ProcessPaymentActivity;
import io.dapr.quickstarts.workflows.activities.RequestApprovalActivity;
import io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity;
import io.dapr.quickstarts.workflows.activities.UpdateInventoryActivity;
import io.dapr.quickstarts.workflows.models.InventoryItem;
import io.dapr.quickstarts.workflows.models.OrderPayload;
import io.dapr.workflows.client.DaprWorkflowClient;
import io.dapr.workflows.client.WorkflowInstanceStatus;
import io.dapr.workflows.runtime.WorkflowRuntime;
import io.dapr.workflows.runtime.WorkflowRuntimeBuilder;

public class WorkflowConsoleApp {

  private static final String STATE_STORE_NAME = "statestore";

  /**
   * The main method of this console app.
   *
   * @param args The port the app will listen on.
   * @throws Exception An Exception.
   */
  public static void main(String[] args) throws Exception {
    System.out.println("*** Welcome to the Dapr Workflow console app sample!");
    System.out.println("*** Using this app, you can place orders that start workflows.");
    // 等待 sidecar 可用
    Thread.sleep(5 * 1000);

    // 向构建器注册 OrderProcessingWorkflow 及其 activity。
    WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder().registerWorkflow(OrderProcessingWorkflow.class);
    builder.registerActivity(NotifyActivity.class);
    builder.registerActivity(ProcessPaymentActivity.class);
    builder.registerActivity(RequestApprovalActivity.class);
    builder.registerActivity(VerifyInventoryActivity.class);
    builder.registerActivity(UpdateInventoryActivity.class);

    // 构建并启动 workflow runtime，用于拉取并执行任务
    WorkflowRuntime runtime = builder.build();
    System.out.println("Start workflow runtime");
    runtime.start(false);

    InventoryItem inventory = prepareInventoryAndOrder();

    DaprWorkflowClient workflowClient = new DaprWorkflowClient();
    try (workflowClient) {
      executeWorkflow(workflowClient, inventory);
    }
  }

  private static void executeWorkflow(DaprWorkflowClient workflowClient, InventoryItem inventory) {
    System.out.println("==========Begin the purchase of item:==========");
    String itemName = inventory.getName();
    int orderQuantity = inventory.getQuantity();
    int totalCost = orderQuantity * inventory.getPerItemCost();
    OrderPayload order = new OrderPayload();
    order.setItemName(itemName);
    order.setQuantity(orderQuantity);
    order.setTotalCost(totalCost);
    System.out.println("Starting order workflow, purchasing " + orderQuantity + " of " + itemName);

    String instanceId = workflowClient.scheduleNewWorkflow(OrderProcessingWorkflow.class, order);
    System.out.printf("Scheduled new workflow instance of OrderProcessingWorkflow with instance ID: %s%n",
        instanceId);

    try {
      workflowClient.waitForInstanceStart(instanceId, Duration.ofSeconds(10), false);
      System.out.printf("Workflow instance %s started%n", instanceId);
    } catch (TimeoutException e) {
      System.out.printf("Workflow instance %s did not start within 10 seconds%n", instanceId);
      return;
    }

    try {
      WorkflowInstanceStatus workflowStatus = workflowClient.waitForInstanceCompletion(instanceId,
          Duration.ofSeconds(30),
          true);
      if (workflowStatus != null) {
        System.out.printf("Workflow instance completed, out is: %s%n",
            workflowStatus.getSerializedOutput());
      } else {
        System.out.printf("Workflow instance %s not found%n", instanceId);
      }
    } catch (TimeoutException e) {
      System.out.printf("Workflow instance %s did not complete within 30 seconds%n", instanceId);
    }

  }

  private static InventoryItem prepareInventoryAndOrder() {
    // 准备库存中的 10 辆汽车
    InventoryItem inventory = new InventoryItem();
    inventory.setName("cars");
    inventory.setPerItemCost(5000);
    inventory.setQuantity(10);
    DaprClient daprClient = new DaprClientBuilder().build();
    restockInventory(daprClient, inventory);

    // 准备 1 辆汽车的订单
    InventoryItem order = new InventoryItem();
    order.setName("cars");
    order.setPerItemCost(5000);
    order.setQuantity(1);
    return order;
  }

  private static void restockInventory(DaprClient daprClient, InventoryItem inventory) {
    String key = inventory.getName();
    daprClient.saveState(STATE_STORE_NAME, key, inventory).block();
  }
}
```

#### `OrderProcessingWorkflow.java`

在 `OrderProcessingWorkflow.java` 中，该 workflow 被定义为一个类，其所有相关任务（由 workflow activity 确定）都包含在该类中。

```java
package io.dapr.quickstarts.workflows;

import java.time.Duration;
import org.slf4j.Logger;

import io.dapr.quickstarts.workflows.activities.NotifyActivity;
import io.dapr.quickstarts.workflows.activities.ProcessPaymentActivity;
import io.dapr.quickstarts.workflows.activities.RequestApprovalActivity;
import io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity;
import io.dapr.quickstarts.workflows.activities.UpdateInventoryActivity;
import io.dapr.quickstarts.workflows.models.ApprovalResponse;
import io.dapr.quickstarts.workflows.models.InventoryRequest;
import io.dapr.quickstarts.workflows.models.InventoryResult;
import io.dapr.quickstarts.workflows.models.Notification;
import io.dapr.quickstarts.workflows.models.OrderPayload;
import io.dapr.quickstarts.workflows.models.OrderResult;
import io.dapr.quickstarts.workflows.models.PaymentRequest;
import io.dapr.workflows.Workflow;
import io.dapr.workflows.WorkflowStub;

public class OrderProcessingWorkflow implements Workflow {

  @Override
  public WorkflowStub create() {
    return ctx -> {
      Logger logger = ctx.getLogger();
      String orderId = ctx.getInstanceId();
      logger.info("Starting Workflow: " + ctx.getName());
      logger.info("Instance ID(order ID): " + orderId);
      logger.info("Current Orchestration Time: " + ctx.getCurrentInstant());

      OrderPayload order = ctx.getInput(OrderPayload.class);
      logger.info("Received Order: " + order.toString());
      OrderResult orderResult = new OrderResult();
      orderResult.setProcessed(false);

      // 通知用户订单已提交
      Notification notification = new Notification();
      notification.setMessage("Received Order: " + order.toString());
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // 通过检查库存，确定是否有足够的商品可供购买
      InventoryRequest inventoryRequest = new InventoryRequest();
      inventoryRequest.setRequestId(orderId);
      inventoryRequest.setItemName(order.getItemName());
      inventoryRequest.setQuantity(order.getQuantity());
      InventoryResult inventoryResult = ctx.callActivity(VerifyInventoryActivity.class.getName(),
          inventoryRequest, InventoryResult.class).await();

      // 库存不足时，失败并告知用户
      if (!inventoryResult.isSuccess()) {
        notification.setMessage("Insufficient inventory for order : " + order.getItemName());
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // 超过特定阈值的订单需要获得批准
      if (order.getTotalCost() > 5000) {
        ctx.callActivity(RequestApprovalActivity.class.getName(), order).await();

        ApprovalResponse approvalResponse = ctx.waitForExternalEvent("approvalEvent",
          Duration.ofSeconds(30), ApprovalResponse.class).await();
        if (!approvalResponse.isApproved()) {
          notification.setMessage("Order " + order.getItemName() + " was not approved.");
          ctx.callActivity(NotifyActivity.class.getName(), notification).await();
          ctx.complete(orderResult);
          return;
        }
      }

      // 库存充足，用户可以购买商品。处理其付款
      PaymentRequest paymentRequest = new PaymentRequest();
      paymentRequest.setRequestId(orderId);
      paymentRequest.setItemBeingPurchased(order.getItemName());
      paymentRequest.setQuantity(order.getQuantity());
      paymentRequest.setAmount(order.getTotalCost());
      boolean isOK = ctx.callActivity(ProcessPaymentActivity.class.getName(),
          paymentRequest, boolean.class).await();
      if (!isOK) {
        notification.setMessage("Payment failed for order : " + orderId);
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      inventoryResult = ctx.callActivity(UpdateInventoryActivity.class.getName(),
          inventoryRequest, InventoryResult.class).await();
      if (!inventoryResult.isSuccess()) {
        // 如果更新库存时出错，则为用户退款
        // paymentRequest.setAmount(-1 * paymentRequest.getAmount());
        // ctx.callActivity(ProcessPaymentActivity.class.getName(),
        // paymentRequest).await();

        // 告知用户其付款处理失败
        notification.setMessage("Order failed to update inventory! : " + orderId);
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // 告知用户其订单已处理
      notification.setMessage("Order completed! : " + orderId);
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // 以订单结果已处理的状态完成 workflow
      orderResult.setProcessed(true);
      ctx.complete(orderResult);
    };
  }

}
```

#### `activities` 目录

`Activities` 目录包含 workflow 使用的五个 workflow activity，它们定义在以下文件中：
- [`NotifyActivity.java`](https://github.com/dapr/quickstarts/blob/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/NotifyActivity.java)
- [`RequestApprovalActivity`](https://github.com/dapr/quickstarts/blob/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/RequestApprovalActivity.java)
- [`VerifyInventoryActivity`](https://github.com/dapr/quickstarts/blob/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/VerifyInventoryActivity.java)
- [`ProcessPaymentActivity`](https://github.com/dapr/quickstarts/blob/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/ProcessPaymentActivity.java)
- [`UpdateInventoryActivity`](https://github.com/dapr/quickstarts/blob/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/UpdateInventoryActivity.java)

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

`order-processor` 控制台应用会启动并管理 `OrderProcessingWorkflow` workflow，它模拟从商店购买商品的过程。该 workflow 由五个独立的 workflow activity（即任务）组成：

- `NotifyActivity`：在整个 workflow 中输出消息。这些消息会在以下情况下通知你：
  - 库存不足
  - 付款无法处理，等等
- `VerifyInventoryActivity`：检查 state store，确保有足够的库存可供购买。
- `RequestApprovalActivity`：对超过特定成本阈值的订单请求批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从 state store 中移除所请求的商品，并使用新的剩余库存值更新存储。

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/go/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在执行 `git clone` 的文件夹中，进入 `sdk` 目录：

```bash
cd quickstarts/workflows/go/sdk
```

### 步骤 3：运行 order processor 应用

在终端中，使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 将 order processor 应用与 Dapr sidecar 一起启动。在 `go/sdk` 目录中运行以下命令：

```bash
dapr run -f .
```

这会使用唯一的 workflow ID 启动 `order-processor` 应用，并运行 workflow activity。

预期输出：

```text
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == dapr client initializing for: 127.0.0.1:35291
== APP - order-processor == INFO: 2026/10/24 00:00:58 connecting work item listener stream
== APP - order-processor == adding base stock item: paperclip
== APP - order-processor == INFO: 2026/10/24 00:00:58 starting background processor
== APP - order-processor == adding base stock item: cars
== APP - order-processor == adding base stock item: computers
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == NotifyActivity: Received order 3d5e681c-aff3-4f1a-860a-a9976ec96a81 for 1 cars - $5000
== APP - order-processor == VerifyInventoryActivity: Verifying inventory for order 3d5e681c-aff3-4f1a-860a-a9976ec96a81 of 1 cars
== APP - order-processor == VerifyInventoryActivity: There are 10 cars available for purchase
== APP - order-processor == ProcessPaymentActivity: 3d5e681c-aff3-4f1a-860a-a9976ec96a81 for 1 - cars (5000USD)
== APP - order-processor == UpdateInventoryActivity: Checking Inventory for order 3d5e681c-aff3-4f1a-860a-a9976ec96a81 for 1 * cars
== APP - order-processor == UpdateInventoryActivity: There are now 9 cars left in stock
== APP - order-processor == NotifyActivity: Order 3d5e681c-aff3-4f1a-860a-a9976ec96a81 has completed!
== APP - order-processor == workflow status: COMPLETED
== APP - order-processor == Purchase of item is complete
```

使用 `CTRL+C` 停止 Dapr workflow，或运行：

```bash
dapr stop -f .
```

### (可选) 步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果该容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看 workflow 的追踪 span（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run` 时：

1. 创建一个包含一辆汽车的 OrderPayload。
2. 为 workflow 生成唯一的订单 ID（在上面的示例中为 `3d5e681c-aff3-4f1a-860a-a9976ec96a81`），并调度该 workflow。
3. `NotifyActivity` workflow activity 发送通知，表示已收到一辆汽车的订单。
4. `VerifyInventoryActivity` workflow activity 检查库存数据，确定能否供应所订购的商品，并返回库存中汽车的数量。
5. 订单的总成本为 5000，因此 workflow 不会调用 `RequestApprovalActivity` activity。
6. `ProcessPaymentActivity` workflow activity 开始处理订单 `3d5e681c-aff3-4f1a-860a-a9976ec96a81` 的付款，并确认是否成功。
7. `UpdateInventoryActivity` workflow activity 在订单处理完成后，使用当前可用的汽车数量更新库存。
8. `NotifyActivity` workflow activity 发送通知，表示订单 `3d5e681c-aff3-4f1a-860a-a9976ec96a81` 已完成。
9. workflow 以已完成状态终止，OrderResult 被设置为 processed。

#### `order-processor/main.go`

在应用程序的程序文件中：

- 生成唯一的 workflow 订单 ID
- 调度 workflow
- 获取 workflow 状态
- 注册 workflow 及其调用的 workflow activity

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"


	"github.com/dapr/durabletask-go/workflow"
	"github.com/dapr/go-sdk/client"
)

var (
	stateStoreName    = "statestore"
	workflowComponent = "dapr"
	workflowName      = "OrderProcessingWorkflow"
	defaultItemName   = "cars"
)

func main() {
	fmt.Println("*** Welcome to the Dapr Workflow console app sample!")
	fmt.Println("*** Using this app, you can place orders that start workflows.")

	r := workflow.NewRegistry()

	if err := r.AddWorkflow(OrderProcessingWorkflow); err != nil {
		log.Fatal(err)
	}
	if err := r.AddActivity(NotifyActivity); err != nil {
		log.Fatal(err)
	}
	if err := r.AddActivity(RequestApprovalActivity); err != nil {
		log.Fatal(err)
	}
	if err := r.AddActivity(VerifyInventoryActivity); err != nil {
		log.Fatal(err)
	}
	if err := r.AddActivity(ProcessPaymentActivity); err != nil {
		log.Fatal(err)
	}
	if err := r.AddActivity(UpdateInventoryActivity); err != nil {
		log.Fatal(err)
	}

	wfClient, err := client.NewWorkflowClient()
	if err != nil {
		log.Fatalf("failed to initialise workflow client: %v", err)
	}

	if err := wfClient.StartWorker(context.Background(), r); err != nil {
		log.Fatal(err)
	}

	dclient, err := client.NewClient()
	if err != nil {
		log.Fatal(err)
	}
	inventory := []InventoryItem{
		{ItemName: "paperclip", PerItemCost: 5, Quantity: 100},
		{ItemName: "cars", PerItemCost: 5000, Quantity: 10},
		{ItemName: "computers", PerItemCost: 500, Quantity: 100},
	}
	if err := restockInventory(dclient, inventory); err != nil {
		log.Fatalf("failed to restock: %v", err)
	}

	fmt.Println("==========Begin the purchase of item:==========")

	itemName := defaultItemName
	orderQuantity := 1

	totalCost := inventory[1].PerItemCost * orderQuantity

	orderPayload := OrderPayload{
		ItemName:  itemName,
		Quantity:  orderQuantity,
		TotalCost: totalCost,
	}

	id, err := wfClient.ScheduleWorkflow(context.Background(), workflowName, workflow.WithInput(orderPayload))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}

	waitCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_, err = wfClient.WaitForWorkflowCompletion(waitCtx, id)
	if err != nil {
		log.Fatalf("failed to wait for workflow: %v", err)
	}

	respFetch, err := wfClient.FetchWorkflowMetadata(context.Background(), id, workflow.WithFetchPayloads(true))
	if err != nil {
		log.Fatalf("failed to get workflow: %v", err)
	}

	fmt.Printf("workflow status: %v\n", respFetch.String())

	fmt.Println("Purchase of item is complete")
}

func restockInventory(daprClient client.Client, inventory []InventoryItem) error {
	for _, item := range inventory {
		itemSerialized, err := json.Marshal(item)
		if err != nil {
			return err
		}
		fmt.Printf("adding base stock item: %s\n", item.ItemName)
		if err := daprClient.SaveState(context.Background(), stateStoreName, item.ItemName, itemSerialized, nil); err != nil {
			return err
		}
	}
	return nil
}
```

#### `order-processor/workflow.go`

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/dapr/durabletask-go/workflow"
	"github.com/dapr/go-sdk/client"
)

type OrderPayload struct {
	ItemName  string `json:"item_name"`
	TotalCost int    `json:"total_cost"`
	Quantity  int    `json:"quantity"`
}

type OrderResult struct {
	Processed bool `json:"processed"`
}

type InventoryItem struct {
	ItemName    string `json:"item_name"`
	PerItemCost int    `json:"per_item_cost"`
	Quantity    int    `json:"quantity"`
}

type InventoryRequest struct {
	RequestID string `json:"request_id"`
	ItemName  string `json:"item_name"`
	Quantity  int    `json:"quantity"`
}

type InventoryResult struct {
	Success       bool          `json:"success"`
	InventoryItem InventoryItem `json:"inventory_item"`
}

type PaymentRequest struct {
	RequestID          string `json:"request_id"`
	ItemBeingPurchased string `json:"item_being_purchased"`
	Amount             int    `json:"amount"`
	Quantity           int    `json:"quantity"`
}

type ApprovalRequired struct {
	Approval bool `json:"approval"`
}

type Notification struct {
	Message string `json:"message"`
}

// OrderProcessingWorkflow 是订单处理流程中编排 activity 的主 workflow。
func OrderProcessingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	orderID := ctx.ID()
	var orderPayload OrderPayload
	if err := ctx.GetInput(&orderPayload); err != nil {
		return nil, err
	}
	err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{
		Message: fmt.Sprintf("Received order %s for %d %s - $%d", orderID, orderPayload.Quantity, orderPayload.ItemName, orderPayload.TotalCost),
	})).Await(nil)
	if err != nil {
		return OrderResult{Processed: false}, err
	}

	var verifyInventoryResult InventoryResult
	if err := ctx.CallActivity(VerifyInventoryActivity, workflow.WithActivityInput(InventoryRequest{
		RequestID: orderID,
		ItemName:  orderPayload.ItemName,
		Quantity:  orderPayload.Quantity,
	})).Await(&verifyInventoryResult); err != nil {
		return OrderResult{Processed: false}, err
	}

	if !verifyInventoryResult.Success {
		notification := Notification{Message: fmt.Sprintf("Insufficient inventory for %s", orderPayload.ItemName)}
		err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(notification)).Await(nil)
		return OrderResult{Processed: false}, err
	}

	if orderPayload.TotalCost > 5000 {
		var approvalRequired ApprovalRequired
		if err := ctx.CallActivity(RequestApprovalActivity, workflow.WithActivityInput(orderPayload)).Await(&approvalRequired); err != nil {
			return OrderResult{Processed: false}, err
		}
		if err := ctx.WaitForExternalEvent("manager_approval", time.Second*200).Await(nil); err != nil {
			return OrderResult{Processed: false}, err
		}
		// TODO：确认超时流程，超时将以错误的形式体现。
		if approvalRequired.Approval {
			if err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{Message: fmt.Sprintf("Payment for order %s has been approved!", orderID)})).Await(nil); err != nil {
				log.Printf("failed to notify of a successful order: %v\n", err)
			}
		} else {
			if err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{Message: fmt.Sprintf("Payment for order %s has been rejected!", orderID)})).Await(nil); err != nil {
				log.Printf("failed to notify of an unsuccessful order :%v\n", err)
			}
			return OrderResult{Processed: false}, err
		}
	}
	err = ctx.CallActivity(ProcessPaymentActivity, workflow.WithActivityInput(PaymentRequest{
		RequestID:          orderID,
		ItemBeingPurchased: orderPayload.ItemName,
		Amount:             orderPayload.TotalCost,
		Quantity:           orderPayload.Quantity,
	})).Await(nil)
	if err != nil {
		if err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{Message: fmt.Sprintf("Order %s failed!", orderID)})).Await(nil); err != nil {
			log.Printf("failed to notify of a failed order: %v", err)
		}
		return OrderResult{Processed: false}, err
	}

	err = ctx.CallActivity(UpdateInventoryActivity, workflow.WithActivityInput(PaymentRequest{
		RequestID:          orderID,
		ItemBeingPurchased: orderPayload.ItemName,
		Amount:             orderPayload.TotalCost,
		Quantity:           orderPayload.Quantity,
	})).Await(nil)
	if err != nil {
		if err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{Message: fmt.Sprintf("Order %s failed!", orderID)})).Await(nil); err != nil {
			log.Printf("failed to notify of a failed order: %v", err)
		}
		return OrderResult{Processed: false}, err
	}

	if err := ctx.CallActivity(NotifyActivity, workflow.WithActivityInput(Notification{Message: fmt.Sprintf("Order %s has completed!", orderID)})).Await(nil); err != nil {
		log.Printf("failed to notify of a successful order: %v", err)
	}
	return OrderResult{Processed: true}, err
}

// NotifyActivity 输出一条通知消息
func NotifyActivity(ctx workflow.ActivityContext) (any, error) {
	var input Notification
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("NotifyActivity: %s\n", input.Message)
	return nil, nil
}

// ProcessPaymentActivity 用于处理付款
func ProcessPaymentActivity(ctx workflow.ActivityContext) (any, error) {
	var input PaymentRequest
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("ProcessPaymentActivity: %s for %d - %s (%dUSD)\n", input.RequestID, input.Quantity, input.ItemBeingPurchased, input.Amount)
	return nil, nil
}

// VerifyInventoryActivity 用于验证库存中是否有该商品
func VerifyInventoryActivity(ctx workflow.ActivityContext) (any, error) {
	var input InventoryRequest
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	fmt.Printf("VerifyInventoryActivity: Verifying inventory for order %s of %d %s\n", input.RequestID, input.Quantity, input.ItemName)
	dClient, err := client.NewClient()
	if err != nil {
		return nil, err
	}
	item, err := dClient.GetState(context.Background(), stateStoreName, input.ItemName, nil)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return InventoryResult{
			Success:       false,
			InventoryItem: InventoryItem{},
		}, nil
	}
	var result InventoryItem
	if err := json.Unmarshal(item.Value, &result); err != nil {
		log.Fatalf("failed to parse inventory result %v", err)
	}
	fmt.Printf("VerifyInventoryActivity: There are %d %s available for purchase\n", result.Quantity, result.ItemName)
	if result.Quantity >= input.Quantity {
		return InventoryResult{Success: true, InventoryItem: result}, nil
	}
	return InventoryResult{Success: false, InventoryItem: InventoryItem{}}, nil
}

// UpdateInventoryActivity 用于修改库存。
func UpdateInventoryActivity(ctx workflow.ActivityContext) (any, error) {
	var input PaymentRequest
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	fmt.Printf("UpdateInventoryActivity: Checking Inventory for order %s for %d * %s\n", input.RequestID, input.Quantity, input.ItemBeingPurchased)
	dClient, err := client.NewClient()
	if err != nil {
		return nil, err
	}
	item, err := dClient.GetState(context.Background(), stateStoreName, input.ItemBeingPurchased, nil)
	if err != nil {
		return nil, err
	}
	var result InventoryItem
	err = json.Unmarshal(item.Value, &result)
	if err != nil {
		return nil, err
	}
	newQuantity := result.Quantity - input.Quantity
	if newQuantity < 0 {
		return nil, fmt.Errorf("insufficient inventory for: %s", input.ItemBeingPurchased)
	}
	result.Quantity = newQuantity
	newState, err := json.Marshal(result)
	if err != nil {
		log.Fatalf("failed to marshal new state: %v", err)
	}
	dClient.SaveState(context.Background(), stateStoreName, input.ItemBeingPurchased, newState, nil)
	fmt.Printf("UpdateInventoryActivity: There are now %d %s left in stock\n", result.Quantity, result.ItemName)
	return InventoryResult{Success: true, InventoryItem: result}, nil
}

// RequestApprovalActivity 为订单请求批准
func RequestApprovalActivity(ctx workflow.ActivityContext) (any, error) {
	var input OrderPayload
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	fmt.Printf("RequestApprovalActivity: Requesting approval for payment of %dUSD for %d %s\n", input.TotalCost, input.Quantity, input.ItemName)
	return ApprovalRequired{Approval: true}, nil
}
```

{{% /tab %}}


{{< /tabpane >}}

## 第 5 步：管理 workflow

现在 workflow 已经在运行，接下来学习如何使用 Dapr CLI 管理它。

### 查看正在运行的 workflow

打开一个单独的终端，并运行以下 CLI 命令。

```bash
# 列出所有 workflow
dapr workflow list --app-id order-processor -o wide
```

你应该会看到类似以下的输出：

```
NAMESPACE  APP ID           NAME                     INSTANCE ID  CREATED               LAST UPDATE           STATUS
default    order-processor  OrderProcessingWorkflow  e4d3807c     2025-11-07T12:29:37Z  2025-11-07T12:29:52Z  COMPLETED
```

### 查看 workflow 历史记录

查看 workflow 的详细执行历史：

```bash
dapr workflow history e4d3807c --app-id order-processor
```

你应该会看到类似以下的输出：

```
TYPE                 NAME                     EVENTID  ELAPSED   STATUS     DETAILS
ExecutionStarted     OrderProcessingWorkflow  -        Age:1.1m  RUNNING    orchestration start
OrchestratorStarted  -                        -        13.4ms    RUNNING    replay cycle start
TaskScheduled        NotifyActivity           0        1.3ms     RUNNING    activity=NotifyActivity
TaskCompleted        -                        -        2.6ms     RUNNING    eventId=0
OrchestratorStarted  -                        -        2.6ms     RUNNING    replay cycle start
TaskScheduled        VerifyInventoryActivity  1        637.6µs   RUNNING    activity=VerifyInventoryActivity
TaskCompleted        -                        -        2.4ms     RUNNING    eventId=1
OrchestratorStarted  -                        -        1.7ms     RUNNING    replay cycle start
TaskScheduled        ProcessPaymentActivity   2        439.3µs   RUNNING    activity=ProcessPaymentActivity
TaskCompleted        -                        -        1.6ms     RUNNING    eventId=2
OrchestratorStarted  -                        -        1.5ms     RUNNING    replay cycle start
TaskScheduled        UpdateInventoryActivity  3        311.2µs   RUNNING    activity=UpdateInventoryActivity
TaskCompleted        -                        -        2.4ms     RUNNING    eventId=3
OrchestratorStarted  -                        -        2.7ms     RUNNING    replay cycle start
TaskScheduled        NotifyActivity           4        354.1µs   RUNNING    activity=NotifyActivity
TaskCompleted        -                        -        2.5ms     RUNNING    eventId=4
OrchestratorStarted  -                        -        1.6ms     RUNNING    replay cycle start
ExecutionCompleted   -                        5        517.1µs   COMPLETED  execDuration=38.7ms
```

### 与 workflow 交互

#### 引发 external event

如果你的 workflow 正在等待[external event]({{% ref "workflow-patterns.md#external-system-interaction" %}})，你可以引发该事件。
它接受一个参数，格式为 `<instance-id>/<event-name>`。事件名称必须是 workflow 代码等待的名称。JavaScript 和 .NET 示例等待 `ApprovalEvent`，Python 示例等待 `approval_event`，Java 示例等待 `approvalEvent`，Go 示例等待 `manager_approval`。本 Quickstart 中的订单金额为 5000，因此在默认运行中，workflow 不会等待审批事件。

```bash
dapr workflow raise-event e4d3807c/ApprovalEvent \
  --app-id order-processor \
  --input '{"paymentId": "pay-123", "amount": 100.00}'
```

#### 挂起与恢复

```bash
# 挂起 workflow
dapr workflow suspend e4d3807c \
  --app-id order-processor \
  --reason "Waiting for inventory"

# 准备就绪后恢复
dapr workflow resume e4d3807c \
  --app-id order-processor \
  --reason "Inventory received"
```

### 清理

测试完成后，清除已完成的 workflow。

{{% alert title="重要" color="warning" %}}
执行清除操作时，应用程序中必须有正在运行的 Workflow Client。
需要 Workflow Client 连接，以保持 workflow 状态机的完整性并防止数据损坏。
如果出现类似以下的错误，则说明 Workflow Client 未在运行：
```
failed to purge orchestration state: rpc error: code = FailedPrecondition desc = failed to purge orchestration state: failed to lookup actor: api error: code = FailedPrecondition desc = did not find address for actor
```
{{% /alert %}}

```bash
# 清除指定的 workflow
dapr workflow purge e4d3807c --app-id order-processor

# 或清除所有已完成的 workflow
dapr workflow purge --app-id order-processor --all
```

### 使用 Dapr Dev Dashboard

除了 CLI，你还可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 浏览 `OrderProcessingWorkflow` 实例、检查其状态，并深入查看每次执行的事件历史，包括每个 activity 的输入和输出。

<img src="/images/workflow-overview/workflow-diagrid-dashboard.png" width=800 alt="展示本地 workflow 执行情况的 Diagrid Dev Dashboard"/><br/>

## 告诉我们你的看法！

我们会持续改进 Quickstart 示例，并重视你的反馈。你觉得本 Quickstart 有帮助吗？你对改进有什么建议？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 在 Quickstarts 仓库中运行[workflow 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow)（Python、.NET 和 Java）。它们演示了任务链、扇出/扇入、child workflow、监控、外部系统交互、resiliency 与补偿、版本控制、workflow 管理和 history propagation。
- 使用[HTTP 而非 SDK]({{% ref howto-manage-workflow.md %}})，即可用任何编程语言设置 Dapr workflow。
- 浏览一个更深入的 [.NET SDK 示例 workflow](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)。
- 了解更多关于[workflow 作为 Dapr building block]({{% ref workflow-overview %}})的内容。
```

{{< button text="Explore the workflow tutorials  >>" link="https://github.com/dapr/quickstarts/tree/master/tutorials/workflow" >}}
