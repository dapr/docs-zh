---
type: docs
title: "Dapr Python gRPC 服务扩展入门"
linkTitle: "gRPC"
weight: 100000
description: 如何快速上手 Dapr Python gRPC 扩展
---

Dapr Python SDK 提供了一个内置的 gRPC 服务器扩展 `dapr.ext.grpc`，用于创建 Dapr 服务。

## 安装

您可以通过以下命令下载并安装 Dapr gRPC 服务器扩展：

{{< tabpane text=true >}}

{{% tab header="Stable" %}}
```bash
pip install dapr-ext-grpc
```
{{% /tab %}}

{{% tab header="Development" %}}
{{% alert title="注意" color="warning" %}}
开发包包含的功能和行为将与 Dapr 运行时的预发布版本兼容。在安装 `dapr-dev` 包之前，请确保卸载 Python SDK 扩展的任何稳定版本。
{{% /alert %}}

```bash
pip3 install dapr-ext-grpc-dev
```
{{% /tab %}}

{{< /tabpane >}}

## 示例

`App` 对象可用于创建服务器。

### 监听服务调用请求

`InvokeMethodReqest` 和 `InvokeMethodResponse` 对象可用于处理传入请求。

一个简单的监听并响应请求的服务如下所示：

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

在订阅主题时，您可以指示 Dapr 已接受传递的事件，还是应该丢弃该事件或稍后重试。

```python
from typing import Optional
from cloudevents.sdk.event import v1
from dapr.ext.grpc import App
from dapr.clients.grpc._response import TopicEventResponse

app = App()

# 主题的默认订阅
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A')
def mytopic(event: v1.Event) -> Optional[TopicEventResponse]:
    print(event.Data(),flush=True)
    # 返回 None（或不显式返回）等效于
    # 返回 TopicEventResponse("success")。
    # 您也可以返回 TopicEventResponse("retry") 让 dapr 记录
    # 该消息并稍后重试传递，或返回 TopicEventResponse("drop")
    # 让其丢弃该消息
    return TopicEventResponse("success")

# 使用发布订阅路由的特定处理程序
@app.subscribe(pubsub_name='pubsub', topic='TOPIC_A',
               rule=Rule("event.type == \"important\"", 1))
def mytopic_important(event: v1.Event) -> None:
    print(event.Data(),flush=True)

# 禁用主题验证的处理程序
@app.subscribe(pubsub_name='pubsub-mqtt', topic='topic/#', disable_topic_validation=True,)
def mytopic_wildcard(event: v1.Event) -> None:
    print(event.Data(),flush=True)

app.run(50051)
```

完整示例可在[此处](https://github.com/dapr/python-sdk/blob/v1.0.0rc2/examples/pubsub-simple/subscriber.py)找到。

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
- [PyPi](https://pypi.org/project/dapr-ext-grpc/)
