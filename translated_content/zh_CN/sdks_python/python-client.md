---
type: docs
title: "Dapr 客户端 Python SDK 入门"
linkTitle: "客户端"
weight: 10000
description: 如何快速上手使用 Dapr Python SDK
---

Dapr 客户端包允许你从 Python 应用程序与其他 Dapr 应用程序进行交互。

{{% alert title="注意" color="primary" %}}
 如果还没有，请尝试其中一个[快速入门]({{% ref quickstarts %}})，快速了解如何将 Dapr Python SDK 与 API 构建块一起使用。

{{% /alert %}}

## 前提条件

在开始之前，[安装 Dapr Python 包]({{% ref "python#installation" %}})。

## 导入客户端包

`dapr` 包包含 `DaprClient`，用于创建和使用客户端。

```python
from dapr.clients import DaprClient
```

## 初始化客户端
你可以通过多种方式初始化 Dapr 客户端：

#### 默认值：
当不使用任何参数初始化客户端时，它将使用 Dapr 边车实例的默认值（`127.0.0.1:50001`）。
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 使用客户端
```

#### 初始化时指定端点：  
当在构造函数中作为参数传递时，gRPC 端点优先于任何配置或环境变量。

```python
from dapr.clients import DaprClient

with DaprClient("mydomain:50051?tls=true") as d:
    # 使用客户端
```  

#### 配置选项：  

##### Dapr 边车端点
你可以使用标准化的 `DAPR_GRPC_ENDPOINT` 环境变量来指定 gRPC 端点。设置此变量后，可以在不使用任何参数的情况下初始化客户端：

```bash
export DAPR_GRPC_ENDPOINT="mydomain:50051?tls=true"
```
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    # 客户端将使用环境变量中指定的端点
```  

旧的环境变量 `DAPR_RUNTIME_HOST`、`DAPR_HTTP_PORT` 和 `DAPR_GRPC_PORT` 也受支持，但 `DAPR_GRPC_ENDPOINT` 优先。

