---
type: docs
title: "快速入门：工作流"
linkTitle: 工作流
weight: 73
description: Dapr 工作流构建块入门
---

{{% alert title="注意" color="primary" %}}
在快速入门中，Redis 目前被用作工作流的状态存储组件。但是，Redis 不支持事务回滚，不应在生产环境中作为 Actor 状态存储使用。
{{% /alert %}}

让我们来了解一下 Dapr [工作流构建块]({{% ref workflow-overview.md %}})。在本快速入门中，你将创建一个简单的控制台应用程序，演示 Dapr 的工作流编程模型和工作流管理 API。

在本指南中，你将：

- 运行 `order-processor` 应用程序。
- 启动工作流并观察工作流活动/任务的执行。
- 查看工作流逻辑以及工作流活动及其在代码中的表示方式。

<img src="/images/workflow-quickstart-overview.png" width=800 style="padding-bottom:15px;">

该工作流包含以下活动：

- `NotifyActivity`：使用记录器在工作流过程中输出消息。
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `RequestApprovalActivity`：请求对超过特定成本阈值的订单进行批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的项目，并使用新的剩余库存值更新存储。

该工作流还包含业务逻辑：
- 如果库存不足，工作流将不会继续进行付款。
- 当订单总成本大于 5000 时，工作流将调用 `RequestApprovalActivity` 并等待外部批准事件。
- 如果订单未获得批准或批准超时，工作流将不会继续进行付款。

<img src="/images/workflow-quickstart-controlflow.png" width=800 style="padding-bottom:15px;">

在继续快速入门之前，请选择你首选的语言特定 Dapr SDK。
{{< tabpane text=true >}}

 <!-- Python -->
{{% tab "Python" %}}

`order-processor` 控制台应用程序启动并管理 `order_processing_workflow`，它模拟从商店购买商品。该工作流由五个独特的工作流活动或任务组成：

- `notify_activity`：使用记录器在工作流过程中输出消息。这些消息会在以下情况下通知你：
  - 你的库存不足
  - 你的付款无法处理等
- `verify_inventory_activity`：检查状态存储以确保有足够的库存可供购买。
- `request_approval_activity`：请求对超过特定成本阈值的订单进行批准。
- `process_payment_activity`：处理并授权付款。
- `update_inventory_activity`：从状态存储中移除所请求的项目，并使用新的剩余库存值更新存储。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/python/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在新的终端窗口中，导航到 `order-processor` 目录：

```bash
cd workflows/python/sdk/order-processor
```

安装 Dapr Python SDK 包：

```bash
pip3 install -r requirements.txt
```

返回到 `python/sdk` 目录：

```bash
cd ..
```


### 步骤 3：运行订单处理应用程序

在终端中，使用 [多应用运行]({{% ref multi-app-dapr-run %}}) 启动订单处理应用程序和 Dapr 边车。从 `python/sdk` 目录，运行以下命令：

```bash
dapr run -f .
```

这将启动具有唯一工作流 ID 的 `order-processor` 应用程序并运行工作流活动。

预期输出：

```bash
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == 2025-02-13 11:44:11.357 durabletask-worker INFO: Starting gRPC worker that connects to dns:127.0.0.1:38891
== APP - order-processor == 2025-02-13 11:44:11.361 durabletask-worker INFO: Successfully connected to dns:127.0.0.1:38891. Waiting for work items...
== APP - order-processor == INFO:NotifyActivity:Received order 6830cb00174544a0b062ba818e14fddc for 1 cars at $5000 !
== APP - order-processor == 2025-02-13 11:44:14.157 durabletask-worker INFO: 6830cb00174544a0b062ba818e14fddc: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:VerifyInventoryActivity:Verifying inventory for order 6830cb00174544a0b062ba818e14fddc of 1 cars
== APP - order-processor == INFO:VerifyInventoryActivity:There are 10 Cars available for purchase
== APP - order-processor == 2025-02-13 11:44:14.171 durabletask-worker INFO: 6830cb00174544a0b062ba818e14fddc: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:ProcessPaymentActivity:Processing payment: 6830cb00174544a0b062ba818e14fddc for 1 cars at 5000 USD
== APP - order-processor == INFO:ProcessPaymentActivity:Payment for request ID 6830cb00174544a0b062ba818e14fddc processed successfully
== APP - order-processor == 2025-02-13 11:44:14.177 durabletask-worker INFO: 6830cb00174544a0b062ba818e14fddc: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:UpdateInventoryActivity:Checking inventory for order 6830cb00174544a0b062ba818e14fddc for 1 cars
== APP - order-processor == INFO:UpdateInventoryActivity:There are now 9 cars left in stock
== APP - order-processor == 2025-02-13 11:44:14.189 durabletask-worker INFO: 6830cb00174544a0b062ba818e14fddc: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:NotifyActivity:Order 6830cb00174544a0b062ba818e14fddc has completed!
== APP - order-processor == 2025-02-13 11:44:14.195 durabletask-worker INFO: 6830cb00174544a0b062ba818e14fddc: Orchestration completed with status: COMPLETED
== APP - order-processor == item: InventoryItem(item_name=Paperclip, per_item_cost=5, quantity=100)
== APP - order-processor == item: InventoryItem(item_name=Cars, per_item_cost=5000, quantity=10)
== APP - order-processor == item: InventoryItem(item_name=Computers, per_item_cost=500, quantity=100)
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == Starting order workflow, purchasing 1 of cars
== APP - order-processor == 2025-02-13 11:44:16.363 durabletask-client INFO: Starting new 'order_processing_workflow' instance with ID = 'fc8a507e4a2246d2917d3ad4e3111240'.
== APP - order-processor == 2025-02-13 11:44:16.366 durabletask-client INFO: Waiting 30s for instance 'fc8a507e4a2246d2917d3ad4e3111240' to complete.
== APP - order-processor == 2025-02-13 11:44:16.366 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:NotifyActivity:Received order fc8a507e4a2246d2917d3ad4e3111240 for 1 cars at $5000 !
== APP - order-processor == 2025-02-13 11:44:16.373 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:VerifyInventoryActivity:Verifying inventory for order fc8a507e4a2246d2917d3ad4e3111240 of 1 cars
== APP - order-processor == INFO:VerifyInventoryActivity:There are 10 Cars available for purchase
== APP - order-processor == 2025-02-13 11:44:16.383 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:ProcessPaymentActivity:Processing payment: fc8a507e4a2246d2917d3ad4e3111240 for 1 cars at 5000 USD
== APP - order-processor == INFO:ProcessPaymentActivity:Payment for request ID fc8a507e4a2246d2917d3ad4e3111240 processed successfully
== APP - order-processor == 2025-02-13 11:44:16.390 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:UpdateInventoryActivity:Checking inventory for order fc8a507e4a2246d2917d3ad4e3111240 for 1 cars
== APP - order-processor == INFO:UpdateInventoryActivity:There are now 9 cars left in stock
== APP - order-processor == 2025-02-13 11:44:16.403 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestrator yielded with 1 task(s) and 0 event(s) outstanding.
== APP - order-processor == INFO:NotifyActivity:Order fc8a507e4a2246d2917d3ad4e3111240 has completed!
== APP - order-processor == 2025-02-13 11:44:16.411 durabletask-worker INFO: fc8a507e4a2246d2917d3ad4e3111240: Orchestration completed with status: COMPLETED
== APP - order-processor == 2025-02-13 11:44:16.425 durabletask-client INFO: Instance 'fc8a507e4a2246d2917d3ad4e3111240' completed.
== APP - order-processor == 2025-02-13 11:44:16.425 durabletask-worker INFO: Stopping gRPC worker...
== APP - order-processor == 2025-02-13 11:44:16.426 durabletask-worker INFO: Disconnected from dns:127.0.0.1:38891
== APP - order-processor == 2025-02-13 11:44:16.426 durabletask-worker INFO: No longer listening for work items
== APP - order-processor == 2025-02-13 11:44:16.426 durabletask-worker INFO: Worker shutdown completed
== APP - order-processor == Workflow completed! Result: {"processed": true, "__durabletask_autoobject__": true}
```

