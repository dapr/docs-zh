---
type: docs
title: "How-To：启用事务性发件箱模式"
linkTitle: "How-To：启用事务性发件箱模式"
weight: 400
description: "在 state store 与 pub/sub 消息代理之间提交单个事务"
---

事务性发件箱模式是一种众所周知的设计模式，用于发送与应用程序状态变更相关的通知。事务性发件箱模式使用一个横跨数据库与消息代理的单一事务来投递通知。

开发者在尝试自行实现此模式时面临着许多困难的技术挑战，通常需要编写容易出错的中央协调管理器，且最多只能支持一两种数据库与消息代理的组合。

例如，你可以使用发件箱模式来：
1. 向账户数据库写入新的用户记录。
1. 发送一条通知消息，告知账户已成功创建。

借助 Dapr 的 outbox 支持，当调用 Dapr 的[事务 API]({{% ref "state_api.md#state-transactions" %}})时，你可以在应用程序状态被创建或更新时通知订阅者。

下图从高层次概述了 outbox 功能的工作原理：

1) 服务 A 使用事务将状态保存或更新到 state store。
2) 在同一事务下向消息代理写入一条消息。当消息成功投递到消息代理后，事务完成，从而确保状态与消息作为一个整体完成事务提交。
3) 消息代理将消息 topic 投递给任何订阅者，本例中为服务 B。

{{< diagram name="state-management-outbox" width="85" >}}

## Outbox 在底层的工作原理

Dapr outbox 在两个流程中处理请求：用户请求流程与后台消息流程。二者共同确保状态与事件保持一致。

{{< diagram state-management-outbox-steps >}}

交互顺序如下：

1. 应用程序调用 Dapr State Management API，使用事务方法以事务方式写入状态。  
   这是业务数据（例如订单或资料更新）提交进行持久化的入口点。

2. Dapr 向一个内部 outbox topic 发布一条带有唯一事务 ID 的 intent message。  
   这条持久化记录确保在任何数据库提交发生之前，事件意向就已经存在。

3. 状态与一个 transaction marker 以原子方式写入同一个 state store。  
   业务数据与标记在同一事务中提交，防止部分写入。

4. 事务提交后，应用程序收到成功响应。  
   此时应用程序可以继续执行，因为已知状态已保存，事件意向也得到保证。

5. 后台订阅者读取 intent message。  
   当 outbox 启用时，Dapr 会启动消费者来处理内部 outbox topic。

6. 订阅者在 state store 中验证 transaction marker。  
   此项检查确认数据库提交已成功，然后才会进行外部发布。

7. 验证通过的业务事件被发布到外部 pub/sub topic。  
   事件被发送到已配置的消息代理（Kafka、RabbitMQ 等），其他服务可以消费该事件。

8. 从 state store 中清理（删除）标记。  
   事件成功投递后，这可防止数据库无限制地增长。

9. 消息被确认并从内部 topic 中移除  
   如果发布或清理失败，Dapr 会重试，从而确保可靠的至少一次投递。
  
## 要求

1. outbox 功能需要 Dapr 支持的[事务型 state store]({{% ref supported-state-stores %}})。  
   [了解更多关于可使用的事务方法的内容。]({{% ref "howto-get-save-state.md#perform-state-transactions" %}})

2. 任何 Dapr 支持的[pub/sub 消息代理]({{% ref supported-pubsub %}})均可与 outbox 功能一起使用。

   {{% alert title="注意" color="primary" %}}
   建议使用支持竞争消费者模式的消息代理（例如 [Apache Kafka]({{% ref setup-apache-kafka%}})），以降低重复事件的可能性。
   {{% /alert %}}

3. 内部 outbox topic  
   启用 outbox 时，Dapr 会使用以下命名约定创建一个内部 topic：`{namespace}{appID}{topic}outbox`，其中：

   - `namespace`：Dapr 应用程序的 namespace（如果已配置）
   - `appID`：Dapr 应用程序标识符
   - `topic`：在 `outboxPublishTopic` 元数据中指定的值

   这样，每个 outbox topic 都会在应用程序与外部 topic 的范围内被唯一标识，从而防止多租户环境中的路由冲突。

   你可以通过设置 `outboxInternalTopic` 元数据字段来覆盖自动生成的名称。设置后，该值将作为完整的内部 topic 名称使用，不附加 namespace、appID 或后缀。

   {{% alert title="注意" color="primary" %}}
   请确保 topic 已提前创建，或者 Dapr 在启动时拥有足够的权限来创建该 topic。
   {{% /alert %}}

