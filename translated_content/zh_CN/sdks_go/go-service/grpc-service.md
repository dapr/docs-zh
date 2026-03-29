---
type: docs
title: "Dapr 服务（回调）SDK for Go 入门"
linkTitle: "gRPC 服务"
weight: 20000
description: 如何快速上手 Dapr Go 服务（回调）SDK
no_list: true
---

## Dapr gRPC 服务 SDK for Go

### 前置条件
首先导入 Dapr Go service/grpc 包：

```go
daprd "github.com/dapr/go-sdk/service/grpc"
```

### 创建和启动服务

要创建一个 gRPC Dapr 服务，首先，使用特定地址创建一个 Dapr 回调实例：

```go
s, err := daprd.NewService(":50001")
if err != nil {
    log.Fatalf("failed to start the server: %v", err)
}
```
或者使用地址和一个已有的 net.Listener，以便与现有的服务监听器结合：

```go
list, err := net.Listen("tcp", "localhost:0")
if err != nil {
	log.Fatalf("gRPC listener creation failed: %s", err)
}
s := daprd.NewServiceWithListener(list)
```

一旦创建了服务实例，您就可以为该服务"附加"任意数量的事件、绑定和服务调用逻辑处理器，如下所示。逻辑定义完成后，就可以启动服务了：

```go
if err := s.Start(); err != nil {
    log.Fatalf("server error: %v", err)
}
```

### 事件处理
要处理来自特定主题的事件，您需要在启动服务之前添加至少一个主题事件处理器：

```go
sub := &common.Subscription{
		PubsubName: "messages",
		Topic:      "topic1",
	}
if err := s.AddTopicEventHandler(sub, eventHandler); err != nil {
    log.Fatalf("error adding topic subscription: %v", err)
}
```

处理器方法本身可以是任何具有预期签名的方法：

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	log.Printf("event - PubsubName:%s, Topic:%s, ID:%s, Data: %v", e.PubsubName, e.Topic, e.ID, e.Data)
	// do something with the event
	return true, nil
}
```

或者，您可以使用[路由规则](https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/)，根据 CloudEvent 的内容将消息发送到不同的处理器。

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

您还可以创建一个实现 `TopicEventSubscriber` 接口的自定义类型来处理您的事件：

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
要处理服务调用，您需要在启动服务之前添加至少一个服务调用处理器：

```go
if err := s.AddServiceInvocationHandler("echo", echoHandler); err != nil {
    log.Fatalf("error adding invocation handler: %v", err)
}
```

处理器方法本身可以是任何具有预期签名的方法：

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
要处理绑定调用，您需要在启动服务之前添加至少一个绑定调用处理器：

```go
if err := s.AddBindingInvocationHandler("run", runHandler); err != nil {
    log.Fatalf("error adding binding handler: %v", err)
}
```

处理器方法本身可以是任何具有预期签名的方法：

```go
func runHandler(ctx context.Context, in *common.BindingEvent) (out []byte, err error) {
	log.Printf("binding - Data:%v, Meta:%v", in.Data, in.Metadata)
	// do something with the invocation here 
	return nil, nil
}
```

## 相关链接
- [Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples)
