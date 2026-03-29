---
type: docs
title: "实现 Go 发布订阅组件"
linkTitle: "发布订阅"
weight: 1000
description: 如何使用 Dapr 可插拔组件 Go SDK 创建发布订阅组件
no_list: true
is_preview: true
---

创建发布订阅组件只需要几个基本步骤。

## 导入发布订阅包

创建文件 `components/pubsub.go` 并添加发布订阅相关包的 `import` 语句。

```go
package components

import (
	"context"
	"github.com/dapr/components-contrib/pubsub"
)
```

## 实现 `PubSub` 接口

创建一个实现 `PubSub` 接口的类型。

```go
type MyPubSubComponent struct {
}

func (component *MyPubSubComponent) Init(metadata pubsub.Metadata) error {
	// 调用此方法以使用配置的元数据初始化组件...
}

func (component *MyPubSubComponent) Close() error {
    // 不用于可插拔组件...
	return nil
}

func (component *MyPubSubComponent) Features() []pubsub.Feature {
	// 返回组件支持的功能列表...
}

func (component *MyPubSubComponent) Publish(req *pubsub.PublishRequest) error {
	// 将消息发送到 "topic"...
}

func (component *MyPubSubComponent) Subscribe(ctx context.Context, req pubsub.SubscribeRequest, handler pubsub.Handler) error {
	// 在取消之前，持续检查 topic 是否有消息并将其传递给 Dapr 运行时...
}
```

对 `Subscribe()` 方法的调用预期会建立一个用于检索消息的长效机制，但立即返回 `nil`（或错误，如果无法建立该机制）。该机制应在取消时结束（例如，通过 `ctx.Done()` 或 `ctx.Err() != nil`）。应从中拉取消息的 "topic" 通过 `req` 参数传递，而传递给 Dapr 运行时则通过 `handler` 回调执行。回调在应用程序（由 Dapr 运行时提供服务）确认消息处理后才会返回。

```go
func (component *MyPubSubComponent) Subscribe(ctx context.Context, req pubsub.SubscribeRequest, handler pubsub.Handler) error {
	go func() {
		for {
			err := ctx.Err()

			if err != nil {
				return
			}
	
			messages := // 轮询消息...

            for _, message := range messages {
                handler(ctx, &pubsub.NewMessage{
                    // 设置消息内容...
                })
            }

			select {
				case <-ctx.Done():
				case <-time.After(5 * time.Second):
			} 
		}
	}()

	return nil
}
```

## 注册发布订阅组件

在主应用程序文件（例如 `main.go`）中，向应用程序注册发布订阅组件。

```go
package main

import (
	"example/components"
	dapr "github.com/dapr-sandbox/components-go-sdk"
	"github.com/dapr-sandbox/components-go-sdk/pubsub/v1"
)

func main() {
	dapr.Register("<socket name>", dapr.WithPubSub(func() pubsub.PubSub {
		return &components.MyPubSubComponent{}
	}))

	dapr.MustRun()
}
```

## 后续步骤
- [可插拔组件 Go SDK 的高级技巧]({{% ref go-advanced %}})
- 了解有关实现的更多信息：
  - [绑定]({{% ref go-bindings %}})
  - [状态]({{% ref go-state-store %}})
