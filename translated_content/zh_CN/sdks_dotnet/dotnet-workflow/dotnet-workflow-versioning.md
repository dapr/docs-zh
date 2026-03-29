---
type: docs
title: ".NET SDK 中的工作流版本控制"
linkTitle: "工作流版本控制"
weight: 2500
description: 了解如何在 Dapr .NET SDK 中使用基于补丁和基于名称的工作流版本控制
---

## 概述

Dapr 工作流版本控制允许你演进工作流，而不会中断进行中实例的确定性执行。
.NET SDK 支持两种方法：

- **基于补丁的版本控制**：引入由 `context.IsPatched("patch-name")` 守护的条件分支。
- **基于名称的版本控制**：创建一个新的工作流类型名称，并让版本控制策略选择最新版本。

对于小型就地更改，使用基于补丁的版本控制。对于需要全新的工作流类型的大型重构，使用基于名称的版本控制。

{{% alert title="注意" color="primary" %}}
工作流版本控制需要 Dapr .NET SDK v1.17.0 或更高版本以及 Dapr 运行时 v1.17.0 或更高版本。
{{% /alert %}}

## 何时使用每种方法

**基于补丁的版本控制** 适用于以下情况：
- 你需要在现有工作流中进行小型、增量式的更改。
- 你希望现有实例在部署后保持确定性行为。
- 你希望暂时避免引入新的工作流类型。

**基于名称的版本控制** 适用于以下情况：
- 你想要一个没有累积补丁的全新工作流类型。
- 你准备好删除旧的补丁块并更自由地重构。
- 你希望基于命名约定自动选择版本。

## 基于补丁的版本控制

基于补丁的版本控制依赖于工作流内部的确定性开关。使用 `WorkflowContext.IsPatched` 来守护新行为：

```csharp
public override async Task RunAsync(WorkflowContext context, OrderPayload input)
{
    await context.CallActivityAsync(nameof(ReserveInventoryActivity), input);

    if (context.IsPatched("v2"))
    {
        await context.CallActivityAsync(nameof(ChargePaymentActivityV2), input);
    }
    else
    {
        await context.CallActivityAsync(nameof(ChargePaymentActivity), input);
    }
}
```

### 补丁规则

- 补丁名称可以在同一工作流中多次出现，并且可以嵌套。
- 补丁名称**在部署中必须唯一**。例如，如果你部署了一个带有补丁名称 `"v1"` 的工作流，
- 你不得在后续编辑中重复使用 `"v1"`。请使用新的标识符（如 `"v2"`）以避免非确定性行为。
- `IsPatched` 在 `WorkflowContext` 上可用；无需额外设置。

{{% alert title="提示" color="primary" %}}
保持补丁名称简单且单调（例如，`"v2"`、`"v3"`），以便清楚了解每次部署引入的更改。
{{% /alert %}}

## 基于名称的版本控制

基于名称的版本控制允许你通过更改工作流类型名称来创建新版本的工作流。推荐的模式是将现有工作流复制到新文件中，重命名类，根据需要进行重构，然后在必要时再次开始打补丁。

例如，如果你有 `OrderWorkflow`，则创建 `OrderWorkflowV2` 并重构它。较旧的版本可以保留给进行中的实例，而新实例使用最新版本。

### 默认命名行为

默认情况下，基于名称的版本控制使用内置的 **NumericVersionStrategy** 和数字后缀。以下都是有效示例：

- `MyWorkflow`（被视为版本 `0`）
- `MyWorkflow2`
- `MyWorkflowV2`

默认策略假设较高的数字值是较新的版本（例如，`MyWorkflowV10` 比 `MyWorkflowV2` 更新）。.NET SDK 还包含其他内置策略（Date、SemVer 和 Numeric）以及对自定义策略的支持。

### 内置策略和选项

.NET SDK 附带了几个内置的基于名称的策略。每个策略都支持允许你调整如何解析后缀以及当没有后缀时该如何处理的选项。

- **DateVersionStrategy**：从尾随后缀派生基于日期的版本（例如，`MyWorkflow20220611`）。
  选项包括：
  - **日期格式**：使用标准 C# 日期格式规则；默认为 `yyyyMMdd`。
  - **默认版本**：当未提供后缀时使用；默认为 `0`。
  - **前缀**：在日期后缀之前匹配的可选前缀，带有可选区分大小写。