## 启用发件箱模式

要启用 outbox 功能，请在 state store 组件上添加以下必填和可选字段：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql-outbox
spec:
  type: state.mysql
  version: v1
  metadata:
  - name: connectionString
    value: "<CONNECTION STRING>"
  - name: outboxPublishPubsub # Required
    value: "mypubsub"
  - name: outboxPublishTopic # Required
    value: "newOrder"
  - name: outboxPubsub # Optional
    value: "myOutboxPubsub"
  - name: outboxInternalTopic # Optional
    value: "myapp-neworder-outbox"
  - name: outboxDiscardWhenMissingState #Optional. Defaults to false
    value: false
```

### 元数据字段

| 名称                | 必填    | 默认值 | 描述                                            |
| --------------------|-------------|---------------|------------------------------------------------------- |
| outboxPublishPubsub | 是         | N/A           | 设置在发布状态变更时用于投递通知的 pub/sub 组件名称
| outboxPublishTopic  | 是         | N/A           | 设置在 `outboxPublishPubsub` 所配置的 pub/sub 上接收状态变更的 topic。消息正文将是针对 `insert` 或 `update` 操作的状态事务项
| outboxPubsub        | 否         | `outboxPublishPubsub`           | 设置 Dapr 用于协调状态与 pub/sub 事务的 pub/sub 组件。如果未设置，则使用 `outboxPublishPubsub` 所配置的 pub/sub 组件。如果你希望将用于发送通知状态变更的 pub/sub 组件与用于协调事务的组件分开，此设置会很有用
| outboxInternalTopic | 否         | 自动生成           | 设置内部 outbox topic 名称。设置后，该值将作为完整的 topic 名称使用，不附加 namespace、appID 或后缀。为空时，使用默认命名约定 `{namespace}{appID}{topic}outbox`
| outboxDiscardWhenMissingState  | 否         | `false`           | 将 `outboxDiscardWhenMissingState` 设置为 `true` 后，如果 Dapr 无法在数据库中找到状态，它将丢弃该事务且不再重试。如果在 Dapr 能够投递消息之前，state store 中的数据因任何原因被删除，并且你希望 Dapr 从 pub/sub 中丢弃这些项且停止重试获取状态，则此设置会很有用

## 其他配置

### 在同一个 state store 上组合使用 outbox 与非 outbox 消息

如果你希望使用同一个 state store 来发送 outbox 与非 outbox 消息，只需定义两个连接到同一 state store 的组件，其中一个启用 outbox 功能，另一个不启用。

#### 不带 outbox 的 MySQL state store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql
spec:
  type: state.mysql
  version: v1
  metadata:
  - name: connectionString
    value: "<CONNECTION STRING>"
```

#### 带 outbox 的 MySQL state store

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysql-outbox
spec:
  type: state.mysql
  version: v1
  metadata:
  - name: connectionString
    value: "<CONNECTION STRING>"
  - name: outboxPublishPubsub # Required
    value: "mypubsub"
  - name: outboxPublishTopic # Required
    value: "newOrder"
```

### 定制发件箱模式消息

你可以通过设置另一个事务来覆盖发布到 pub/sub 消息代理的发件箱模式消息。该事务不会保存到数据库，并被明确标记为投影（projection）。该事务会添加一个名为 `outbox.projection` 的元数据键，其值设置为 `true`。当它被添加到事务中保存的状态数组时，写入状态时会忽略此负载，并将该数据用作发送给上游订阅者的负载。

要正确使用，state store 上的操作与消息投影之间的 `key` 值必须匹配。如果键不匹配，整个事务将失败。

如果对同一个键定义了两个或更多启用 `outbox.projection` 的状态项，则使用第一个定义的项，其余项被忽略。

[了解更多关于默认与自定义 CloudEvent 消息的内容。]({{% ref pubsub-cloudevents.md %}})

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

在以下状态事务的 Python SDK 示例中，值 `"2"` 被保存到数据库，而值 `"3"` 被发布到最终用户 topic。

```python
DAPR_STORE_NAME = "statestore"

async def main():
    client = DaprClient()

    client.execute_state_transaction(
       store_name=DAPR_STORE_NAME,
       operations=[
          # 定义第一个状态操作以保存值 "2"
          TransactionalStateOperation(
             key='key1', data='2', metadata={'outbox.projection': 'false'}
          ),
          # 定义第二个状态操作以发布带有元数据的值 "3"
          TransactionalStateOperation(
             key='key1', data='3', metadata={'outbox.projection': 'true'}
          ),
       ],
    )

    print("State transaction executed.")
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。   

