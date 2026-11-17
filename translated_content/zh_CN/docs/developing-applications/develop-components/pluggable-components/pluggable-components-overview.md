---
type: docs
title: "可插拔组件概述"
linkTitle: "概述"
weight: 1000
description: "可插拔组件的解剖结构和支持的组件类型概述"
---

可插拔组件是指未包含在运行时中的组件，与随 `dapr init` 提供的内置组件不同。你可以配置 Dapr 使用可插拔组件；这些组件利用构建块 API，但注册方式与[内置 Dapr 组件](https://github.com/dapr/components-contrib)不同。

{{< diagram name="building-blocks-concept" width="75" >}}

## 可插拔组件与内置组件

Dapr 提供两种注册和创建组件的方式：

- 包含在运行时中的内置组件，位于 [components-contrib 仓库](https://github.com/dapr/components-contrib)中。
- 独立部署和注册的可插拔组件。

虽然两种注册方式都利用了 Dapr 的构建块 API，但各自的实现过程不同。

| 组件详情 | [内置组件](https://github.com/dapr/components-contrib/blob/master/docs/developing-component.md) | 可插拔组件 |
| :--- | :--- | :--- |
| **语言** | 只能用 Go 编写 | [可以用任何 gRPC 支持的语言编写](https://grpc.io/docs/what-is-grpc/introduction/#protocol-buffer-versions) |
| **运行位置** | 作为 Dapr 运行时可执行文件的一部分 | 作为 Pod 中独立的进程或容器运行，与 Dapr 本身分开运行。 |
| **向 Dapr 注册** | 集成到 Dapr 代码库中 | 通过 Unix 域套接字（使用 gRPC）向 Dapr 注册 |
| **分发方式** | 随 Dapr 版本发布，组件的新功能与 Dapr 版本保持一致 | 独立于 Dapr 本身分发。可以在需要时添加新功能，并遵循其自身的发布周期。 |
| **组件激活方式** | Dapr 启动并运行组件（自动） | 用户手动启动组件 |

## 为什么要创建可插拔组件？

可插拔组件适用于以下场景：

- 你需要一个私有组件。
- 你希望组件独立于 Dapr 的发布流程。
- 你对 Go 不太熟悉，或者用 Go 实现组件并不理想。

## 功能特性

### 实现可插拔组件

要实现可插拔组件，你需要在组件中实现一个 gRPC 服务。实现 gRPC 服务需要三个步骤：

1. 找到 proto 定义文件
1. 创建服务脚手架
1. 定义服务

了解更多关于[如何开发和实现可插拔组件]({{% ref develop-pluggable.md %}})的内容。

### 为组件利用多个构建块

除了从同一组件实现多个 gRPC 服务（例如 `StateStore`、`QueriableStateStore`、`TransactionalStateStore` 等）之外，可插拔组件还可以暴露其他组件接口的实现。这意味着单个可插拔组件可以同时充当 state store、pub/sub 以及输入 binding 或 output binding。换句话说，你可以将多个组件接口实现到同一个可插拔组件中，并将其作为 gRPC 服务暴露出去。

虽然在同一个可插拔组件上暴露多个组件接口可以减轻部署多个组件的运维负担，但这会让组件的实现和调试变得更困难。如有疑问，请遵循“关注点分离”原则，只在必要时才把多个组件接口合并到同一个可插拔组件中。

## 将可插拔组件投入运维

内置组件与可插拔组件有一个共同点：两者都需要[组件规范]({{% ref "components-concept.md#component-specification" %}})。内置组件无需任何额外步骤即可使用：Dapr 会自动准备好使用它们。

相比之下，可插拔组件在能与 Dapr 通信之前需要额外的步骤。你需要先运行组件，并促成 Dapr 与组件之间的通信，才能启动注册过程。

## 后续步骤

- [实现可插拔组件]({{% ref develop-pluggable.md %}})
- [可插拔组件注册]({{% ref "pluggable-components-registration" %}})
