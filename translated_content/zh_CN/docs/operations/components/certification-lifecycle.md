---
type: docs
title: "认证生命周期"
linkTitle: "认证生命周期"
weight: 200
description: "从提交到生产就绪的组件认证生命周期"
---

{{% alert title="Note" color="primary" %}}
认证生命周期仅适用于内置组件，不适用于[可插拔组件]({{%ref "components-concept.md#Built-in-and-pluggable-components" %}})。
{{% /alert %}}

## 概述

Dapr 采用模块化设计，功能以组件形式交付。每个组件都有一个接口定义。所有组件都是可互换的，因此在理想情况下，您可以用具有相同接口的另一个组件替换某个组件。生产环境中使用的每个组件都需要维护一定的技术要求，以确保功能兼容性和健壮性。

通常，组件需要满足：

- 符合定义的 Dapr 接口
- 功能正确且健壮
- 文档完善且得到维护

为了确保组件符合 Dapr 制定的标准，需要在 Dapr 维护者管理的环境中对组件运行一系列测试。一旦测试持续通过，就可以确定组件的成熟度级别。

## 认证级别

级别如下：

- [Alpha](#alpha)
- [Beta](#beta)
- [Stable](#stable)

### Alpha

- 组件实现了所需的接口，并按照规范中的描述工作
- 组件具有文档
- 组件可能存在错误，或在集成时暴露错误
- 组件可能无法通过所有一致性测试
- 组件可能没有一致性测试
- 由于后续版本可能存在不兼容的更改，建议仅用于非业务关键用途

所有组件都从 Alpha 阶段开始。

### Beta

- 组件必须通过满足组件规范所定义的所有组件一致性测试
- 组件一致性测试已在 Dapr 维护者管理的环境中运行
- 组件包含由 Dapr 维护者审核和批准的一致性测试结果记录，并注明特定的 components-contrib 版本
- 由于后续版本可能存在不兼容的更改，建议仅用于非业务关键用途

{{% alert title="Note" color="primary" %}}
如果满足以下条件，经维护者酌情决定，组件可以跳过 Beta 阶段和一致性测试要求：
- 组件是绑定
- 认证测试是全面的
{{% /alert %}}

### Stable

- 组件必须具有组件[认证测试](#certification-tests)，用于验证功能和弹性
- 组件由 Dapr 维护者维护，并由社区支持
- 组件文档完善且经过测试
- 组件在之前至少 1 个 Dapr runtime 次版本发布中已作为 Alpha 或 Beta 提供
- 维护者将根据 Dapr 支持策略处理组件安全性、核心功能和测试问题，并发布包含修补后的稳定组件的补丁版本

{{% alert title="Note" color="primary" %}}
稳定的 Dapr 组件基于 Dapr 认证和一致性测试，并不保证任何特定供应商的支持，其中供应商的 SDK 被用作组件的一部分。

Dapr 组件测试保证组件的稳定性，独立于任何使用的第三方供应商声明的稳定性状态。这是因为稳定（例如 alpha、beta、stable）的含义对每个供应商可能不同。
{{% /alert %}}

### 之前的正式发布（GA）组件

任何之前认证为 GA 的组件即使不满足新要求，也允许进入 Stable 级别。

## 一致性测试

[components-contrib](https://github.com/dapr/components-contrib) 仓库中的每个组件都需要遵守 Dapr 定义的一组接口。一致性测试是在这些组件定义上运行的测试，连同其关联的后端服务，以测试组件是否符合 Dapr 接口规范和行为。

一致性测试是为以下构建块定义的：

- 状态存储
- 密钥存储
- 绑定
- 发布订阅

要了解更多信息，请参阅此处的 [readme](https://github.com/dapr/components-contrib/blob/master/tests/conformance/README.md)。

### 测试要求

- 测试应根据组件规范验证组件的功能行为和健壮性
- 重现测试所需的所有详细信息都应作为组件一致性测试文档的一部分添加

## 认证测试

[components-contrib](https://github.com/dapr/components-contrib) 仓库中的每个稳定组件都必须具有认证测试计划和自动化认证测试，用于验证组件通过 Dapr 支持的所有功能。

稳定组件的测试计划应包括以下场景：

- 客户端重新连接：如果客户端库暂时无法连接到服务，Dapr 边车不应在服务重新上线后要求重启。
- 身份验证选项：验证组件可以使用所有支持的选项进行身份验证。
- 验证资源预配：验证组件是否在初始化时自动预配资源（如适用）。
- 与相应构建块和组件相关的所有场景。

测试计划必须由 Dapr 维护者批准，并与组件代码一起发布在 `README.md` 文件中。

### 测试要求

- 测试应根据组件规范验证组件的功能行为和健壮性，反映测试计划中的场景
- 测试必须作为 [components-contrib](https://github.com/dapr/components-contrib) 仓库持续集成的一部分成功运行

## 组件认证流程

为了对组件进行认证，测试在 Dapr 项目维护的环境中运行。

### 新组件认证：Alpha->Beta

对于需要从 Alpha 更改为 Beta 认证的新组件，组件认证请求遵循以下步骤：

- 请求者在 [components-contrib](https://github.com/dapr/components-contrib) 仓库中创建组件认证的 issue，注明当前和新的认证级别
- 请求者提交 PR 将组件与定义的一致性测试套件集成（如果尚未包含）
  - 用户在创建的 issue 中详细说明环境设置，以便 Dapr 维护者可以在托管环境中设置服务
  - 环境设置完成后，Dapr 维护者审核 PR，如果批准则合并该 PR
- 请求者在 [docs](https://github.com/dapr/docs) 仓库中提交 PR，更新组件的认证级别

### 新组件认证：Beta->Stable

对于需要从 Beta 更改为 Stable 认证的新组件，组件认证请求遵循以下步骤：

- 请求者在 [components-contrib](https://github.com/dapr/components-contrib) 仓库中创建组件认证的 issue，注明当前和新的认证级别
- 请求者为测试计划提交 PR，作为组件源代码目录中的 `README.md` 文件
  - 请求者在创建的 PR 中详细说明测试环境要求，包括任何手动步骤或所需的凭据
  - Dapr 维护者审核测试计划，提供反馈或批准，并最终合并 PR
- 请求者为自动化认证测试提交 PR，包括在适用时预配资源的脚本
- 测试环境设置完成并预配凭据后，Dapr 维护者审核 PR，如果批准则合并 PR
- 请求者在 [docs](https://github.com/dapr/docs) 仓库中提交 PR，更新组件的认证级别
