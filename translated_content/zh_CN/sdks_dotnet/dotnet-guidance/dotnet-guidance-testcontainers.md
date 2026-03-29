---
type: docs
title: "Integration testing with Dapr.Testcontainers"
linkTitle: "Testcontainers"
weight: 85200
description: 使用 Dapr.Testcontainers 针对真实基础设施运行 Dapr 集成测试
---

## 概述

`Dapr.Testcontainers` 是一个辅助包，用于使用容器针对真实的 Dapr 运行时组件编写集成测试。它封装了 `Testcontainers` 库来启动 Dapr 边车、控制平面服务（placement 和 scheduler）以及特定 Dapr 构建块所需的基础设施。

{{% alert title="重要" color="warning" %}}
`Dapr.Testcontainers` 是初始版本。API 仍在演进中，可能在未来的版本中发生变化。我们尽量保持变化最小，但在该包成熟的过程中，你应预期可能出现破坏性变更。
{{% /alert %}}

## 包

- `Dapr.Testcontainers`（核心 harness 和基础设施）
- `Dapr.Testcontainers.Xunit`（可选的 xUnit 辅助工具）

## 前置条件

- 一个容器运行时（Docker Desktop、Podman 或等效工具）。
- 能够拉取 Dapr 和依赖镜像的网络访问。

## 核心概念

`Dapr.Testcontainers` 围绕**环境**和**harness**来建模测试：

- **`DaprTestEnvironment`**：共享基础设施（网络、placement、scheduler、可选 Redis）。当你需要多个应用共享 Dapr 控制平面或运行多应用测试时使用它。
- **`DaprHarnessBuilder`**：为特定构建块（工作流、作业、分布式锁或对话）创建 harness。
- **`DaprTestApplicationBuilder`**：使用 harness 启动你的测试应用，并将 Dapr 端点连接到配置。

## 基本工作流测试示例

下面的示例反映了 .NET SDK 测试套件中的工作流集成测试，展示了典型设置：

```csharp
var componentsDir = TestDirectoryManager.CreateTestDirectory("workflow-components");

await using var environment = await DaprTestEnvironment.CreateWithPooledNetworkAsync(needsActorState: true);
await environment.StartAsync();

var harness = new DaprHarnessBuilder(componentsDir)
    .WithEnvironment(environment)
    .BuildWorkflow();

await using var testApp = await DaprHarnessBuilder.ForHarness(harness)
    .ConfigureServices(builder =>
    {
        builder.Services.AddDaprWorkflowBuilder(opt =>
        {
            opt.RegisterWorkflow<TestWorkflow>();
        });
    })
    .BuildAndStartAsync();

using var scope = testApp.CreateScope();
var workflowClient = scope.ServiceProvider.GetRequiredService<DaprWorkflowClient>();

await workflowClient.ScheduleNewWorkflowAsync(nameof(TestWorkflow), input: 42);
```

## 配置 Dapr 运行时

`DaprRuntimeOptions` 让你控制 Dapr 镜像版本、App ID、日志级别和容器日志：

```csharp
var options = new DaprRuntimeOptions("1.17.0")
    .WithAppId("test-app")
    .WithLogLevel(DaprLogLevel.Debug)
    .WithContainerLogs();

var harness = new DaprHarnessBuilder(componentsDir)
    .WithOptions(options)
    .BuildWorkflow();
```

你也可以通过 `DAPR_RUNTIME_VERSION` 环境变量全局设置运行时版本。

## xUnit 辅助工具

如果你使用 xUnit，`Dapr.Testcontainers.Xunit` 包包含一个辅助特性，可在运行时版本过低时跳过测试：

```csharp
[MinimumDaprRuntimeFact("1.17.0")]
public async Task RequiresLatestRuntime()
{
    // ...
}
```

## 后续步骤

- 查看 Dapr .NET SDK 仓库中的集成测试项目（例如 `test/Dapr.IntegrationTest.Workflow`）。
- 使用与你所测试的构建块匹配的 harness（工作流、作业、分布式锁、对话）。
