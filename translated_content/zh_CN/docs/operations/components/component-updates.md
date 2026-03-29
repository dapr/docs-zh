---
type: docs
title: "更新组件"
linkTitle: "更新组件"
weight: 300
description: "更新应用程序使用的已部署组件"
---

当对应用程序使用的现有已部署组件进行更新时，除非启用了 [`HotReload`](#hot-reloading-preview-feature) 特性门控，否则 Dapr 不会自动更新组件。
需要重启 Dapr 边车以获取组件的最新版本。
具体操作方式取决于托管环境。

### Kubernetes

在 Kubernetes 中运行时，更新组件的过程包含两个步骤：

1. 将新的组件 YAML 应用到目标命名空间
1. 除非[启用了 `HotReload` 特性门控](#hot-reloading-preview-feature)，否则在你的部署上执行 [rollout restart 操作](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#updating-resources) 以获取最新组件

### 自托管模式

除非[启用了 `HotReload` 特性门控](#hot-reloading-preview-feature)，否则更新组件的过程需要单个步骤：停止并重启 `daprd` 进程以获取最新组件。

## 热重载（预览功能）

> 此功能目前处于[预览]({{% ref "preview-features.md" %}})阶段。
> 热重载通过 [`HotReload` 特性门控]({{% ref "support-preview-features.md" %}}) 启用。

Dapr 可以"热重载"组件，即无需重启 Dapr 边车进程或 Kubernetes pod 即可自动获取组件更新。
这意味着在运行时创建、更新或删除组件清单会反映在 Dapr 边车中。

{{% alert title="更新组件" color="warning" %}}
当组件更新时，它首先被关闭，然后使用新配置重新初始化。
在此过程中，组件将在短时间内不可用。
{{% /alert %}}

{{% alert title="初始化错误" color="warning" %}}
如果通过热重载创建或更新组件时初始化过程出错，Dapr 边车会遵循组件字段 [`spec.ignoreErrors`]({{% ref component-schema.md%}})。
也就是说，行为与边车启动时加载组件时的行为相同。
- `spec.ignoreErrors=false`（*默认*）：边车优雅关闭。
- `spec.ignoreErrors=true`：边车继续运行，但不注册旧组件或新组件配置。
{{% /alert %}}

除以下类型外，所有组件都支持热重载。
对于这些组件类型的任何创建、更新或删除操作都会被边车忽略，需要重启才能获取更改。
- [Actor 状态存储]({{% ref "state_api.md#configuring-state-store-for-actors" %}})
- [工作流后端]({{% ref "workflow-architecture.md#workflow-backend" %}})

## 延伸阅读
- [组件概念]({{% ref components-concept.md %}})
- [在组件定义中引用密钥]({{% ref component-secrets.md %}})
- [支持的状态存储]({{% ref supported-state-stores %}})
- [支持的发布订阅代理]({{% ref supported-pubsub %}})
- [支持的密钥存储]({{% ref supported-secret-stores %}})
- [支持的绑定]({{% ref supported-bindings %}})
- [设置组件作用域]({{% ref component-scopes.md %}})
