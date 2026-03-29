---
type: docs
title: "操作指南：将消息路由到不同的事件处理程序"
linkTitle: "操作指南：路由事件"
weight: 2300
description: "了解如何根据 CloudEvent 字段将消息从主题路由到不同的事件处理程序"
---

发布订阅路由是[基于内容的路由](https://www.enterpriseintegrationpatterns.com/ContentBasedRouter.html)的一种实现，这是一种使用 DSL 而非命令式应用程序代码的消息传递模式。通过发布订阅路由，你可以使用表达式根据内容将 [CloudEvents](https://cloudevents.io) 路由到应用程序中的不同 URI/路径和事件处理程序。如果没有路由匹配，则使用可选的默认路由。当应用程序扩展以支持多个事件版本或特殊情况时，这非常有用。

虽然路由可以通过代码实现，但将路由规则保持在应用程序外部可以提高可移植性。

此功能适用于[声明式和编程式订阅方法]({{% ref subscription-methods %}})，但不适用于流式订阅。

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

{{% tab "JavaScript" %}}
```javascript
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json({ type: 'application/*+json' }));

const port = 3000

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "inventory",
      routes: {
        rules: [
          {
            match: 'event.type == "widget"',
            path: '/widgets'
          },
          {
            match: 'event.type == "gadget"',
            path: '/gadgets'
          },
        ],
        default: '/products'
      }
    }
  ]);
})

app.post('/products', (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

app.listen(port, () => console.log(`consumer app listening on port ${port}!`))
```
{{% /tab %}}

{{% tab ".NET" %}}
```csharp
        [Topic("pubsub", "inventory", "event.type ==\"widget\"", 1)]
        [HttpPost("widgets")]
        public async Task<ActionResult<Stock>> HandleWidget(Widget widget, [FromServices] DaprClient daprClient)
        {
            // Logic
            return stock;
        }

        [Topic("pubsub", "inventory", "event.type ==\"gadget\"", 2)]
        [HttpPost("gadgets")]
        public async Task<ActionResult<Stock>> HandleGadget(Gadget gadget, [FromServices] DaprClient daprClient)
        {
            // Logic
            return stock;
        }

        [Topic("pubsub", "inventory")]
        [HttpPost("products")]
        public async Task<ActionResult<Stock>> HandleProduct(Product product, [FromServices] DaprClient daprClient)
        {
            // Logic
            return stock;
        }
```
{{% /tab %}}

{{% tab "Go" %}}
```golang
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

const appPort = 3000

type subscription struct {
	PubsubName string            `json:"pubsubname"`
	Topic      string            `json:"topic"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	Routes     routes            `json:"routes"`
}

type routes struct {
	Rules   []rule `json:"rules,omitempty"`
	Default string `json:"default,omitempty"`
}

type rule struct {
	Match string `json:"match"`
	Path  string `json:"path"`
}

// This handles /dapr/subscribe
func configureSubscribeHandler(w http.ResponseWriter, _ *http.Request) {
	t := []subscription{
		{
			PubsubName: "pubsub",
			Topic:      "inventory",
			Routes: routes{
				Rules: []rule{
					{
						Match: `event.type == "widget"`,
						Path:  "/widgets",
					},
					{
						Match: `event.type == "gadget"`,
						Path:  "/gadgets",
					},
				},
				Default: "/products",
			},
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(t)
}

func main() {
	router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/dapr/subscribe", configureSubscribeHandler).Methods("GET")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", appPort), router))
}
```
{{% /tab %}}

{{% tab "PHP" %}}
```php
<?php

require_once __DIR__.'/vendor/autoload.php';

