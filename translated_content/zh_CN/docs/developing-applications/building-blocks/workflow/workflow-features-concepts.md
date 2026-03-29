---
type: docs
title: "功能与概念"
linkTitle: "功能与概念"
weight: 2000
description: "了解更多关于 Dapr 工作流的功能与概念"
---

现在您已经对[工作流构建块]({{% ref workflow-overview.md %}})有了整体了解，让我们深入探讨 Dapr 工作流引擎和 SDK 提供的功能和概念。 Dapr 工作流公开了几个核心功能和概念，这些在所有支持的语言中都是通用的。

{{% alert title="注意" color="primary" %}}
有关工作流状态管理方式的更多信息，请参阅[工作流架构指南]({{% ref workflow-architecture.md %}})。
{{% /alert %}}

## 工作流

Dapr 工作流是您编写的函数，用于定义要按特定顺序执行的一系列任务。
Dapr 工作流引擎负责任务的调度和执行，包括管理失败和重试。
如果托管工作流的应用程序扩展到多台机器上，工作流引擎会在多台机器之间对工作流及其任务的执行进行负载均衡。

工作流可以调度多种不同类型的任务，包括：
- [活动]({{% ref "workflow-features-concepts.md#workflow-activities" %}})：用于执行自定义逻辑
- [持久化定时器]({{% ref "workflow-features-concepts.md#durable-timers" %}})：用于将工作流暂停任意时长
- [子工作流]({{% ref "workflow-features-concepts.md#child-workflows" %}})：用于将较大的工作流拆分为较小的部分
- [外部事件等待器]({{% ref "workflow-features-concepts.md#external-events" %}})：用于阻塞工作流直到收到外部事件信号。这些任务将在其对应章节中详细描述。

## 工作流实例管理

### 查询工作流状态

您可以使用 CLI 查询工作流实例：

```bash
# 查找所有运行中的工作流
dapr workflow list --app-id myapp --filter-status RUNNING

# 按名称查找工作流
dapr workflow list --app-id myapp --filter-name OrderProcessing

# 查找最近的工作流（过去 2 小时）
dapr workflow list --app-id myapp --filter-max-age 2h

# 获取详细的 JSON 输出
dapr workflow list --app-id myapp --output json
```

### 工作流历史

查看完整的执行历史：

```bash
dapr workflow history wf-12345 --app-id myapp --output json
```

这将显示所有事件、活动和状态转换。

## 外部事件

### 通过 CLI 触发事件

```bash
dapr workflow raise-event wf-12345/ApprovalReceived \
  --app-id myapp \
  --input '{"approved": true, "comments": "Approved by manager"}'
```

## 工作流暂停与恢复

### 使用 CLI

```bash
# 暂停以进行手动干预
dapr workflow suspend wf-12345 \
  --app-id myapp \
  --reason "Awaiting customer response"

# 准备就绪后恢复
dapr workflow resume wf-12345 \
  --app-id myapp \
  --reason "Customer responded"
```

### 工作流标识

每个您定义的工作流都有一个类型名称，而工作流的每次单独执行都需要一个唯一的_实例 ID_。工作流实例 ID 可以由您的应用程序代码生成，这在工作流对应于文档或作业等业务实体时非常有用；也可以是自动生成的 UUID。工作流的实例 ID 可用于调试，也可用于使用 [Workflow API]({{% ref workflow_api.md %}}) 管理工作流。

任何给定时刻只能存在一个具有给定 ID 的工作流实例。但是，如果某个工作流实例完成或失败，其 ID 可以被新的工作流实例重用。但请注意，新的工作流实例将有效地替换配置的状态存储中的旧实例。

### 工作流重放

