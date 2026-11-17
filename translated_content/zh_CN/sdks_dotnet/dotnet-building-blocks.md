---
type: docs
title: ".NET building block 支持"
linkTitle: "building block 支持"
weight: 1500
description: "为 SDK 1.19 中的 Dapr building block 选择 .NET SDK 包与 API"
---

本指南介绍 [`v1.19.0`](https://github.com/dapr/dotnet-sdk/tree/v1.19.0) 中的 .NET SDK API 范围。
阅读本指南时，请使用该版本或之后兼容的版本。运行时与 component 的支持独立于 SDK 支持：安装某个包并不会启用运行时 API，也不会为 component 添加功能。
若要使用完整的 1.19 API，请使用 Dapr 1.19 运行时，其中包括 Binary Store 和较新的管理操作。

请为所需的 building block 安装对应的包，例如：

```sh
dotnet add package Dapr.Client
```

请保持 Dapr 包版本一致。实验性 API 可能产生编译器诊断，例如 `DAPR_CONVERSATION`、`DAPR_CRYPTOGRAPHY` 和 `DAPR_DISTRIBUTEDLOCK`；在选择启用之前，请参阅[实验性属性]({{< ref dotnet-guidance-experimental-attributes.md >}})。

## 选择 API

| building block | 包与入口点 | 已实现的功能 |
| --- | --- | --- |
| [service invocation]({{< ref "dotnet-client/_index.md#invoke-a-service" >}}) | `Dapr.Client`：`CreateInvokeHttpClient`、`InvocationHandler`、`CreateInvocationInvoker`、`DaprClient` | HTTP 动词、JSON 或任意内容、请求头与查询参数、响应与状态检查、通过 Dapr 代理使用的生成式 gRPC 客户端，以及旧版 `InvokeMethodGrpcAsync` protobuf 调用。新应用建议优先使用原生 HTTP/gRPC 客户端。 |
| [发布和订阅]({{< ref dotnet-messaging >}}) | `Dapr.Messaging`：`IDaprPublishSubscribeClient`、`DaprPublishSubscribeClient`、`[DaprTopic]` | 带类型的 JSON、CloudEvents、原始字节、空事件，以及按条目报告失败的批量发布；生成的流式订阅、gRPC 推送与 HTTP 订阅；动态流式订阅、路由、metadata、死信配置和显式确认。`Dapr.Client` 发布与 `Dapr.AspNetCore` 主题端点仍然可用。 |
| [State Management]({{< ref dotnet-state-management >}}) | `Dapr.StateManagement`：`DaprStateManagementClient`、生成的 `IDaprStateStoreClient` 接口 | 单条与批量的读取、写入和删除，ETag，一致性与并发选项，事务，metadata/TTL，以及依赖 component 的查询。`Dapr.Client` 还额外提供字节状态方法和 `StateEntry<T>`。 |
| [Binary Store]({{< ref dotnet-binarystore >}}) | `Dapr.BinaryStore`：`DaprBinaryStoreClient`、生成的 `IDaprBinaryStoreClient` 接口 | 流式或内存上传、覆盖控制、分块或流式下载、缓冲字节下载，以及删除。本 SDK 版本未公开列表、范围读取或文件 metadata API。 |
| [搜索]({{< ref dotnet-search >}}) | `Dapr.Search`：`DaprSearchClient`、带有 `[SearchIndex]` 的生成 `IDaprSearchIndex<T>` 接口 | alpha 的索引管理，带类型的文档 upsert、读取和删除，全文查询与提供方原生查询，过滤、排序、投影、高亮，基于延续令牌的分页，写入确认，以及按文档报告的失败。component 能力各不相同。 |
| [向量]({{< ref dotnet-vector >}}) | `Dapr.Vector`：`DaprVectorClient`、带有 `[VectorCollection]` 的生成 `IDaprVectorCollection<T>` 接口 | alpha 的集合管理，向量的写入、读取和删除，带类型的 JSON 或不透明的字节负载，metadata 过滤，按向量或已存储 ID 查询，距离度量与分数阈值，有序的批量查询响应与错误，写入确认，以及按记录报告的失败。未公开嵌入生成与分页。 |
| [Bindings]({{< ref "dotnet-client/_index.md#interact-with-output-bindings" >}}) | `Dapr.Client`：`InvokeBindingAsync`；输入使用 ASP.NET Core 或 gRPC 回调 | 输出 binding 操作，支持带类型的 JSON 请求/响应或原始字节及 metadata；输入事件通过应用回调接收。操作与负载格式因 component 而异。 |
| [Actor]({{< ref dotnet-actors-next >}}) | `Dapr.Actors.Next` 以及原有的 `Dapr.Actors` 包系列 | 生成的代理与派发、动态调用、状态/缓存管理、生命周期与轮次钩子、重入、timer/reminder 及其管理 API、pub/sub 流、状态迁移、状态机，以及内存内测试。原有 SDK 保留其独立的远程处理/JSON 代理和 HTTP 宿主 API；它与 Actors Next 不具备 API 兼容性。 |
| [secrets]({{< ref dotnet-secrets >}}) | `Dapr.SecretsManagement`：`DaprSecretsManagementClient`、`[SecretStore]`；`Dapr.Extensions.Configuration` | 带 metadata 的单条与批量读取、生成的启动时加载 secrets 属性，以及由 secrets 提供数据的 `IConfiguration`。没有创建、更新、删除或 secrets 监听方法。 |
| [配置]({{< ref "dotnet-client/_index.md#get-configuration-keys" >}}) | `Dapr.Client` 与 `Dapr.Extensions.Configuration` | 获取指定或全部键，订阅更新，按 ID 取消订阅，以及快照式或流式的 `IConfiguration` 提供程序（可选择非阻塞启动）。这些 API 用于读取或监听配置，不用于写入配置。 |
| [分布式锁]({{< ref dotnet-distributedlock-howto.md >}}) | `Dapr.DistributedLock`：`DaprDistributedLockClient` | 带持有者和过期时间的尝试获取，通过 `IAsyncDisposable` 自动解锁，以及带状态报告的显式解锁。没有等待直至获取成功或租约续期的 API。旧版 `DaprClient.Lock`/`Unlock` 的响应结构不同。 |
| [加密]({{< ref dotnet-cryptography-howto.md >}}) | `Dapr.Cryptography`：`DaprEncryptionClient` | 缓冲式与流式加解密，密钥包装与数据加密算法的选择，解密密钥覆盖，以及可配置的流式块大小。SDK 不公开运行时的 subtle 密钥、签名与验证 API。 |
| [job]({{< ref dotnet-jobs >}}) | `Dapr.Jobs`：`DaprJobsClient`、`MapDaprScheduledJobHandler` | 一次性、间隔、Cron/时区和预定义调度；原始、JSON 与字符串负载；开始时间、重复次数上限、过期时间、覆盖与失败策略；获取、列出、删除、按前缀删除和清除；HTTP 与 gRPC 触发回调。 |
| [对话]({{< ref dotnet-ai >}}) | `Dapr.AI`：`DaprConversationClient`；`Dapr.AI.Microsoft.Extensions`：`DaprChatClient` | 基于角色的文本消息、工具与工具选择以及返回的工具调用、上下文 ID、metadata/参数、PII 清理、温度、响应架构、提示词缓存保留，以及模型与 token 用量结果。`IChatClient` 映射了其中的一部分功能。本版本的两个客户端均不提供 token 流式输出。 |
| [workflow]({{< ref dotnet-workflow >}}) | `Dapr.Workflow`：`Workflow<TInput, TOutput>`、`WorkflowActivity<TInput, TOutput>`、`DaprWorkflowClient` | 持久化编排，活动、子 workflow 与 detached workflow，timer 与事件，重试，有界并行，延续，custom status，多应用路由，补丁与名称版本控制，自定义序列化，history propagation 与缓存，alpha 的二进制负载引用，以及实例管理，包括等待、列出、查看历史和重新运行。 |

## 客户端通用行为

请复用长生命周期的客户端，最好通过它们的依赖注入注册扩展进行注册。大多数专用客户端默认以单例方式注册，并继承通用的端点、API 令牌、JSON 与 gRPC 通道设置。请为网络操作和异步流枚举传递取消令牌；HTTP 超时设置并不等同于每个 gRPC 操作的截止时间。

不要假定所有客户端的失败行为都相同。尤其需要参阅[状态客户端特定于版本的取消行为]({{< ref "dotnet-statemanagementclient-usage.md#cancellation-tokens" >}})，检查批量发布的失败，观察动态订阅的完成情况，并检查显式解锁的状态。

上文链接版本的 SDK 源代码是公共签名的权威参考。表格中链接的各任务指南区分了 SDK 功能与运行时/component 要求，并标明了哪些 API 仍只在较旧的 `DaprClient` 接口上可用。
