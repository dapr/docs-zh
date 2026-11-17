---
type: docs
title: "Getting started with the Dapr client Python SDK"
linkTitle: "客户端"
weight: 10000
description: 如何快速上手使用 Dapr Python SDK
---

Dapr 客户端包允许你在 Python 应用程序中与其他 Dapr 应用进行交互。

{{% alert title="注意" color="primary" %}}
如果你还没有试过，请先体验其中一个[Quickstart]({{% ref quickstarts %}})，快速了解如何将 Dapr Python SDK 与 API building blocks 配合使用。

{{% /alert %}}

## 前提条件

开始之前，请先[安装 Dapr Python 包]({{% ref "python#installation" %}})。

## 导入客户端包

`dapr` 包中包含 `DaprClient`，用于创建和使用客户端。

```python
from dapr.clients import DaprClient
```

## 初始化客户端
你可以通过多种方式初始化 Dapr 客户端：

#### 默认值：
在不传入任何参数的情况下初始化客户端时，将使用 Dapr sidecar 实例的默认值（`127.0.0.1:50001`）。
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 使用客户端
```

#### 初始化时指定端点：

以构造函数参数的形式传入时，gRPC 端点优先于任何配置或环境变量。

```python
from dapr.clients import DaprClient

with DaprClient("mydomain:50051?tls=true") as d:
    # 使用客户端
```

使用 `host:port?tls=true` 或 `host:port?tls=false` 格式设置端点，以及连接是否使用 TLS。

{{% alert title="已弃用" color="warning" %}}
以 `http://` 或 `https://` 开头的 gRPC 端点（例如 `https://mydomain:443`）仍然可用，但会发出 `DeprecationWarning`，并给出等效的端点。请将其替换为 `mydomain:443?tls=true`（对应 `https://`）或 `mydomain:443?tls=false`（对应 `http://`）。Python 在许多情况下会隐藏 `DeprecationWarning`，因此请使用 `-W default` 运行以查看它。
{{% /alert %}}

#### 配置选项：

##### Dapr sidecar 端点
你可以使用标准化的 `DAPR_GRPC_ENDPOINT` 环境变量指定 gRPC 端点。设置该变量后，客户端可以在不带任何参数的情况下初始化：

```bash
export DAPR_GRPC_ENDPOINT="mydomain:50051?tls=true"
```
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 客户端将使用环境变量中指定的端点
```

要通过 Unix 域套接字连接到 sidecar，请在三个斜杠之后给出套接字的绝对路径，例如 `unix:///tmp/dapr.sock`。`DaprClient`、`WorkflowRuntime` 和 `DaprWorkflowClient` 都接受这种形式。`unix://` 之后带有主机部分的端点（例如 `unix://dapr.sock`）会在创建客户端时抛出 `ValueError`。如需使用相对路径，请写作 `unix:dapr.sock`。

旧版环境变量 `DAPR_RUNTIME_HOST`、`DAPR_HTTP_PORT` 和 `DAPR_GRPC_PORT` 同样受支持，但 `DAPR_GRPC_ENDPOINT` 优先。

`DAPR_GRPC_ENDPOINT` 中的 `http://` 和 `https://` 前缀同样已弃用，请改用 `host:port?tls=true` 或 `host:port?tls=false`。

