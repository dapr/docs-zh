---
type: docs
title: "操作指南：路由消息到不同的事件处理器"
linkTitle: "操作指南：路由事件"
weight: 2300
description: "了解如何根据 CloudEvent 字段将主题中的消息路由到不同的事件处理器"
---

发布订阅路由是[基于内容的路由](https://www.enterpriseintegrationpatterns.com/ContentBasedRouter.html)的一种实现，这是一种利用 DSL 而非命令式应用程序代码的消息传递模式。通过发布订阅路由，你可以使用表达式将 [CloudEvents](https://cloudevents.io)（基于其内容）路由到应用程序中不同的 URI/路径和事件处理器。如果没有匹配的路由，则使用可选的默认路由。随着应用程序扩展以支持多个事件版本或特殊情况，这被证明是有用的。

虽然路由可以用代码实现，但将路由规则与应用程序外部化可以提高可移植性。

此功能同时适用于[声明式和编程式订阅方法]({{% ref subscription-methods %}}) ，但不适用于流式订阅。

## 声明式订阅

对于声明式订阅，使用 `dapr.io/v2alpha1` 作为 `apiVersion`。以下是使用路由的 `subscriptions.yaml` 示例：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: myevent-subscription
spec:
  pubsubname: pubsub
  topic: inventory
  routes:
    rules:
      - match: event.type == "widget"
        path: /widgets
      - match: event.type == "gadget"
        path: /gadgets
    default: /products
scopes:
  - app1
  - app2
```

## 编程式订阅

在编程式方法中，返回 `routes` 结构而不是 `route`。JSON 结构与声明式 YAML 匹配：

{{< tabpane text=true >}}

{{% tab "Python" %}}
```python
import flask
from flask import request, jsonify
from flask_cors import CORS
import json
import sys

app = flask.Flask(__name__)
CORS(app)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
      {
        'pubsubname': 'pubsub',
        'topic': 'inventory',
        'routes': {
          'rules': [
            {
              'match': 'event.type == "widget"',
              'path': '/widgets'
            },
            {
              'match': 'event.type == "gadget"',
              'path': '/gadgets'
            },
          ],
          'default': '/products'
        }
      }]
    return jsonify(subscriptions)

@app.route('/products', methods=['POST'])
def ds_subscriber():
    print(request.json, flush=True)
    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}
app.run()
```

{{% /tab %}}
\
[GB](translated_content/zh_CN/docs/developing-applications/building-blocks/pubsub/howto-route-messages.md)
