---
type: docs
title: "Dapr 可插拔组件 Go SDK 的高级用法"
linkTitle: "Advanced"
weight: 2000
description: 如何使用 Dapr 可插拔组件 Go SDK 的高级技术
is_preview: true
---

虽然大多数人通常不需要，但这些指南展示了配置 Go 可插拔组件的高级方法。

## 组件生命周期

可插拔组件通过传递一个"工厂方法"来注册，该方法会为与该 socket 关联的该类型的每个已配置 Dapr 组件调用。该方法返回与该 Dapr 组件关联的实例（无论是否共享）。这允许多个相同类型的 Dapr 组件使用不同的元数据集进行配置，当组件操作需要相互隔离时等。

## 注册多个服务

每次调用 `Register()` 会将一个 socket 绑定到一个注册的可插拔组件。每个 socket 可以注册每种组件类型中的一个（输入/输出绑定、发布订阅和状态存储）。

```go
func main() {
	dapr.Register("service-a", dapr.WithStateStore(func() state.Store {
		return &components.MyDatabaseStoreComponent{}
	}))

	dapr.Register("service-a", dapr.WithOutputBinding(func() bindings.OutputBinding {
		return &components.MyDatabaseOutputBindingComponent{}
	}))

	dapr.Register("service-b", dapr.WithStateStore(func() state.Store {
		return &components.MyDatabaseStoreComponent{}
	}))

	dapr.MustRun()
}
```

在上面的示例中，一个状态存储和输出绑定注册到 socket `service-a`，而另一个状态存储注册到 socket `service-b`。

## 配置多个组件

配置 Dapr 使用托管组件与配置任何单个组件相同 — 组件 YAML 引用关联的 socket。例如，要为上面注册的两个组件（到 socket `service-a` 和 `service-b`）配置 Dapr 状态存储，您需要创建两个配置文件，每个文件引用其各自的 socket。

```yaml
#
# 此组件使用与 socket `service-a` 关联的状态存储
#
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store-a
spec:
  type: state.service-a
  version: v1
  metadata: []
```

```yaml
#
# 此组件使用与 socket `service-b` 关联的状态存储
#
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: state-store-b
spec:
  type: state.service-b
  version: v1
  metadata: []
```

## 后续步骤
- 了解有关实现的更多信息：
  - [绑定]({{% ref go-bindings %}})
  - [状态]({{% ref go-state-store %}})
  - [发布订阅]({{% ref go-pub-sub %}})