$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions(['dapr.subscriptions' => [
    new \Dapr\PubSub\Subscription(pubsubname: 'pubsub', topic: 'inventory', routes: (
      rules: => [
        ('match': 'event.type == "widget"', path: '/widgets'),
        ('match': 'event.type == "gadget"', path: '/gadgets'),
      ]
      default: '/products')),
]]));
$app->post('/products', function(
    #[\Dapr\Attributes\FromBody]
    \Dapr\PubSub\CloudEvent $cloudEvent,
    \Psr\Log\LoggerInterface $logger
    ) {
        $logger->alert('Received event: {event}', ['event' => $cloudEvent]);
        return ['status' => 'SUCCESS'];
    }
);
$app->start();
```
{{% /tab %}}

{{< /tabpane >}}

## 通用表达式语言 (CEL)

在这些示例中，根据 `event.type` 的不同，应用程序将在以下路径被调用：

- `/widgets`
- `/gadgets`
- `/products`

表达式以[通用表达式语言 (CEL)](https://github.com/google/cel-spec)编写，其中 `event` 表示云事件。可以引用 [CloudEvents 核心规范](https://github.com/cloudevents/spec/blob/v1.0.1/spec#required-attributes)中的任何属性。

### 表达式示例

匹配"重要"消息：

```javascript
has(event.data.important) && event.data.important == true
```

匹配大于 $10,000 的存款：

```javascript
event.type == "deposit" && int(event.data.amount) > 10000
```
{{% alert title="注意" color="primary" %}}
默认情况下，数值以双精度浮点数形式写入。数值没有自动算术转换。在这种情况下，如果 `event.data.amount` 未转换为整数，则不会执行匹配。有关更多信息，请参阅 [CEL 文档](https://github.com/google/cel-spec/blob/master/doc/langdef.md)。
{{% /alert %}}

匹配消息的多个版本：

```javascript
event.type == "mymessage.v1"
```

```javascript
event.type == "mymessage.v2"
```

## CloudEvent 属性

作为参考，以下属性来自 CloudEvents 规范。

### 事件数据

#### data

根据术语 **data** 的定义，CloudEvents _可能_包含有关发生的领域特定信息。如果存在，此信息将封装在 `data` 中。

- **描述：** 事件负载。此规范不对信息类型施加限制。它被编码为由 `datacontenttype` 属性指定的媒体格式（例如 application/json），并在存在相应属性时遵循 `dataschema` 格式。
- **约束：**
  - 可选 (OPTIONAL)

{{% alert title="限制" color="warning" %}}
目前，只有当 data 是嵌套的 JSON 值而不是字符串中的 JSON 转义时，你才能访问 data 内部的属性。
{{% /alert %}}

### 必需属性

以下属性在所有 CloudEvents 中是**必需**的：

#### id

- **类型：** `String`
- **描述：** 标识事件。生产者_必须_确保 `source` + `id` 对于每个不同的事件都是唯一的。如果重复事件被重新发送（例如由于网络错误），它可能具有相同的 `id`。消费者可以假定具有相同 `source` 和 `id` 的事件是重复的。
- **约束：**
  - 必需 (REQUIRED)
  - 必须是非空字符串
  - 必须在生产者范围内唯一
- **示例：**
  - 生产者维护的事件计数器
  - UUID

#### source

- **类型：** `URI-reference`
- **描述：** 标识事件发生的上下文。通常这包括以下信息：
  - 事件源的类型
  - 发布事件的组织
  - 产生事件的进程
  
  URI 中编码的数据的确切语法和语义由事件生产者定义。

  生产者_必须_确保 `source` + `id` 对于每个不同的事件都是唯一的。

  应用程序可以：
  - 为每个不同的生产者分配唯一的 `source`，从而更容易生成唯一 ID 并防止其他生产者具有相同的 `source`。
  - 使用 UUID、URN、DNS 权限或应用程序特定的方案来创建唯一的 `source` 标识符。

  一个源可能包含多个生产者。在这种情况下，生产者_必须_协作以确保 `source` + `id` 对于每个不同的事件都是唯一的。

- **约束：**
  - 必需 (REQUIRED)
  - 必须是非空 URI 引用
  - 建议使用绝对 URI
- **示例：**
  - 具有 DNS 权限的互联网范围内唯一 URI：
    - https://github.com/cloudevents
    - mailto:cncf-wg-serverless@lists.cncf.io
  - 具有 UUID 的通用唯一 URN：
    - urn:uuid:6e8bc430-9c3a-11d9-9669-0800200c9a66
  - 应用程序特定的标识符：
    - /cloudevents/spec/pull/123
    - /sensors/tn-1234567/alerts
    - 1-555-123-4567

#### specversion

- **类型：** `String`
- **描述：** 事件使用的 CloudEvents 规范版本。这能够解释上下文。合规的事件生产者在引用此版本的规范时_必须_使用值 `1.0`。

  目前，此属性仅包含"主"和"次"版本号。这允许对规范进行补丁更改而不更改序列化中此属性的值。

  注意：对于"候选版本"版本，可能会使用后缀进行测试目的。

- **约束：**
  - 必需 (REQUIRED)
  - 必须是非空字符串

#### type

- **类型：** `String`
- **描述：** 包含一个描述与源发事件相关的事件类型的值。通常，此属性用于路由、可观测性、策略执行等。格式由生产者定义，可能包括 `type` 的版本等信息。有关更多信息，请参阅 [Primer 中的 CloudEvents 版本控制](https://github.com/cloudevents/spec/blob/v1.0.1/primer.md#versioning-of-cloudevents)。
- **约束：**
  - 必需 (REQUIRED)
  - 必须是非空字符串
  - 应以前向 DNS 名称作为前缀。前缀域指示组织，该组织定义此事件类型的语义。
- **示例：**
  - com.github.pull_request.opened
  - com.example.object.deleted.v2

### 可选属性

以下属性在 CloudEvents 中是**可选**的。有关 OPTIONAL 定义的更多信息，请参阅[符号约定](https://github.com/cloudevents/spec/blob/v1.0.1/spec.md#notational-conventions)部分。

#### datacontenttype

- **类型：** `String`，根据 [RFC 2046](https://tools.ietf.org/html/rfc2046)
- **描述：** `data` 值的内容类型。此属性使 `data` 能够承载任何类型的内容，其中格式和编码可能与所选事件格式的不同。

  例如，使用 [JSON 信封](https://github.com/cloudevents/spec/blob/v1.0.1/json-format.md#3-envelope)格式渲染的事件可能在 `data` 中承载 XML 负载。通过将此属性设置为 `"application/xml"` 来通知消费者。

  对于不同 `datacontenttype` 值如何渲染 `data` 内容的规则在事件格式规范中定义。例如，JSON 事件格式在[第 3.1 节](https://github.com/cloudevents/spec/blob/v1.0.1/json-format.md#31-handling-of-data)中定义了关系。

  对于某些二进制模式协议绑定，此字段直接映射到相应协议的 content-type 元数据属性。你可以在相应协议中找到二进制模式和 content-type 元数据映射的规范规则。

  在某些事件格式中，你可以省略 `datacontenttype` 属性。例如，如果 JSON 格式事件没有 `datacontenttype` 属性，则暗示 `data` 是符合 `"application/json"` 媒体类型的 JSON 值。换句话说：没有 `datacontenttype` 的 JSON 格式事件与具有 `datacontenttype="application/json"` 的事件完全等效。

  将没有 `datacontenttype` 属性的事件消息转换为不同格式或协议绑定时，应将目标 `datacontenttype` 显式设置为源的隐式 `datacontenttype`。

- **约束：**
  - 可选 (OPTIONAL)
  - 如果存在，必须遵守 [RFC 2046](https://tools.ietf.org/html/rfc2046) 中指定的格式
- 有关媒体类型示例，请参阅 [IANA 媒体类型](https://www.iana.org/assignments/media-types/media-types.xhtml)

#### dataschema

- **类型：** `URI`
- **描述：** 标识 `data` 遵循的模式。对模式的不兼容更改应通过不同的 URI 反映。有关更多信息，请参阅 [Primer 中的 CloudEvents 版本控制](https://github.com/cloudevents/spec/blob/v1.0.1/primer.md#versioning-of-cloudevents)。
- **约束：**
  - 可选 (OPTIONAL)
  - 如果存在，必须是非空 URI

#### subject

- **类型：** `String`
- **描述：** 这在事件生产者（由 `source` 标识）的上下文中描述事件主题。在发布-订阅场景中，订阅者通常会订阅由 `source` 发出的事件。如果 `source` 上下文具有内部子结构，则单独的 `source` 标识符可能不足以作为任何特定事件的限定符。

  在上下文元数据中标识事件主题（而不是仅在 `data` 负载中）对于通用订阅过滤场景很有帮助，在这些场景中，中间件无法解释 `data` 内容。在上述示例中，订阅者可能只对名称以 '.jpg' 或 '.jpeg' 结尾的 blob 感兴趣。使用 `subject` 属性，你可以为该事件子集构建简单而高效的字符串后缀过滤器。

- **约束：**
  - 可选 (OPTIONAL)
  - 如果存在，必须是非空字符串
- **示例：**  
  订阅者可能注册对新 blob 在 blob 存储容器中创建时的兴趣。在这种情况下：
  - 事件 `source` 标识订阅范围（存储容器）
  - 事件 `type` 标识"blob 已创建"事件
  - 事件 `id` 唯一标识事件实例，以区分同名的 blob 的单独创建事件。
  
  新创建的 blob 的名称承载在 `subject` 中：
  - `source`: https://example.com/storage/tenant/container
  - `subject`: mynewfile.jpg

#### time

- **类型：** `Timestamp`
- **描述：** 事件发生时的时间戳。如果无法确定事件发生的时间，则 CloudEvents 生产者可以将此属性设置为其他时间（例如当前时间）。但是，同一 `source` 的所有生产者在这方面_必须_保持一致。换句话说，它们要么都使用事件的实际时间，要么都使用相同的算法来确定使用的值。
- **约束：**
  - 可选 (OPTIONAL)
  - 如果存在，必须遵守 [RFC 3339](https://tools.ietf.org/html/rfc3339) 中指定的格式

{{% alert title="限制" color="warning" %}}
目前，不支持与时间的比较（例如"现在"之前或之后）。
{{% /alert %}}

## 社区电话演示

观看[此视频](https://www.youtube.com/watch?v=QqJgRmbH82I&t=1063s)，了解如何使用发布订阅进行消息路由：

{{< youtube id=QqJgRmbH82I start=1063 >}}

## 后续步骤

- 尝试[发布订阅路由示例](https://github.com/dapr/samples/tree/master/pub-sub-routing)。
- 了解[主题范围]({{% ref pubsub-scopes %}})和[消息存活时间]({{% ref pubsub-message-ttl %}})。
- [配置具有多个命名空间的发布订阅组件]({{% ref pubsub-namespaces %}})。
- 查看[发布订阅组件]({{% ref setup-pubsub %}})列表。
- 阅读 [API 参考]({{% ref pubsub_api %}})。
