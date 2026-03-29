```python
) -> InventoryResult:
    """定义更新库存活动。这由工作流用于检查库存
    是否足以完成订单，并通过从库存中减少订单数量来更新库存。"""
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
    """定义请求批准活动。这由工作流用于请求批准
    订单付款。仅当订单总成本大于特定阈值时才使用此活动"""
    logger = logging.getLogger('RequestApprovalActivity')

    logger.info('Requesting approval for payment of '+f'{input["total_cost"]}'+' USD for '
                +f'{input["quantity"]}' +' ' +f'{input["item_name"]}')
```
{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

`order-processor` 控制台应用程序启动和管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。工作流由四个工作流活动或任务组成：

- `notifyActivity`：利用记录器在工作流过程中打印出消息。这些消息会在库存不足、付款无法处理等情况时通知用户。
- `verifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `requestApprovalActivity`：为超过特定阈值的订单请求批准。
- `processPaymentActivity`：处理并授权付款。
- `updateInventoryActivity`：使用新的剩余库存值更新状态存储。

### 第 1 步：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 2 步：设置环境

克隆[快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/javascript/sdk)。

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

### 第 3 步：运行订单处理器应用程序

在终端中，使用[多应用运行]({{% ref multi-app-dapr-run %}})启动订单处理器应用程序和 Dapr sidecar。从 `javascript/sdk` 目录，运行以下命令：

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

### （可选）第 4 步：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI（通常位于 `http://localhost:9411/zipkin/`）中查看工作流跟踪范围。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 为工作流生成了一个唯一的订单 ID（在上面的示例中，`f5087775-779c-4e73-ac77-08edfcb375f4`）并安排了工作流。
2. `notifyActivity` 工作流活动发送一条通知，说明已收到 1 辆汽车的订单。
3. `verifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以提供订购的物品，并响应库存中的汽车数量。
4. 你的工作流启动并通知你其状态。
5. `requestApprovalActivity` 工作流活动为订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 请求批准
6. `processPaymentActivity` 工作流活动开始处理订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 的付款并确认是否成功。
7. `updateInventoryActivity` 工作流活动使用当前可用的汽车更新库存，在订单处理完成后。
8. `notifyActivity` 工作流活动发送一条通知，说明订单 `f5087775-779c-4e73-ac77-08edfcb375f4` 已完成并已处理。
9. 工作流作为已完成并已处理终止。

#### `order-processor/app.ts`

在应用程序文件中：

- 生成唯一的工作流订单 ID
- 安排工作流
- 检索工作流状态
- 注册工作流及其调用的活动

```javascript
import { DaprWorkflowClient, WorkflowRuntime, DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";
import { InventoryItem, OrderPayload } from "./model";
import { notifyActivity, orderProcessingWorkflow, processPaymentActivity, requestApprovalActivity, verifyInventoryActivity as verifyInventoryActivity, updateInventoryActivity } from "./orderProcessingWorkflow";

const workflowWorker = new WorkflowRuntime();

async function start() {
  // 更新 gRPC 客户端和工作程序以使用本地地址和端口
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

  // 将工作程序启动包装在 try-catch 块中以处理启动期间的任何错误
  try {
    await workflowWorker.start();
    console.log("Workflow runtime started successfully");
  } catch (error) {
    console.error("Error starting workflow runtime:", error);
  }

  // 安排新的编排
  try {
    const id = await workflowClient.scheduleNewWorkflow(orderProcessingWorkflow, order);
    console.log(`Orchestration scheduled with ID: ${id}`);

    // 等待编排完成
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

在 `orderProcessingWorkflow.ts` 中，工作流被定义为一个类，包含所有相关任务（由工作流活动确定）。

```javascript
import { Task, WorkflowActivityContext, WorkflowContext, TWorkflow, DaprClient } from "@dapr/dapr";
import { InventoryItem, InventoryRequest, InventoryResult, OrderNotification, OrderPayload, OrderPaymentRequest, OrderResult } from "./model";

const daprClient = new DaprClient();
const storeName = "statestore";

// 定义通知活动。这由工作流用于发送通知
export const notifyActivity = async (_: WorkflowActivityContext, orderNotification: OrderNotification) => {
  console.log(orderNotification.message);
  return;
};

//定义验证库存活动。这由工作流用于验证是否有库存可用于订单
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

`order-processor` 控制台应用程序启动和管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。工作流由四个工作流活动或任务组成：

- `NotifyActivity`：利用记录器在工作流过程中打印出消息
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `RequestApprovalActivity`：为超过特定阈值的订单请求批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的物品，并使用新的剩余库存值更新存储。

### 第 1 步：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 7](https://dotnet.microsoft.com/download/dotnet/7.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：**.NET 7 是 Dapr v1.15 中 Dapr.Workflows 支持的最低 .NET 版本。在 Dapr v1.16 及更高版本中仅支持 .NET 8 和 .NET 9。

### 第 2 步：设置环境

克隆[快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/csharp/sdk)。

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

返回 `csharp/sdk` 目录：

```bash
cd ..
```

### 第 3 步：运行订单处理器应用程序

在终端中，使用[多应用运行]({{% ref multi-app-dapr-run %}})启动订单处理器应用程序和 Dapr sidecar。从 `csharp/sdk` 目录，运行以下命令：

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

### （可选）第 4 步：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI（通常位于 `http://localhost:9411/zipkin/`）中查看工作流跟踪范围。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上面的示例中，`571a6e25`）并安排了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到一辆汽车的订单。
4. `VerifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以提供订购的物品，并响应库存中的汽车数量。库存充足，因此工作流继续。
5. 订单的总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `571a6e25` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动使用当前可用的汽车更新库存，在订单处理完成后。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `571a6e25` 已完成。
9. 工作流作为已完成终止，OrderResult 被设置为已处理。

#### `order-processor/Program.cs`

在应用程序的程序文件中：

- 生成唯一的工作流订单 ID
- 安排工作流
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

// 工作流主机是一个通过 gRPC 连接到 sidecar 的后台服务
var builder = Host.CreateDefaultBuilder(args).ConfigureServices(services =>
{
    services.AddDaprClient();
    services.AddDaprWorkflow(options =>
    {
        // 请注意，也可以将 lambda 函数注册为工作流
        // 或活动实现，而不是类。
        options.RegisterWorkflow<OrderProcessingWorkflow>();

        // 这些是由工作流调用的活动。
        options.RegisterActivity<NotifyActivity>();
        options.RegisterActivity<VerifyInventoryActivity>();
        options.RegisterActivity<RequestApprovalActivity>();
        options.RegisterActivity<ProcessPaymentActivity>();
        options.RegisterActivity<UpdateInventoryActivity>();
    });
});

// 启动应用程序 - 这是我们要连接到 Dapr sidecar 的地方
using var host = builder.Build();
host.Start();

var daprClient = host.Services.GetRequiredService<DaprClient>();
var workflowClient = host.Services.GetRequiredService<DaprWorkflowClient>();

// 为工作流生成唯一 ID
var orderId = Guid.NewGuid().ToString()[..8];
const string itemToPurchase = "Cars";
const int amountToPurchase = 1;

// 用物品填充存储
RestockInventory(itemToPurchase);

// 构造订单
var orderInfo = new OrderPayload(itemToPurchase, 5000, amountToPurchase);

// 启动工作流
Console.WriteLine($"Starting workflow {orderId} purchasing {amountToPurchase} {itemToPurchase}");

await workflowClient.ScheduleNewWorkflowAsync(
    name: nameof(OrderProcessingWorkflow),
    instanceId: orderId,
    input: orderInfo);

// 等待工作流启动并确认输入
var state = await workflowClient.WaitForWorkflowStartAsync(
    instanceId: orderId);

Console.WriteLine($"Your workflow has started. Here is the status of the workflow: {Enum.GetName(typeof(WorkflowRuntimeStatus), state.RuntimeStatus)}");

// 等待工作流完成
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

在 `OrderProcessingWorkflow.cs` 中，工作流被定义为一个类，包含所有相关任务（由单独文件中的工作流活动确定）。

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

        // 通知用户订单已通过
        await context.CallActivityAsync(nameof(NotifyActivity),
            new Notification($"Received order {orderId} for {order.Quantity} {order.Name} at ${order.TotalCost}"));
        LogOrderReceived(logger, orderId, order.Quantity, order.Name, order.TotalCost);

        // 通过检查库存来确定是否有足够的物品可供购买
        var inventoryRequest = new InventoryRequest(RequestId: orderId, order.Name, order.Quantity);
        var result = await context.CallActivityAsync<InventoryResult>(
            nameof(VerifyInventoryActivity), inventoryRequest);
        LogCheckInventory(logger, inventoryRequest);
            
        // 如果库存不足，则失败并通知用户 
        if (!result.Success)
        {
            // 在此处结束工作流，因为我们没有足够的库存
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

        // 有足够的库存可供购买，因此用户可以购买物品。处理他们的付款
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
        catch (TaskFailedException)
        {
            // 让他们知道他们的付款已处理，但没有足够的库存，因此他们将获得退款
            await context.CallActivityAsync(nameof(NotifyActivity),
                new Notification($"Order {orderId} Failed! You are now getting a refund"));
            LogRefund(logger, orderId);
            return new OrderResult(Processed: false);
        }

        // 让他们知道他们的付款已处理
        await context.CallActivityAsync(nameof(NotifyActivity), new Notification($"Order {orderId} has completed!"));
        LogSuccessfulOrder(logger, orderId);

        // 以成功结果结束工作流
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

`Activities` 目录保存工作流使用的四个工作流活动，在以下文件中定义：

- `NotifyActivity.cs`
- `VerifyInventoryActivity.cs`
- `RequestApprovalActivity.cs`
- `ProcessPaymentActivity.cs`
- `UpdateInventoryActivity.cs`

## 观看演示

观看[此视频以了解 Dapr 工作流 .NET 演示](https://youtu.be/BxiKpEmchgQ?t=2564)：

{{< youtube id=BxiKpEmchgQ start=2564 >}}

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

`order-processor` 控制台应用程序启动和管理订单处理工作流的生命周期，该工作流在状态存储中存储和检索数据。工作流由四个工作流活动或任务组成：

- `NotifyActivity`：利用记录器在工作流过程中打印出消息。
- `RequestApprovalActivity`：为超过特定成本阈值的订单请求批准。
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的物品，并使用新的剩余库存值更新存储。

### 第 1 步：先决条件

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

### 第 2 步：设置环境

克隆[快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk)。

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

返回 `java/sdk` 目录：

```bash
cd ..
```

### 第 3 步：运行订单处理器应用程序

在终端中，使用[多应用运行]({{% ref multi-app-dapr-run %}})启动订单处理器应用程序和 Dapr sidecar。从 `java/sdk` 目录，运行以下命令：

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

### （可选）第 4 步：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI（通常位于 `http://localhost:9411/zipkin/`）中查看工作流跟踪范围。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run -f .` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上面的示例中，`d1bf548b-c854-44af-978e-90c61ed88e3c`）并安排了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到一辆汽车的订单。
4. `VertifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以提供订购的物品，并响应库存中的汽车数量。库存充足，因此工作流继续。
5. 订单的总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `d1bf548b-c854-44af-978e-90c61ed88e3c` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动使用当前可用的汽车更新库存，在订单处理完成后。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `d1bf548b-c854-44af-978e-90c61ed88e3c` 已完成。
9. 工作流作为已完成终止，orderResult 被设置为已处理。

#### `order-processor/WorkflowConsoleApp.java` 

在应用程序的程序文件中：
- 生成唯一的工作流订单 ID
- 安排工作流
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
   * 此控制台应用程序的主要方法。
   *
   * @param args 应用程序将监听的端口。
   * @throws Exception 异常。
   */
  public static void main(String[] args) throws Exception {
    System.out.println("*** Welcome to the Dapr Workflow console app sample!");
    System.out.println("*** Using this app, you can place orders that start workflows.");
    // 等待 sidecar 变为可用
    Thread.sleep(5 * 1000);

    // 使用构建器注册 OrderProcessingWorkflow 及其活动。
    WorkflowRuntimeBuilder builder = new WorkflowRuntimeBuilder().registerWorkflow(OrderProcessingWorkflow.class);
    builder.registerActivity(NotifyActivity.class);
    builder.registerActivity(ProcessPaymentActivity.class);
    builder.registerActivity(RequestApprovalActivity.class);
    builder.registerActivity(VerifyInventoryActivity.class);
    builder.registerActivity(UpdateInventoryActivity.class);

    // 构建然后启动工作流运行时，拉取并执行任务
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
    // 准备 10 辆汽车的库存
    InventoryItem inventory = new InventoryItem();
    inventory.setName("cars");
    inventory.setPerItemCost(50000);
    inventory.setQuantity(10);
    DaprClient daprClient = new DaprClientBuilder().build();
    restockInventory(daprClient, inventory);

    // 准备 10 辆汽车的订单
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

在 `OrderProcessingWorkflow.java` 中，工作流被定义为一个类，包含所有相关任务（由工作流活动确定）。

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

      // 通知用户订单已通过
      Notification notification = new Notification();
      notification.setMessage("Received Order: " + order.toString());
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // 通过检查库存来确定是否有足够的物品可供购买
      InventoryRequest inventoryRequest = new InventoryRequest();
      inventoryRequest.setRequestId(orderId);
      inventoryRequest.setItemName(order.getItemName());
      inventoryRequest.setQuantity(order.getQuantity());
      InventoryResult inventoryResult = ctx.callActivity(VerifyInventoryActivity.class.getName(),
          inventoryRequest, InventoryResult.class).await();

      // 如果库存不足，则失败并通知用户
      if (!inventoryResult.isSuccess()) {
        notification.setMessage("Insufficient inventory for order : " + order.getItemName());
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // 要求超过特定阈值的订单必须获得批准
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

      // 有足够的库存可供购买，因此用户可以购买物品。
      // 处理他们的付款
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
        // 如果更新库存时出错，则向用户退款
        // paymentRequest.setAmount(-1 * paymentRequest.getAmount());
        // ctx.callActivity(ProcessPaymentActivity.class.getName(),
        // paymentRequest).await();

        // 让用户知道他们的付款处理失败
        notification.setMessage("Order failed to update inventory! : " + orderId);
        ctx.callActivity(NotifyActivity.class.getName(), notification).await();
        ctx.complete(orderResult);
        return;
      }

      // 让用户知道他们的订单已处理
      notification.setMessage("Order completed! : " + orderId);
      ctx.callActivity(NotifyActivity.class.getName(), notification).await();

      // 完成工作流，订单结果已处理
      orderResult.setProcessed(true);
      ctx.complete(orderResult);
    };
  }

}
```

#### `activities` 目录

`activities` 目录保存工作流使用的四个工作流活动，在以下文件中定义：
- [`NotifyActivity.java`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/NotifyActivity.java)
- [`RequestApprovalActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/RequestApprovalActivity.java)
- [`ReserveInventoryActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/VerifyInventoryActivity.java)
- [`ProcessPaymentActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/ProcessPaymentActivity.java)
- [`UpdateInventoryActivity`](https://github.com/dapr/quickstarts/tree/master/workflows/java/sdk/order-processor/src/main/java/io/dapr/quickstarts/workflows/activities/UpdateInventoryActivity.java)

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

`order-processor` 控制台应用程序启动和管理 `OrderProcessingWorkflow` 工作流，模拟从商店购买物品。工作流由五个独特的工作流活动或任务组成：

- `NotifyActivity`：利用记录器在工作流过程中打印出消息。这些消息会在以下情况通知你：
  - 库存不足
  - 付款无法处理等
- `VerifyInventoryActivity`：检查状态存储以确保有足够的库存可供购买。
- `RequestApprovalActivity`：为超过特定成本阈值的订单请求批准。
- `ProcessPaymentActivity`：处理并授权付款。
- `UpdateInventoryActivity`：从状态存储中移除所请求的物品，并使用新的剩余库存值更新存储。

### 第 1 步：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 2 步：设置环境

克隆[快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/workflows/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在新的终端窗口中，导航到 `sdk` 目录：

```bash
cd workflows/go/sdk
```

### 第 3 步：运行订单处理器应用程序

在终端中，使用[多应用运行]({{% ref multi-app-dapr-run %}})启动订单处理器应用程序和 Dapr sidecar。从 `go/sdk` 目录，运行以下命令：

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

### （可选）第 4 步：在 Zipkin 中查看

运行 `dapr init` 会启动 [openzipkin/zipkin](https://hub.docker.com/r/openzipkin/zipkin/) Docker 容器。如果容器已停止运行，使用以下命令启动 Zipkin Docker 容器：

```
docker run -d -p 9411:9411 openzipkin/zipkin
```

在 Zipkin Web UI（通常位于 `http://localhost:9411/zipkin/`）中查看工作流跟踪范围。

<img src="/images/workflow-trace-spans-zipkin.png" width=800 style="padding-bottom:15px;">

### 发生了什么？

当你运行 `dapr run` 时：

1. 创建了一个包含一辆汽车的 OrderPayload。
2. 为工作流生成了一个唯一的订单 ID（在上面的示例中，`b4cb2687-1af0-4f8d-9659-eb6389c07ade`）并安排了工作流。
3. `NotifyActivity` 工作流活动发送一条通知，说明已收到 10 辆汽车的订单。
4. `VerifyInventoryActivity` 工作流活动检查库存数据，确定你是否可以提供订购的物品，并响应库存中的汽车数量。
5. 订单的总成本为 5000，因此工作流不会调用 `RequestApprovalActivity` 活动。
6. `ProcessPaymentActivity` 工作流活动开始处理订单 `b4cb2687-1af0-4f8d-9659-eb6389c07ade` 的付款并确认是否成功。
7. `UpdateInventoryActivity` 工作流活动使用当前可用的汽车更新库存，在订单处理完成后。
8. `NotifyActivity` 工作流活动发送一条通知，说明订单 `b4cb2687-1af0-4f8d-9659-eb6389c07ade` 已完成。
9. 工作流作为已完成终止，OrderResult 被设置为已处理。

#### `order-processor/main.go`

在应用程序的程序文件中：

- 生成唯一的工作流订单 ID
- 安排工作流
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

// OrderProcessingWorkflow 是用于协调订单处理中的活动的主要工作流。
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
		// TODO: 确认超时流程 - 这将以错误形式出现。
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

// NotifyActivity 输出通知消息
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

// VerifyInventoryActivity 用于验证物品是否在库存中可用
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

// UpdateInventoryActivity 修改库存。
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

// RequestApprovalActivity 请求订单批准
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


## 第 5 步：管理工作流

现在你的工作流正在运行，让我们了解如何使用 Dapr CLI 管理它。

### 查看运行中的工作流

打开一个单独的终端并运行以下 CLI 命令。

```bash
# 列出所有工作流
dapr workflow list --app-id order-processor -o wide
```

你应该会看到如下输出：

```
NAMESPACE  APP ID           NAME                     INSTANCE ID  CREATED               LAST UPDATE           STATUS
default    order-processor  OrderProcessingWorkflow  e4d3807c     2025-11-07T12:29:37Z  2025-11-07T12:29:52Z  COMPLETED
```

### 检查工作流历史记录

查看工作流的详细执行历史记录：

```bash
dapr workflow history e4d3807c --app-id order-processor
```

你应该会看到如下输出：

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

#### 触发外部事件

如果你的工作流正在等待[外部事件]({{% ref "workflow-patterns.md#external-system-interaction" %}})，你可以触发一个。
它接受一个参数，格式为 `<instance-id>/<event-name>`。

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

# 准备就绪时恢复
dapr workflow resume e4d3807c \
  --app-id order-processor \
  --reason "Inventory received"
```

### 清理

测试后，清除已完成的工作流。

{{% alert title="重要" color="warning" %}}
应用程序中必须运行工作流客户端才能执行清除操作。
需要工作流客户端连接以保持工作流状态机完整性并防止损坏。
如下错误表明工作流客户端未运行：
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

我们正在不断努力改进我们的快速入门示例，非常重视你的反馈。你觉得这个快速入门有帮助吗？你有改进建议吗？

在我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 中加入讨论。

## 后续步骤

- 使用 [HTTP 而不是 SDK]({{% ref howto-manage-workflow.md %}}) 使用任何编程语言设置 Dapr 工作流
- 查看更深入的 [.NET SDK 示例工作流](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
- 了解有关[作为 Dapr 构建块的工作流]({{% ref workflow-overview %}})的更多信息
```

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
