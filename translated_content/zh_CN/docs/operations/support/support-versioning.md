---
type: docs
title: "版本控制策略"
linkTitle: "版本控制"
weight: 1000
description: "Dapr 的版本控制策略"
---

## 简介
Dapr 通过版本控制方案，为运行时、API 和组件的未来变更而设计。本主题描述了 API、组件清单（如组件）和 Github 仓库的版本控制方案和策略。

## 版本控制
版本控制是为计算机软件的特定状态分配唯一版本名称或唯一版本号的过程。
- 版本控制提供兼容性、显式的变更控制以及处理变更（特别是重大变更）的能力。
- Dapr 努力保持向后兼容。如果需要重大变更，将[提前公告]({{% ref "support-release-policy#feature-and-deprecations" %}})。
- 弃用功能会跨越多个发布版本进行，新旧功能会并排工作。

版本控制适用于以下 Dapr 仓库：dapr、CLI、稳定语言 SDK、dashboard、components-contrib、quickstarts、helm-charts 和 documentation。

Dapr 具有以下版本控制方案：
- Dapr `HTTP API` 使用 `MAJOR.MINOR` 进行版本控制
- Dapr `GRPC API` 使用 `MAJOR` 进行版本控制
- 发布版本（包括 dapr、CLI、SDK 和 Helm Chart 的 GitHub 仓库）使用 `MAJOR.MINOR.PATCH`
- 文档和 Quickstarts 仓库使用 Dapr 运行时仓库的版本控制
- Dapr `Components` 在 components-contrib GitHub 仓库中使用 `MAJOR`
- Dapr `Manifests` 使用 `MAJOR.MINOR`。这些包括订阅和配置。

请注意，Dapr API、二进制发布版本（运行时、CLI、SDK）和组件都是相互独立的。

## Dapr HTTP API
Dapr HTTP API 根据这些 [REST API 指南](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#71-url-structure) 进行版本控制。

基于这些指南：
- 当预期旧版本将被弃用时，API 的 `MAJOR` 版本会递增。任何此类弃用都将被沟通，并提供升级路径。
- 对于任何其他更改，`MINOR` 版本*可能*会递增。例如，对发送到 API 的消息的 JSON 模式进行更改。
- API 重大变更的定义可以查看[这里](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#123-definition-of-a-breaking-change)。
- 实验性 API 包含"alpha"后缀以表示其 alpha 状态。例如 v1.0alpha、v2.0alpha 等。

## Dapr 运行时
Dapr 发布版本使用 `MAJOR.MINOR.PATCH` 版本控制。例如 1.0.0。阅读[支持的发布版本]({{% ref support-release-policy.md %}})以了解有关发布版本控制的更多信息。

## Helm Charts
[helm-charts 仓库](https://github.com/dapr/helm-charts)中的 Helm charts 使用 Dapr 运行时版本控制。Helm charts 用于 [Kubernetes 部署]({{% ref "kubernetes-deploy#install-with-helm-advanced" %}})

## 语言 SDK、CLI 和 dashboard
Dapr 语言 SDK、CLI 和 dashboard 与 Dapr 运行时独立版本控制，可以按不同的时间表发布。查看此[表格]({{% ref "support-release-policy#supported-versions" %}})以显示 SDK、CLI、dashboard 和运行时版本之间的兼容性。运行时的每个新版本都会列出相应的受支持 SDK、CLI 和 Dashboard。

SDK、CLI 和 Dashboard 的版本控制遵循 `MAJOR.MINOR.PATCH` 格式。当 SDK 中存在不向后兼容的更改时（例如，更改客户端方法上的参数），主版本会递增。次版本会为新功能和错误修复进行更新，而在错误或安全热修复的情况下会递增补丁版本。

SDK 中的示例和示例代码与该仓库一起进行版本控制。

## 组件
组件在 components-contrib 仓库中实现，遵循 `MAJOR` 版本控制方案。组件的版本遵守主版本（vX），补丁和非重大变更会添加到最新的主版本中。当组件接口中存在不向后兼容的更改时，版本会递增，例如，更改状态存储接口中的现有方法。

[components-contrib](https://github.com/dapr/components-contrib/) 仓库发布版本是其内部所有组件的统一版本。也就是说，components-contrib 仓库发布版本由其中所有组件的 schema 组成。如果没有组件更改，Dapr 的新版本并不意味着 components-contrib 有新发布版本。

注意：组件具有生产使用生命周期状态：Alpha、Beta 和 Stable。这些状态与其版本控制无关。受支持组件的表格显示了它们的版本和状态。
* [状态存储组件]({{% ref supported-state-stores.md %}})列表
* [发布订阅组件]({{% ref supported-pubsub.md %}})列表
* [绑定组件]({{% ref supported-bindings.md %}})列表
* [密钥存储组件]({{% ref supported-secret-stores.md %}})列表
* [配置存储组件]({{% ref supported-configuration-stores.md %}})列表
* [锁组件]({{% ref supported-locks.md %}})列表
* [加密组件]({{% ref supported-cryptography.md %}})列表
* [中间件组件]({{% ref supported-middleware.md %}})列表

有关组件版本控制的更多信息，请阅读[组件的版本 2 及更高版本](https://github.com/dapr/components-contrib/blob/master/docs/developing-component.md#version-2-and-beyond-of-a-component)

### 组件 schema

组件 YAML 的版本控制有两种形式：
- 组件清单的版本控制。`apiVersion`
- 组件实现的版本。`.spec.version`

组件清单包含 `.spec.metadata` 字段中实现的 schema，`.type` 字段表示实现

请参阅下面示例中的注释：
```yaml
apiVersion: dapr.io/v1alpha1 # <-- 这是组件清单的版本
kind: Component
metadata:
  name: pubsub
spec:
  version: v1 # <-- 这是 pubsub.redis schema 实现的版本
  type: pubsub.redis
  metadata:
  - name: redisHost
    value: redis-master:6379
  - name: redisPassword
    value: general-kenobi
```

### 组件清单版本
组件 YAML 清单使用 `dapr.io/v1alpha1` 进行版本控制。

### 组件实现版本
组件实现的版本由 `.spec.version` 字段确定，如上面的示例所示。`.spec.version` 字段在 schema 实例中是必需的，如果不存在，组件将无法加载。对于 Dapr 1.0.0 的发布版本，所有组件都标记为 `v1`。组件实现版本仅在不向后兼容的更改时递增。

### 组件弃用
组件弃用将提前两个（2）发布版本宣布。组件弃用会导致组件版本的主版本更新。2 个发布版本后，组件将从 Dapr 运行时中注销，尝试加载它将抛出致命异常。

组件弃用和移除将在发布说明中宣布。

## Quickstarts 和示例
[Quickstarts 仓库](https://github.com/dapr/quickstarts)中的 Quickstarts 使用运行时版本控制，相应版本的表格位于示例仓库的首页。用户应仅使用与正在运行的运行时版本对应的 Quickstarts。

[Samples 仓库](https://github.com/dapr/samples)中的示例根据示例维护者的情况逐个进行版本控制。与运行时发布版本相差甚远（落后多个版本）或超过 1 年未维护的示例将被删除。

## 相关链接
* 阅读[支持的发布版本]({{% ref support-release-policy.md %}})
* 阅读[重大变更和弃用策略]({{% ref breaking-changes-and-deprecations.md %}})
