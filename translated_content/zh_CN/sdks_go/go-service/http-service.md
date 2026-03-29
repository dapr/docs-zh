---
type: docs
title: "Dapr HTTP Service SDK for Go 入门"
linkTitle: "HTTP Service"
weight: 10000
description: 如何快速上手使用 Dapr HTTP Service SDK for Go
no_list: true
---

### 前置条件
首先导入 Dapr Go service/http 包：

```go
daprd "github.com/dapr/go-sdk/service/http"
```

### 创建并启动服务
要创建一个 HTTP Dapr 服务，首先需要使用特定地址创建一个 Dapr 回调实例：

```go
s := daprd.NewService(":8080")
```

或者使用地址和现有的 http.ServeMux，以便合并现有的服务器实现：

```go
mux := http.NewServeMux()
mux.HandleFunc("/", myOtherHandler)
s := daprd.NewServiceWithMux(":8080", mux)
```

创建服务实例后，您可以为该服务"附加"任意数量的事件、绑定和服务调用逻辑处理器，如下所示。一旦定义了逻辑，就可以启动服务了：

```go
if err := s.Start(); err != nil && err != http.ErrServerClosed {
	log.Fatalf("error: %v", err)
}
```

### 事件处理
要处理来自特定主题的事件，需要在启动服务之前添加至少一个主题事件处理器：

```go
sub := &common.Subscription{
	PubsubName: "messages",
	Topic:      "topic1",
	Route:      "/events",
}
err := s.AddTopicEventHandler(sub, eventHandler)
if err != nil {
	log.Fatalf("error adding topic subscription: %v", err)
}
```

处理器方法本身可以是任何符合预期签名的方法：

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	log.Printf("event - PubsubName:%s, Topic:%s, ID:%s, Data: %v", e.PubsubName, e.Topic, e.ID, e.Data)
	// do something with the event
	return true, nil
}
```

或者，您可以使用[路由规则](https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/)根据 CloudEvent 的内容将消息发送到不同的处理器。

```go
sub := &common.Subscription{
	PubsubName: "messages",
	Topic:      "topic1",
	Route:      "/important",
	Match:      `event.type == "important"`,
	Priority:   1,
}
err := s.AddTopicEventHandler(sub, importantHandler)
if err != nil {
	log.Fatalf("error adding topic subscription: %v", err)
}
```

您也可以创建一个实现了 `TopicEventSubscriber` 接口的自定义类型来处理事件：

```go
type EventHandler struct {
	// any data or references that your event handler needs.
}

func (h *EventHandler) Handle(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    log.Printf("event - PubsubName:%s, Topic:%s, ID:%s, Data: %v", e.PubsubName, e.Topic, e.ID, e.Data)
    // do something with the event
    return true, nil
}
```

然后可以使用 `AddTopicEventSubscriber` 方法添加 `EventHandler`：

```go
sub := &common.Subscription{
    PubsubName: "messages",
    Topic:      "topic1",
}
eventHandler := &EventHandler{
// initialize any fields
}
if err := s.AddTopicEventSubscriber(sub, eventHandler); err != nil {
    log.Fatalf("error adding topic subscription: %v", err)
}
```

### 服务调用处理器
要处理服务调用，需要在启动服务之前添加至少一个服务调用处理器：

```go
if err := s.AddServiceInvocationHandler("/echo", echoHandler); err != nil {
	log.Fatalf("error adding invocation handler: %v", err)
}
```

处理器方法本身可以是任何符合预期签名的方法：

```go
func echoHandler(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {
	log.Printf("echo - ContentType:%s, Verb:%s, QueryString:%s, %+v", in.ContentType, in.Verb, in.QueryString, string(in.Data))
	// do something with the invocation here 
	out = &common.Content{
		Data:        in.Data,
		ContentType: in.ContentType,
		DataTypeURL: in.DataTypeURL,
	}
	return
}
```

### 绑定调用处理器

```go
if err := s.AddBindingInvocationHandler("/run", runHandler); err != nil {
	log.Fatalf("error adding binding handler: %v", err)
}
```

处理器方法本身可以是任何符合预期签名的方法：

```go
func runHandler(ctx context.Context, in *common.BindingEvent) (out []byte, err error) {
	log.Printf("binding - Data:%v, Meta:%v", in.Data, in.Metadata)
	// do something with the invocation here 
	return nil, nil
}
```

## 相关链接
- [Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples)