##### Dapr API 令牌
如果你的 Dapr 实例配置为需要 `DAPR_API_TOKEN` 环境变量，你可以在环境中设置它，客户端将自动使用它。  
你可以在[这里](https://docs.dapr.io/operations/security/api-token/)阅读更多关于 Dapr API 令牌身份验证的信息。

##### 健康检查超时
在客户端初始化时，会针对 Dapr 边车（`/healthz/outbound`）执行健康检查。
客户端将等待边车启动并运行后再继续。  

默认健康检查超时为 60 秒，但可以通过设置 `DAPR_HEALTH_TIMEOUT` 环境变量来覆盖。

##### 重试和超时

如果从边车收到特定的错误代码，Dapr 客户端可以重试请求。这可以通过 `DAPR_API_MAX_RETRIES` 环境变量配置，并且会自动拾取，不需要任何代码更改。
`DAPR_API_MAX_RETRIES` 的默认值是 `0`，表示不会进行重试。  

你可以通过创建 `dapr.clients.retry.RetryPolicy` 对象并将其传递给 DaprClient 构造函数来微调更多重试参数：

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

或者对于 actors：
```python
factory = ActorProxyFactory(retry_policy=RetryPolicy(max_attempts=3))
proxy = ActorProxy.create('DemoActor', ActorId('1'), DemoActorInterface, factory)
```

**超时**可以通过环境变量 `DAPR_API_TIMEOUT_SECONDS` 为所有调用设置。默认值为 60 秒。

> 注意：你可以单独控制服务调用的超时，方法是将 `timeout` 参数传递给 `invoke_method` 方法。 

## 错误处理
最初，Dapr 中的错误遵循[标准 gRPC 错误模型](https://grpc.io/docs/guides/error/#standard-error-model)。然而，为了提供更详细和更有信息量的错误消息，在 1.13 版本中引入了一个增强的错误模型，该模型与 gRPC [更丰富的错误模型](https://grpc.io/docs/guides/error/#richer-error-model)保持一致。作为响应，Python SDK 实现了 `DaprGrpcError`，这是一个自定义异常类，旨在改善开发人员体验。  
值得注意的是，对于所有 gRPC 状态异常，使用 `DaprGrpcError` 的转换正在进行中。截至目前，并非 SDK 中的每个 API 调用都已更新以利用此自定义异常。我们正在积极进行此增强，并欢迎社区的贡献。

使用 Dapr python-SDK 时处理 `DaprGrpcError` 异常的示例：

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


## 构建块

Python SDK 允许你与所有 [Dapr 构建块]({{% ref building-blocks %}}) 进行交互。

### 调用服务

Dapr Python SDK 提供了一个简单的 API，可以通过 HTTP 或 gRPC（已弃用）调用服务。可以通过设置 `DAPR_API_METHOD_INVOCATION_PROTOCOL` 环境变量来选择协议，未设置时默认为 HTTP。Dapr 中的 GRPC 服务调用已弃用，建议使用 GRPC 代理作为替代。

```python 
from dapr.clients import DaprClient

with DaprClient() as d:
    # 调用方法（gRPC 或 HTTP GET）    
    resp = d.invoke_method('service-to-invoke', 'method-to-invoke', data='{"message":"Hello World"}')

    # 对于其他 HTTP 动词，必须指定动词
    # 调用 'POST' 方法（仅 HTTP）    
    resp = d.invoke_method('service-to-invoke', 'method-to-invoke', data='{"id":"100", "FirstName":"Value", "LastName":"Value"}', http_verb='post')
```

HTTP api 调用的基本端点在 `DAPR_HTTP_ENDPOINT` 环境变量中指定。
如果未设置此变量，端点值将从 `DAPR_RUNTIME_HOST` 和 `DAPR_HTTP_PORT` 变量派生，其默认值分别为 `127.0.0.1` 和 `3500`。

gRPC 调用的基本端点是用于客户端初始化的端点（[上文解释](#initialising-the-client)）。


- 有关服务调用的完整指南，请访问[如何：调用服务]({{% ref howto-invoke-discover-services.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/invoke-simple)，获取代码示例和说明以尝试服务调用。

### 保存和获取应用程序状态

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

- 有关状态操作的完整列表，请访问[如何：获取和保存状态]({{% ref howto-get-save-state.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/state_store)，获取代码示例和说明以尝试状态管理。

### 查询应用程序状态（Alpha）

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

- 有关状态存储查询选项的完整列表，请访问[如何：查询状态]({{% ref howto-state-query-api.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/state_store_query)，获取代码示例和说明以尝试状态存储查询。

### 发布和订阅

#### 发布消息

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.publish_event(pubsub_name='pubsub', topic_name='TOPIC_A', data='{"message":"Hello World"}')
```


发送带有 json 有效负载的 [CloudEvents](https://cloudevents.io/) 消息：
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

发布带有纯文本有效负载的 [CloudEvents](https://cloudevents.io/) 消息：
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


#### 订阅消息

```python
from cloudevents.sdk.event import v1
from dapr.ext.grpc import App
import json

app = App()

# 主题的默认订阅
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A')
def mytopic(event: v1.Event) -> None:
    data = json.loads(event.Data())
    print(f'Received: id={data["id"]}, message="{data ["message"]}"' 
          ' content_type="{event.content_type}"',flush=True)

# 使用发布/订阅路由的特定处理程序
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A',
               rule=Rule("event.type == \"important\"", 1))
def mytopic_important(event: v1.Event) -> None:
    data = json.loads(event.Data())
    print(f'Received: id={data["id"]}, message="{data ["message"]}"' 
          ' content_type="{event.content_type}"',flush=True)
```

- 有关发布/订阅的更多信息，请访问[如何：发布和订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/pubsub-simple)，获取代码示例和说明以尝试发布/订阅。

#### 流式消息订阅

你可以使用 `subscribe` 或 `subscribe_handler` 方法创建对 PubSub 主题的流式订阅。

`subscribe` 方法返回一个可迭代的 `Subscription` 对象，允许你使用 `for` 循环（例如 `for message in subscription`）或调用 `next_message` 方法从流中拉取消息。这将在等待消息时阻塞主线程。
完成后，你应该调用 close 方法来终止订阅并停止接收消息。

`subscribe_with_handler` 方法接受一个回调函数，该函数对从流中接收到的每条消息执行。
它在单独的线程中运行，因此不会阻塞主线程。回调应返回一个 `TopicEventResponse`（例如 `TopicEventResponse('success')`），指示消息是成功处理、应该重试还是应该丢弃。该方法将根据返回的状态自动管理消息确认。对 `subscribe_with_handler` 方法的调用返回一个关闭函数，完成后应调用该函数以终止订阅。

以下是使用 `subscribe` 方法的示例： 

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc.subscription import StreamInactiveError, StreamCancelledError

counter = 0


def process_message(message):
    global counter
    counter += 1
    # 在此处处理消息
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
                if message is None:
                    print('No message received. The stream might have been cancelled.')
                    continue

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
    # 在此处处理消息
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

- 有关发布/订阅的更多信息，请访问[如何：发布和订阅]({{% ref howto-publish-subscribe.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/pubsub-simple)，获取代码示例和说明以尝试流式发布/订阅。

### 对话（Alpha）
 
{{% alert title="注意" color="primary" %}}
Dapr 对话 API 目前处于 alpha 阶段。
{{% /alert %}}

从 1.15 版本开始，Dapr 为开发者提供了通过[对话 API]({{% ref conversation-overview.md %}})与大型语言模型（LLM）安全可靠地交互的能力。

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

### 与输出绑定交互

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.invoke_binding(binding_name='kafkaBinding', operation='create', data='{"message":"Hello World"}')
```

- 有关输出绑定的完整指南，请访问[如何：使用绑定]({{% ref howto-bindings.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/main/examples/invoke-binding)，获取代码示例和说明以尝试输出绑定。

### 检索密钥

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    resp = d.get_secret(store_name='localsecretstore', key='secretKey')
```

- 有关密钥的完整指南，请访问[如何：检索密钥]({{% ref howto-secrets.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/secret_store)，获取代码示例和说明以尝试检索密钥

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

        # 等待边车在 20 秒内启动。
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

- 通过[如何：管理配置]({{% ref howto-manage-configuration.md %}})指南了解有关管理配置的更多信息。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/configuration)，获取代码示例和说明以尝试配置。

### 分布式锁

```python
from dapr.clients import DaprClient

def main():
    # 锁参数
    store_name = 'lockstore'  # 在 components/lockstore.yaml 中定义
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

        # 此时锁已释放 - 通过 `with` 子句的魔法 ;)
        unlock_result = dapr.unlock(store_name, resource_id, client_id)
        print('We already released the lock so unlocking will not work.')
        print('We tried to unlock it anyway and got back [%s]' % unlock_result.status)
```

- 了解有关使用分布式锁的更多信息：[如何：使用锁]({{% ref howto-use-distributed-lock.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/blob/master/examples/distributed_lock)，获取代码示例和说明以尝试分布式锁。

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

        print(decrypt_bytes.decode())  # The secret is "passw0rd"
```

- 有关状态操作的完整列表，请访问[如何：使用加密 API]({{% ref howto-cryptography.md %}})。
- 访问 [Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples/crypto)，获取代码示例和说明以尝试加密

## 相关链接
[Python SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples)
