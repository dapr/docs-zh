---
type: docs
title: "更新资源"
linkTitle: "更新资源"
weight: 300
description: "更新应用程序所使用的已部署 components、configurations、resiliency 和 HTTPEndpoints"
---

对已部署资源（Components、Subscriptions、Configurations、Resiliency、WorkflowAccessPolicies 和 HTTPEndpoints）的更新会由 Dapr sidecar 通过[热重载](#热重载)自动获取。热重载默认启用；如需关闭，请在 [Dapr 应用程序配置]({{% ref "preview-features.md" %}}) 中禁用 `HotReload` 特性。
当热重载被禁用时，需要重启 Dapr sidecar 才能获取资源的最新版本。具体操作方式取决于托管环境。

### Kubernetes

当热重载被禁用且运行在 Kubernetes 中时，更新 component 需要两个步骤：

1. 将新的 component YAML 应用到目标 namespace
1. 在你的 deployments 上执行 [rollout restart 操作](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#updating-resources)，以获取最新的 component

### 自托管

当热重载被禁用时，更新 component 只需一个步骤：停止并重启 `daprd` 进程，以获取最新的 component。

> **注意：**在兼容 POSIX 的系统（Linux、macOS）上，你也可以向 `daprd` 进程发送 `SIGHUP` 信号，在进程内重新加载运行时，而无需完全重启它。更多信息请参阅[使用 SIGHUP 重新加载配置]({{% ref "configuration-overview.md#reloading-configuration-with-sighup" %}})。

## 热重载

Dapr 会“热重载”资源，即无需手动重启 Dapr sidecar 进程或 Kubernetes pod，就能自动获取资源更新。

### Components 和 Subscriptions

在运行时创建、更新或删除 Component 或 Subscription manifest，都会反映到 Dapr sidecar 中。

{{% alert title="更新 Components" color="warning" %}}
当 component 更新时，它会先被关闭，然后使用新配置重新初始化。
在此过程中，该 component 会短暂不可用。
{{% /alert %}}

{{% alert title="初始化错误" color="warning" %}}
如果通过热重载创建或更新 component 时初始化出错，Dapr sidecar 会遵循 component 字段 [`spec.ignoreErrors`]({{% ref component-schema.md%}})。
也就是说，其行为与 sidecar 启动时加载 component 的行为相同。
- `spec.ignoreErrors=false`（*默认*）：sidecar 优雅关闭。
- `spec.ignoreErrors=true`：sidecar 继续运行，但旧的或新的 component 配置都不会被注册。
{{% /alert %}}

所有 component 类型都支持热重载。

{{% alert title="Dapr 1.18.2 及更早版本中的 Actor state store" color="warning" %}}
在 Dapr 1.18.2 及更早版本中，[Actor state store]({{% ref "state_api.md#configuring-state-store-for-actors" %}}) 不参与热重载。
对 Actor state store 的任何创建、更新或删除都会被 sidecar 忽略，需要重启才能获取更改。
{{% /alert %}}

#### Actor State Stores

自 Dapr 1.18.3 起，[Actor state store]({{% ref "state_api.md#configuring-state-store-for-actors" %}}) 也会被热重载，并且 Actor 运行时会在运行时让 Actor 托管与已配置的存储保持一致：

- **添加** Actor state store 会启用 Actor 托管和 Workflow API，包括此前已连接的 workflow 工作进程。
- **移除** Actor state store 会 drains 并停用所托管的 Actor，并从 placement 和 Scheduler 服务中撤销 Actor 类型的注册。在重新配置存储之前，Actor 状态和 Workflow API 都会返回错误。Dapr sidecar 会继续运行；重新添加存储后，Actor 托管会自动恢复。
- **更新** Actor state store 的原地配置（例如热重载时获取到轮换后的 secret）会替换存储实例，而不会中断 Actor 托管。只有在移除存储、取消其 Actor state store 标记，或被名称不同的 component 替换时，才会 drained Actor。

同一时间只能配置一个 Actor state store。通过热重载加载第二个标记为 Actor state store 的 component 会被跳过，并记录一条错误；如果之后移除了当前的 Actor state store，该 component 则会生效。

#### 引用的 secrets

热重载也会检测 component 通过 `secretKeyRef` 引用的 secrets 发生的变化，而不只是 manifest 的变化。每次 reconcile 时，sidecar 都会重新解析该引用；如果值发生了变化，则会在 60 秒内关闭并使用新值重新初始化 component，无需重启 pod。这适用于所有 secret store。更多详情请阅读 [How-To：在 component 中引用 secrets]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

### Configurations、Resiliency、WorkflowAccessPolicies 和 HTTPEndpoints

Dapr sidecar 也会重新加载 [配置]({{% ref "configuration-overview.md" %}})、[Resiliency]({{% ref "resiliency-overview.md" %}})、[WorkflowAccessPolicy]({{% ref "workflow-access-policy.md" %}}) 和 [HTTPEndpoint]({{% ref "service-invocation-overview.md" %}}) 资源。

与可以原地重新加载的 Components 和 Subscriptions 不同，这些资源类型的变更会触发 Dapr sidecar 进程自动执行**优雅重启**，以确保新配置被干净地应用。未变更的资源会被检测出来并静默忽略，因此只有在检测到实际变更时才会发生重启。

## 延伸阅读
- [Components 概念]({{% ref components-concept.md %}})
- [在 component 定义中引用 secrets]({{% ref component-secrets.md %}})
- [支持的 state store]({{% ref supported-state-stores %}})
- [支持的 pub/sub brokers]({{% ref supported-pubsub %}})
- [支持的 secret store]({{% ref supported-secret-stores %}})
- [支持的 bindings]({{% ref supported-bindings %}})
- [设置 component 作用域]({{% ref component-scopes.md %}})