{{% /tab %}}

{{% tab "JavaScript" %}}

<!--javascript-->

在以下状态事务的 JavaScript SDK 示例中，值 `"2"` 被保存到数据库，而值 `"3"` 被发布到最终用户 topic。

```javascript
const { DaprClient, StateOperationType } = require('@dapr/dapr');

const DAPR_STORE_NAME = "statestore";

async function main() {
  const client = new DaprClient();

  // 定义第一个状态操作以保存值 "2"
  const op1 = {
    operation: StateOperationType.UPSERT,
    request: {
      key: "key1",
      value: "2"
    }
  };

  // 定义第二个状态操作以发布带有元数据的值 "3"
  const op2 = {
    operation: StateOperationType.UPSERT,
    request: {
      key: "key1",
      value: "3",
      metadata: {
        "outbox.projection": "true"
      }
    }
  };

  // 创建状态操作列表
  const ops = [op1, op2];

  // 执行状态事务
  await client.state.transaction(DAPR_STORE_NAME, ops);
  console.log("State transaction executed.");
}

main().catch(err => {
  console.error(err);
});
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。   


{{% /tab %}}

{{% tab ".NET" %}}

<!--dotnet-->

在以下状态事务的 .NET SDK 示例中，值 `"2"` 被保存到数据库，而值 `"3"` 被发布到最终用户 topic。

```csharp
public class Program
{
    private const string DAPR_STORE_NAME = "statestore";

    public static async Task Main(string[] args)
    {
        var client = new DaprClientBuilder().Build();

        // 定义第一个状态操作以保存值 "2"
        var op1 = new StateTransactionRequest(
            key: "key1",
            value: Encoding.UTF8.GetBytes("2"),
            operationType: StateOperationType.Upsert
        );

        // 定义第二个状态操作以发布带有元数据的值 "3"
        var metadata = new Dictionary<string, string>
        {
            { "outbox.projection", "true" }
        };
        var op2 = new StateTransactionRequest(
            key: "key1",
            value: Encoding.UTF8.GetBytes("3"),
            operationType: StateOperationType.Upsert,
            metadata: metadata
        );

        // 创建状态操作列表
        var ops = new List<StateTransactionRequest> { op1, op2 };

        // 执行状态事务
        await client.ExecuteStateTransactionAsync(DAPR_STORE_NAME, ops);
        Console.WriteLine("State transaction executed.");
    }
}
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。    

