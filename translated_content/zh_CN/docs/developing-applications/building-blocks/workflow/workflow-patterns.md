---
type: docs
title: 工作流模式
linkTitle: 工作流模式
weight: 3000
description: "编写不同类型的工作流模式"
---

Dapr Workflows 简化了微服务架构中复杂的有状态协调需求。以下各节介绍几种可从 Dapr Workflows 中受益的应用模式。

## 任务链

在任务链模式中，工作流中的多个步骤按顺序执行，一个步骤的输出可以作为下一个步骤的输入。任务链工作流通常涉及对某些数据执行一系列操作，例如过滤、转换和归约。

<img src="/images/workflow-overview/workflows-chaining.png" width=800 alt="Diagram showing how the task chaining workflow pattern works">

在某些情况下，工作流的步骤可能需要跨多个微服务进行编排。为了提高可靠性和可扩展性，您也可以使用队列来触发各个步骤。

虽然该模式很简单，但其实现中隐藏了许多复杂性。例如：

- 如果某个微服务在较长时间内不可用，会发生什么？
- 失败的步骤可以自动重试吗？
- 如果不能，如何促进先前完成步骤的回滚（如果适用）？
- 除了实现细节之外，有没有一种方法可以可视化工作流，让其他工程师能够理解它的作用和工作原理？

Dapr Workflow 通过允许您将任务链模式简明地实现为您所选编程语言中的一个简单函数来解决这些复杂性，如下例所示。

{{< tabpane text=true >}}

{{% tab "Python" %}}Python" >}}

```python
import dapr.ext.workflow as wf


def task_chain_workflow(ctx: wf.DaprWorkflowContext, wf_input: int):
    try:
        result1 = yield ctx.call_activity(step1, input=wf_input)
        result2 = yield ctx.call_activity(step2, input=result1)
        result3 = yield ctx.call_activity(step3, input=result2)
    except Exception as e:
        yield ctx.call_activity(error_handler, input=str(e))
        raise
    return [result1, result2, result3]


def step1(ctx, activity_input):
    print(f'Step 1: Received input: {activity_input}.')
    # Do some work
    return activity_input + 1


def step2(ctx, activity_input):
    print(f'Step 2: Received input: {activity_input}.')
    # Do some work
    return activity_input * 2


def step3(ctx, activity_input):
    print(f'Step 3: Received input: {activity_input}.')
    # Do some work
    return activity_input ^ 2


def error_handler(ctx, error):
    print(f'Executing error handler: {error}.')
    # Apply some compensating work
```

> **注意** 工作流重试策略将在未来版本的 Python SDK 中提供。