Dapr 工作流使用一种称为[事件溯源](https://learn.microsoft.com/azure/architecture/patterns/event-sourcing)的技术来维护其执行状态。工作流引擎不存储工作流的当前状态快照，而是管理一个仅追加的历史事件日志，记录描述工作流所执行的各种步骤。当使用工作流 SDK 时，这些历史事件会在工作流"等待"调度任务的结果时自动存储。

当工作流"等待"调度任务时，它会从内存中卸载，直到任务完成。一旦任务完成，工作流引擎会调度工作流函数再次运行。第二次工作流函数执行称为_重放_。

当工作流函数被重放时，它会从头开始运行。但是，当它遇到已经完成的任务时，工作流引擎不会再次调度该任务，而是：

1. 将已完成任务的存储结果返回给工作流。
1. 继续执行直到下一个"等待"点。

这种"重放"行为会持续进行，直到工作流函数完成或以错误失败。

使用这种重放技术，工作流能够从任何"等待"点恢复执行，就好像它从未从内存中卸载一样。甚至可以恢复前次运行中的局部变量值，而工作流引擎无需知道它们存储了什么数据。这种恢复状态的能力使 Dapr 工作流具有_持久性_和_容错性_。

{{% alert title="注意" color="primary" %}}
此处描述的工作流重放行为要求工作流函数代码具有_确定性_。确定性工作流函数在提供完全相同的输入时会执行完全相同的操作。[了解更多关于确定性工作流代码的限制。]({{% ref "workflow-features-concepts.md#workflow-determinism-and-code-restraints" %}})
{{% /alert %}}


### 无限循环与永生工作流

如[工作流重放]({{% ref "#workflow-replay" %}})章节所述，工作流维护其所有操作的只写事件溯源历史日志。为了避免资源失控使用，工作流必须限制其调度的操作数量。例如，确保您的工作流不会：

- 在其实现中使用无限循环
- 调度数千个任务。

如果工作流可能需要调度大量任务，您可以使用以下两种技术来编写工作流：

1. **使用 _continue-as-new_ API**：
    每个工作流 SDK 都暴露了一个 _continue-as-new_ API，工作流可以调用它来使用新的输入和历史重新启动自身。_continue-as-new_ API 特别适合实现"永生工作流"，如监控代理，否则将使用类似 `while (true)` 的构造来实现。使用 _continue-as-new_ 是保持工作流历史记录规模较小的好方法。

    > _continue-as-new_ API 会截断现有历史记录，用新的历史记录替换它。

1. **使用子工作流**：
    每个工作流 SDK 都暴露了用于创建子工作流的 API。子工作流的行为与任何其他工作流一样，只是它由父工作流调度。子工作流具有：
    - 自己的历史记录
    - 跨多台机器分发工作流函数执行的好处。

    如果工作流需要调度数千个或更多任务，建议将这些任务分布在子工作流中，以避免单个工作流的历史记录规模过大。

### 更新工作流代码

由于工作流是长期运行且持久的，更新工作流代码必须非常小心。如[工作流确定性]({{% ref "#workflow-determinism-and-code-restraints" %}})限制章节所述，工作流代码必须具有确定性。如果系统中存在任何未完成的工作流实例，则对工作流代码的更新必须保持这种确定性。否则，对工作流代码的更新可能导致这些工作流下次执行时出现运行时故障。

[查看已知限制]({{% ref "#limitations" %}})

## 工作流活动

工作流活动是工作流中的基本工作单元，也是业务流程中被编排的任务。例如，您可能创建一个工作流来处理订单。任务可能涉及检查库存、向客户收费和创建发货。每个任务都是一个单独的活动。这些活动可以串行执行、并行执行或两者结合执行。

与工作流不同，活动对您可以在其中执行的工作类型没有限制。活动经常用于发出网络调用或运行 CPU 密集型操作。活动也可以将数据返回给工作流。

Dapr 工作流引擎保证每个被调用的活动作为工作流执行的一部分**至少执行一次**。由于活动只保证至少一次执行，建议尽可能将活动逻辑实现为幂等的。

## 子工作流

除了活动，工作流还可以将其他工作流调度为_子工作流_。子工作流有自己的实例 ID、历史记录和状态，独立于启动它的父工作流。

子工作流有许多好处：

* 您可以将大型工作流拆分为一系列较小的子工作流，使代码更易于维护。
* 您可以跨多个计算节点并发分发工作流逻辑，如果您的工作流逻辑需要协调大量任务，这将非常有用。
* 您可以通过保持父工作流的历史记录较小来减少内存使用和 CPU 开销。

子工作流的返回值就是其输出。如果子工作流因异常失败，则该异常会像活动任务因异常失败一样被暴露到父工作流。子工作流也支持自动重试策略。

终止父工作流会终止由该工作流实例创建的所有子工作流。详见[终止工作流 API]({{% ref "workflow_api.md#terminate-workflow-request" %}})。

## 持久化定时器

Dapr 工作流允许您为任意时间范围安排类似提醒的持久化延迟，包括分钟、天甚至数年。这些_持久化定时器_可以由工作流调度以实现简单延迟或为其他异步任务设置临时超时。更具体地说，持久化定时器可以设置为在特定日期触发或在指定持续时间后触发。持久化定时器的最大持续时间没有限制，它们在内部由内部 actor 提醒器支持。例如，跟踪某项服务 30 天免费订阅的工作流可以使用在创建工作流 30 天后触发的持久化定时器来实现。工作流在等待持久化定时器触发时可以安全地从内存中卸载。

{{% alert title="注意" color="primary" %}}
工作流创作 SDK 中的一些 API 可能会在内部调度持久化定时器以实现内部超时行为。
{{% /alert %}}

## 重试策略

工作流支持针对活动和子工作流的持久化重试策略。工作流重试策略与 [Dapr 弹性策略]({{% ref "resiliency-overview.md" %}}) 在以下方面有所不同：

- 工作流重试策略由工作流作者在代码中配置，而 Dapr 弹性策略由应用程序操作员在 YAML 中配置。
- 工作流重试策略是持久的，在应用程序重启后保持其状态，而 Dapr 弹性策略不是持久的，必须在应用程序重启后重新应用。
- 工作流重试策略由活动和子工作流中未处理的错误/异常触发，而 Dapr 弹性策略由操作超时和连接故障触发。

重试在内部使用持久化定时器实现。这意味着工作流在等待重试触发时可以安全地从内存中卸载，从而节省系统资源。这也意味着重试之间的延迟可以任意长，包括分钟、小时甚至数天。

{{% alert title="注意" color="primary" %}}
重试策略执行的操作会保存到工作流的历史记录中。必须注意不要在工作流已经执行后更改重试策略的行为。否则，工作流在重放时可能会出现意外行为。请参阅有关[更新工作流代码]({{% ref "#updating-workflow-code" %}})的说明以获取更多信息。
{{% /alert %}}

可以同时使用工作流重试策略和 Dapr 弹性策略。例如，如果工作流活动使用 Dapr 客户端调用服务，则 Dapr 客户端使用配置好的弹性策略。详见[快速入门：服务间弹性]({{% ref "resiliency-serviceinvo-quickstart.md" %}})以获取更多信息和示例。但是，如果活动本身因任何原因失败，包括耗尽弹性策略的重试次数，则工作流的弹性策略会介入。

{{% alert title="注意" color="primary" %}}
同时使用工作流重试策略和弹性策略可能导致意外行为。例如，如果工作流活动耗尽其配置的重试策略，工作流引擎仍会根据工作流重试策略重试该活动。这可能导致活动被重试的次数超出预期。
{{% /alert %}}

由于工作流重试策略是在代码中配置的，确切的开发者体验可能因工作流 SDK 版本而异。一般来说，工作流重试策略可以使用以下参数进行配置：

| 参数 | 描述 |
| --- | --- |
| **最大尝试次数** | 执行活动或子工作流的最大次数。如果设置为 0，则不会进行任何尝试。 |
| **首次重试间隔** | 等待第一次重试的时间量。 |
| **退避系数** | 用于确定退避增加速率的系数。例如，系数为 2 会使每次后续重试的等待时间翻倍。 |
| **最大重试间隔** | 每次后续重试之前等待的最大时间量。如果设置为 0，则不会发生重试。 |
| **重试超时** | 重试的全局超时时间，无论配置的最大尝试次数如何。此超时到期后，将不再尝试执行活动。 |

## 外部事件

有时工作流需要等待由外部系统触发的事件。例如，审批工作流可能要求人工在工作流处理订单时明确批准订单请求（如果总成本超过某个阈值）。另一个例子是琐事游戏编排工作流，在等待所有参与者提交他们对琐事问题的答案时暂停。这些中途执行的输入称为_外部事件_。

外部事件具有_名称_和_有效载荷_，并被传递到单个工作流实例。工作流可以创建"等待外部事件"任务来订阅外部事件，并_等待_这些任务以阻塞执行直到收到事件。然后工作流可以读取这些事件的有效载荷，并决定下一步采取什么行动。外部事件可以串行或并行处理。外部事件可以由其他工作流或工作流代码触发。

工作流也可以等待多个相同名称的外部事件信号，在这种情况下，它们会以先进先出（FIFO）的方式被分派到相应的工作流任务。如果工作流收到外部事件信号但尚未创建"等待外部事件"任务，该事件将被保存到工作流的历史记录中，并在工作流请求该事件后立即被消费。

了解更多关于[与外部系统交互]({{% ref "workflow-patterns.md#external-system-interaction" %}})的信息。

## 清除

工作流状态可以从状态存储中清除，清除其所有历史记录并移除与特定工作流实例相关的所有元数据。清除功能用于已运行到 `COMPLETED`、`FAILED` 或 `TERMINATED` 状态的工作流。

在 [workflow API 参考指南]({{% ref workflow_api.md %}}) 中了解更多。

## 版本控制

工作流代码是长期运行的，必须在更新期间保持确定性。有关修补和命名工作流版本控制的详细信息，请参阅[工作流版本控制]({{% ref workflow-versioning.md %}})。

## 限制

### 工作流确定性与代码约束

为了利用工作流重放技术，您的工作流代码需要具有确定性。为了使您的工作流代码具有确定性，您可能需要解决一些限制。

#### 工作流函数必须调用确定性 API
生成随机数、随机 UUID 或获取当前日期的 API 是_非确定性的_。要解决此限制，您可以：
- 在活动函数中使用这些 API，或
- （推荐）使用 SDK 提供的内置等效 API。例如，每个创作 SDK 都提供了一种以确定性方式获取当前时间的 API。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
DateTime currentTime = DateTime.UtcNow;
Guid newIdentifier = Guid.NewGuid();
string randomString = GetRandomString();
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
Instant currentTime = Instant.now();
UUID newIdentifier = UUID.randomUUID();
String randomString = getRandomString();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 不要这样做！
const currentTime = new Date();
const newIdentifier = uuidv4();
const randomString = getRandomString();
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
const currentTime = time.Now()
```

{{% /tab %}}

{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
DateTime currentTime = context.CurrentUtcDateTime;
Guid newIdentifier = context.NewGuid();
string randomString = await context.CallActivityAsync<string>(nameof("GetRandomString")); //使用 "nameof" 以防止指定应用程序中不存在的活动名称
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
Instant currentTime = context.getCurrentInstant();
Guid newIdentifier = context.newGuid();
String randomString = context.callActivity(GetRandomString.class.getName(), String.class).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 这样做！！
const currentTime = context.getCurrentUtcDateTime();
const randomString = yield context.callActivity(getRandomString);
```

{{% /tab %}}

{{% tab "Go" %}}

```go
const currentTime = ctx.CurrentUTCDateTime()
```

{{% /tab %}}

{{< /tabpane >}}


#### 工作流函数必须仅_间接_与外部状态交互。
外部数据包括任何不存储在工作流状态中的数据。工作流不得与全局变量、环境变量、文件系统交互，或进行网络调用。

相反，工作流应该使用工作流输入、活动任务和外部事件处理来_间接_地与外部状态交互。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
string configuration = Environment.GetEnvironmentVariable("MY_CONFIGURATION")!;
string data = await new HttpClient().GetStringAsync("https://example.com/api/data");
```
{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
String configuration = System.getenv("MY_CONFIGURATION");

HttpRequest request = HttpRequest.newBuilder().uri(new URI("https://postman-echo.com/post")).GET().build();
HttpResponse<String> response = HttpClient.newBuilder().build().send(request, HttpResponse.BodyHandlers.ofString());
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 不要这样做！
// 访问环境变量 (Node.js)
const configuration = process.env.MY_CONFIGURATION;

fetch('https://postman-echo.com/get')
  .then(response => response.text())
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
resp, err := http.Get("http://example.com/api/data")
```

{{% /tab %}}


{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
string configuration = workflowInput.Configuration; // 假设的工作流输入参数
string data = await context.CallActivityAsync<string>(nameof("MakeHttpCall"), "https://example.com/api/data");
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
String configuration = ctx.getInput(InputType.class).getConfiguration(); // 假设的工作流输入参数
String data = ctx.callActivity(MakeHttpCall.class, "https://example.com/api/data", String.class).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 这样做！！
const configuration = workflowInput.getConfiguration(); // 假设的工作流输入参数
const data = yield ctx.callActivity(makeHttpCall, "https://example.com/api/data");
```

{{% /tab %}}


{{% tab "Go" %}}

```go
// 这样做！！
err := ctx.CallActivity(MakeHttpCallActivity, workflow.ActivityInput("https://example.com/api/data")).Await(&output)

```

{{% /tab %}}
{{< /tabpane >}}


#### 工作流函数必须仅在工作流调度线程上执行。
每种语言 SDK 的实现都要求所有工作流函数操作在与调度函数的同一线程（goroutine 等）上操作。工作流函数必须永远不要：
- 调度后台线程，或
- 使用调度回调函数在另一个线程上运行的 API。

违反此规则可能导致未定义的行为。任何后台处理都应委托给活动任务，活动任务可以串行或并发调度。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
Task t = Task.Run(() => context.CallActivityAsync("DoSomething"));
await context.CreateTimer(5000).ConfigureAwait(false);
```
{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
new Thread(() -> {
    ctx.callActivity(DoSomethingActivity.class.getName()).await();
}).start();
ctx.createTimer(Duration.ofSeconds(5)).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

不要将 JavaScript 工作流声明为 `async`。Node.js 运行时不能保证异步函数是确定性的。

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
go func() {
  err := ctx.CallActivity(DoSomething).Await(nil)
}()
err := ctx.CreateTimer(time.Second).Await(nil)
```

{{% /tab %}}



{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
Task t = context.CallActivityAsync(nameof("DoSomething"));
await context.CreateTimer(5000).ConfigureAwait(true);
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
ctx.callActivity(DoSomethingActivity.class.getName()).await();
ctx.createTimer(Duration.ofSeconds(5)).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

由于 Node.js 运行时不能保证异步函数是确定性的，请始终将 JavaScript 工作流声明为同步生成器函数。

{{% /tab %}}

{{% tab "Go" %}}

```go
// 这样做！
task := ctx.CallActivity(DoSomething)
task.Await(nil)
```

{{% /tab %}}

{{< /tabpane >}}

### 更新工作流代码
确保您对工作流代码的更新保持其确定性。以下是一些可能破坏工作流确定性的代码更新示例：
- **更改工作流函数签名**：更改工作流或活动的名称、输入或输出被视为破坏性更改，必须避免。
- **更改工作流任务的数量或顺序**：更改工作流任务的数量或顺序会导致工作流的历史记录与工作流代码不再匹配，并可能导致运行时错误或其他意外行为。

要解决这些约束，请使用版本控制指南中描述的工作流[版本控制]({{% ref workflow-versioning.md %}})概念来修补和引入新的命名工作流版本，以确定性地将更改合并到您的工作流中。

## 下一步

{{< button text="工作流模式 >>" page="workflow-patterns.md" >}}

## 相关链接

- [使用快速入门试用 Dapr 工作流]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- 试用以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