### （可选）步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看工作流跟踪跨度（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上述示例中为 `fc8a507e4a2246d2917d3ad4e3111240`）并调度了工作流。
3. `notify_activity` 工作流活动发送一条通知，说明已收到一辆汽车的订单。
4. `verify_inventory_activity` 工作流活动检查库存数据，确定你是否可以供应订购的项目，并响应库存中的汽车数量。库存充足，因此工作流继续进行。
5. 订单总成本为 5000，因此工作流不会调用 `request_approval_activity` 活动。
6. `process_payment_activity` 工作流活动开始处理订单 `fc8a507e4a2246d2917d3ad4e3111240` 的付款并确认是否成功。
7. `update_inventory_activity` 工作流活动在订单处理后使用当前可用的汽车更新库存。
8. `notify_activity` 工作流活动发送一条通知，说明订单 `fc8a507e4a2246d2917d3ad4e3111240` 已完成。
9. 工作流以完成状态终止，并且 OrderResult 设置为已处理。

#### `order-processor/app.py`

在应用程序的程序文件中：

- 生成唯一的工作流订单 ID
- 调度工作流
- 检索工作流状态
- 注册工作流及其调用的活动

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
        # Wait for the sidecar to become available
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
                print(f'Workflow failed! Status: {state.runtime_status.name}')  # not expected
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

在 `workflow.py` 中，工作流被定义为一个类，其中包含所有相关任务（由工作流活动确定）。

```python
from datetime import timedelta
import logging
import json

from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext, WorkflowRuntime, when_any
from dapr.clients import DaprClient
from dapr.conf import settings

from model import InventoryItem, Notification, InventoryRequest, OrderPayload, OrderResult,\
    PaymentRequest, InventoryResult

store_name = "statestore"

wfr = WorkflowRuntime()

logging.basicConfig(level=logging.INFO)

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
    # Create a logger
    logger = logging.getLogger('NotifyActivity')
    logger.info(input.message)

@wfr.activity(name="process_payment_activity")
def process_payment_activity(ctx: WorkflowActivityContext, input: PaymentRequest):
    """Defines Process Payment Activity.This is used by the workflow to process a payment"""
    logger = logging.getLogger('ProcessPaymentActivity')
    logger.info('Processing payment: '+f'{input.request_id}'+' for '
                +f'{input.quantity}' +' ' +f'{input.item_being_purchased}'+' at '+f'{input.amount}'
                +' USD')
    logger.info(f'Payment for request ID {input.request_id} processed successfully')

@wfr.activity(name="verify_inventory_activity")
def verify_inventory_activity(ctx: WorkflowActivityContext,
                              input: InventoryRequest) -> InventoryResult:
    """Defines Verify Inventory Activity. This is used by the workflow to verify if inventory
    is available for the order"""
    logger = logging.getLogger('VerifyInventoryActivity')

    logger.info('Verifying inventory for order '+f'{input.request_id}'+' of '
                +f'{input.quantity}' +' ' +f'{input.item_name}')
    with DaprClient(f'{settings.DAPR_RUNTIME_HOST}:{settings.DAPR_GRPC_PORT}') as client:
        result = client.get_state(store_name, input.item_name)
    if result.data is None:
        return InventoryResult(False, None)
    res_json=json.loads(str(result.data.decode('utf-8')))
    logger.info(f'There are {res_json["quantity"]} {res_json["name"]} available for purchase')
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
    logger = logging.getLogger('UpdateInventoryActivity')

    logger.info('Checking inventory for order ' +f'{input.request_id}'+' for '
                +f'{input.quantity}' +' ' +f'{input.item_being_purchased}')
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
        logger.info(f'There are now {new_quantity} {input.item_being_purchased} left in stock')

@wfr.activity(name="request_approval_activity")
def request_approval_activity(ctx: WorkflowActivityContext,
                             input: OrderPayload):
    """Defines Request Approval Activity. This is used by the workflow to request approval
    for payment of an order. This activity is used only if the order total cost is greater than
    a particular threshold"""
    logger = logging.getLogger('RequestApprovalActivity')

    logger.info('Requesting approval for payment of '+f'{input["total_cost"]}'+' USD for '
                +f'{input["quantity"]}' +' ' +f'{input["item_name"]}')
```
{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

`order-processor` 控制台应用程序启动并管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。该工作流由四个工作流活动或任务组成：

- `notifyActivity`：使用记录器在工作流过程中输出消息。这些消息会在库存不足、付款无法处理等情况时通知用户。
- `verifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `requestApprovalActivity`：请求对超过特定阈值的订单进行批准。
- `processPaymentActivity`：处理并授权付款。
- `updateInventoryActivity`：使用新的剩余库存值更新状态存储。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在新的终端窗口中，导航到 `order-processor` 目录：

```bash
cd workflows/javascript/sdk/order-processor
```

安装依赖项：

```bash
cd ./javascript/sdk
npm install
npm run build
```

### 步骤 3：运行订单处理应用程序

在终端中，使用 [多应用运行]({{% ref multi-app-dapr-run %}}) 启动订单处理应用程序和 Dapr 边车。从 `javascript/sdk` 目录，运行以下命令：

```bash
dapr run -f .
```

这将启动具有唯一工作流 ID 的 `order-processor` 应用程序并运行工作流活动。

预期输出：

```log
== APP - order-processor == Starting new orderProcessingWorkflow instance with ID = f5087775-779c-4e73-ac77-08edfcb375f4
== APP - order-processor == Orchestration scheduled with ID: f5087775-779c-4e73-ac77-08edfcb375f4
== APP - order-processor == Waiting 30 seconds for instance f5087775-779c-4e73-ac77-08edfcb375f4 to complete...
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 0 history event...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, EXECUTIONSTARTED=1]
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Received "Activity Request" work item
== APP - order-processor == Received order f5087775-779c-4e73-ac77-08edfcb375f4 for 1 car at a total cost of 5000
== APP - order-processor == Activity notifyActivity completed with output undefined (0 chars)
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 3 history event...
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Received "Activity Request" work item
== APP - order-processor == Verifying inventory for f5087775-779c-4e73-ac77-08edfcb375f4 of 1 car
== APP - order-processor == 2025-02-13T10:33:21.622Z INFO [HTTPClient, HTTPClient] Sidecar Started
== APP - order-processor == There are 10 car in stock
== APP - order-processor == Activity verifyInventoryActivity completed with output {"success":true,"inventoryItem":{"itemName":"car","perItemCost":5000,"quantity":10}} (84 chars)
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 6 history event...
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Received "Activity Request" work item
== APP - order-processor == Processing payment for order car
== APP - order-processor == Payment of 5000 for 1 car processed successfully
== APP - order-processor == Activity processPaymentActivity completed with output true (4 chars)
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 9 history event...
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Received "Activity Request" work item
== APP - order-processor == Updating inventory for f5087775-779c-4e73-ac77-08edfcb375f4 of 1 car
== APP - order-processor == Inventory updated for f5087775-779c-4e73-ac77-08edfcb375f4, there are now 9 car in stock
== APP - order-processor == Activity updateInventoryActivity completed with output {"success":true,"inventoryItem":{"itemName":"car","perItemCost":5000,"quantity":9}} (83 chars)
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 12 history event...
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Waiting for 1 task(s) and 0 event(s) to complete...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Received "Activity Request" work item
== APP - order-processor == order f5087775-779c-4e73-ac77-08edfcb375f4 processed successfully!
== APP - order-processor == Activity notifyActivity completed with output undefined (0 chars)
== APP - order-processor == Received "Orchestrator Request" work item with instance id 'f5087775-779c-4e73-ac77-08edfcb375f4'
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Rebuilding local state with 15 history event...
== APP - order-processor == Processing order f5087775-779c-4e73-ac77-08edfcb375f4...
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Processing 2 new history event(s): [ORCHESTRATORSTARTED=1, TASKCOMPLETED=1]
== APP - order-processor == Order f5087775-779c-4e73-ac77-08edfcb375f4 processed successfully!
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Orchestration completed with status COMPLETED
== APP - order-processor == f5087775-779c-4e73-ac77-08edfcb375f4: Returning 1 action(s)
== APP - order-processor == Instance f5087775-779c-4e73-ac77-08edfcb375f4 completed
== APP - order-processor == Orchestration completed! Result: {"processed":true}
```

### （可选）步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看工作流跟踪跨度（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 为工作流生成了一个唯一的订单 ID（在上述示例中为 `f5087775-779c-4e73-ac77-08edfcb375f4`）并调度了工作流。
2. `notifyActivity` 工作流活动发送一条通知，说明已收到 1 辆汽车的订单。
3. `verifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以供应订购的项目，并响应库存中的汽车数量。
4. 你的工作流启动并通知你其状态。
5. `requestApprovalActivity` 工作流活动请求对订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 的批准
6. `processPaymentActivity` 工作流活动开始处理订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 的付款并确认是否成功。
7. `updateInventoryActivity` 工作流活动在订单处理后使用当前可用的汽车更新库存。
8. `notifyActivity` 工作流活动发送一条通知，说明订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 已完成并已处理。
9. 工作流以完成和已处理状态终止。