- **SemVerVersionStrategy**：从尾随后缀派生 SemVer 版本（例如，`MyWorkflow1.2.3`）。
  选项包括：
  - **前缀**：在 SemVer 后缀之前匹配的可选前缀，带有可选区分大小写。
  - **预发布/生成支持**：可以解析预发布注释和生成元数据。
  - **默认版本**：当未提供后缀时的可选默认值（如果配置为允许缺少后缀）。
- **NumericVersionStrategy**：从尾随后缀派生数字版本（例如，`MyWorkflow42` 或
  `MyWorkflowV42`）。
  选项包括：
  - **前缀**：在数字后缀之前匹配的可选前缀，带有可选区分大小写。
  - **零填充宽度**：可选宽度，允许使用带前导零的固宽数字。
  - **默认版本**：当未提供后缀时使用。

## 配置基于名称的版本控制

### 1. 安装版本控制包

将 `Dapr.Workflow.Versioning` 包添加到你的项目中。

### 2. 注册工作流版本控制

在启动期间将版本控制添加到 DI：

```csharp
builder.Services.AddDaprWorkflowVersioning();
```

### 3. 选择策略（可选）

你可以在调用 `AddDaprWorkflowVersioning` 后在 DI 中注册策略来选择：

```csharp
builder.Services.UseDefaultWorkflowStrategy<NumericVersionStrategy>("workflow-versioning-options");
```

可选字符串键用于定位策略选项。

### 4. 配置策略选项（可选）

使用相同的键注册策略选项：

```csharp
builder.Services.ConfigureStrategyOptions<NumericVersionStrategyOptions>("workflow-versioning-options", o =>
{
    o.SuffixPrefix = "V";
});
```

{{% alert title="注意" color="primary" %}}
选项键字符串必须完全匹配，否则选项将不会应用。
{{% /alert %}}

### 5. 注册活动

活动照常注册。使用基于名称的版本控制时不需要注册工作流，因为源生成器会在构建时自动发现它们。

```csharp
builder.Services.AddDaprWorkflow(w =>
{
    w.RegisterActivity<SendEmailActivity>();
});
```

配置完成后，命名工作流版本控制将在运行时自动应用。

## 跨程序集工作流发现

默认情况下，工作流版本控制源生成器仅扫描执行的程序集。如果你将工作流保留在单独的引用程序集中，则除非你选择加入引用扫描，否则不会发现这些实现。

默认情况下禁用引用扫描，因为它可能会增加构建时间（生成器必须检查所有引用的程序集以查找 `Workflow<,>` 实现）。要启用它，请将以下内容添加到执行应用程序的 `.csproj` 文件中：

```xml
<ItemGroup>
  <CompilerVisibleProperty Include="DaprWorkflowVersioningScanReferences" />
</ItemGroup>
```

启用后，源生成器会将引用程序集中发现的任何工作流实现添加到用于版本跟踪的内部注册表中。

## 覆盖名称和版本

如果你需要覆盖从工作流类型检测到的规范名称或版本，请将 `[WorkflowVersion]` 属性应用于实现工作流的类，并显式指定值。

## 最佳实践

- **按规范名称调度**：调度新的工作流实例时，使用规范工作流名称（未版本化的名称）。SDK 会自动发现版本化类型并将规范名称映射到最新版本。避免使用特定的版本化名称进行调度。
- **保留旧版本**：无限期保留较旧的工作流类型。只有在确定没有进行中的实例引用它们时才能删除它们。过早删除旧版本可能会导致长时间运行的工作流停滞。
- **单向版本控制**：始终向前推进版本。避免重命名或重复使用较旧的版本标识符。

## 当前限制

- 单个项目不能为不同的工作流混合使用多个版本控制策略。
- 没有从一个版本控制策略到另一个策略的自动迁移。
- 工作流版本控制不能跨应用程序边界工作。如果你使用多应用工作流，必须根据目标应用的任何版本控制策略使用该应用期望的类型名称。调用此 .NET 应用程序的其他应用程序如果设置为使用基于名称的工作流版本控制，则可以简单地使用规范名称。

## 示例项目

端到端示例可在 Dapr .NET SDK 仓库的 [examples/Workflow/WorkflowVersioning](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow/WorkflowVersioning) 中找到。

## 后续步骤

- [了解如何编写工作流和活动]({{% ref howto-author-workflow.md %}})
- [工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})
- [GitHub 上的工作流示例]({{% ref dotnet-workflow-examples.md %}})
