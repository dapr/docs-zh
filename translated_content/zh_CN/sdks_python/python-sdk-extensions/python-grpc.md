---
type: docs
title: "Dapr Python gRPC 服务扩展入门"
linkTitle: "gRPC"
weight: 100000
description: 如何快速上手 Dapr Python gRPC 扩展
---

Dapr Python SDK 提供了一个内置的 gRPC 服务器扩展 `dapr.ext.grpc`，用于创建 Dapr 服务。

## 安装

你可以通过以下命令下载并安装 Dapr gRPC 服务器扩展：

{{< tabpane text=true >}}

{{% tab header="Stable" %}}
```bash
pip install "dapr[grpc]"
```
{{% /tab %}}

{{% tab header="Development" %}}
{{% alert title="注意" color="warning" %}}
开发版将包含与 Dapr 运行时预发布版本兼容的功能和行为。只有打过标签的正式版本会发布到 PyPI，因此请从 GitHub 仓库安装开发版。安装之前，请确保卸载所有稳定版本的 Python SDK。
{{% /alert %}}

```bash
pip install "dapr[grpc] @ git+https://github.com/dapr/python-sdk.git@main"
```
{{% /tab %}}

{{< /tabpane >}}

从 Dapr 1.19 开始，该扩展成为 `dapr` 包的可选依赖（extra）。`dapr-ext-grpc` 包不再发布。如果你之前安装过它，请按照[升级步骤]({{% ref "python#install-extensions" %}})迁移到该可选依赖。导入路径保持不变。

## 示例

可以使用 `App` 对象创建服务器。

### 监听服务调用请求

可以使用 `InvokeMethodReqest` 和 `InvokeMethodResponse` 对象处理传入的请求。

一个能够监听并响应请求的简单服务大致如下：

```python
from dapr.ext.grpc import App, InvokeMethodRequest, InvokeMethodResponse

app = App()

@app.method(name='my-method')
def mymethod(request: InvokeMethodRequest) -> InvokeMethodResponse:
    print(request.metadata, flush=True)
    print(request.text(), flush=True)

    return InvokeMethodResponse(b'INVOKE_RECEIVED', "text/plain; charset=UTF-8")

app.run(50051)
```

完整示例可在[此处](https://github.com/dapr/python-sdk/tree/v1.0.0rc2/examples/invoke-simple)找到。

### 订阅主题

订阅主题时，你可以指示 Dapr 已接受投递的事件，还是应当丢弃它，或稍后重试。

请为每个处理程序的事件参数标注 `SubscriptionMessage` 类型，它与流式订阅投递的类型相同。该类型提供解析后的负载（`data()`）、投递元数据（`metadata()`），以及 CloudEvent 字段，例如 `id()`、`type()` 和 `extensions()`。

```python
from typing import Optional
from dapr.ext.grpc import App, Rule, SubscriptionMessage
from dapr.clients.grpc._response import TopicEventResponse

app = App()

# 主题的默认订阅
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A')
def mytopic(event: SubscriptionMessage) -> Optional[TopicEventResponse]:
    print(event.data(),flush=True)
    # 返回 None（或不显式返回）等效于
    # 返回 TopicEventResponse("success")。
    # 你也可以返回 TopicEventResponse("retry")，让 dapr 记录
    # 该消息并稍后重试投递，或返回 TopicEventResponse("drop")
    # 让其丢弃该消息
    return TopicEventResponse("success")

# 使用 Pub/Sub 路由的特定处理程序
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A',
               rule=Rule("event.type == \"important\"", 1))
def mytopic_important(event: SubscriptionMessage) -> None:
    print(event.data(),flush=True)

# 禁用主题验证的处理程序
@app.subscribe(pubsub_name='pubsub-mqtt', topic='topic/#', disable_topic_validation=True,)
def mytopic_wildcard(event: SubscriptionMessage) -> None:
    print(event.data(),flush=True)

app.run(50051)
```

完整示例可在[此处](https://github.com/dapr/python-sdk/blob/v1.0.0rc2/examples/pubsub-simple/subscriber.py)找到。

{{% alert title="已弃用" color="warning" %}}
未标注类型的处理程序，或标注为 `cloudevents.sdk.event.v1.Event` 的处理程序，会接收基于 CloudEvents 的事件，并且 `subscribe()` 在注册这些处理程序时会发出 `DeprecationWarning`。请在该类型被移除之前，为它们标注 `SubscriptionMessage`：
- 在 1.20 中，未标注类型的处理程序将接收 `SubscriptionMessage`。只有标注为 CloudEvents 类型的处理程序仍会接收该类型的事件。
- 在 1.21 中，`dapr[grpc]` 可选依赖不再安装 `cloudevents`。
- 在 1.22 中，基于 CloudEvents 的类型将被移除。
{{% /alert %}}

### 设置输入绑定触发器

```python
from dapr.ext.grpc import App, BindingRequest

app = App()

@app.binding('kafkaBinding')
def binding(request: BindingRequest):
    print(request.text(), flush=True)

app.run(50051)
```

完整示例可在[此处](https://github.com/dapr/python-sdk/tree/v1.0.0rc2/examples/invoke-binding)找到。

## 相关链接
- [PyPi](https://pypi.org/project/dapr/)
