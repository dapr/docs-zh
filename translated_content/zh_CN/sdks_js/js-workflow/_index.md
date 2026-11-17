---
type: docs
title: "Dapr Workflow JavaScript SDK"
linkTitle: "workflow"
weight: 20000
description: 使用 Dapr JavaScript SDK 编写、运行和管理持久化 workflow
---

使用 Dapr JavaScript SDK 协调 activity、durable timer、external event 以及其他 workflow。`WorkflowRuntime` 负责注册并执行你的应用代码；`DaprWorkflowClient` 负责调度 workflow 实例并管理其生命周期。两者都通过 Dapr sidecar 的 gRPC 端点工作，与你为 `DaprClient` 选择的协议无关。

这些指南面向 **`@dapr/dapr` 3.19.0 或更高版本**。示例使用 Dapr 运行时 **1.19 或更高版本**，以便可以使用全部已文档化的能力，包括 detached workflow、管理操作，以及 alpha 阶段的 Binary Store building block。请使用 Node.js 18 或更高版本。

```sh
npm install @dapr/dapr@3.19.0
```

## 选择指南

| 指南 | 你将学到 |
| --- | --- |
| [编写和运行 workflow]({{% ref js-workflow-authoring.md %}}) | 注册工作进程、串联与并行化 activity、使用 timer 和事件、重试失败，以及 continue as new。 |
| [管理 workflow 实例]({{% ref js-workflow-management.md %}}) | 调度、查看、等待、挂起、恢复、终止、清除、列出、获取历史记录，以及从某个事件重新运行。 |
| [多应用 workflow 与历史]({{% ref js-workflow-multi-app.md %}}) | 调用远程 activity 和 child workflow、调度 detached workflow，并查看传播的祖先历史。 |
| [workflow 版本控制]({{% ref js-workflow-versioning.md %}}) | 使用可安全重放的补丁决策来演进正在运行的 workflow。 |
| [workflow 序列化]({{% ref js-workflow-serialization.md %}}) | 在客户端与工作进程之间共享序列化器，并保持与已持久化历史的兼容性。 |
| [Workflow data references（alpha）]({{% ref js-workflow-data-references.md %}}) | 将大型负载卸载到 Binary Store、转发显式引用，并仅在需要处流式传输数据。 |

## 运行时配置

`WorkflowRuntime` 和 `DaprWorkflowClient` 接受一个选项对象：

| 选项 | 行为 |
| --- | --- |
| `daprHost`、`daprPort` | sidecar 的主机和 **gRPC** 端口。默认值来自 SDK 设置，通常为 `127.0.0.1:50001`。若未显式设置主机或端口选项，则遵循 `DAPR_GRPC_ENDPOINT`。 |
| `daprApiToken` | Dapr API 令牌；否则使用 `DAPR_API_TOKEN`。 |
| `logger` | SDK 日志选项。在 workflow 代码中使用 `ctx.logger` 可抑制重放期间的消息。 |
| `serializer` | 负载序列化器。默认为 JSON；若省略且配置了 `payloads`，则使用解析器的序列化器。 |
| `payloads` | 可选的 `BinaryStoreWorkflowPayloadResolver`。在每个读取或写入引用的客户端和工作进程上都要注册。 |
| `grpcOptions` | 支持 `grpc.max_receive_message_length` 和 `grpc.max_send_message_length`，两者默认均为 128 MiB，并支持与 Connect 兼容的 `interceptors`。其他旧版 grpc-js 通道设置（如 keepalive、凭据或压缩）不会生效。 |
| `maxConcurrentActivities` | 仅工作进程可用的正整数，用于限制同时执行的 activity 数量。超出的 activity 会在本地排队；workflow 工作项不受此限制。省略时，并发度由 Dapr 运行时的 `workflow.maxConcurrentActivityInvocations` 决定。 |

在调度工作之前，请先等待 `runtime.start()` 完成。该调用会在工作进程连接并就绪后返回；若首次连接失败，则会以错误拒绝。`runtime.isReady` 反映当前的连接就绪状态；连接断开后，工作进程会自动重连。应用关闭时，请调用 `runtime.stop()` 和 `client.stop()`。

SDK 在调度 workflow 时会传播 W3C 追踪上下文。当 activity 具有父级追踪上下文时，它会在 `Dapr.Workflow` tracer 下创建 `WorkflowActivity <name>` 跨度。请在应用中配置 OpenTelemetry provider 和 exporter，以收集这些跨度。

## 升级注意事项

本 SDK 使用自有的 workflow 引擎，而不是共享的 DurableTask 客户端库。升级时请重新测试现有 workflow，包括重放、状态比较、序列化器和传输选项。请使用 `WorkflowRuntimeStatus` 的成员比较状态，而不要硬编码字符串或数值。该引擎**不**支持[stateful workflow 客户端]({{% ref workflow-stateful-client.md %}})；[传播的祖先历史]({{% ref js-workflow-multi-app.md %}}#inspect-propagated-history)与 `getWorkflowHistory` 是相互独立的能力。

## 后续步骤

- [workflow 概述]({{% ref workflow-overview.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})
- [JavaScript SDK workflow 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow/authoring)
- [JavaScript SDK workflow 实现](https://github.com/dapr/js-sdk/tree/main/src/workflow)