#### `order-processor/app.ts`

在应用程序文件中：

- 生成唯一的工作流订单 ID
- 调度工作流
- 检索工作流状态
- 注册工作流及其调用的活动

```javascript
import { DaprWorkflowClient, WorkflowRuntime, DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";
import { InventoryItem, OrderPayload } from "./model";
import { notifyActivity, orderProcessingWorkflow, processPaymentActivity, requestApprovalActivity, verifyInventoryActivity as verifyInventoryActivity, updateInventoryActivity } from "./orderProcessingWorkflow";

const workflowWorker = new WorkflowRuntime();

async function start() {
  // Update the gRPC client and worker to use a local address and port
  const workflowClient = new DaprWorkflowClient();


  const daprHost = process.env.DAPR_HOST ?? "127.0.0.1";
  const daprPort = process.env.DAPR_GRPC_PORT ?? "50001";

  const daprClient = new DaprClient({
    daprHost,
    daprPort,
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  const storeName = "statestore";

  const inventory = new InventoryItem("car", 5000, 10);
  const key = inventory.itemName;

  await daprClient.state.save(storeName, [
    {
      key: key,
      value: inventory,
    }
  ]);

  const order = new OrderPayload("car", 5000, 1);

  workflowWorker
  .registerWorkflow(orderProcessingWorkflow)
  .registerActivity(notifyActivity)
  .registerActivity(verifyInventoryActivity)
  .registerActivity(requestApprovalActivity)
  .registerActivity(processPaymentActivity)
  .registerActivity(updateInventoryActivity);

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await workflowWorker.start();
    console.log("Workflow runtime started successfully");
  } catch (error) {
    console.error("Error starting workflow runtime:", error);
  }

  // Schedule a new orchestration
  try {
    const id = await workflowClient.scheduleNewWorkflow(orderProcessingWorkflow, order);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // Wait for orchestration completion
    const state = await workflowClient.waitForWorkflowCompletion(id, undefined, 30);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
    throw error;
  }

  await workflowClient.stop();
}

process.on('SIGTERM', () => {
  workflowWorker.stop();
})

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

#### `order-processor/orderProcessingWorkflow.ts`

在 `orderProcessingWorkflow.ts` 中，工作流被定义为一个类，其中包含所有相关任务（由工作流活动确定）。

```javascript
import { Task, WorkflowActivityContext, WorkflowContext, TWorkflow, DaprClient } from "@dapr/dapr";
import { InventoryItem, InventoryRequest, InventoryResult, OrderNotification, OrderPayload, OrderPaymentRequest, OrderResult } from "./model";

const daprClient = new DaprClient();
const storeName = "statestore";

// Defines Notify Activity. This is used by the workflow to send out a notification
export const notifyActivity = async (_: WorkflowActivityContext, orderNotification: OrderNotification) => {
  console.log(orderNotification.message);
  return;
};

//Defines Verify Inventory Activity. This is used by the workflow to verify if inventory is available for the order
export const verifyInventoryActivity = async (_: WorkflowActivityContext, inventoryRequest: InventoryRequest) => {
  console.log(`Verifying inventory for ${inventoryRequest.requestId} of ${inventoryRequest.quantity} ${inventoryRequest.itemName}`);
  const result = await daprClient.state.get(storeName, inventoryRequest.itemName);
  if (result == undefined || result == null) {
    return new InventoryResult(false, undefined);
  }
  const inventoryItem = result as InventoryItem;
  console.log(`There are ${inventoryItem.quantity} ${inventoryItem.itemName} in stock`);

  if (inventoryItem.quantity >= inventoryRequest.quantity) {
    return new InventoryResult(true, inventoryItem)
  }
  return new InventoryResult(false, undefined);
}