##### Dapr API Token
如果你的 Dapr 实例配置为需要 `DAPR_API_TOKEN` 环境变量，可以在环境中设置它，客户端会自动使用。你可以在[这里](https://docs.dapr.io/operations/security/api-token/)进一步了解 Dapr API Token 认证。

##### 健康检查超时
客户端初始化时，会对 Dapr sidecar 执行健康检查（`/healthz/outbound`）。客户端会等待 sidecar 启动并运行后再继续。

默认的健康检查超时时间为 60 秒，可以通过设置 `DAPR_HEALTH_TIMEOUT` 环境变量进行覆盖。每次健康检查尝试也受此超时限制，因此一个接受连接却不响应的 sidecar 不会无限期地阻塞客户端。

##### 重试与超时

Dapr 客户端可以在从 sidecar 收到特定错误代码时重试请求。该行为通过 `DAPR_API_MAX_RETRIES` 环境变量配置，并会被自动读取，无需修改代码。`DAPR_API_MAX_RETRIES` 的默认值为 `0`，表示不进行重试。

你可以创建 `dapr.clients.retry.RetryPolicy` 对象并将其传给 DaprClient 构造函数，从而进一步微调重试参数：

```python
from dapr.clients.retry import RetryPolicy

retry = RetryPolicy(
    max_attempts=5, 
    initial_backoff=1, 
    max_backoff=20, 
    backoff_multiplier=1.5,
    retryable_http_status_codes=[408, 429, 500, 502, 503, 504],
    retryable_grpc_status_codes=[StatusCode.UNAVAILABLE, StatusCode.DEADLINE_EXCEEDED, ]
)

with DaprClient(retry_policy=retry) as d:
    ...
```

对于 Actor，可以使用以下方式：
```python
factory = ActorProxyFactory(retry_policy=RetryPolicy(max_attempts=3))
proxy = ActorProxy.create('DemoActor', ActorId('1'), DemoActorInterface, factory)
```

可以通过 `DAPR_API_TIMEOUT_SECONDS` 环境变量为所有调用设置**超时**。默认情况下不设置超时，调用会无时间限制地等待。

> 注意：`DAPR_API_TIMEOUT_SECONDS` 不适用于 workflow 客户端方法 `wait_for_workflow_start` 和 `wait_for_workflow_completion`。若未通过各自的 `timeout_in_seconds` 参数指定，它们会无时间限制地等待。传入 `timeout_in_seconds` 可以限制等待时间。参见 [Dapr Workflow 扩展]({{% ref python-workflow-ext %}})。

> 注意：你可以通过向 `invoke_method` 方法传入 `timeout` 参数，单独控制 service invocation 的超时时间。

##### macOS 上的 DNS 解析

在 macOS 上，客户端会在未设置 `GRPC_DNS_RESOLVER` 环境变量时将其设为 `native`，使 gRPC 使用操作系统的解析器。gRPC 自带的解析器可能会对系统中可以解析的主机名报 `DNS query cancelled` 错误。如需使用其他解析器，请在创建客户端之前设置 `GRPC_DNS_RESOLVER`。该变量作用于整个进程。

## 错误处理
最初，Dapr 的错误遵循[标准 gRPC 错误模型](https://grpc.io/docs/guides/error/#standard-error-model)。但为了提供更详细、信息更丰富的错误消息，Dapr 在 1.13 版本中引入了增强的错误模型，该模型与 gRPC 的 [Richer Error Model](https://grpc.io/docs/guides/error/#richer-error-model) 保持一致。为此，Python SDK 实现了 `DaprGrpcError`，这是一个自定义异常类，旨在改善开发者体验。
需要注意的是，将所有 gRPC 状态异常统一改用 `DaprGrpcError` 的工作仍在进行中。目前，并非 SDK 中的每个 API 调用都已采用这个自定义异常。我们正在积极推进这项改进，也欢迎社区贡献。

以下是在使用 Dapr Python SDK 时处理 `DaprGrpcError` 异常的示例：

```python
try:
    d.save_state(store_name=storeName, key=key, value=value)
except DaprGrpcError as err:
    print(f'Status code: {err.code()}')
    print(f"Message: {err.message()}")
    print(f"Error code: {err.error_code()}")
    print(f"Error info(reason): {err.error_info.reason}")
    print(f"Resource info (resource type): {err.resource_info.resource_type}")
    print(f"Resource info (resource name): {err.resource_info.resource_name}")
    print(f"Bad request (field): {err.bad_request.field_violations[0].field}")
    print(f"Bad request (description): {err.bad_request.field_violations[0].description}")
```

## building blocks

Python SDK 允许你与所有 [Dapr building blocks]({{% ref building-blocks %}}) 进行交互。

### 调用服务

Dapr Python SDK 提供了简单的 API，用于通过 HTTP 或 gRPC（已弃用）调用服务。可以通过设置 `DAPR_API_METHOD_INVOCATION_PROTOCOL` 环境变量来选择协议，未设置时默认为 HTTP。Dapr 中的 gRPC service invocation 已弃用，推荐使用 gRPC 代理作为替代方案。

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 调用方法（gRPC 或 HTTP GET）
    resp = d.invoke_method('service-to-invoke', 'method-to-invoke', data='{"message":"Hello World"}')

    # 对于其他 HTTP 动词，必须指定动词
    # 调用 'POST' 方法（仅 HTTP）
    resp = d.invoke_method('service-to-invoke', 'method-to-invoke', data='{"id":"100", "FirstName":"Value", "LastName":"Value"}', http_verb='post')
```

HTTP API 调用的基础端点通过 `DAPR_HTTP_ENDPOINT` 环境变量指定。
如果未设置该变量，端点值将由 `DAPR_RUNTIME_HOST` 和 `DAPR_HTTP_PORT` 变量推导得出，它们的默认值分别为 `127.0.0.1` 和 `3500`。

gRPC 调用的基础端点即客户端初始化时使用的端点（[见上文](#初始化客户端)）。


- 有关 service invocation 的完整指南，请参阅[操作指南：调用服务]({{% ref howto-invoke-discover-services.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/invoke-simple)，获取 service invocation 的示例代码和试用说明。

### 保存与获取应用状态

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 保存状态
    d.save_state(store_name="statestore", key="key1", value="value1")

    # 获取状态
    data = d.get_state(store_name="statestore", key="key1").data

    # 删除状态
    d.delete_state(store_name="statestore", key="key1")
```

- 有关完整的状态操作列表，请参阅[操作指南：获取与保存状态]({{% ref howto-get-save-state.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/state_store)，获取 State Management 的示例代码和试用说明。

### 查询应用状态（Alpha）

```python
    from dapr import DaprClient

    query = '''
    {
        "filter": {
            "EQ": { "state": "CA" }
        },
        "sort": [
            {
                "key": "person.id",
                "order": "DESC"
            }
        ]
    }
    '''

    with DaprClient() as d:
        resp = d.query_state(
            store_name='state_store',
            query=query,
            states_metadata={"metakey": "metavalue"},  # 可选
        )
```

- 有关 state store 查询选项的完整列表，请参阅[操作指南：Query State]({{% ref howto-state-query-api.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/state_store_query)，获取 state store 查询的示例代码和试用说明。

### 发布与订阅

#### 发布消息

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.publish_event(pubsub_name='pubsub', topic_name='TOPIC_A', data='{"message":"Hello World"}')
```


发送带 JSON 负载的 [CloudEvents](https://cloudevents.io/) 消息：
```python
from dapr.clients import DaprClient
import json

with DaprClient() as d:
    cloud_event = {
        'specversion': '1.0',
        'type': 'com.example.event',
        'source': 'my-service',
        'id': 'myid',
        'data': {'id': 1, 'message': 'hello world'},
        'datacontenttype': 'application/json',
    }

    # 将数据内容类型设置为 'application/cloudevents+json'
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='TOPIC_CE',
        data=json.dumps(cloud_event),
        data_content_type='application/cloudevents+json',
    )
```

以纯文本负载发布 [CloudEvents](https://cloudevents.io/) 消息：
```python
from dapr.clients import DaprClient
import json

with DaprClient() as d:
    cloud_event = {
        'specversion': '1.0',
        'type': 'com.example.event',
        'source': 'my-service',
        'id': "myid",
        'data': 'hello world',
        'datacontenttype': 'text/plain',
    }

    # 将数据内容类型设置为 'application/cloudevents+json'
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='TOPIC_CE',
        data=json.dumps(cloud_event),
        data_content_type='application/cloudevents+json',
    )
```


使用 `publish_events` 可以在一次调用中发布多条消息。`data` 中的每一项可以是 `str`、`bytes` 或 `BulkPublishEntry`。使用 `BulkPublishEntry` 可以为单条消息设置元数据、内容类型或条目 ID。`publish_metadata` 作用于每条消息，单个条目的元数据会覆盖它：
```python
from dapr.clients import BulkPublishEntry, DaprClient
import json

with DaprClient() as d:
    resp = d.publish_events(
        pubsub_name='pubsub',
        topic_name='TOPIC_A',
        data=[
            json.dumps({'id': 1, 'message': 'hello world'}),
            BulkPublishEntry(
                event=json.dumps({'id': 2, 'message': 'hello tenant-a'}),
                metadata={'partitionKey': 'tenant-a'},
            ),
        ],
        data_content_type='application/json',
        publish_metadata={'ttlInSeconds': '60'},
    )

    for entry in resp.failed_entries:
        print(f'failed entry {entry.entry_id}: {entry.error}')
```

有关更多详情，请参阅[Bulk Publish 指南]({{% ref pubsub-bulk.md %}})。

#### 订阅消息

```python
from dapr.ext.grpc import App, Rule, SubscriptionMessage

app = App()

# 某个主题的默认订阅
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A')
def mytopic(event: SubscriptionMessage) -> None:
    data = event.data()
    print(f'Received: id={data["id"]}, message="{data ["message"]}"' 
          f' content_type="{event.data_content_type()}"',flush=True)

# 使用 pub/sub 路由的特定处理程序
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A',
               rule=Rule("event.type == \"important\"", 1))
def mytopic_important(event: SubscriptionMessage) -> None:
    data = event.data()
    print(f'Received: id={data["id"]}, message="{data ["message"]}"' 
          f' content_type="{event.data_content_type()}"',flush=True)
```

将事件参数标注为 `SubscriptionMessage`，这与 streaming subscription 投递的类型相同。`data()` 会按内容类型解析负载，例如 JSON 会返回 `dict`。未标注类型的处理程序，或标注为 `cloudevents.sdk.event.v1.Event` 的处理程序，将收到已弃用的、基于 CloudEvents 的事件，并且 `subscribe()` 会发出 `DeprecationWarning`。有关弃用时间线，请参阅 [Python gRPC 扩展]({{% ref "python-grpc.md#subscribe-to-a-topic" %}})。

- 有关 pub/sub 的更多信息，请参阅[操作指南：发布与订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/pubsub-simple)，获取 pub/sub 的示例代码和试用说明。

#### 流式消息订阅

你可以使用 `subscribe` 或 `subscribe_handler` 方法创建到 PubSub 主题的 streaming subscription。

`subscribe` 方法返回一个可迭代的 `Subscription` 对象，允许你通过 `for` 循环（例如 `for message in subscription`）或调用 `next_message` 方法从流中拉取消息。在等待消息时，这会阻塞主线程。完成后，应调用 close 方法来终止订阅并停止接收消息。

如果流因瞬时错误而失败，或被 sidecar 结束，订阅会重新连接并返回下一条消息。在 Python SDK 1.19 之前，重新连接后订阅会返回 `None`，因此你不再需要检查 `None`。连续五次重新连接失败后，`next_message()` 和 `for` 循环会抛出 `StreamReconnectError`。捕获此错误后，你可以决定是创建新的订阅还是停止应用程序。

`subscribe_with_handler` 方法接受一个回调函数，对从流中接收到的每条消息执行该函数。它在单独的线程中运行，因此不会阻塞主线程。回调应返回 `TopicEventResponse`（例如 `TopicEventResponse('success')`），以表明消息是处理成功、应重试还是应丢弃。该方法会根据返回的状态自动管理消息确认。调用 `subscribe_with_handler` 方法会返回一个关闭函数，完成后应调用该函数来终止订阅。

以下是使用 `subscribe` 方法的示例：

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc.subscription import (
    StreamCancelledError,
    StreamInactiveError,
    StreamReconnectError,
)

counter = 0


def process_message(message):
    global counter
    counter += 1
    # 在此处理消息
    print(f'Processing message: {message.data()} from {message.topic()}...')
    return 'success'


def main():
    with DaprClient() as client:
        global counter

        subscription = client.subscribe(
            pubsub_name='pubsub', topic='TOPIC_A', dead_letter_topic='TOPIC_A_DEAD'
        )

        try:
            for message in subscription:
                try:
                    response_status = process_message(message)

                    if response_status == 'success':
                        subscription.respond_success(message)
                    elif response_status == 'retry':
                        subscription.respond_retry(message)
                    elif response_status == 'drop':
                        subscription.respond_drop(message)

                    if counter >= 5:
                        break
                except StreamInactiveError:
                    print('Stream is inactive. Retrying...')
                    time.sleep(1)
                    continue
                except StreamCancelledError:
                    print('Stream was cancelled')
                    break
                except Exception as e:
                    print(f'Error occurred during message processing: {e}')
        except StreamReconnectError:
            print('Stream could not be reconnected after 5 attempts')
        finally:
            print('Closing subscription...')
            subscription.close()


if __name__ == '__main__':
    main()
```

以下是使用 `subscribe_with_handler` 方法的示例：

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc._response import TopicEventResponse

counter = 0


def process_message(message):
    # 在此处理消息
    global counter
    counter += 1
    print(f'Processing message: {message.data()} from {message.topic()}...')
    return TopicEventResponse('success')


def main():
    with (DaprClient() as client):
        # 这将启动一个新线程来监听消息
        # 并在 `process_message` 函数中处理它们
        close_fn = client.subscribe_with_handler(
            pubsub_name='pubsub', topic='TOPIC_A', handler_fn=process_message,
            dead_letter_topic='TOPIC_A_DEAD'
        )

        while counter < 5:
            time.sleep(1)

        print("Closing subscription...")
        close_fn()


if __name__ == '__main__':
    main()
```

- 有关 pub/sub 的更多信息，请参阅[操作指南：发布与订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/pubsub-simple)，获取流式 pub/sub 的示例代码和试用说明。

### 对话（Alpha）

{{% alert title="注意" color="primary" %}}
Dapr conversation API 目前处于 Alpha 阶段。
{{% /alert %}}

自 1.15 版本起，Dapr 为开发者提供了通过[conversation API]({{% ref conversation-overview.md %}})安全、可靠地与大型语言模型 (LLM) 交互的能力。

```python
from dapr.clients import DaprClient
from dapr.clients.grpc.conversation import ConversationInput

with DaprClient() as d:
    inputs = [
        ConversationInput(content="What's Dapr?", role='user', scrub_pii=True),
        ConversationInput(content='Give a brief overview.', role='user', scrub_pii=True),
    ]

    metadata = {
        'model': 'foo',
        'key': 'authKey',
        'cacheTTL': '10m',
    }

    response = d.converse_alpha1(
        name='echo', inputs=inputs, temperature=0.7, context_id='chat-123', metadata=metadata
    )

    for output in response.outputs:
        print(f'Result: {output.result}')
```

### 与 output binding 交互

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.invoke_binding(binding_name='kafkaBinding', operation='create', data='{"message":"Hello World"}')
```

- 有关 output binding 的完整指南，请参阅[操作指南：使用 binding]({{% ref howto-bindings.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/invoke-binding)，获取 output binding 的示例代码和试用说明。

### 获取 secrets

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.get_secret(store_name='localsecretstore', key='secretKey')
```

- 有关 secrets 的完整指南，请参阅[操作指南：获取 secrets]({{% ref howto-secrets.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/secret_store)，获取检索 secrets 的示例代码和试用说明。

### 配置

#### 获取配置

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 获取配置
    configuration = d.get_configuration(store_name='configurationstore', keys=['orderId'], config_metadata={})
```

#### 订阅配置

```python
import asyncio
from time import sleep
from dapr.clients import DaprClient

async def executeConfiguration():
    with DaprClient() as d:
        storeName = 'configurationstore'

        key = 'orderId'

        # 等待 sidecar 在 20 秒内启动。
        d.wait(20)

        # 按键订阅配置。
        configuration = await d.subscribe_configuration(store_name=storeName, keys=[key], config_metadata={})
        while True:
            if configuration != None:
                items = configuration.get_items()
                for key, item in items:
                    print(f"Subscribe key={key} value={item.value} version={item.version}", flush=True)
            else:
                print("Nothing yet")
        sleep(5)

asyncio.run(executeConfiguration())
```

- 进一步了解如何管理配置，请参阅[操作指南：管理配置]({{% ref howto-manage-configuration.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/configuration)，获取配置的示例代码和试用说明。

### 分布式锁

```python
from dapr.clients import DaprClient

def main():
    # 锁参数
    store_name = 'lockstore'  # 与 components/lockstore.yaml 中的定义一致
    resource_id = 'example-lock-resource'
    client_id = 'example-client-id'
    expiry_in_seconds = 60

    with DaprClient() as dapr:
        print('Will try to acquire a lock from lock store named [%s]' % store_name)
        print('The lock is for a resource named [%s]' % resource_id)
        print('The client identifier is [%s]' % client_id)
        print('The lock will will expire in %s seconds.' % expiry_in_seconds)

        with dapr.try_lock(store_name, resource_id, client_id, expiry_in_seconds) as lock_result:
            assert lock_result.success, 'Failed to acquire the lock. Aborting.'
            print('Lock acquired successfully!!!')

        # 此时锁已经借助 `with` 语句的机制释放了 ;)
        unlock_result = dapr.unlock(store_name, resource_id, client_id)
        print('We already released the lock so unlocking will not work.')
        print('We tried to unlock it anyway and got back [%s]' % unlock_result.status)
```

- 进一步了解如何使用分布式锁：[操作指南：使用锁]({{% ref howto-use-distributed-lock.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/blob/master/examples/distributed_lock)，获取分布式锁的示例代码和试用说明。

### 加密

```python
from dapr.clients import DaprClient

message = 'The secret is "passw0rd"'

def main():
    with DaprClient() as d:
        resp = d.encrypt(
            data=message.encode(),
            options=EncryptOptions(
                component_name='crypto-localstorage',
                key_name='rsa-private-key.pem',
                key_wrap_algorithm='RSA',
            ),
        )
        encrypt_bytes = resp.read()

        resp = d.decrypt(
            data=encrypt_bytes,
            options=DecryptOptions(
                component_name='crypto-localstorage',
                key_name='rsa-private-key.pem',
            ),
        )
        decrypt_bytes = resp.read()

        print(decrypt_bytes.decode())  # secret 的内容为 "passw0rd"
```

- 有关加密操作的完整列表，请参阅[操作指南：使用加密 API]({{% ref howto-cryptography.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/crypto)，获取加密的示例代码和试用说明。

## 相关链接
[Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples)
