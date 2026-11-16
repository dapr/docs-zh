---
type: docs
title: ".NET SDK 中的工作流版本控制"
linkTitle: "工作流版本控制"
weight: 2500
description: 了解如何在 Dapr .NET SDK 中使用基于补丁和基于名称的工作流版本控制
---

## 概述

Dapr Workflow 版本控制允许你在不破坏进行中实例确定性执行的前提下演进工作流。.NET SDK 支持两种方法：

- **基于补丁的版本控制**：引入由 `context.IsPatched("patch-name")` 守护的条件分支。
- **基于名称的版本控制**：创建一个新的工作流类型名称，并让版本策略选择最新版本。

对于小型的就地修改，请使用基于补丁的版本控制。对于需要全新工作流类型的大型重构，请使用基于名称的版本控制。

{{% alert title="注意" color="primary" %}}
工作流版本控制需要 Dapr .NET SDK v1.17.0 或更高版本，以及 Dapr 运行时 v1.17.0 或更高版本。
{{% /alert %}}

## 何时使用各种方法

**基于补丁的版本控制**适用于以下情况：
- 你需要对现有工作流进行小幅、增量式的修改。
- 你希望现有实例在部署后保持确定性行为。
- 你暂时不想引入新的工作流类型。

**基于名称的版本控制**适用于以下情况：
- 你希望获得一个不带累积补丁的全新工作流类型。
- 你已准备好移除旧的补丁分支，并更自由地进行重构。
- 你希望根据命名约定自动选择版本。

## 基于补丁的版本控制

基于补丁的版本控制依赖于工作流内部的确定性分支。使用 `WorkflowContext.IsPatched` 来守护新行为：

```csharp
public override async Task<bool> RunAsync(WorkflowContext context, OrderPayload input)
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

    return true;
}
```

### 补丁规则

- 同一个工作流中，补丁名称可以出现多次，并且可以嵌套。
- 对于同一项更改，请在多次部署之间保留原有的补丁标识符。不要将该标识符用于其他更改，而应引入新的标识符。名称区分大小写，且不能为空白。
- 重放时，历史记录中已记录的补丁返回 `true`；未记录的补丁在重放期间返回 `false`。当执行超出已记录的历史时，新的补丁可以返回 `true`。不要假设每个现有实例都会永远停留在旧分支上。
- 只要保留的历史仍需要它们，就保留旧分支和补丁检查。在没有兼容版本迁移的情况下移除或重新排列持久化调用，可能会导致重放停滞。
- `IsPatched` 在 `WorkflowContext` 上可用，无需额外设置。

{{% alert title="提示" color="primary" %}}
保持补丁名称简单且单调递增（例如 `"v2"`、`"v3"`），以便清楚地看出是哪次部署引入了每项更改。
{{% /alert %}}

## 基于名称的版本控制

基于名称的版本控制允许你通过更改工作流类型名称来创建新版本的工作流。推荐的做法是将现有工作流复制到新文件，重命名类，根据需要进行重构，然后在必要时再次开始修补。

例如，如果你有 `OrderWorkflow`，可以创建 `OrderWorkflowV2` 并对其进行重构。较旧的版本可以保留，供进行中的实例使用，而新实例则使用最新版本。

### 默认命名行为

默认情况下，基于名称的版本控制使用 **NumericVersionStrategy**，其区分大小写的前缀为 `V`：

- `MyWorkflow`（视为版本 `0`）
- `MyWorkflowV2`
- `MyWorkflowV10`

数值越大，版本越新（`MyWorkflowV10` 比 `MyWorkflowV2` 新）。没有前缀的后缀（例如 `MyWorkflow2`）需要设置 `NumericVersionStrategyOptions.SuffixPrefix = ""`，默认配置不接受此类后缀。SDK 还包含 Date 和 SemVer 策略，并支持自定义策略与选择器。

### 内置策略与选项

.NET SDK 附带了几种内置的基于名称的策略。每种策略都支持相应的选项，用于调整如何解析后缀，以及在没有后缀时如何处理。

- **DateVersionStrategy**：从结尾的后缀推导基于日期的版本（例如 `MyWorkflow20220611`）。
  选项包括：
  - **日期格式**：使用标准的 C# 日期格式规则，默认为 `yyyyMMdd`。
  - **默认版本**：未提供后缀时使用，默认为 `0`。
  - **前缀**：日期后缀之前可匹配的可选前缀，可选择是否区分大小写。
- **SemVerVersionStrategy**：解析 SemVer 版本，包括显式的 `[WorkflowVersion(Version = "1.2.3")]` 元数据。对于 C# 类名中无法包含的带点版本、预发布标识符和构建元数据，请使用该特性。
  选项包括：
  - **前缀**：SemVer 后缀之前可匹配的可选前缀，可选择是否区分大小写。
  - **预发布与构建支持**：可解析预发布标注和构建元数据。
  - **默认版本**：未提供后缀时的可选默认值，前提是配置为允许缺少后缀。
- **NumericVersionStrategy**：从结尾的后缀推导数字版本（例如 `MyWorkflow42` 或 `MyWorkflowV42`）。
  选项包括：
  - **前缀**：数字后缀之前可匹配的可选前缀，可选择是否区分大小写。
  - **零填充宽度**：可选宽度，用于支持带前导零的定长数字。
  - **默认版本**：未提供后缀时使用。

## 配置基于名称的版本控制

### 1. 安装版本控制包

如果你尚未添加，请将 `Dapr.Workflow` 包添加到项目中。无需其他包。