{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

在以下状态事务的 Java SDK 示例中，值 `"2"` 被保存到数据库，而值 `"3"` 被发布到最终用户 topic。

```java
public class Main {
    private static final String DAPR_STORE_NAME = "statestore";

    public static void main(String[] args) {
        try (DaprClient client = new DaprClientBuilder().build()) {
            // 定义第一个状态操作以保存值 "2"
            State<String> state1 = new State<>(
                    "key1",
                    "2",
                    null, // etag
                    null // 并发与一致性选项
            );

            // 定义第二个状态操作以发布带有元数据的值 "3"
            Map<String, String> metadata = new HashMap<>();
            metadata.put("outbox.projection", "true");

            State<String> state2 = new State<>(
                    "key1",
                    "3",
                    null, // etag
                    metadata, 
                    null // 并发与一致性选项
            );
            
            TransactionalStateOperation<String> op1 = new TransactionalStateOperation<>(
                TransactionalStateOperation.OperationType.UPSERT, state1
            );

            TransactionalStateOperation<String> op2 = new TransactionalStateOperation<>(
                TransactionalStateOperation.OperationType.UPSERT, state2
            );

            // 创建事务状态操作列表
            List<TransactionalStateOperation<?>> ops = new ArrayList<>();
            ops.add(op1);
            ops.add(op2);

            // 配置事务请求并设置 state store
            ExecuteStateTransactionRequest transactionRequest = new ExecuteStateTransactionRequest(DAPR_STORE_NAME);
            
            transactionRequest.setOperations(ops);

            // 执行状态事务
            client.executeStateTransaction(transactionRequest).block();
            System.out.println("State transaction executed.");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。   


{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

在以下状态事务的 Go SDK 示例中，值 `"2"` 被保存到数据库，而值 `"3"` 被发布到最终用户 topic。

```go
ops := make([]*dapr.StateOperation, 0)

op1 := &dapr.StateOperation{
    Type: dapr.StateOperationTypeUpsert,
    Item: &dapr.SetStateItem{
        Key:   "key1",
        Value: []byte("2"),
    },
}
op2 := &dapr.StateOperation{
    Type: dapr.StateOperationTypeUpsert,
    Item: &dapr.SetStateItem{
        Key:   "key1",
				Value: []byte("3"),
         // 覆盖保存到数据库的数据负载 
				Metadata: map[string]string{
					"outbox.projection": "true",
        },
    },
}
ops = append(ops, op1, op2)
meta := map[string]string{}
err := testClient.ExecuteStateTransaction(ctx, store, meta, ops)
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。   

{{% /tab %}}

{{% tab "HTTP" %}}

<!--http-->

你可以使用以下 HTTP 请求传递消息覆盖：

```bash
curl -X POST http://localhost:3500/v1.0/state/starwars/transaction \
  -H "Content-Type: application/json" \
  -d '{
  "operations": [
    {
      "operation": "upsert",
      "request": {
        "key": "order1",
        "value": {
            "orderId": "7hf8374s",
            "type": "book",
            "name": "The name of the wind"
        }
      }
    },
    {
      "operation": "upsert",
      "request": {
        "key": "order1",
        "value": {
            "orderId": "7hf8374s"
        },
        "metadata": {
           "outbox.projection": "true"
        },
        "contentType": "application/json"
      }
    }
  ]
}'
```

通过将元数据项 `"outbox.projection"` 设置为 `"true"` 并确保 `key` 值匹配（`key1`）：
- 第一个操作被写入 state store，不会向消息代理写入消息。
- 第二个操作的值被发布到已配置的 pub/sub topic。   

{{% /tab %}}

{{< /tabpane >}}

### 覆盖 Dapr 生成的 CloudEvent 字段

你可以使用自定义 CloudEvent 元数据，覆盖已发布的 outbox 事件上的 [Dapr 生成的 CloudEvent 字段]({{% ref "pubsub-cloudevents.md#dapr-generated-cloudevents-example" %}})。

{{< tabpane text=true >}}

{{% tab "Python" %}}

<!--python-->

```python
async def execute_state_transaction():
    async with DaprClient() as client:
        # 定义状态操作
        ops = []

        op1 = {
            'operation': 'upsert',
            'request': {
                'key': 'key1',
                'value': b'2',  # 将字符串转换为字节数组
                'metadata': {
                    'cloudevent.id': 'unique-business-process-id',
                    'cloudevent.source': 'CustomersApp',
                    'cloudevent.type': 'CustomerCreated',
                    'cloudevent.subject': '123',
                    'my-custom-ce-field': 'abc'
                }
            }
        }

        ops.append(op1)

        # 执行状态事务
        store_name = 'your-state-store-name'
        try:
            await client.execute_state_transaction(store_name, ops)
            print('State transaction executed.')
        except Exception as e:
            print('Error executing state transaction:', e)

# 运行异步函数
if __name__ == "__main__":
    asyncio.run(execute_state_transaction())
```
{{% /tab %}}

{{% tab "JavaScript" %}}

<!--javascript-->

```javascript
const { DaprClient } = require('dapr-client');

async function executeStateTransaction() {
    // 初始化 Dapr 客户端
    const daprClient = new DaprClient();

    // 定义状态操作
    const ops = [];

    const op1 = {
        operationType: 'upsert',
        request: {
            key: 'key1',
            value: Buffer.from('2'),
            metadata: {
                'id': 'unique-business-process-id',
                'source': 'CustomersApp',
                'type': 'CustomerCreated',
                'subject': '123',
                'my-custom-ce-field': 'abc'
            }
        }
    };

    ops.push(op1);

    // 执行状态事务
    const storeName = 'your-state-store-name';
    const metadata = {};
}

executeStateTransaction();
```
{{% /tab %}}

{{% tab ".NET" %}}

<!--csharp-->

```csharp
public class StateOperationExample
{
    public async Task ExecuteStateTransactionAsync()
    {
        var daprClient = new DaprClientBuilder().Build();

        // 将值 "2" 定义为字符串并序列化为字节数组
        var value = "2";
        var valueBytes = JsonSerializer.SerializeToUtf8Bytes(value);

        // 定义第一个状态操作以保存带有元数据的值 "2"
       // 覆盖 Cloudevent 元数据
        var metadata = new Dictionary<string, string>
        {
            { "cloudevent.id", "unique-business-process-id" },
            { "cloudevent.source", "CustomersApp" },
            { "cloudevent.type", "CustomerCreated" },
            { "cloudevent.subject", "123" },
            { "my-custom-ce-field", "abc" }
        };

        var op1 = new StateTransactionRequest(
            key: "key1",
            value: valueBytes,
            operationType: StateOperationType.Upsert,
            metadata: metadata
        );

        // 创建状态操作列表
        var ops = new List<StateTransactionRequest> { op1 };

        // 执行状态事务
        var storeName = "your-state-store-name";
        await daprClient.ExecuteStateTransactionAsync(storeName, ops);
        Console.WriteLine("State transaction executed.");
    }

    public static async Task Main(string[] args)
    {
        var example = new StateOperationExample();
        await example.ExecuteStateTransactionAsync();
    }
}
```
{{% /tab %}}

{{% tab "Java" %}}

<!--java-->

```java
public class StateOperationExample {

    public static void main(String[] args) {
        executeStateTransaction();
    }

  public static void executeStateTransaction() {
    // 构建 Dapr 客户端
    try (DaprClient daprClient = new DaprClientBuilder().build()) {

      // 覆盖 CloudEvent 元数据
      Map<String, String> metadata = new HashMap<>();
      metadata.put("cloudevent.id", "unique-business-process-id");
      metadata.put("cloudevent.source", "CustomersApp");
      metadata.put("cloudevent.type", "CustomerCreated");
      metadata.put("cloudevent.subject", "123");
      metadata.put("my-custom-ce-field", "abc");

      State<String> state = new State<>(
          "key1", // 定义键 "key1"
          "value1", // 定义值 "value1"
          null, // etag
          metadata,
          null // 并发与一致性选项
      );

      // 定义状态操作
      List<TransactionalStateOperation<?>> ops = new ArrayList<>();
      TransactionalStateOperation<String> op1 = new TransactionalStateOperation<>(
          TransactionalStateOperation.OperationType.UPSERT,
          state
      );
      ops.add(op1);

      // 执行状态事务
      String storeName = "your-state-store-name";
      daprClient.executeStateTransaction(storeName, ops).block();
      System.out.println("State transaction executed.");
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
```
{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

```go
func main() {
	// 创建 Dapr 客户端
	client, err := dapr.NewClient()
	if err != nil {
		log.Fatalf("failed to create Dapr client: %v", err)
	}
	defer client.Close()

	ctx := context.Background()
	store := "your-state-store-name"

	// 定义状态操作
	ops := make([]*dapr.StateOperation, 0)
	op1 := &dapr.StateOperation{
		Type: dapr.StateOperationTypeUpsert,
		Item: &dapr.SetStateItem{
			Key:   "key1",
			Value: []byte("2"),
			// 覆盖 Cloudevent 元数据
			Metadata: map[string]string{
				"cloudevent.id":                "unique-business-process-id",
				"cloudevent.source":            "CustomersApp",
				"cloudevent.type":              "CustomerCreated",
				"cloudevent.subject":           "123",
				"my-custom-ce-field":           "abc",
			},
		},
	}
	ops = append(ops, op1)

	// 事务的元数据（如有）
	meta := map[string]string{}

	// 执行状态事务
	err = client.ExecuteStateTransaction(ctx, store, meta, ops)
	if err != nil {
		log.Fatalf("failed to execute state transaction: %v", err)
	}

	log.Println("State transaction executed.")
}
```
{{% /tab %}}

{{% tab "HTTP" %}}

<!--http-->

```bash
curl -X POST http://localhost:3500/v1.0/state/starwars/transaction \
  -H "Content-Type: application/json" \
  -d '{
        "operations": [
          {
            "operation": "upsert",
            "request": {
              "key": "key1",
              "value": "2"
            }
          },
        ],
        "metadata": {
          "id": "unique-business-process-id",
          "source": "CustomersApp",
          "type": "CustomerCreated",
          "subject": "123",
          "my-custom-ce-field": "abc",
        }
      }'
```

{{% /tab %}}

{{< /tabpane >}}


{{% alert title="注意" color="primary" %}}
`data` CloudEvent 字段保留供 Dapr 内部使用，不可自定义。

{{% /alert %}}

## 演示

观看 [此视频以了解发件箱模式的概述](https://youtu.be/rTovKpG0rhY?t=1338)：

{{< youtube id=rTovKpG0rhY start=1338 >}}

## 后续步骤

[Dapr Outbox 如何在分布式应用中消除双重写入](https://www.diagrid.io/blog/how-dapr-outbox-eliminates-dual-writes-in-distributed-applications)
