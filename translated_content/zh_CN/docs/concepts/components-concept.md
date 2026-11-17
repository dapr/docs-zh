---
type: docs
title: "components"
linkTitle: "components"
weight: 300
description: "由 building block 和应用程序使用的模块化功能"
---

Dapr 采用模块化设计，功能以 component 的形式交付。每个 component 都有一个接口定义。所有 component 都可以互换，因此你可以用具有相同接口的一个 component 替换另一个 component。

你可以通过以下方式贡献实现并扩展 Dapr component 接口的能力：

- [components-contrib 仓库](https://github.com/dapr/components-contrib)
- [pluggable component]({{% ref "components-concept#built-in-and-pluggable-components" %}})。

一个 building block 可以使用任意 component 组合。例如，[Actor]({{% ref "actors-overview" %}}) 和 [State Management]({{% ref "state-management-overview" %}}) building block 都使用[状态 component](https://github.com/dapr/components-contrib/tree/master/state)。

再举一个例子，[pub/sub]({{% ref "pubsub-overview" %}}) building block 使用 [pub/sub component](https://github.com/dapr/components-contrib/tree/master/pubsub)。

你可以使用 `dapr components` CLI 命令获取托管环境中当前可用 component 的列表。

{{% alert title="注意" color="primary" %}} 
对于任何向应用返回数据的 component，建议相应地设置 Dapr sidecar（进程或容器）的内存容量，以避免潜在的 OOM 恐慌。例如，在 Docker 中使用 `--memory` 选项。对于 Kubernetes，使用 `dapr.io/sidecar-memory-limit` 注解。对于进程，这取决于操作系统和/或进程编排工具。*
{{% /alert %}}

## component specification

每个 component 都有其遵循的规范（或 spec）。component 在设计时通过 YAML 文件进行配置，该文件存储在以下位置之一：

- 解决方案中的 `components/local` 文件夹，或
- 调用 `dapr init` 时创建的全局 `.dapr` 文件夹。

这些 YAML 文件遵循通用的 [Dapr component 架构]({{% ref "component-schema" %}})，但每个文件都针对特定的 component specification。

需要明确的是，component specification 的值，尤其是规范中的 `metadata`，在同一 component 类型的不同 component 之间可能有所不同，例如不同的 state store 之间；并且部分设计时的规范值可以在运行时向 component API 发出请求时被覆盖。因此，强烈建议查看 [component 规范]({{% ref "components-reference" %}})，特别留意用于设置与 component 交互所用 metadata 的请求示例负载。

{{% alert title="提示" color="primary" %}}
在本地开发时，[Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 提供了 component builder，可以引导你为任何 component 类型创建 component YAML 文件，无需手动编写规范。该仪表板还会显示每个正在运行的应用已加载的 component，有助于确认 Dapr 是否正确读取了你的 component 文件。
{{% /alert %}}

下图展示了每种 component 类型的一些 component 示例
{{< diagram name="components-concept" width="80" >}}

## Built-in and pluggable components

Dapr 包含作为运行时一部分的 built-in component。这些是社区开发并捐赠的公共 component，在每个版本中都可以使用。 

Dapr 还允许用户创建自己的私有 component，称为 pluggable component。这些 component 是自托管的（进程或容器），无需用 Go 编写，存在于 Dapr runtime 之外，并且能够“插入” Dapr 以使用 building block API。

在可能的情况下，鼓励将 built-in component 捐赠给 Dapr 项目和社区。

但是，对于你希望创建自己的私有 component、且不打算纳入 Dapr 项目的场景，pluggable component 非常合适。例如：
- 你的 component 可能与你的公司相关或存在知识产权问题，因此无法纳入 Dapr component 仓库。 
- 你希望将 component 更新与 Dapr 发布周期解耦。

有关更多信息，请阅读 [pluggable component 概述]({{% ref "pluggable-components-overview" %}})。

## 热重载

自 Dapr v1.18 起，component 默认在运行时进行“热重载”。如需退出，请在 [Dapr 应用程序配置]({{% ref "preview-features.md" %}}) 中禁用 `HotReload` 功能。
这意味着你可以在不重启 Dapr runtime 的情况下更新 component 配置。
当在 Kubernetes API 中创建、更新或删除 component 资源时，或者在自托管模式下 `resources` 目录中的文件发生更改时，会触发 component 重新加载。
更新 component 时，component 会先关闭，然后使用新配置重新初始化。
在重新加载和重新初始化期间，component 会短暂不可用。

对[配置]({{% ref "configuration-overview.md" %}})、[resiliency]({{% ref "resiliency-overview.md" %}}) 和 HTTPEndpoint 资源的热重载同样适用。
这些资源类型的更改会触发 Dapr sidecar 的平滑重启（通过 SIGHUP）以应用新配置。Windows 不支持 SIGHUP。
更多细节请参阅[更新资源]({{% ref "component-updates.md" %}})。

## 可用的 component 类型

以下是 Dapr 提供的 component 类型：

### name resolution

name resolution component 与 [service invocation]({{% ref "service-invocation-overview" %}}) building block 一起使用，用于与托管环境集成并提供服务到服务的发现。例如，Kubernetes name resolution component 与 Kubernetes DNS 服务集成，自托管模式使用 mDNS，VM 集群可以使用 Consul name resolution component。

- [name resolution component 列表]({{% ref supported-name-resolution %}})
- [name resolution 实现](https://github.com/dapr/components-contrib/tree/master/nameresolution)

### pub/sub 代理

pub/sub 代理 component 是消息代理，可以作为[发布和订阅]({{% ref pubsub-overview %}}) building block 的一部分在服务之间传递消息。

- [pub/sub 代理列表]({{% ref supported-pubsub %}})
- [pub/sub 代理实现](https://github.com/dapr/components-contrib/tree/master/pubsub)

### state store

state store component 是数据存储（数据库、文件、内存），作为 [State Management]({{% ref "state-management-overview" %}}) building block 的一部分存储键值对。

- [state store 列表]({{% ref supported-state-stores %}})
- [state store 实现](https://github.com/dapr/components-contrib/tree/master/state)

### bindings

外部资源可以连接到 Dapr，以触发应用程序上的方法，或由应用程序调用，作为 [bindings]({{% ref bindings-overview %}}) building block 的一部分。

- [支持的 bindings 列表]({{% ref supported-bindings %}})
- [binding 实现](https://github.com/dapr/components-contrib/tree/master/bindings)

### secret stores

[secret]({{% ref "secrets-overview" %}}) 是指任何你希望防范未经授权访问的私密信息。secret store 用于保存可在应用程序中检索和使用的 secrets。

- [支持的 secret store 列表]({{% ref supported-secret-stores %}})
- [secret store 实现](https://github.com/dapr/components-contrib/tree/master/secretstores)

### 配置存储

配置存储用于保存应用程序数据，应用程序实例可以在启动时读取这些数据，或在数据发生更改时收到通知。这实现了动态配置。

- [支持的配置存储列表]({{% ref supported-configuration-stores %}})
- [配置存储实现](https://github.com/dapr/components-contrib/tree/master/configuration)

### 锁

锁 component 用作分布式锁，为队列或数据库等资源提供互斥访问。

- [支持的锁列表]({{% ref supported-locks %}})
- [锁实现](https://github.com/dapr/components-contrib/tree/master/lock)

### 加密

[加密]({{% ref cryptography-overview %}}) component 用于执行加密操作，包括加密和解密消息，且不会向应用程序暴露密钥。

- [支持的加密 component 列表]({{% ref supported-cryptography %}})
- [加密实现](https://github.com/dapr/components-contrib/tree/master/crypto) 

### 对话

Dapr 为开发人员提供了一种抽象与大型语言模型 (LLM) 交互的方式，并内置安全性和可靠性功能。使用[对话]({{% ref conversation-overview %}}) component 可以向不同的 LLM 发送提示，并附带对话上下文。

- [支持的 conversation component 列表]({{% ref supported-conversation %}})
- [对话实现](https://github.com/dapr/components-contrib/tree/main/conversation)

### 搜索

[搜索]({{% ref search-overview %}}) component 用于在全文搜索引擎中索引、检索和查询文档。

- [支持的 search component 列表]({{% ref supported-search %}})
- [搜索实现](https://github.com/dapr/components-contrib/tree/main/search)

### 向量

[向量]({{% ref vector-overview %}}) component 用于存储预先计算好的向量，并对向量数据库执行相似度查询。

- [支持的向量 component 列表]({{% ref supported-vector %}})
- [向量实现](https://github.com/dapr/components-contrib/tree/main/vector)

### middleware

Dapr 允许将自定义 [middleware]({{% ref "middleware" %}}) 插入 HTTP 请求处理流水线。middleware 可以在请求路由到用户代码之前，或在响应返回客户端之前，对 HTTP 请求执行额外操作（例如身份验证、加密和消息转换）。middleware component 与 [service invocation]({{% ref "service-invocation-overview" %}}) building block 一起使用。

- [支持的 middleware component 列表]({{% ref supported-middleware %}})
- [middleware 实现](https://github.com/dapr/components-contrib/tree/master/middleware)

{{% alert title="注意" color="primary" %}} 
由于 pluggable component 无需用 Go 编写，它们的实现流程与内置 Dapr component 不同。有关开发 built-in component 的更多信息，请阅读[开发新 component](https://github.com/dapr/components-contrib/blob/master/docs/developing-component)。
{{% /alert %}}