### 2. 注册工作流版本控制

在启动期间将版本控制添加到 DI：

```csharp
using Dapr.Workflow.Versioning;

builder.Services.AddDaprWorkflowVersioning();
```

### 3. 选择策略（可选）

你可以在调用 `AddDaprWorkflowVersioning` 之后，通过在 DI 中注册策略来进行选择：

```csharp
builder.Services.UseDefaultWorkflowStrategy<NumericVersionStrategy>("workflow-versioning-options");
```

可选的字符串键用于定位策略选项。

### 4. 配置策略选项（可选）

使用相同的键注册策略选项：

```csharp
builder.Services.ConfigureStrategyOptions<NumericVersionStrategyOptions>("workflow-versioning-options", o =>
{
    o.SuffixPrefix = "V";
});
```

{{% alert title="注意" color="primary" %}}
选项键字符串必须完全一致，否则选项将不会生效。
{{% /alert %}}

### 5. 注册工作流和活动

在 `Dapr.Workflow` 中包含的源生成器会在构建时自动发现并注册工作流和活动。你无需选择启用命名工作流版本控制，也能获得这种自动注册的好处。

`AddDaprWorkflow()` 调用仍然需要，用于连接 Dapr Workflow 服务，但其选项委托现在是可选的：
```csharp
builder.Services.AddDaprWorkflow();
```

如果你更倾向于显式注册，仍然支持这种方式：
```csharp
builder.Services.AddDaprWorkflow(w => 
{
    w.RegisterActivity<SendEmailActivity>();
});
```

配置完成后，命名工作流版本控制会在运行时自动应用。

## 跨程序集工作流发现

默认情况下，工作流版本控制源生成器只扫描正在执行的程序集。如果你将工作流保存在单独的被引用程序集中，除非选择启用引用扫描，否则不会发现这些实现。

默认禁用引用扫描，因为它可能会增加构建时间（生成器必须检查所有被引用程序集中的工作流和活动实现）。要启用它，请将以下内容添加到执行应用程序的 `.csproj` 文件中：

```xml
<PropertyGroup>
  <DaprWorkflowVersioningScanReferences>true</DaprWorkflowVersioningScanReferences>
</PropertyGroup>
<ItemGroup>
  <CompilerVisibleProperty Include="DaprWorkflowVersioningScanReferences" />
</ItemGroup>
```

启用后，源生成器会将从所有被引用程序集中发现的工作流和活动类型添加进来，并自动注册。无论你是否使用了命名工作流版本控制，此行为都适用，它是一种通用的发现机制。

## 覆盖名称与版本

如果你需要覆盖从工作流类型检测到的规范名称或版本，请将 `[WorkflowVersion]` 特性应用到实现该工作流的类上，并显式指定值：

```csharp
using Dapr.Workflow;
using Dapr.Workflow.Versioning;

[WorkflowVersion(
    CanonicalName = "OrderWorkflow",
    Version = "2",
    StrategyType = typeof(NumericVersionStrategy))]
public sealed class RevisedOrderWorkflow : Workflow<string, string>
{
    public override Task<string> RunAsync(WorkflowContext context, string input)
        => context.CallActivityAsync<string>("ProcessOrder", input);
}
```

`StrategyType` 会为每个类型覆盖默认策略；`OptionsName` 用于为该覆盖选择命名的策略选项。不同的工作流系列可以使用不同的策略。同一规范名称系列中的所有覆盖必须在策略和选项上保持一致，并且其版本必须能被该策略比较。存在歧义的最新版本或冲突的配置会导致注册失败，而不是悄悄选择某个候选项。

默认选择器为 `MaxVersionSelector`。高级注册可以在 `AddDaprWorkflowVersioning` 中提供 `DefaultStrategy` 和 `DefaultSelector` 工厂，或使用 `UseDefaultWorkflowSelector<TSelector>()`。来自已加载程序集的生成贡献会在版本选择之前合并。显式的工作流注册优先，因此显式的规范别名可以有意覆盖自动路由。

## 最佳实践

- **按规范名称调度**：调度新的工作流实例时，请使用规范工作流名称（即不带版本的名称）。SDK 会发现带版本的类型，并自动将规范名称映射到最新版本。只有在有意将调用方固定到某个版本时，才使用具体的带版本名称；具体注册仍可用于重放。完全限定的具体名称可用于消除简单名称的冲突。
- **保留旧版本**：无限期保留较旧的工作流类型。只有在确定没有进行中的实例引用它们之后，才可以移除。过早移除旧版本可能会导致长时间运行的工作流停滞。
- **单向推进版本**：始终向前推进版本。避免重命名或复用较旧的版本标识符。

## 当前限制

- 没有从一种版本控制策略到另一种策略的自动迁移。
- 版本选择由目标应用程序配置，而不是在应用之间协商。多应用调用方在目标启用基于名称的路由时，可以使用其规范名称；否则请使用其注册名称。
- 基于名称的路由不会迁移正在运行的历史记录，也不会迁移不兼容的活动契约。请保留已保留历史所需的具体版本和活动名称。

## 示例项目

Dapr .NET SDK 仓库中提供了一个端到端示例：[examples/Workflow/WorkflowVersioning](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow/WorkflowVersioning)。

## 后续步骤

- [了解如何编写工作流和活动]({{% ref howto-author-workflow.md %}})
- [工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})
- [GitHub 上的工作流示例]({{% ref dotnet-workflow-examples.md %}})