export const requestApprovalActivity = async (_: WorkflowActivityContext, orderPayLoad: OrderPayload) => {
  console.log(`Requesting approval for order ${orderPayLoad.itemName}`);
  return true;
}

export const processPaymentActivity = async (_: WorkflowActivityContext, orderPaymentRequest: OrderPaymentRequest) => {
  console.log(`Processing payment for order ${orderPaymentRequest.itemBeingPurchased}`);
  console.log(`Payment of ${orderPaymentRequest.amount} for ${orderPaymentRequest.quantity} ${orderPaymentRequest.itemBeingPurchased} processed successfully`);
  return true;
}

export const updateInventoryActivity = async (_: WorkflowActivityContext, inventoryRequest: InventoryRequest) => {
  console.log(`Updating inventory for ${inventoryRequest.requestId} of ${inventoryRequest.quantity} ${inventoryRequest.itemName}`);
  const result = await daprClient.state.get(storeName, inventoryRequest.itemName);
  if (result == undefined || result == null) {
    return new InventoryResult(false, undefined);
  }
  const inventoryItem = result as InventoryItem;
  inventoryItem.quantity = inventoryItem.quantity - inventoryRequest.quantity;
  if (inventoryItem.quantity < 0) {
    console.log(`Insufficient inventory for ${inventoryRequest.requestId} of ${inventoryRequest.quantity} ${inventoryRequest.itemName}`);
    return new InventoryResult(false, undefined);
  }
  await daprClient.state.save(storeName, [
    {
      key: inventoryRequest.itemName,
      value: inventoryItem,
    }
  ]);
  console.log(`Inventory updated for ${inventoryRequest.requestId}, there are now ${inventoryItem.quantity} ${inventoryItem.itemName} in stock`);
  return new InventoryResult(true, inventoryItem);
}

export const orderProcessingWorkflow: TWorkflow = async function* (ctx: WorkflowContext, orderPayLoad: OrderPayload): any {
  const orderId = ctx.getWorkflowInstanceId();
  console.log(`Processing order ${orderId}...`);

  const orderNotification: OrderNotification = {
    message: `Received order ${orderId} for ${orderPayLoad.quantity} ${orderPayLoad.itemName} at a total cost of ${orderPayLoad.totalCost}`,
  };
  yield ctx.callActivity(notifyActivity, orderNotification);

  const inventoryRequest = new InventoryRequest(orderId, orderPayLoad.itemName, orderPayLoad.quantity);
  const inventoryResult = yield ctx.callActivity(verifyInventoryActivity, inventoryRequest);

  if (!inventoryResult.success) {
    const orderNotification: OrderNotification = {
      message: `Insufficient inventory for order ${orderId}`,
    };
    yield ctx.callActivity(notifyActivity, orderNotification);
    return new OrderResult(false);
  }

  if (orderPayLoad.totalCost > 5000) {
    yield ctx.callActivity(requestApprovalActivity, orderPayLoad);
    
    const tasks: Task<any>[] = [];
    const approvalEvent = ctx.waitForExternalEvent("approval_event");
    tasks.push(approvalEvent);
    const timeOutEvent = ctx.createTimer(30);
    tasks.push(timeOutEvent);
    const winner = ctx.whenAny(tasks);

    if (winner == timeOutEvent) {
      const orderNotification: OrderNotification = {
        message: `Order ${orderId} has been cancelled due to approval timeout.`,
      };
      yield ctx.callActivity(notifyActivity, orderNotification);
      return new OrderResult(false);
    }
    const approvalResult = approvalEvent.getResult();
    if (!approvalResult) {
      const orderNotification: OrderNotification = {
        message: `Order ${orderId} was not approved.`,
      };
      yield ctx.callActivity(notifyActivity, orderNotification);
      return new OrderResult(false);
    }
  }

  const orderPaymentRequest = new OrderPaymentRequest(orderId, orderPayLoad.itemName, orderPayLoad.totalCost, orderPayLoad.quantity);
  const paymentResult = yield ctx.callActivity(processPaymentActivity, orderPaymentRequest);

  if (!paymentResult) {
    const orderNotification: OrderNotification = {
      message: `Payment for order ${orderId} failed`,
    };
    yield ctx.callActivity(notifyActivity, orderNotification);
    return new OrderResult(false);
  }

  const updatedResult = yield ctx.callActivity(updateInventoryActivity, inventoryRequest);
  if (!updatedResult.success) {
    const orderNotification: OrderNotification = {
      message: `Failed to update inventory for order ${orderId}`,
    };
    yield ctx.callActivity(notifyActivity, orderNotification);
    return new OrderResult(false);
  }

  const orderCompletedNotification: OrderNotification = {
    message: `order ${orderId} processed successfully!`,
  };
  yield ctx.callActivity(notifyActivity, orderCompletedNotification);

  console.log(`Order ${orderId} processed successfully!`);
  return new OrderResult(true);
}
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

`order-processor` 控制台应用程序启动并管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。该工作流由四个工作流活动或任务组成：

