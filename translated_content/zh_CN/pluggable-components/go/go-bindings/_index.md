---
type: docs
title: "实现 Go 输入/输出绑定组件"
linkTitle: "绑定"
weight: 1000
description: 如何使用 Dapr 可插拔组件 Go SDK 创建输入/输出绑定
no_list: true
is_preview: true
---

创建绑定组件只需几个基本步骤。

## 导入绑定包

创建文件 `components/inputbinding.go` 并添加与绑定相关包的 `import` 语句。

```go
package components

import (
	"context"
	"github.com/dapr/components-contrib/bindings"
)
```

## 输入绑定：实现 `InputBinding` 接口

创建一个实现 `InputBinding` 接口的类型。

```go
type MyInputBindingComponent struct {
}

func (component *MyInputBindingComponent) Init(meta bindings.Metadata) error {
	// 调用以使用配置的元数据初始化组件...
}

func (component *MyInputBindingComponent) Read(ctx context.Context, handler bindings.Handler) error {
	// 直到取消为止，检查底层存储中的消息并将其传递给 Dapr 运行时...
}
```

预期 `Read()` 方法调用会建立一个用于检索消息的长效机制，但立即返回 `nil`（或在无法设置该机制时返回错误）。该机制应在取消时结束（例如，通过 `ctx.Done() or ctx.Err() != nil`）。当从组件的底层存储读取消息时，它们通过 `handler` 回调传递给 Dapr 运行时，该回调在应用程序（由 Dapr 运行时提供服务）确认消息处理完成之前不会返回。

```go
func (b *MyInputBindingComponent) Read(ctx context.Context, handler bindings.Handler) error {
	go func() {
		for {
			err := ctx.Err()

			if err != nil {
				return
			}
	
			messages := // 轮询消息...

            for _, message := range messages {
                handler(ctx, &bindings.ReadResponse{
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

## 输出绑定：实现 `OutputBinding` 接口

创建一个实现 `OutputBinding` 接口的类型。

```go
type MyOutputBindingComponent struct {
}

func (component *MyOutputBindingComponent) Init(meta bindings.Metadata) error {
	// 调用以使用配置的元数据初始化组件...
}

func (component *MyOutputBindingComponent) Invoke(ctx context.Context, req *bindings.InvokeRequest) (*bindings.InvokeResponse, error) {
	// 调用以调用特定操作...
}

func (component *MyOutputBindingComponent) Operations() []bindings.OperationKind {
	// 调用以列出可被调用的操作。
}
```

## 输入和输出绑定组件

组件可以同时既是输入绑定又是输出绑定。只需实现两个接口并将组件注册为两种绑定类型。

## 注册绑定组件

在主应用程序文件（例如 `main.go`）中，向应用程序注册绑定组件。

```go
package main

import (
	"example/components"
	dapr "github.com/dapr-sandbox/components-go-sdk"
	"github.com/dapr-sandbox/components-go-sdk/bindings/v1"
)

func main() {
	// 注册输入绑定...
	dapr.Register("my-inputbinding", dapr.WithInputBinding(func() bindings.InputBinding {
		return &components.MyInputBindingComponent{}
	}))

	// 注册输出绑定...
	dapr.Register("my-outputbinding", dapr.WithOutputBinding(func() bindings.OutputBinding {
		return &components.MyOutputBindingComponent{}
	}))

	dapr.MustRun()
}
```

## 后续步骤
- [可插拔组件 Go SDK 的高级技巧]({{% ref go-advanced %}})
- 了解更多关于实现：
  - [状态存储]({{% ref go-state-store %}})
  - [发布订阅]({{% ref go-pub-sub %}})
