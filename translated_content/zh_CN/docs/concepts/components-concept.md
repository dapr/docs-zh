---
type: docs
title: "组件"
linkTitle: "组件"
weight: 300
description: "构建块和应用程序使用的模块化功能"
---

Dapr 采用模块化设计，功能以组件的形式交付。每个组件都有接口定义，所有组件都是可互换的，因此你可以用具有相同接口的另一个组件替换一个组件。

你可以通过以下方式贡献实现并扩展 Dapr 的组件接口能力：

- [components-contrib 仓库](https://github.com/dapr/components-contrib)
- [可插拔组件]({{% ref "components-concept#built-in-and-pluggable-components" %}})。

一个构建块可以使用任意组合的组件。例如，[actors]({{% ref "actors-overview" %}}) 和[状态管理]({{% ref "state-management-overview" %}}) 构建块都使用[状态组件](https://github.com/dapr/components-contrib/tree/master/state)。

再举一个例子，[发布订阅]({{% ref "pubsub-overview" %}}) 构建块使用[发布订阅组件](https://github.com/dapr/components-contrib/tree/master/pubsub)。

你可以使用 `dapr components` CLI 命令获取托管环境中当前可用的组件列表。

{{% alert title="注意" color="primary" %}} 
对于任何向应用返回数据的组件，建议相应设置 Dapr 边车的内存容量（进程或容器），以避免潜在的 OOM 崩溃。例如在 Docker 中使用 `--memory` 选项。在 Kubernetes 中，使用 `dapr.io/sidecar-memory-limit` 注解。对于进程，这取决于操作系统和/或进程编排工具。*
{{% /alert %}}


## 组件规范

每个组件都有其符合的规范（或 spec）。组件在设计时通过 YAML 文件进行配置，该文件存储在以下位置之一：

- 解决方案内的 `components/local` 文件夹，或
- 在调用 `dapr init` 时创建的 `.dapr` 文件夹中全局存储。

这些 YAML 文件遵循通用的 [Dapr 组件 schema]({{% ref "component-schema" %}})，
但每个文件都是特定于组件规范的。

重要的是要理解，组件规范值，特别是 `spec` `metadata`，在相同组件类型的组件之间可能会发生变化，例如在不同的状态存储之间，并且在向组件 API 发出请求时，某些设计时规范值可以在运行时被覆盖。因此，强烈建议查看[组件规范]({{% ref "components-reference" %}})，
特别注意示例负载，了解用于与组件交互的元数据设置请求。

下图显示了一些每种组件类型的组件示例
<img src="/images/concepts-components.png" width=1200>

## 内置组件和可插拔组件

Dapr 包含作为运行时一部分的内置组件。这些是公开组件，由社区开发和捐赠，在每个版本中都可用。

Dapr 还允许用户创建自己的私有组件，称为可插拔组件。这些组件是自托管的（进程或容器），
不需要用 Go 编写，位于 Dapr 运行时之外，并且能够"插入"Dapr 以利用构建块 API。

尽可能鼓励将内置组件捐赠给 Dapr 项目和社区。

但是，可插拔组件是创建不在 Dapr 项目中的私有组件的理想选择。
例如：
- 你的组件可能是特定于你的公司或存在知识产权问题，因此不能包含在 Dapr 组件仓库中。
- 你希望将组件更新与 Dapr 发布周期解耦。

有关更多信息，请阅读[可插拔组件概述]({{% ref "pluggable-components-overview" %}})。

## 热重载

启用 [`HotReload` 功能]({{% ref "support-preview-features" %}})后，组件能够在运行时"热重载"。
这意味着你可以在不重启 Dapr 运行时的情况下更新组件配置。
当在 Kubernetes API 中创建、更新或删除组件资源时，或者在自托管模式下更改 `resources` 目录中的文件时，会发生组件重新加载。
当组件更新时，组件首先关闭，然后使用新配置重新初始化。
在重新加载和重新初始化期间，组件会有一段短暂不可用的时间。

## 可用的组件类型

以下是 Dapr 提供的组件类型：

### 名称解析

名称解析组件与[服务调用]({{% ref "service-invocation-overview" %}}) 构建块一起使用，以与托管环境集成并提供服务到服务的发现。例如，Kubernetes 名称解析组件与 Kubernetes DNS 服务集成，自托管使用 mDNS，虚拟机集群可以使用 Consul 名称解析组件。

- [名称解析组件列表]({{% ref supported-name-resolution %}})
- [名称解析实现](https://github.com/dapr/components-contrib/tree/master/nameresolution)

### 发布订阅代理

发布订阅代理组件是消息代理，作为[发布和订阅]({{% ref pubsub-overview %}}) 构建块的一部分，可以在服务之间传递消息。

- [发布订阅代理列表]({{% ref supported-pubsub %}})
- [发布订阅代理实现](https://github.com/dapr/components-contrib/tree/master/pubsub)

### 状态存储

状态存储组件是数据存储（数据库、文件、内存），作为[状态管理]({{% ref "state-management-overview" %}}) 构建块的一部分，存储键值对。

- [状态存储列表]({{% ref supported-state-stores %}})
- [状态存储实现](https://github.com/dapr/components-contrib/tree/master/state)

### 绑定

外部资源可以连接到 Dapr，以作为[绑定]({{% ref bindings-overview %}}) 构建块的一部分来触发应用上的方法，或从应用调用。

- [支持的绑定列表]({{% ref supported-bindings %}})
- [绑定实现](https://github.com/dapr/components-contrib/tree/master/bindings)

### 密钥存储

[密钥]({{% ref "secrets-overview" %}})是你希望防止被不希望访问的任何私密信息。密钥存储用于存储可以在应用中检索和使用的密钥。

- [支持的密钥存储列表]({{% ref supported-secret-stores %}})
- [密钥存储实现](https://github.com/dapr/components-contrib/tree/master/secretstores)

### 配置存储

配置存储用于保存应用数据，然后可以在启动时由应用实例读取或在发生更改时通知。这允许动态配置。

- [支持的配置存储列表]({{% ref supported-configuration-stores %}})
- [配置存储实现](https://github.com/dapr/components-contrib/tree/master/configuration)

### 锁

锁组件用作分布式锁，以提供对队列或数据库等资源的互斥访问。

- [支持的锁列表]({{% ref supported-locks %}})
- [锁实现](https://github.com/dapr/components-contrib/tree/master/lock)

### 加密

[加密]({{% ref cryptography-overview %}})组件用于执行加密操作，包括消息的加密和解密，而不会将密钥暴露给你的应用。

- [支持的加密组件列表]({{% ref supported-cryptography %}})
- [加密实现](https://github.com/dapr/components-contrib/tree/master/crypto)

### 对话

Dapr 为开发者提供了一种通过内置安全性和可靠性功能来抽象与大语言模型（LLM）交互的方式。使用[对话]({{% ref conversation-overview %}})组件向不同的 LLM 发送提示，以及对话上下文。

- [支持的对话组件列表]({{% ref supported-conversation %}})
- [对话实现](https://github.com/dapr/components-contrib/tree/main/conversation)

### 中间件

Dapr 允许将自定义[中间件]({{% ref "middleware" %}})插入到 HTTP 请求处理管道中。中间件可以在请求被路由到用户代码之前，或响应返回给客户端之前，对 HTTP 请求执行其他操作（如身份验证、加密和消息转换）。中间件组件与[服务调用]({{% ref "service-invocation-overview" %}}) 构建块一起使用。

- [支持的中间件组件列表]({{% ref supported-middleware %}})
- [中间件实现](https://github.com/dapr/components-contrib/tree/master/middleware)

{{% alert title="注意" color="primary" %}} 
由于可插拔组件不需要用 Go 编写，因此它们遵循与内置 Dapr 组件不同的实现过程。有关开发内置组件的更多信息，请阅读[开发新组件](https://github.com/dapr/components-contrib/blob/master/docs/developing-component)。
{{% /alert %}}