- `NotifyActivity`：使用记录器在工作流过程中输出消息
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `RequestApprovalActivity`：请求对超过特定阈值的订单进行批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的项目，并使用新的剩余库存值更新存储。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 7](https://dotnet.microsoft.com/download/dotnet/7.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：**.NET 7 是 Dapr v1.15 中 Dapr.Workflows 支持的最低 .NET 版本。在 Dapr v1.16 及更高版本中，仅支持 .NET 8 和 .NET 9。

### 步骤 2：设置环境

克隆 [快速入门仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在新的终端窗口中，导航到 `order-processor` 目录：

```bash
cd workflows/csharp/sdk/order-processor
```

安装依赖项：

```bash
dotnet restore
dotnet build
```

返回到 `csharp/sdk` 目录：

```bash
cd ..
```

### 步骤 3：运行订单处理应用程序

在终端中，使用 [多应用运行]({{% ref multi-app-dapr-run %}}) 启动订单处理应用程序和 Dapr 边车。从 `csharp/sdk` 目录，运行以下命令：

```bash
dapr run -f .
```

这将启动具有唯一工作流 ID 的 `order-processor` 应用程序并运行工作流活动。

预期输出：

```
== APP - order-processor == Starting workflow 571a6e25 purchasing 1 Cars
== APP - order-processor == info: Microsoft.DurableTask.Client.Grpc.GrpcDurableTaskClient[40]
== APP - order-processor ==       Scheduling new OrderProcessingWorkflow orchestration with instance ID '571a6e25' and 45 bytes of input data.
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/StartInstance
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/StartInstance
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 3045.9209ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 3046.0945ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 3016.1346ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 3016.3572ms - 200
== APP - order-processor == info: Microsoft.DurableTask.Client.Grpc.GrpcDurableTaskClient[42]
== APP - order-processor ==       Waiting for instance '571a6e25' to start.
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/WaitForInstanceStart
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/WaitForInstanceStart
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 2.9095ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 3.0445ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 99.446ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 99.5407ms - 200
== APP - order-processor == Your workflow has started. Here is the status of the workflow: Running
== APP - order-processor == info: Microsoft.DurableTask.Client.Grpc.GrpcDurableTaskClient[43]
== APP - order-processor ==       Waiting for instance '571a6e25' to complete, fail, or terminate.
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/WaitForInstanceCompletion
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/WaitForInstanceCompletion
== APP - order-processor == info: WorkflowConsoleApp.Activities.NotifyActivity[1985924262]
== APP - order-processor ==       Presenting notification Notification { Message = Received order 571a6e25 for 1 Cars at $5000 }
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 1.6785ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 1.7869ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[2013970020]
== APP - order-processor ==       Received request ID '571a6e25' for 1 Cars at $5000
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 1.1947ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 1.3293ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Activities.VerifyInventoryActivity[1478802116]
== APP - order-processor ==       Reserving inventory for order request ID '571a6e25' of 1 Cars
== APP - order-processor == info: WorkflowConsoleApp.Activities.VerifyInventoryActivity[1130866279]
== APP - order-processor ==       There are: 10 Cars available for purchase
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 1.8534ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 2.0077ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[1162731597]
== APP - order-processor ==       Checked inventory for request ID 'InventoryRequest { RequestId = 571a6e25, ItemName = Cars, Quantity = 1 }'
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 1.1851ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 1.3742ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Activities.ProcessPaymentActivity[340284070]
== APP - order-processor ==       Processing payment: request ID '571a6e25' for 1 Cars at $5000
== APP - order-processor == info: WorkflowConsoleApp.Activities.ProcessPaymentActivity[1851315765]
== APP - order-processor ==       Payment for request ID '571a6e25' processed successfully
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 0.8249ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 0.9595ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[340284070]
== APP - order-processor ==       Processed payment request as there's sufficient inventory to proceed: PaymentRequest { RequestId = 571a6e25, ItemBeingPurchased = Cars, Amount = 1, Currency = 5000 }
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 0.4457ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 0.5267ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Activities.UpdateInventoryActivity[2144991393]
== APP - order-processor ==       Checking inventory for request ID '571a6e25' for 1 Cars
== APP - order-processor == info: WorkflowConsoleApp.Activities.UpdateInventoryActivity[1901852920]
== APP - order-processor ==       There are now 9 Cars left in stock
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 0.6012ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 0.7097ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[96138418]
== APP - order-processor ==       Updating available inventory for PaymentRequest { RequestId = 571a6e25, ItemBeingPurchased = Cars, Amount = 1, Currency = 5000 }
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 0.469ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 0.5431ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Activities.NotifyActivity[1985924262]
== APP - order-processor ==       Presenting notification Notification { Message = Order 571a6e25 has completed! }
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteActivityTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 0.494ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 0.5685ms - 200
== APP - order-processor == info: WorkflowConsoleApp.Workflows.OrderProcessingWorkflow[510392223]
== APP - order-processor ==       Order 571a6e25 has completed
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[100]
== APP - order-processor ==       Start processing HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[100]
== APP - order-processor ==       Sending HTTP request POST http://localhost:37355/TaskHubSidecarService/CompleteOrchestratorTask
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 1.6353ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 1.7546ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.ClientHandler[101]
== APP - order-processor ==       Received HTTP response headers after 15807.213ms - 200
== APP - order-processor == info: System.Net.Http.HttpClient.Default.LogicalHandler[101]
== APP - order-processor ==       End processing HTTP request after 15807.3675ms - 200
== APP - order-processor == Workflow Status: Completed
```

### （可选）步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看工作流跟踪跨度（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上述示例中为 `571a6e25`）并调度了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到一辆汽车的订单。
4. `VerifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以供应订购的项目，并响应库存中的汽车数量。库存充足，因此工作流继续进行。
5. 订单总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `571a6e25` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动在订单处理后使用当前可用的汽车更新库存。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `571a6e25` 已完成。
9. 工作流以完成状态终止，并且 OrderResult 设置为已处理。

#### `order-processor/Program.cs`

在应用程序的程序文件中：

- 生成唯一的工作流订单 ID
- 调度工作流
- 检索工作流状态
- 注册工作流及其调用的活动

```csharp
using Dapr.Client;
using Dapr.Workflow;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using WorkflowConsoleApp.Activities;
using WorkflowConsoleApp.Models;
using WorkflowConsoleApp.Workflows;

const string storeName = "statestore";

// The workflow host is a background service that connects to the sidecar over gRPC
var builder = Host.CreateDefaultBuilder(args).ConfigureServices(services =>
{
    services.AddDaprClient();
    services.AddDaprWorkflow(options =>
    {
        // Note that it's also possible to register a lambda function as the workflow
        // or activity implementation instead of a class.
        options.RegisterWorkflow<OrderProcessingWorkflow>();

        // These are the activities that get invoked by the workflow(s).
        options.RegisterActivity<NotifyActivity>();
        options.RegisterActivity<VerifyInventoryActivity>();
        options.RegisterActivity<RequestApprovalActivity>();
        options.RegisterActivity<ProcessPaymentActivity>();
        options.RegisterActivity<UpdateInventoryActivity>();
    });
});

// Start the app - this is the point where we connect to the Dapr sidecar
using var host = builder.Build();
host.Start();

var daprClient = host.Services.GetRequiredService<DaprClient>();
var workflowClient = host.Services.GetRequiredService<DaprWorkflowClient>();

// Generate a unique ID for the workflow
var orderId = Guid.NewGuid().ToString()[..8];
const string itemToPurchase = "Cars";
const int amountToPurchase = 1;

// Populate the store with items
RestockInventory(itemToPurchase);

// Construct the order
var orderInfo = new OrderPayload(itemToPurchase, 5000, amountToPurchase);

// Start the workflow
Console.WriteLine($"Starting workflow {orderId} purchasing {amountToPurchase} {itemToPurchase}");

await workflowClient.ScheduleNewWorkflowAsync(
    name: nameof(OrderProcessingWorkflow),
    instanceId: orderId,
    input: orderInfo);

// Wait for the workflow to start and confirm the input
var state = await workflowClient.WaitForWorkflowStartAsync(
    instanceId: orderId);

Console.WriteLine($"Your workflow has started. Here is the status of the workflow: {Enum.GetName(typeof(WorkflowRuntimeStatus), state.RuntimeStatus)}");

// Wait for the workflow to complete
state = await workflowClient.WaitForWorkflowCompletionAsync(
    instanceId: orderId);

Console.WriteLine("Workflow Status: {0}", Enum.GetName(typeof(WorkflowRuntimeStatus), state.RuntimeStatus));
return;

void RestockInventory(string itemToPurchase)
{
    daprClient.SaveStateAsync(storeName, itemToPurchase, new OrderPayload(Name: itemToPurchase, TotalCost: 50000, Quantity: 10));
}

```

#### `order-processor/Workflows/OrderProcessingWorkflow.cs`

在 `OrderProcessingWorkflow.cs` 中，工作流被定义为一个类，其中包含所有相关任务（由单独文件中的工作流活动确定）。

```csharp
namespace WorkflowConsoleApp.Workflows;

using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using Dapr.Workflow;
using DurableTask.Core.Exceptions;
using Activities;
using Models;

internal sealed partial class OrderProcessingWorkflow : Workflow<OrderPayload, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderPayload order)
    {
        var logger = context.CreateReplaySafeLogger<OrderProcessingWorkflow>();
        var orderId = context.InstanceId;

        // Notify the user that an order has come through
        await context.CallActivityAsync(nameof(NotifyActivity),
            new Notification($"Received order {orderId} for {order.Quantity} {order.Name} at ${order.TotalCost}"));
        LogOrderReceived(logger, orderId, order.Quantity, order.Name, order.TotalCost);

        // Determine if there is enough of the item available for purchase by checking the inventory
        var inventoryRequest = new InventoryRequest(RequestId: orderId, order.Name, order.Quantity);
        var result = await context.CallActivityAsync<InventoryResult>(
            nameof(VerifyInventoryActivity), inventoryRequest);
        LogCheckInventory(logger, inventoryRequest);
            
        // If there is insufficient inventory, fail and let the user know 
        if (!result.Success)
        {
            // End the workflow here since we don't have sufficient inventory
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

        // There is enough inventory available so the user can purchase the item(s). Process their payment
        var processPaymentRequest = new PaymentRequest(RequestId: orderId, order.Name, order.Quantity, order.TotalCost);
        await context.CallActivityAsync(nameof(ProcessPaymentActivity),processPaymentRequest);
        LogPaymentProcessing(logger, processPaymentRequest);

        try
        {
            // Update the available inventory
            var paymentRequest = new PaymentRequest(RequestId: orderId, order.Name, order.Quantity, order.TotalCost); 
            await context.CallActivityAsync(nameof(UpdateInventoryActivity), paymentRequest);
            LogInventoryUpdate(logger, paymentRequest);
        }
        catch (TaskFailedException)
        {
            // Let them know their payment was processed, but there's insufficient inventory, so they're getting a refund
            await context.CallActivityAsync(nameof(NotifyActivity),
                new Notification($"Order {orderId} Failed! You are now getting a refund"));
            LogRefund(logger, orderId);
            return new OrderResult(Processed: false);
        }

        // Let them know their payment was processed
        await context.CallActivityAsync(nameof(NotifyActivity), new Notification($"Order {orderId} has completed!"));
        LogSuccessfulOrder(logger, orderId);

        // End the workflow with a success result
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

`Activities` 目录保存工作流使用的四个活动，在以下文件中定义：

- `NotifyActivity.cs`
- `VerifyInventoryActivity.cs`
- `RequestApprovalActivity.cs`
- `ProcessPaymentActivity.cs`
- `UpdateInventoryActivity.cs`

## 观看演示

观看 [此视频以演示 Dapr Workflow .NET 演示](https://youtu.be/BxiKpEmchgQ?t=2564)：

{{< youtube id=BxiKpEmchgQ start=2564 >}}

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

`order-processor` 控制台应用程序启动并管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。该工作流由四个工作流活动或任务组成：

- `NotifyActivity`：使用记录器在工作流过程中输出消息。
- `RequestApprovalActivity`：请求对超过特定成本阈值的订单进行批准。
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的项目，并使用新的剩余库存值更新存储。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
    - [Microsoft JDK 17](https://docs.microsoft.com/java/openjdk/download#openjdk-17)
    - [Oracle JDK 17](https://www.oracle.com/technetwork/java/javase/downloads/index.html#JDK17)
    - [OpenJDK 17](https://jdk.java.net/17/)
- [Apache Maven](https://maven.apache.org/install.html) 版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

导航到 `order-processor` 目录：

```bash
cd workflows/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

返回到 `java/sdk` 目录：

```bash
cd ..
```

### 步骤 3：运行订单处理应用程序

在终端中，使用 [多应用运行]({{% ref multi-app-dapr-run %}}) 启动订单处理应用程序和 Dapr 边车。从 `java/sdk` 目录，运行以下命令：

```bash
cd workflows/java/sdk
dapr run -f .
```

这将启动具有唯一工作流 ID 的 `order-processor` 应用程序并运行工作流活动。

预期输出：

```
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Workflow: OrderProcessingWorkflow
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Activity: NotifyActivity
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Activity: ProcessPaymentActivity
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Activity: RequestApprovalActivity
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Activity: VerifyInventoryActivity
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Registered Activity: UpdateInventoryActivity
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - List of registered workflows: [io.dapr.quickstarts.workflows.OrderProcessingWorkflow]
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - List of registered activites: [io.dapr.quickstarts.workflows.activities.NotifyActivity, io.dapr.quickstarts.workflows.activities.UpdateInventoryActivity, io.dapr.quickstarts.workflows.activities.ProcessPaymentActivity, io.dapr.quickstarts.workflows.activities.RequestApprovalActivity, io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity]
== APP - order-processor == [main] INFO io.dapr.workflows.runtime.WorkflowRuntimeBuilder - Successfully built dapr workflow runtime
== APP - order-processor == Start workflow runtime
== APP - order-processor == Feb 12, 2025 2:44:13 PM com.microsoft.durabletask.DurableTaskGrpcWorker startAndBlock
== APP - order-processor == INFO: Durable Task worker is connecting to sidecar at 127.0.0.1:39261.
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == Starting order workflow, purchasing 1 of cars
== APP - order-processor == scheduled new workflow instance of OrderProcessingWorkflow with instance ID: d1bf548b-c854-44af-978e-90c61ed88e3c
== APP - order-processor == [Thread-0] INFO io.dapr.workflows.WorkflowContext - Starting Workflow: io.dapr.quickstarts.workflows.OrderProcessingWorkflow
== APP - order-processor == [Thread-0] INFO io.dapr.workflows.WorkflowContext - Instance ID(order ID): d1bf548b-c854-44af-978e-90c61ed88e3c
== APP - order-processor == [Thread-0] INFO io.dapr.workflows.WorkflowContext - Current Orchestration Time: 2025-02-12T14:44:18.154Z
== APP - order-processor == [Thread-0] INFO io.dapr.workflows.WorkflowContext - Received Order: OrderPayload [itemName=cars, totalCost=5000, quantity=1]
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.NotifyActivity - Received Order: OrderPayload [itemName=cars, totalCost=5000, quantity=1]
== APP - order-processor == workflow instance d1bf548b-c854-44af-978e-90c61ed88e3c started
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity - Verifying inventory for order 'd1bf548b-c854-44af-978e-90c61ed88e3c' of 1 cars
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity - There are 10 cars available for purchase
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.VerifyInventoryActivity - Verified inventory for order 'd1bf548b-c854-44af-978e-90c61ed88e3c' of 1 cars
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.ProcessPaymentActivity - Processing payment: d1bf548b-c854-44af-978e-90c61ed88e3c for 1 cars at $5000
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.ProcessPaymentActivity - Payment for request ID 'd1bf548b-c854-44af-978e-90c61ed88e3c' processed successfully
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.UpdateInventoryActivity - Updating inventory for order 'd1bf548b-c854-44af-978e-90c61ed88e3c' of 1 cars
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.UpdateInventoryActivity - Updated inventory for order 'd1bf548b-c854-44af-978e-90c61ed88e3c': there are now 9 cars left in stock
== APP - order-processor == there are now 9 cars left in stock
== APP - order-processor == [Thread-0] INFO io.dapr.quickstarts.workflows.activities.NotifyActivity - Order completed! : d1bf548b-c854-44af-978e-90c61ed88e3c
== APP - order-processor == workflow instance completed, out is: {"processed":true}
```

### （可选）步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看工作流跟踪跨度（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上述示例中为 `d1bf548b-c854-44af-978e-90c61ed88e3c`）并调度了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到一辆汽车的订单。
4. `VertifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以供应订购的项目，并响应库存中的汽车数量。库存充足，因此工作流继续进行。
5. 订单总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `d1bf548b-c854-44af-978e-90c61ed88e3c` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动在订单处理后使用当前可用的汽车更新库存。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `d1bf548b-c854-44af-978e-90c61ed88e3c` 已完成。
9. 工作流以完成状态终止，并且 orderResult 设置为已处理。

#### `order-processor/WorkflowConsoleApp.java` 

在应用程序的程序文件中：
- 生成唯一的工作流订单 ID
- 调度工作流
- 检索工作流状态
- 注册工作流及其调用的活动

```java
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
    // Wait for the sidecar to become available
    Thread.sleep(5 * 1000);

    // Register the OrderProcessingWorkflow and its activities with the builder.
    WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder().registerWorkflow(OrderProcessingWorkflow.class);
    builder.registerActivity(NotifyActivity.class);
    builder.registerActivity(ProcessPaymentActivity.class);
    builder.registerActivity(RequestApprovalActivity.class);
    builder.registerActivity(VerifyInventoryActivity.class);
    builder.registerActivity(UpdateInventoryActivity.class);

    // Build and then start the workflow runtime pulling and executing tasks
    try (WorkflowRuntime runtime = builder.build()) {
      System.out.println("Start workflow runtime");
      runtime.start(false);
    }

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
    int totalcost = orderQuantity * inventory.getPerItemCost();
    OrderPayload order = new OrderPayload();
    order.setItemName(itemName);
    order.setQuantity(orderQuantity);
    order.setTotalCost(totalcost);
    System.out.println("Starting order workflow, purchasing " + orderQuantity + " of " + itemName);

    String instanceId = workflowClient.scheduleNewWorkflow(OrderProcessingWorkflow.class, order);
    System.out.printf("scheduled new workflow instance of OrderProcessingWorkflow with instance ID: %s%n",
        instanceId);

    try {
      workflowClient.waitForInstanceStart(instanceId, Duration.ofSeconds(10), false);
      System.out.printf("workflow instance %s started%n", instanceId);
    } catch (TimeoutException e) {
      System.out.printf("workflow instance %s did not start within 10 seconds%n", instanceId);
      return;
    }

    try {
      WorkflowInstanceStatus workflowStatus = workflowClient.waitForInstanceCompletion(instanceId,
          Duration.ofSeconds(30),
          true);
      if (workflowStatus != null) {
        System.out.printf("workflow instance completed, out is: %s%n",
            workflowStatus.getSerializedOutput());
      } else {
        System.out.printf("workflow instance %s not found%n", instanceId);
      }
    } catch (TimeoutException e) {
      System.out.printf("workflow instance %s did not complete within 30 seconds%n", instanceId);
    }

  }

  private static InventoryItem prepareInventoryAndOrder() {
    // prepare 10 cars in inventory
    InventoryItem inventory = new InventoryItem();
    inventory.setName("cars");
    inventory.setPerItemCost(50000);
    inventory.setQuantity(10);
    DaprClient daprClient = new DaprClientBuilder().build();
    restockInventory(daprClient, inventory);

    // prepare order for 10 cars
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

在 `OrderProcessingWorkflow.java` 中，工作流被定义为一个类，其中包含所有相关任务（由工作流活动确定）。

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

public class OrderProcessingWorkflow extends Workflow {

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

      // Notify the user that an order has come through
      Notification notification = new Notification();
      notification.setMessage("Received Order: " + order.toString());
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // Determine if there is enough of the item available for purchase by checking
      // the inventory
      InventoryRequest inventoryRequest = new InventoryRequest();
      inventoryRequest.setRequestId(orderId);
      inventoryRequest.setItemName(order.getItemName());
      inventoryRequest.setQuantity(order.getQuantity());
      InventoryResult inventoryResult = ctx.callActivity(VerifyInventoryActivity.class.getName(),
          inventoryRequest, InventoryResult.class).await();

      // If there is insufficient inventory, fail and let the user know
      if (!inventoryResult.isSuccess()) {
        notification.setMessage("Insufficient inventory for order : " + order.getItemName());
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // Require orders over a certain threshold to be approved
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

      // There is enough inventory available so the user can purchase the item(s).
      // Process their payment
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
        // If there is an error updating the inventory, refund the user
        // paymentRequest.setAmount(-1 * paymentRequest.getAmount());
        // ctx.callActivity(ProcessPaymentActivity.class.getName(),
        // paymentRequest).await();

        // Let users know their payment processing failed
        notification.setMessage("Order failed to update inventory! : " + orderId);
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // Let user know their order was processed
      notification.setMessage("Order completed! : " + orderId);
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // Complete the workflow with order result is processed
      orderResult.setProcessed(true);
      ctx.complete(orderResult);
    };
  }

}
```

#### `activities` 目录

`Activities` 目录保存工作流使用的四个活动，在以下文件中定义：
- [`NotifyActivity.java`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/NotifyActivity.java)
- [`RequestApprovalActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/RequestApprovalActivity.java)
- [`ReserveInventoryActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/VerifyInventoryActivity.java)
- [`ProcessPaymentActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/ProcessPaymentActivity.java)
- [`UpdateInventoryActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/UpdateInventoryActivity.java)

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

`order-processor` 控制台应用程序启动并管理 `OrderProcessingWorkflow` 工作流，它模拟从商店购买商品。该工作流由五个独特的工作流活动或任务组成：

- `NotifyActivity`：使用记录器在工作流过程中输出消息。这些消息会在以下情况下通知你：
  - 你的库存不足
  - 你的付款无法处理等
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `RequestApprovalActivity`：请求对超过特定成本阈值的订单进行批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的项目，并使用新的剩余库存值更新存储。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在新的终端窗口中，导航到 `sdk` 目录：

```bash
cd workflows/go/sdk
```

### 步骤 3：运行订单处理应用程序

在终端中，使用 [多应用运行]({{% ref multi-app-dapr-run %}}) 启动订单处理应用程序和 Dapr 边车。从 `go/sdk` 目录，运行以下命令：

```bash
dapr run -f .
```

这将启动具有唯一工作流 ID 的 `order-processor` 应用程序并运行工作流活动。

预期输出：

```bash
== APP - order-processor == *** Welcome to the Dapr Workflow console app sample!
== APP - order-processor == *** Using this app, you can place orders that start workflows.
== APP - order-processor == dapr client initializing for: 127.0.0.1:46533
== APP - order-processor == INFO: 2025/02/13 13:18:33 connecting work item listener stream
== APP - order-processor == 2025/02/13 13:18:33 work item listener started
== APP - order-processor == INFO: 2025/02/13 13:18:33 starting background processor
== APP - order-processor == adding base stock item: paperclip
== APP - order-processor == adding base stock item: cars
== APP - order-processor == adding base stock item: computers
== APP - order-processor == ==========Begin the purchase of item:==========
== APP - order-processor == NotifyActivity: Received order b4cb2687-1af0-4f8d-9659-eb6389c07ade for 1 cars - $5000
== APP - order-processor == VerifyInventoryActivity: Verifying inventory for order b4cb2687-1af0-4f8d-9659-eb6389c07ade of 1 cars
== APP - order-processor == VerifyInventoryActivity: There are 10 cars available for purchase
== APP - order-processor == ProcessPaymentActivity: b4cb2687-1af0-4f8d-9659-eb6389c07ade for 1 - cars (5000USD)
== APP - order-processor == UpdateInventoryActivity: Checking Inventory for order b4cb2687-1af0-4f8d-9659-eb6389c07ade for 1 * cars
== APP - order-processor == UpdateInventoryActivity: There are now 9 cars left in stock
== APP - order-processor == NotifyActivity: Order b4cb2687-1af0-4f8d-9659-eb6389c07ade has completed!
== APP - order-processor == workflow status: COMPLETED
== APP - order-processor == Purchase of item is complete
```

使用 `CTRL+C` 或以下命令停止 Dapr 工作流：

```bash
dapr stop -f .
```

### （可选）步骤 4：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，请使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI 中查看工作流跟踪跨度（通常位于 `http://localhost:9411/zipkin/`）。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上述示例中为 `b4cb2687-1af0-4f8d-9659-eb6389c07ade`）并调度了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到 10 辆汽车的订单。
4. `VerifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以供应订购的项目，并响应库存中的汽车数量。
5. 订单总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `b4cb2687-1af0-4f8d-9659-eb6389c07ade` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动在订单处理后使用当前可用的汽车更新库存。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `b4cb2687-1af0-4f8d-9659-eb6389c07ade` 已完成。
9. 工作流以完成状态终止，并且 OrderResult 设置为已处理。

#### `order-processor/main.go`

在应用程序的程序文件中：

- 生成唯一的工作流订单 ID
- 调度工作流
- 检索工作流状态
- 注册工作流及其调用的活动

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

	id, err := wfClient.ScheduleWorkflow(context.Background(), workflowName, workflow.WithInput(orderPayload), workflow.WithInstanceID("order-"+time.Now().Format("20060102150405")))
	if err != nil {
		log.Fatalf("failed to start workflow: %v", err)
	}

	waitCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	_, err = wfClient.WaitForWorkflowCompletion(waitCtx, id)
	cancel()
	if err != nil {
		log.Fatalf("failed to wait for workflow: %v", err)
	}

	respFetch, err := wfClient.FetchWorkflowMetadata(context.Background(), id, workflow.WithFetchPayloads(true))
	if err != nil {
		log.Fatalf("failed to get workflow: %v", err)
	}

	fmt.Printf("workflow status: %v\n", respFetch.String())

	fmt.Println("Purchase of item is complete")
	select {}
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

// OrderProcessingWorkflow is the main workflow for orchestrating activities in the order process.
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
		// TODO: Confirm timeout flow - this will be in the form of an error.
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

// NotifyActivity outputs a notification message
func NotifyActivity(ctx workflow.ActivityContext) (any, error) {
	var input Notification
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("NotifyActivity: %s\n", input.Message)
	return nil, nil
}

// ProcessPaymentActivity is used to process a payment
func ProcessPaymentActivity(ctx workflow.ActivityContext) (any, error) {
	var input PaymentRequest
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}
	fmt.Printf("ProcessPaymentActivity: %s for %d - %s (%dUSD)\n", input.RequestID, input.Quantity, input.ItemBeingPurchased, input.Amount)
	return nil, nil
}

// VerifyInventoryActivity is used to verify if an item is available in the inventory
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

// UpdateInventoryActivity modifies the inventory.
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

// RequestApprovalActivity requests approval for the order
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


## 步骤 5：管理工作流

现在你的工作流正在运行，让我们学习如何使用 Dapr CLI 来管理它。

### 查看运行中的工作流

打开一个单独的终端并运行以下 CLI 命令。

```bash
# 列出所有工作流
dapr workflow list --app-id order-processor -o wide
```

你应该看到类似以下的输出：

```
NAMESPACE  APP ID           NAME                     INSTANCE ID  CREATED               LAST UPDATE           STATUS
default    order-processor  OrderProcessingWorkflow  e4d3807c     2025-11-07T12:29:37Z  2025-11-07T12:29:52Z  COMPLETED
```

### 检查工作流历史记录

查看工作流的详细执行历史记录：

```bash
dapr workflow history e4d3807c --app-id order-processor
```

你应该看到类似以下的输出：

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

### 与工作流交互

#### 引发外部事件

如果你的工作流正在等待 [外部事件]({{% ref "workflow-patterns.md#external-system-interaction" %}})，你可以引发一个。
它接受一个格式为 `<instance-id>/<event-name>` 的参数。

```bash
dapr workflow raise-event e4d3807c/ApprovalEvent \
  --app-id order-processor \
  --input '{"paymentId": "pay-123", "amount": 100.00}'
```

#### 暂停和恢复

```bash
# 暂停工作流
dapr workflow suspend e4d3807c \
  --app-id order-processor \
  --reason "Waiting for inventory"

# 准备好后恢复
dapr workflow resume e4d3807c \
  --app-id order-processor \
  --reason "Inventory received"
```

### 清理

测试后，清除已完成的工作流。

{{% alert title="重要" color="warning" %}}
执行清除操作需要应用程序中运行工作流客户端。
需要工作流客户端连接以保持工作流状态机的完整性并防止损坏。
以下错误表明工作流客户端未运行：
```
failed to purge orchestration state: rpc error: code = FailedPrecondition desc = failed to purge orchestration state: failed to lookup actor: api error: code = FailedPrecondition desc = did not find address for actor
```
{{% /alert %}}

```bash
# 清除特定工作流
dapr workflow purge e4d3807c --app-id order-processor

# 或清除所有已完成的工作流
dapr workflow purge --app-id order-processor
```

## 告诉我们你的想法！

我们一直在努力改进快速入门示例，重视你的反馈。你觉得这个快速入门有帮助吗？你有改进建议吗？

在我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 中加入讨论。

## 后续步骤

- 使用 HTTP 而非 SDK 为任何编程语言设置 Dapr 工作流 [如何管理工作流]({{% ref howto-manage-workflow.md %}})
- 查看更深入的 [.NET SDK 示例工作流](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
- 了解有关 [工作流作为 Dapr 构建块]({{% ref workflow-overview %}}) 的更多信息
```

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
