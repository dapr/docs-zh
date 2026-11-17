---
type: docs
title: "Dapr Python SDK 与 FastAPI 集成"
linkTitle: "FastAPI"
weight: 200000
description: 如何使用 FastAPI 扩展创建 Dapr Python virtual Actor 和发布订阅
---

Dapr Python SDK 通过 `dapr.ext.fastapi` 扩展提供与 FastAPI 的集成。

## 安装

你可以通过以下命令下载并安装 Dapr FastAPI 扩展：

{{< tabpane text=true >}}

{{% tab header="稳定版" %}}
```bash
pip install "dapr[fastapi]"
```
{{% /tab %}}

{{% tab header="开发版" %}}
{{% alert title="注意" color="warning" %}}
开发版将包含与 Dapr runtime 预发布版本兼容的功能和行为。只有带标签的正式版本才会发布到 PyPI，因此请从 GitHub 仓库安装开发版。安装前请确保卸载所有稳定版的 Python SDK。
{{% /alert %}}

```bash
pip install "dapr[fastapi] @ git+https://github.com/dapr/python-sdk.git@main"
```
{{% /tab %}}

{{< /tabpane >}}

从 Dapr 1.19 开始，该扩展是 `dapr` 包的一个 extra（可选依赖组）。`dapr-ext-fastapi` 包不再发布。如果你之前安装过它，请按照[升级步骤]({{% ref "python#install-extensions" %}})迁移到该 extra。导入路径不变。

## 示例

### 订阅不同类型的事件

```python
import uvicorn
from fastapi import Body, FastAPI
from dapr.ext.fastapi import DaprApp
from pydantic import BaseModel

class RawEventModel(BaseModel):
    body: str

class User(BaseModel):
    id: int
    name: str

class CloudEventModel(BaseModel):
    data: User
    datacontenttype: str
    id: str
    pubsubname: str
    source: str
    specversion: str
    topic: str
    traceid: str
    traceparent: str
    tracestate: str
    type: str    
    
    
app = FastAPI()
dapr_app = DaprApp(app)

# 允许处理任意结构的事件（最简单，但健壮性最差）
# dapr publish --publish-app-id sample --topic any_topic --pubsub pubsub --data '{"id":"7", "desc": "good", "size":"small"}'
@dapr_app.subscribe(pubsub='pubsub', topic='any_topic')
def any_event_handler(event_data = Body()):
    print(event_data)    

# 为了健壮性，请根据发布者是否使用 CloudEvents，选择以下方式之一

# 处理使用 CloudEvents 发送的事件
# dapr publish --publish-app-id sample --topic cloud_topic --pubsub pubsub --data '{"id":"7", "name":"Bob Jones"}'
@dapr_app.subscribe(pubsub='pubsub', topic='cloud_topic')
def cloud_event_handler(event_data: CloudEventModel):
    print(event_data)   

# 处理未使用 CloudEvents 发送的原始事件
# curl -X "POST" http://localhost:3500/v1.0/publish/pubsub/raw_topic?metadata.rawPayload=true -H "Content-Type: application/json" -d '{"body": "345"}'
@dapr_app.subscribe(pubsub='pubsub', topic='raw_topic')
def raw_event_handler(event_data: RawEventModel):
    print(event_data)    

 

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=30212)
```

### 创建 Actor

```python
from fastapi import FastAPI
from dapr.ext.fastapi import DaprActor
from demo_actor import DemoActor

app = FastAPI(title=f'{DemoActor.__name__}Service')

# 添加 Dapr Actor 扩展
actor = DaprActor(app)

@app.on_event("startup")
async def startup_event():
    # 注册 DemoActor
    await actor.register_actor(DemoActor)

@app.get("/GetMyData")
def get_my_data():
    return "{'message': 'myData'}"
```
