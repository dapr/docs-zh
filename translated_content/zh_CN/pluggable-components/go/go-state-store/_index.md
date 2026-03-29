---
type: docs
title: "实现 Go 状态存储组件"
linkTitle: "状态存储"
weight: 1000
description: 如何使用 Dapr 可插拔组件 Go SDK 创建状态存储
no_list: true
is_preview: true
---

创建状态存储组件只需要几个基本步骤。

## 导入状态存储包

创建文件 `components/statestore.go` 并添加状态存储相关包的 `import` 语句。

```go
package components

import (
	"context"
	"github.com/dapr/components-contrib/state"
)
```

## 实现 `Store` 接口

创建一个实现 `Store` 接口的类型。

```go
type MyStateStore struct {
}

func (store *MyStateStore) Init(metadata state.Metadata) error {
	// 使用配置的元数据初始化组件时调用...
}

func (store *MyStateStore) GetComponentMetadata() map[string]string {
    // 可插拔组件不使用此方法...
	return map[string]string{}
}

func (store *MyStateStore) Features() []state.Feature {
	// 返回状态存储支持的功能列表...
}

func (store *MyStateStore) Delete(ctx context.Context, req *state.DeleteRequest) error {
	// 从状态存储中删除请求的键...
}

func (store *MyStateStore) Get(ctx context.Context, req *state.GetRequest) (*state.GetResponse, error) {
	// 从状态存储中获取请求的键值，否则返回空响应...
}

func (store *MyStateStore) Set(ctx context.Context, req *state.SetRequest) error {
	// 在状态存储中将请求的键设置为指定值...
}

func (store *MyStateStore) BulkGet(ctx context.Context, req []state.GetRequest) (bool, []state.BulkGetResponse, error) {
	// 从状态存储中获取请求的键值...
}

func (store *MyStateStore) BulkDelete(ctx context.Context, req []state.DeleteRequest) error {
	// 从状态存储中删除请求的键...
}

func (store *MyStateStore) BulkSet(ctx context.Context, req []state.SetRequest) error {
	// 在状态存储中将请求的键设置为指定的值...
}
```

## 注册状态存储组件

在主应用程序文件（例如 `main.go`）中，将状态存储注册到应用程序服务。

```go
package main

import (
	"example/components"
	dapr "github.com/dapr-sandbox/components-go-sdk"
	"github.com/dapr-sandbox/components-go-sdk/state/v1"
)

func main() {
	dapr.Register("<socket name>", dapr.WithStateStore(func() state.Store {
		return &components.MyStateStoreComponent{}
	}))

	dapr.MustRun()
}
```

## 批量状态存储

虽然状态存储需要支持[批量操作]({{% ref "state-management-overview.md#bulk-read-operations" %}})，但其实现会顺序委托给单个操作方法。

## 事务性状态存储

支持事务的状态存储应该实现可选的 `TransactionalStore` 接口。其 `Multi()` 方法接收一个包含要在事务中执行的 `delete` 和/或 `set` 操作序列的请求。状态存储应遍历该序列并应用每个操作。

```go
func (store *MyStateStoreComponent) Multi(ctx context.Context, request *state.TransactionalStateRequest) error {
    // 开始事务...

    for _, operation := range request.Operations {
		switch operation.Operation {
		case state.Delete:
			deleteRequest := operation.Request.(state.DeleteRequest)
			// 处理删除请求...
		case state.Upsert:
			setRequest := operation.Request.(state.SetRequest)
			// 处理设置请求...
		}
	}

    // 结束（或回滚）事务...

	return nil
}
```

## 可查询状态存储

支持查询的状态存储应该实现可选的 `Querier` 接口。其 `Query()` 方法接收有关查询的详细信息，例如过滤器、结果限制、分页和结果的排序顺序。状态存储使用这些详细信息生成一组值作为其响应的一部分返回。

```go
func (store *MyStateStoreComponent) Query(ctx context.Context, req *state.QueryRequest) (*state.QueryResponse, error) {
	// 生成并返回结果...
}
```

## ETag 和其他语义错误处理

Dapr 运行时对某些状态存储操作导致的某些错误条件有额外的处理。状态存储可以通过从其操作逻辑返回特定错误来指示此类条件：

| 错误 | 适用操作 | 描述
|---|---|---|
| `NewETagError(state.ETagInvalid, ...)` | Delete、Set、Bulk Delete、Bulk Set | 当 ETag 无效时 |
| `NewETagError(state.ETagMismatch, ...)`| Delete、Set、Bulk Delete、Bulk Set | 当 ETag 与预期值不匹配时 |
| `NewBulkDeleteRowMismatchError(...)` | Bulk Delete | 当受影响的行数与预期行数不匹配时 |

## 后续步骤
- [可插拔组件 Go SDK 的高级技术]({{% ref go-advanced %}})
- 了解有关实现的更多信息：
  - [绑定]({{% ref go-bindings %}})
  - [发布订阅]({{% ref go-pub-sub %}})