{{% /tab Japan>

由于代码本身是自解释的，这里不再详细解释每个步骤的作用。

#### 工作流类型选择

Dapr Workflow 支持两种类型的工作流：

1. **确定性工作流（Deterministic Workflows）**：基于预定义规则和条件的工作流，执行顺序可预测。
2. **事件驱动工作流（Event-Driven Workflows）**：响应外部事件或内部状态变化而触发的工作流。

对于任务链模式，通常推荐使用确定性工作流，因为步骤的执行顺序是已知的且可预测的。

### 实际应用示例

考虑一个典型的电子商务订单处理场景：

1. 验证订单信息
2. 检查库存可用性
3. 处理支付
4. 发货通知
5. 更新订单状态

在这个场景中，每个步骤都依赖于前一个步骤的输出，形成了一个清晰的任务链。如果某个步骤失败（如支付处理失败），工作流可以自动触发补偿操作，释放已占用的资源（如取消库存预留）。

### 错误处理策略

任务链模式中的错误处理至关重要。推荐采用以下策略：

- **重试机制**：对于临时性故障（如网络超时），实现自动重试
- **补偿操作**：对于无法恢复的故障，执行补偿操作以撤销已完成步骤的影响
- **超时控制**：为每个步骤设置合理的超时时间，避免无限等待
- **状态持久化**：定期保存工作流状态，支持故障恢复

### 性能优化

在实现任务链模式时，需要注意以下性能优化点：

- **并行化**：当步骤之间没有依赖关系时，考虑并行执行以提高吞吐量
- **缓存**：对于重复使用的计算结果，实施缓存策略
- **批处理**：将多个相似的操作合并为批处理，减少网络开销
- **资源池化**：复用数据库连接、HTTP 客户端等资源

### 监控与可观测性

有效的监控对于维护任务链工作流至关重要。关键监控指标包括：

- 各步骤的执行时间和吞吐量
- 失败率和错误类型分布
- 工作流实例的当前状态和历史记录
- 资源利用率（CPU、内存、网络等）

### 扩展性考虑

随着业务增长，工作流可能需要处理更多并发实例。扩展性策略包括：

- **水平扩展**：增加工作流引擎实例数量
- **垂直扩展**：提升单个实例的处理能力
- **分区策略**：将工作流实例分布到不同的队列或主题
- **限流机制**：防止系统过载

### 与其他模式的结合

任务链模式可以与其他 Dapr 工作流模式结合使用：

- **扇入/扇出**：在任务链的某个阶段并行处理多个子任务
- **状态机**：为复杂业务流程建模
- **事件驱动**：与外部系统集成，响应业务事件

### 安全性考量

在实现任务链工作流时，安全性是不可忽视的方面：

- **认证与授权**：确保只有授权用户可以触发或管理工作流
- **数据加密**：敏感数据在传输和存储过程中需要加密
- **审计日志**：记录所有关键操作以便追踪和合规
- **输入验证**：严格验证每个步骤的输入，防止注入攻击

### 测试策略

全面的测试确保工作流的可靠性：

- **单元测试**：测试各个活动（Activity）的业务逻辑
- **集成测试**：验证工作流与外部系统的交互
- **端到端测试**：模拟完整的业务流程
- **故障注入测试**：故意引入故障，验证错误处理机制

### 最佳实践总结

实现任务链工作流的最佳实践包括：

1. 保持工作流定义简洁明了
2. 使用明确的错误处理和补偿策略
3. 实现充分的日志记录和监控
4. 定期进行性能测试和优化
5. 遵循安全最佳实践
6. 建立完善的测试体系
7. 文档化工作流设计和业务规则

通过遵循这些实践，您可以构建出既高效又可靠的任务链工作流系统，满足现代分布式应用的需求。

## Fan-out/fan-in

In the fan-out/fan-in design pattern, you execute multiple tasks simultaneously across potentially multiple workers, wait for them to finish, and perform some aggregation on the result.

<img src="/images/workflow-overview/workflows-fanin-fanout.png" width=800 alt="Diagram showing how the fan-out/fan-in workflow pattern works">

In addition to the challenges mentioned in [the previous pattern]({{% ref "workflow-patterns.md#task-chaining" %}}), there are several important questions to consider when implementing the fan-out/fan-in pattern manually:

- How do you control the degree of parallelism?
- How do you know when to trigger subsequent aggregation steps?
- What if the number of parallel steps is dynamic?

Dapr Workflows provides a way to express the fan-out/fan-in pattern as a simple function, as shown in the following example:

```bash
# Start the workflow
dapr workflow run DataProcessingWorkflow \
  --app-id processor \
  --input '{"items": ["item1", "item2", "item3"]}'

# Monitor parallel execution
dapr workflow history <instance-id> --app-id processor --output json
```

The fan-out/fan-in pattern is particularly useful when you need to:

- Process multiple items concurrently to improve throughput
- Aggregate results from parallel executions
- Handle dynamic workloads where the number of parallel tasks may vary
- Distribute work across multiple workers for better resource utilization

The pattern consists of three main phases:

1. **Fan-out Phase**: Distribute work items to multiple parallel tasks
2. **Execution Phase**: Each task processes its assigned work item independently
3. **Fan-in Phase**: Collect and aggregate results from all parallel tasks

This pattern is commonly used in scenarios such as:

- Batch processing of records
- Parallel API calls to external services
- Distributed data analysis
- Image or video processing pipelines
- Report generation from multiple data sources

The implementation leverages Dapr's built-in workflow runtime to handle:

- Task scheduling and coordination
- State persistence across distributed execution
- Automatic retry and failure recovery
- Result aggregation

Key considerations when implementing this pattern:

- **Concurrency Control**: Limit the number of parallel executions to avoid overwhelming downstream systems
- **Timeout Management**: Set appropriate timeouts for individual tasks
- **Error Handling**: Define strategies for partial failures
- **Resource Management**: Monitor resource consumption during parallel execution

The workflow runtime ensures that even if the process crashes during parallel execution, the workflow can resume and only schedule the remaining tasks, providing fault tolerance and exactly-once semantics.

For scenarios requiring controlled concurrency, you can implement rate limiting or throttling mechanisms to ensure that:

- No more than N tasks execute simultaneously
- External service rate limits are respected
- System resources are not exhausted

This pattern can be combined with other Dapr Workflow patterns:

- **Monitoring**: Track progress of parallel executions
- **Compensation**: Handle failures by reversing completed operations
- **External Events**: Wait for external triggers before aggregation

### Fan-out/fan-in 的关键要点

- Fan-out/fan-in 模式可以用普通编程构造表示为简单函数
- 并行任务的数量可以是静态的或动态的
- 工作流本身能够聚合并行执行的结果

此外，工作流的执行是持久的。如果工作流启动 100 个并行任务执行，只有 40 个在进程崩溃前完成，工作流会自动重启，并且只调度剩余的 60 个任务。

可以进一步使用简单的、特定于语言的构造来限制并发程度。下面的示例代码说明了如何将扇出程度限制为仅 5 个并发活动执行：

{{< tabpane text=true >}}

The example demonstrates how to control the number of concurrent executions by limiting the fan-out degree. This approach ensures that:

- Resources are not overwhelmed by too many parallel tasks
- External services are not overloaded with requests
- System stability is maintained under high load

You can adjust the `MaxParallelism` constant to match your specific requirements and infrastructure capacity.

### Controlled Concurrency

Limiting concurrency in this way can be useful for limiting contention against shared resources. For example, if the activities need to call into external resources that have their own concurrency limits, like databases or external APIs, it can be useful to ensure that no more than a specified number of activities call that resource concurrently.

### 异步 HTTP API

异步 HTTP API 通常使用[异步请求-回复模式](https://learn.microsoft.com/azure/architecture/patterns/async-request-reply)实现。传统上实现此模式涉及以下步骤：

1. 客户端向 HTTP API 端点发送请求（_启动 API_）
2. _启动 API_ 向后端队列写入消息，触发长时间运行操作的启动
3. 在调度后端操作后，_启动 API_ 立即向客户端返回 HTTP 202 响应，其中包含可用于轮询状态的标识符
4. _状态 API_ 查询包含长时间运行操作状态状态的数据库
5. 客户端重复轮询_状态 API_，直到某个超时过期或收到"完成"响应

端到端流程如下图所示。

<img src="/images/workflow-overview/workflow-async-request-response.png" width=800 alt="Diagram showing how the async request response pattern works"/>

实现异步请求-回复模式的挑战在于它涉及多个 API 和状态存储的使用。它还涉及正确实现协议，以便客户端知道如何自动轮询状态并了解操作何时完成。

Dapr workflow HTTP API 原生支持异步请求-回复模式，无需编写任何代码或进行任何状态管理。

以下 `curl` 命令说明了工作流 API 如何支持此模式。

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/OrderProcessingWorkflow/start?instanceID=12345678 -d '{"Name":"Paperclips","Quantity":1,"TotalCost":9.95}'
```

前面的命令将产生以下响应 JSON：

```json
{"instanceID":"12345678"}
```

HTTP 客户端可以使用工作流实例 ID 构建状态查询 URL，并重复轮询，直到在有效负载中看到"COMPLETE"、"FAILURE"或"TERMINATED"状态。

```bash
curl http://localhost:3500/v1.0/workflows/dapr/12345678
```

以下是进行中工作流状态可能的样子。

```json
{
  "instanceID": "12345678",
  "workflowName": "OrderProcessingWorkflow",
  "createdAt": "2023-05-03T23:22:11.143069826Z",
  "lastUpdatedAt": "2023-05-03T23:22:22.460025267Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"Name\":\"Paperclips\",\"Quantity\":1,\"TotalCost\":9.95}"
  }
}
```

从前面的示例中可以看到，工作流的运行时状态是 `RUNNING`，这让客户端知道它应该继续轮询。

如果工作流已完成，状态可能如下所示。

```json
{
  "instanceID": "12345678",
  "workflowName": "OrderProcessingWorkflow",
  "createdAt": "2023-05-03T23:30:11.381146313Z",
  "lastUpdatedAt": "2023-05-03T23:30:52.923870615Z",
  "runtimeStatus": "COMPLETED",
  "properties": {
    "dapr.workflow.custom_status": "",
    "dapr.workflow.input": "{\"Name\":\"Paperclips\",\"Quantity":1,\"TotalCost\":9.95}",
    "dapr.workflow.output": "{\"Processed\":true}"
  }
}
```

从前面的示例中可以看到，工作流的运行时状态现在是 `COMPLETED`，这意味着客户端可以停止轮询更新。

## Monitor

监控器模式是一个重复进行的过程，通常：

1. 检查系统状态
2. 根据该状态采取一些操作 - 例如发送通知
3. 休眠一段时间
4. 重复

下图提供了该模式的粗略说明。

<img src="/images/workflow-overview/workflow-monitor-pattern.png" width=800 alt="Diagram showing how the monitor pattern works"/>

根据业务需求，可能有一个监控器或多个监控器，每个业务实体（例如股票）一个。此外，休眠时间可能需要根据情况改变。这些要求使得使用基于 cron 的调度系统变得不切实际。

Dapr Workflow 通过允许您实现_永久工作流_来原生支持此模式。Dapr Workflow 公开了一个 _continue-as-new_ API，工作流作者可以使用它来使用新输入从头重启工作流函数，而不是编写无限 while 循环（[这是一种反模式]({{% ref "workflow-features-concepts.md#infinite-loops-and-eternal-workflows" %}})）。

监控模式的主要特点包括：

- **循环执行**：工作流持续运行，定期检查系统状态
- **状态检测**：根据当前状态决定下一步操作
- **自适应间隔**：根据系统状态调整检查频率
- **事件触发**：在检测到异常时触发相应的响应动作

这种模式特别适用于：

- 监控系统健康状态
- 定期检查外部服务可用性
- 轮询 API 端点状态
- 执行定时数据同步
- 维护长时间运行的后台任务

实现监控模式时，需要考虑：

- **优雅关闭**：工作流应该能够优雅地停止，而不是无限循环
- **状态持久化**：在检查间隔之间保持必要的状态信息
- **错误处理**：妥善处理检查过程中的各种错误情况
- **资源管理**：避免在监控过程中泄漏资源

监控模式也可以通过参与者（Actors）和提醒（Reminders）来实现。区别在于此工作流表示为具有输入和本地变量中存储状态的单个函数。如有需要，工作流还可以执行具有更强可靠性保证的操作序列。

### 外部系统交互

在某些情况下，工作流可能需要暂停并等待外部系统执行某些操作。例如，工作流可能需要暂停并等待付款收到。在这种情况下，付款系统在收到付款时可能会向发布订阅主题发布事件，而该主题上的监听器可以使用[触发事件工作流 API]({{% ref "howto-manage-workflow.md#raise-an-event" %}})向工作流引发事件。

另一个非常常见的场景是工作流需要暂停并等待人工操作，例如在批准采购订单时。Dapr Workflow 通过[外部事件]({{% ref "workflow-features-concepts.md#external-events" %}})功能支持此事件模式。

以下是涉及人工的采购订单工作流示例：

1. 收到采购订单时触发工作流。
2. 工作流中的规则确定需要人工执行某些操作。例如，采购订单成本超过某个自动批准阈值。
3. 工作流发送请求人工操作的通知。例如，向指定审批者发送带有批准链接的电子邮件。
4. 工作流暂停并等待人工通过点击链接批准或拒绝订单。
5. 如果在指定时间内未收到批准，工作流恢复并执行一些补偿逻辑，例如取消订单。

下图说明了此流程。

<img src="/images/workflow-overview/workflow-human-interaction-pattern.png" width=800 alt="Diagram showing how the external system interaction pattern works with a human involved"/>

向等待的工作流实例传递事件以恢复工作流执行的代码位于工作流外部。，可以使用[触发事件]({{% ref "howto-manage-workflow.md#raise-an-event" %}})工作流管理 API 向等待的工作流实例传递事件，如下例所示。

外部事件不一定需要由人工直接触发。它们也可以由其他系统触发。例如，工作流可能需要暂停并等待付款收到。在这种情况下，付款系统在收到付款时可能会向发布订阅主题发布事件，而该主题上的监听器可以使用触发事件工作流 API 向工作流引发事件。

## 补偿

补偿模式（也称为 saga 模式）提供了一种机制，用于在工作流部分失败时回滚或撤销已执行的操作。此模式对于跨越多个微服务的长时间运行工作流尤其重要，因为在这种情况下传统的数据库事务是不可行的。

在分布式微服务架构中，您经常需要跨多个服务协调操作。当这些操作无法包装在单个事务中时，补偿模式提供了一种通过为工作流中的每个步骤定义补偿操作来维护一致性的方法。

补偿模式解决了几个关键挑战：

- **分布式事务管理**：当工作流跨越多个微服务，每个都有其自己的数据存储时，传统的 ACID 事务是不可能的。补偿模式通过确保操作全部成功完成或通过补偿全部撤销来提供事务一致性。
- **部分故障恢复**：如果工作流在某些步骤成功完成后失败，补偿模式允许您优雅地撤销这些已完成的步骤。
- **业务流程完整性**：确保业务流程能够在发生故障时正确回滚，维护业务运营的完整性。
- **长时间运行的过程**：对于可能运行数小时、数天或更长时间的工作流，传统的锁定机制是不可行的。补偿提供了一种在这些场景中处理故障的方法。

补偿模式的常见用例包括：

- **电子商务订单处理**：预留库存、收取付款和发货。如果发货失败，您需要释放库存并退款。
- **金融交易**：在转账中，如果向目标账户入账失败，您需要回滚从源账户扣款。
- **资源调配**：在跨多个提供商调配云资源时，如果某个步骤失败，您需要清理所有先前调配的资源。
- **多步骤业务流程**：任何涉及多个可能需要在未来故障时撤销的不可逆步骤的业务流程。

Dapr Workflow 为补偿模式提供支持，允许您为每个步骤注册补偿活动，并在需要时按相反顺序执行。

以下是电子商务流程的工作流示例：

1. 收到订单时触发工作流。
2. 库存中为订单预留。
3. 处理付款。
4. 订单发货。
5. 如果上述任何操作导致错误，则用另一个操作补偿这些操作：
   - 取消发货。
   - 退款付款。
   - 释放库存预留。

下图说明了此流程。

<img src="/images/workflow-overview/workflows-compensation.png" width=600 alt="Diagram showing how the compensation pattern."/>

使用 Dapr Workflow 补偿模式的主要好处包括：

- **补偿控制**：您可以完全控制何时以及如何执行补偿活动。
- **灵活配置**：您可以实现自定义逻辑来确定要运行哪些补偿。
- **错误处理**：根据您的特定业务需求处理补偿失败。
- **简单实现**：无需额外的框架依赖 - 只需标准的工作流活动和异常处理。

补偿模式确保您的分布式工作流可以保持一致性并从故障中优雅恢复，使其成为构建可靠微服务架构的基本工具。

## 下一步

{{< button text="工作流架构 >>" page="workflow-architecture.md" >}}

## 相关链接

- [使用快速入门试用 Dapr Workflows]({{% ref workflow-quickstart.md %})
- [工作流概述]({{% ref workflow-overview.md %})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- 试用以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
