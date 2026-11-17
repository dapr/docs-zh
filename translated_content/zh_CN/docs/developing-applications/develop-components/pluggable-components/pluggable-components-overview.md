---
type: docs
title: "Pluggable components overview"
linkTitle: "概述"
weight: 1000
description: "pluggable component 的解剖结构和支持的 component 类型概述"
---

pluggable component 是指未包含在运行时中的 component，与随 `dapr init` 提供的 built-in component 不同。你可以配置 Dapr 使用 pluggable component；这些 component 利用 building block API，但注册方式与 [built-in Dapr components](https://github.com/dapr/components-contrib) 不同。

{{< diagram name="building-blocks-concept" width="75" >}}

## pluggable component 与 built-in component

Dapr 提供两种注册和创建 component 的方式：

- 包含在运行时中的 built-in component，位于 [components-contrib 仓库](https://github.com/dapr/components-contrib)中。
- 独立部署和注册的 pluggable component。

虽然两种注册方式都利用了 Dapr 的 building block API，但各自的实现过程不同。

| Component 详情 | [Built-in Component](https://github.com/dapr/components-contrib/blob/master/docs/developing-component.md) | Pluggable Components |
| :--- | :--- | :--- |
| **语言** | 只能用 Go 编写 | [可以用任何 gRPC 支持的语言编写](https://grpc.io/docs/what-is-grpc/introduction/#protocol-buffer-versions) |
| **运行位置** | 作为 Dapr runtime 可执行文件的一部分 | 作为 Pod 中独立的进程或容器运行，与 Dapr 本身分开运行。 |
| **向 Dapr 注册** | 集成到 Dapr 代码库中 | 通过 Unix 域套接字（使用 gRPC）向 Dapr 注册 |
| **分发方式** | 随 Dapr 版本发布，component 的新功能与 Dapr 版本保持一致 | 独立于 Dapr 本身分发。可以在需要时添加新功能，并遵循其自身的发布周期。 |
| **component 激活方式** | Dapr 启动并运行 component（自动） | 用户手动启动 component |

## 为什么要创建 pluggable component？

pluggable component 适用于以下场景：

- 你需要一个私有 component。
- 你希望 component 独立于 Dapr 的发布流程。
- 你对 Go 不太熟悉，或者用 Go 实现 component 并不理想。

## 功能特性

### 实现 pluggable component

要实现 pluggable component，你需要在 component 中实现一个 gRPC 服务。实现 gRPC 服务需要三个步骤：

1. 找到 proto 定义文件
1. 创建服务脚手架
1. 定义服务

了解更多关于[如何开发和实现 pluggable component]({{% ref develop-pluggable.md %}})的内容。

### 为 component 利用多个 building block

除了从同一 component 实现多个 gRPC 服务（例如 `StateStore`、`QueriableStateStore`、`TransactionalStateStore` 等）之外，pluggable component 还可以暴露其他 component 接口的实现。这意味着单个 pluggable component 可以同时充当 state store、pub/sub 以及输入 binding 或 output binding。换句话说，你可以将多个 component 接口实现到同一个 pluggable component 中，并将其作为 gRPC 服务暴露出去。

虽然在同一个 pluggable component 上暴露多个 component 接口可以减轻部署多个 component 的运维负担，但这会让 component 的实现和调试变得更困难。如有疑问，请遵循“关注点分离”原则，只在必要时才把多个 component 接口合并到同一个 pluggable component 中。

## 将 pluggable component 投入运维

built-in component 与 pluggable component 有一个共同点：两者都需要 [component specification]({{% ref "components-concept.md#component-specification" %}})。built-in component 无需任何额外步骤即可使用：Dapr 会自动准备好使用它们。

相比之下，pluggable component 在能与 Dapr 通信之前需要额外的步骤。你需要先运行 component，并促成 Dapr 与 component 之间的通信，才能启动注册过程。

## 后续步骤

- [实现 pluggable component]({{% ref develop-pluggable.md %}})
- [pluggable component 注册]({{% ref "pluggable-components-registration" %}})
