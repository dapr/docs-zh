---
type: docs
title: "在 .NET SDK 中的 Workflow data references"
linkTitle: "数据引用（Alpha）"
weight: 1550
description: "将大型 workflow 负载卸载到 Binary Store，并通过显式数据引用延迟读取它们"
---

Workflow data references 让你可以把大型负载排除在 workflow 历史记录之外。.NET SDK 会把序列化后的负载存入 Dapr Binary Store，并改为记录一个小型引用。你既可以保留现有的 workflow 和 activity 类型，让 SDK 自动获取数据；也可以传递 `PayloadReference<T>` 值，仅在需要数据的地方读取。

{{% alert title="Alpha 功能" color="warning" %}}
**Binary Store 是 alpha building block，可能会发生变化**。.NET SDK 的 Workflow data references 实现同样**处于 alpha 阶段**；其 API 和行为可能会发生变化。

这些 API 从 `Dapr.Workflow` 1.19.0 起可用。更早的包不包含它们。
{{% /alert %}}

{{% alert title="跨应用 SDK 兼容性" color="warning" %}}
跨应用的 activity 和 workflow 调用输入**默认为内联**。在与其他 .NET 应用进行跨应用 workflow 时，请在每个参与的 .NET 应用上注册 `WithBinaryStorePayloads(...)`（并且这些应用需能访问同一个 Binary Store），以保证返回值、propagated history 和转发引用之间的兼容性；一旦启用，**切勿取消注册**。[JavaScript SDK]({{% ref js-workflow-data-references.md %}}) 也从 `@dapr/dapr` 3.19.0 起支持版本 1 引用信封，具备兼容的序列化和存储访问能力，但不实现负载阶段回退。不要假设其他 SDK 支持此方案。相关要求和限制参见[跨应用输入处理](#跨应用输入处理)。
{{% /alert %}}

请按适合你应用的顺序使用本指南：

- **入门：**[选择处理方式](#选择如何处理负载)、[设置负载支持](#设置负载支持)，以及[使用自动卸载、显式引用或流式传输](#使用负载)。
- **配置策略：**查看[选项、写入偏好和入站处理](#配置与策略参考)。
- **处理应用边界：**配置[跨应用调用](#跨应用输入处理)和[事件](#事件负载处理)。
- **迁移与运维：**[在现有 workflow 中采用引用](#在现有-workflow-中采用数据引用)、[切换回内联负载](#切换回内联负载)，以及[管理已存储的负载](#操作带有已存储负载的-workflow)。
- **评估权衡：**参见[基准测试对比](#基准测试对比)。

## 选择如何处理负载

| 方式 | 应用类型 | 行为 | 适用场景 |
| --- | --- | --- | --- |
| 内联（默认） | `DocumentPayload` | 完整的序列化值保留在历史记录中。不需要 Binary Store 注册或访问。 | 能轻松放入 workflow 历史记录的小负载。 |
| 自动卸载（`PreferReference`） | `DocumentPayload` | 符合条件的大值会存储到外部。SDK 在需要普通值的任何地方下载并反序列化它们，包括每次接收该文档的 workflow 执行。除非明确允许，跨应用输入仍保持内联。 | 作为向显式引用过渡的过渡性迁移，或确保与已在使用数据引用的其他 .NET 应用兼容，同时无需立即更改本地签名。 |
| 显式引用 | `PayloadReference<DocumentPayload>` | workflow 可以转发引用而无需下载文档。activity 或客户端显式将其解析为对象或打开流。 | workflow 协调各步骤而不自行检查负载（将数据访问推迟到真正需要它的特定 activity），尤其适用于单应用 workflow，或所有参与应用都使用 .NET 且可升级以支持 Binary Store 负载的多应用拓扑。 |

### 性能与内存权衡

- **两种卸载模式都能减少 workflow 历史流量：**在 [SDK 基准测试](#基准测试对比)（跨九个 activity 处理 2 MB 文档）中，两种模式都将 workflow protobuf 流量减少了 **约 99.9%**。
- **自动卸载并不能消除重复物化：**由于 workflow 签名仍接收 `DocumentPayload`，SDK 会在每次重放时下载并反序列化该负载。在此基准测试中，自动卸载分配的托管字节数是内联处理的 **1.39 倍**。只有在你正在**向显式数据引用迁移**，或需要与**已在使用数据引用的另一 .NET 应用保持跨应用兼容**时，才应主要启用自动卸载，即使本应用目前只使用自动卸载。
- **显式引用可推迟物化：**传递 `PayloadReference<T>` 可以避免在 activity 显式解析或流式读取负载之前下载或反序列化它，从而同时减少执行时间和托管分配。当你不使用 multi-app workflow，或所有参与应用都使用 .NET 且可以升级以支持 Binary Store 负载时，这是最合适的方式。

### 引用的工作方式

卸载发生在**序列化之后**，依据序列化值的 UTF-8 字节数决定。引用信封包含存储名称、键、大小、SHA-256 哈希和格式版本。存储键采用内容寻址，并限定在某个 workflow instance 作用域内。在 `Preserve` 和 `PreferReference` 下，已有引用会原样通过，但跨应用输入需要内联时除外。`PreferInline` 则会改为解析传出的引用。

## 设置负载支持

### 前提条件

- `Dapr.Workflow` 1.19.0 或更高版本。负载支持包含在 `Dapr.Workflow` 中。
- Dapr runtime 1.19.0 或更高版本。
- 除 workflow 通常所需的 actor state store、placement 服务和 Scheduler 之外，还需配置一个 Binary Store component。
- 在每个写入或读取这些 workflow 的客户端和工作进程上注册负载支持，且这些客户端和工作进程可以访问被引用的 component，并使用兼容的序列化设置。

SDK 负责管理引用；workflow runtime 协议不需要原生的数据引用支持。仅添加 component 并不会启用卸载。

### 配置 Binary Store component

若要进行一次可随时丢弃的本地实验，请将以下 component 添加到 sidecar 的资源目录中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflow-payloads
spec:
  type: binarystore.in-memory
  version: v1
  metadata: []
```

{{% alert title="内存存储仅用于实验" color="warning" %}}
该 component 会在 sidecar 停止时丢失所有负载，即使 workflow 历史记录仍保存在持久化的 state store 中，它也严格仅用于临时测试。这些历史记录将无法再解析其引用。对于必须在重启后继续运行的 workflow，请使用持久的 Binary Store，并且只要任何历史记录或使用方仍需要负载，就应保留这些负载。
{{% /alert %}}

### 注册负载支持

在 `AddDaprWorkflow` 或 `AddDaprWorkflowBuilder` 之后链式调用 `WithBinaryStorePayloads`。例如，在应用的启动代码中注册下文使用的 workflow 和 activity 类型：

```csharp
using Dapr.Workflow;
using Dapr.Workflow.Payloads;
using Microsoft.Extensions.DependencyInjection;

builder.Services.AddDaprWorkflow().WithBinaryStorePayloads(options =>
{
    options.StoreName = "workflow-payloads";
    options.WritePreference = PayloadWritePreference.PreferReference;
    options.OffloadThreshold = 64 * 1024;
});
```

- **`StoreName` 与端点：**`StoreName` 必须与 component 名称一致。如果你使用了非默认的 sidecar gRPC 端点，请为 workflow 客户端和 Binary Store 客户端统一配置 `DAPR_GRPC_ENDPOINT`。
- **构建器链式调用：**`WithBinaryStorePayloads` 扩展的是 workflow 构建器，而不是 `IServiceCollection`。对于后续的服务注册，请使用 `builder.Services`，或使用返回的 workflow 构建器的 `Services` 属性。
- **主机作用域：**卸载是为整个主机配置的，而不是按 workflow 配置的。在已卸载的 workflow 运行期间，不要为同一个 App ID 混用支持负载的工作进程和不支持负载的工作进程。

{{% alert title="始终保持负载支持注册" color="warning" %}}
一旦你在任何 .NET 应用中启用了 `WithBinaryStorePayloads(...)`（包括参与 multi-app workflow 的任何应用），**切勿取消注册**，即使你之后选择不再创建引用。保留的 workflow 历史记录、结果和事件仍可能包含需要已注册服务才能读取的数据引用。若要停止未来的卸载，请在保持 `WithBinaryStorePayloads(...)` 注册的同时设置 `WritePreference = PayloadWritePreference.PreferInline`；参见[切换回内联负载](#切换回内联负载)。
{{% /alert %}}

## 使用负载

下面的示例使用上文的注册，即选择了 `PreferReference`。其他写入行为和限制参见[配置与策略参考](#配置与策略参考)。

### 使用自动卸载

保持普通的输入和输出类型。SDK 会存储符合 `OffloadThreshold` 的值，并在将其传递给应用代码之前解析它们。这些类型无论是否使用 `WithBinaryStorePayloads` 都可以工作：

```csharp
using Dapr.Workflow;

public sealed record DocumentPayload(string Content);

public sealed class DocumentWorkflow : Workflow<DocumentPayload, int>
{
    public override Task<int> RunAsync(WorkflowContext context, DocumentPayload input)
        => context.CallActivityAsync<int>(nameof(MeasureDocumentActivity), input);
}

public sealed class MeasureDocumentActivity : WorkflowActivity<DocumentPayload, int>
{
    public override Task<int> RunAsync(WorkflowActivityContext context, DocumentPayload input)
        => Task.FromResult(input.Content.Length);
}
```

在客户端代码中，从应用的服务提供程序解析 `DaprWorkflowClient`，然后像往常一样调度：

```csharp
var client = services.GetRequiredService<DaprWorkflowClient>();
var document = new DocumentPayload(new string('a', 128 * 1024));

var instanceId = await client.ScheduleNewWorkflowAsync(
    nameof(DocumentWorkflow), input: document);
```

使用上述注册时，文档超过 64 KiB，因此会在 workflow 和 activity 的输入边界处被卸载，而较小的整数结果保持内联。如果没有负载注册，或者使用默认的 `Preserve` 偏好加普通输入，同一文档则保持内联。你可以在不同构建或部署之间安全地更改 `OffloadThreshold`：它只影响新写入的 workflow 历史记录项是内联还是被卸载，对已有 workflow 的自动解析没有影响。（相反，若不做规划就更改 `MaxInMemoryRehydrationSize` 并**不安全**，因为它适用于所有已有引用；参见[安全地调整 `MaxInMemoryRehydrationSize`](#安全地调整-maxinmemoryrehydrationsize)。）

由于 `DocumentWorkflow` 接收 `DocumentPayload`，每次 workflow 重放时 SDK 仍会下载并反序列化该负载；先前下载的文档不会在多次执行之间缓存。

### 传递显式引用

为避免在 workflow 本身中物化文档，请将 workflow 和 activity 的输入改为 `PayloadReference<DocumentPayload>`，并把 `IWorkflowPayloadResolver` 注入到消费它的 activity 中。（对于已有 workflow，请在新版本中引入契约变更；参见[在现有 workflow 中采用数据引用](#在现有-workflow-中采用数据引用)。）

```csharp
using Dapr.Workflow;
using Dapr.Workflow.Payloads;

public sealed class ReferenceWorkflow : Workflow<PayloadReference<DocumentPayload>, int>
{
    public override Task<int> RunAsync(
        WorkflowContext context, PayloadReference<DocumentPayload> input)
        => context.CallActivityAsync<int>(nameof(MeasureReferenceActivity), input);
}

public sealed class MeasureReferenceActivity(IWorkflowPayloadResolver resolver)
    : WorkflowActivity<PayloadReference<DocumentPayload>, int>
{
    public override async Task<int> RunAsync(
        WorkflowActivityContext context, PayloadReference<DocumentPayload> input)
    {
        var document = await resolver.ResolveAsync<DocumentPayload>(input);
        return document.Content.Length;
    }
}
```

在客户端代码中，调度前先存储文档，并且两次调用使用同一个实例 ID：

```csharp
var client = services.GetRequiredService<DaprWorkflowClient>();
var resolver = services.GetRequiredService<IWorkflowPayloadResolver>();
var instanceId = $"document-{Guid.NewGuid():N}";
var document = new DocumentPayload(new string('a', 128 * 1024));

var reference = await resolver.StoreAsync(document, instanceId);
await client.ScheduleNewWorkflowAsync(
    nameof(ReferenceWorkflow), instanceId, reference);
```

显式引用的关键规则：

- **创建引用：**在客户端或 activity 代码中调用 `StoreAsync`，切勿在重放的 workflow 代码中调用。无论 `WritePreference` 或 `OffloadThreshold` 如何设置，`StoreAsync` 都会写入该值。
- **写入偏好：**对于引用类型的 workflow，请使用 `Preserve` 或 `PreferReference`；`PreferInline` 会把传出的引用转换回内联文档内容，从而导致接收方契约失败。
- **重试：**activity 重试可能会再次下载负载；显式引用并不保证恰好一次（exactly-once）的下载。
- **workflow 内解析：**如果 workflow 本身必须读取该值，请调用 `await context.ResolvePayloadAsync(reference)`，而不要直接调用 Binary Store 客户端。`context.HasPayloadResolver()` 可报告是否已注册支持。解析后的值仅在当前 workflow 执行期间缓存（最多 `ResolutionCacheSize` 项），不会跨重放缓存。

### 流式传输大负载

`ResolveAsync<T>` 在反序列化之前会缓冲序列化后的负载，并受 `MaxInMemoryRehydrationSize` 限制。仅使用类型化引用并不能消除该限制。对于更大的数据，请在 activity 或客户端中使用 `IWorkflowPayloadResolver.OpenAsync(reference)`（或在 workflow 中使用 `context.OpenPayloadAsync(reference)`，不过为避免重放开销，更推荐在 activity 中处理），并通过异步读取和 `await using` 增量地消费该流：

- **序列化内容：**流包含完整的序列化字节，而不只是文档的内部属性。
- **写入缓冲：**流式读取可以避免在读取时缓冲整个负载，但 `StoreAsync` 在写入时仍会在内存中序列化该值。
- **手动完整性检查：**流式读取**不会**自动验证内容哈希。使用方必须根据 `reference.ContentHash` 检查字节，并在适当时根据 `reference.Size` 检查。有界缓冲读取和 SHA-256 验证，请参见[流式 activity 示例](https://github.com/dapr/dotnet-sdk/blob/622c5374db5b06d0cdf538e94927853f0beede88/examples/Workflow/WorkflowDataReferences/Activities/MeasurePayloadActivity.cs)。

## 配置与策略参考

### 配置卸载与读取限制

在 `WithBinaryStorePayloads(...)` 中配置 `BinaryStorePayloadOptions`：

| 选项 | 默认值 | 用途 |
| --- | --- | --- |
| `StoreName` | 必填 | Binary Store component 名称。 |
| `KeyPrefix` | `"workflow-payloads"` | 实例作用域、内容寻址键的前缀。 |
| `WritePreference` | `PayloadWritePreference.Preserve` | 为未来的写入（包括事件）选择 `Preserve`、`PreferReference` 或 `PreferInline`。跨应用的 activity 和 workflow 调用输入需要内联数据，除非每次调用单独允许。 |
| `OffloadThreshold` | `64 * 1024` 字节 | 在 `PreferReference` 下，卸载大小达到或超过该值的序列化值。`null` 会在已启用的边界处卸载每个非空负载；数值必须为正数。 |
| `OffloadSites` | `PayloadKind.All` | 选择在 `PreferReference` 下哪些边界可以自动创建引用。不限制内联或读取。 |
| `MaxInMemoryRehydrationSize` | `16 * 1024 * 1024` 字节 | 缓冲解析（包括 `ResolveAsync<T>` 和出站内联）允许的最大序列化负载大小。这不是传输限制，也不是进程总内存的限制。 |
| `VerifyIntegrityOnRead` | `true` | 对缓冲读取验证 SHA-256。不验证 `OpenAsync` 返回的流。 |
| `ResolutionCacheSize` | `128` | 每次执行中 workflow 上下文解析器缓存的最大已解析条目数。`0` 会禁用该缓存。 |
| `SkipWriteIfExists` | `true` | 将已存在的内容寻址对象视为写入成功。但不保证重复的上传尝试不会传输任何字节。 |

`PayloadKind` 标志涵盖 workflow 和 activity 的输入/输出、external event、continue as new 的输入、custom status，以及 child workflow 的输入/输出（detached workflow 的输入和重新运行的覆盖值使用 `PayloadKind.WorkflowInput`；终止输出使用 `PayloadKind.WorkflowOutput`）。可组合这些标志以限制自动卸载：

```csharp
options.OffloadSites = PayloadKind.WorkflowInput | PayloadKind.ActivityInput;
```

缓冲读取超过 `MaxInMemoryRehydrationSize` 时会抛出 `PayloadRehydrationLimitException`，对象缺失时抛出 `PayloadNotFoundException`，哈希校验失败时抛出 `PayloadIntegrityException`。对于已有历史记录，请保留兼容的负载读取器和序列化设置；更改序列化器并不会迁移已存储的数据。

### 安全地调整 `MaxInMemoryRehydrationSize`

与只影响未来写入的 `OffloadThreshold` 不同，**`MaxInMemoryRehydrationSize` 不能随意更改**。它会在每次缓冲读取和内联操作时强制执行，包括 workflow 历史记录中已有的引用。如果把它降到低于某个已有负载的声明大小或实际大小以下，可能导致：

1. 普通 `T` 输入和输出在物化期间抛出 `PayloadRehydrationLimitException`。
2. 跨应用边界的内联在调用发送之前失败。
3. 已有引用的 `PreferInline` 转换失败。
4. 在重放或之后的轮次遇到较旧引用时，运行中的 workflow 失败。

#### 容量规划最佳实践

- **保留 16 MiB 的默认值**，除非有实测需求证明需要更改。
- **留出适度余量：**将限制设置为高于预期序列化负载大小，并为自然增长留出空间。
- **考虑并发内存压力：**将限制保持在与并发解析相乘后不会导致内存占用过高的大小以下。例如，32 MiB 的限制配合 20 个并发物化，仅负载缓冲区就可能需要约 640 MiB，此外还有 UTF-8 转换和反序列化期间的额外分配。
- **大文档优先使用流式读取：**使用 `PayloadReference<T>` 并通过 `OpenAsync` 进行流式读取，而不是无限期地提高内存限制。
- **与传输限制对齐：**如果预期会进行跨应用内联，请确保物化后的负载也符合所配置的 Dapr runtime 和 gRPC 传输限制（包括消息开销）。提高 `MaxInMemoryRehydrationSize` 并不会提高传输限制。
- **测试边界行为：**在负载和集成测试中，覆盖接近并刚超过所配置限制的负载。

#### 之后更改 `MaxInMemoryRehydrationSize`

将 `MaxInMemoryRehydrationSize` 视为主机兼容性与内存安全的边界：在所有可能处理同一 workflow 版本的工作进程之间保持其一致，并且只能通过经过审查的部署来更改，而不是在运行时修改。

- **提高限制**通常是向后兼容的，但需要重新评估内存并发和传输限制。
- **降低限制**可能会破坏已有 workflow，因为其历史记录中包含大于新值的引用（会在重放、类型化状态读取、自动反序列化、`PreferInline` 转换或跨应用内联时失败）。在降低之前：
  1. 找出仍在运行的 workflow instance 所使用的最大被引用负载。
  2. 将大负载的消费者修改为接受 `PayloadReference<T>`，并通过 `OpenAsync` 流式读取内容。
  3. 当把普通 `T` 输入更改为 `PayloadReference<T>` 输入时，为 workflow 和 activity 契约进行版本化。
  4. 在已有实例完成或退役之前，保留旧的 workflow 版本及其之前的限制。
  5. 逐步推出较低的限制，并监控 `PayloadRehydrationLimitException`。

### 选择写入偏好

`BinaryStorePayloadOptions.WritePreference` 控制未来传出的顶层负载的转换方式。它默认为 `PayloadWritePreference.Preserve`；仅注册并不会启用自动负载卸载。

| 偏好 | 普通传出值 | 传出引用 |
| --- | --- | --- |
| `Preserve`（默认） | 以内联方式序列化；不自动上传。 | 保留引用。 |
| `PreferReference` | 若序列化值达到已启用的 `OffloadSites` 边界上的 `OffloadThreshold`，则上传；否则保持内联。 | 保留引用；不再次上传。 |
| `PreferInline` | 以内联方式序列化；不自动上传。 | 解析为其原始序列化内容，并将该内容内联写入。若无法安全完成解析则失败。 |

重要的策略规则：

- **仅影响未来的写入：**写入偏好影响新 workflow 和正在运行的 workflow 的未来写入。它们不会重写已保留的历史记录，不会持久化实例级设置，不会从 workflow 的输入推断策略，也不会自动对 workflow 或 activity 进行版本化。
- **在 `Preserve` 下没有对象溯源：**`Preserve` 表示不进行自动的出站转换。如果 SDK 将引用解析为普通 `T`，而你的代码之后返回该 `T`，则输出会作为新值以内联方式序列化。历史记录中可以合法地同时包含内联值和引用。
- **停止自动卸载：**设置 `WritePreference = PayloadWritePreference.Preserve`（或在 `PreferReference` 下设置 `OffloadSites = PayloadKind.None`），即可停止自动创建引用，同时保持引用读取和显式 `StoreAsync` 写入有效。若要把传出的引用转换回内联数据，参见[切换回内联负载](#切换回内联负载)。

### 入站处理保留已记录的表示形式

入站处理与 `WritePreference` 无关，对本地、跨应用和事件输入的处理方式相同：

| 接收到的负载 | 接收方契约 | 行为 |
| --- | --- | --- |
| 内联数据 | 普通 `T` | 正常反序列化。 |
| 引用信封 | 普通 `T` | 使用已注册的负载支持进行解析和反序列化。 |
| 引用信封 | `PayloadReference<T>` | 直接传递引用，不自动物化。 |
| 内联数据 | `PayloadReference<T>` | 报告契约不匹配；不会为了制造引用而上传数据。 |

为应用代码解析引用不会重写 workflow 历史记录，也不会修改已保留的线路 metadata。接收到的数据也不会确立传出偏好，也不能证明发送方能够消费以引用为值的响应。不受支持的信封版本、缺失的数据、完整性失败以及缓冲限制违规，都会以错误的形式呈现，而不会回退为普通的应用数据。

## 跨应用与外部边界

### 跨应用输入处理

自动边界切换使 Binary Store 负载在顶层输入上，默认与 multi-app workflow 调用兼容。当 activity、child workflow 或 detached workflow 的目标是另一个应用（`TargetAppId` 与当前应用不同）时，SDK 会将该边界标记为需要内联数据，覆盖主机的 `PreferReference` 设置：

- 普通输入保持内联。
- 任何顶层 `PayloadReference<T>` 都由源应用解析（在重放过滤掉已记录的调用之后，使存储 I/O 不会直接在确定性的 workflow 代码体内运行），并在 Dapr 路由调用之前，将其原始序列化负载以内联方式发送，无需再经过一次反序列化/序列化循环。

跨应用边界切换的作用域：

- **仅限顶层跨应用输入：**DTO 属性内部的嵌套引用、返回值/输出以及 propagated history 不会被自动转换。由于这些路径仍可能携带引用，**参与 multi-app workflow 的每个 .NET 应用都应注册 `WithBinaryStorePayloads(...)`**（且一旦启用就切勿取消注册），以保持兼容性。
- **需要源应用的读取访问权限：**源应用必须注册了负载支持，并且可以访问 Binary Store 中被引用的对象。
- **仍然适用传输限制：**在负载以内联方式物化之后，常规的 Dapr、gRPC、Scheduler 和 state store 消息大小限制仍然适用。
- **按调用选择退出：**当两个应用都支持引用并共享底层 Binary Store 的访问权限时，设置 `AllowPayloadReferences: true`。

请正确配置源 App ID：如果它不可用，任何非空的 `TargetAppId` 都会被视为跨应用，并默认内联。显式的同应用目标则遵循常规的主机偏好。

#### 使用内联默认值

对于顶层跨应用输入，发送方会解析 `reference`，并以内联方式发送普通的 `T` 数据（发送方仍需要 `WithBinaryStorePayloads(...)` 和存储访问权限才能解析 `reference`；如果目标是另一个 .NET 应用，也请在那里注册 `WithBinaryStorePayloads(...)`，以保持返回值和 propagated history 的兼容性）：

```csharp
var length = await context.CallActivityAsync<int>(
    "MeasureDocumentActivity",
    reference,
    new WorkflowTaskOptions(TargetAppId: "document-service"));
```

#### 为已知目标显式允许引用

仅当以下所有条件都成立时，才使用 `AllowPayloadReferences: true` 按调用选择退出：

1. 目标支持带有兼容负载契约和序列化设置的版本 1 信封。JavaScript SDK 从 `@dapr/dapr` 3.19.0 起支持未分阶段的引用；它不实现负载阶段回退。不要假设其他语言的 SDK 支持此方案。
2. 目标在 .NET 中注册了 `WithBinaryStorePayloads(...)`，或在 JavaScript 中注册了[负载解析器]({{% ref js-workflow-data-references.md %}}#register-a-resolver-on-clients-and-workers)（仅升级 SDK 是不够的）。
3. 两个应用都能通过各自 sidecar 中具名的 Binary Store component 访问相同的底层存储对象（component 名称相同但指向独立的内存存储，并不会共享数据）。
4. 发送主机使用 `Preserve` 或 `PreferReference`（`PreferInline` 仍会强制内联内容）。

```csharp
// activity 调用
var length = await context.CallActivityAsync<int>(
    "MeasureReferenceActivity",
    reference,
    new WorkflowTaskOptions(
        TargetAppId: "document-service",
        AllowPayloadReferences: true));

// child workflow 调用
var childLength = await context.CallChildWorkflowAsync<int>(
    "ReferenceWorkflow",
    reference,
    new ChildWorkflowTaskOptions(
        TargetAppId: "document-service",
        AllowPayloadReferences: true));

// detached workflow 调用（除非设置 AllowPayloadReferences: true，否则使用内联默认值）
var detachedId = await context.ScheduleNewDetachedWorkflowAsync(
    workflowName: "DocumentWorkflow",
    instanceId: null,
    input: reference,
    startTime: null,
    options: new WorkflowTaskOptions(TargetAppId: "document-service"));
```

`AllowPayloadReferences` 仅适用于该调用的输入，并且在 SDK 重试时保持不变。detached workflow 选项仅支持 Routing 和负载权限；retry policies 和 history propagation 会被拒绝。

#### 限制与范围

跨应用内联和 `PreferInline` 是**要么内联成功、要么报错**，而不是尽力而为的回退：

- **严格校验：**解析时会检查 `MaxInMemoryRehydrationSize`（同时针对声明大小和实际读取的字节数），并在启用 `VerifyIntegrityOnRead` 时校验 SHA-256 哈希。存储缺失、不受支持的信封或超出限制/完整性失败，都会阻止调用被提交；SDK 绝不会悄悄回退为发送引用。
- **没有递归或返回路径的重写：**由于只转换顶层调用输入，因此需要为嵌套的 `PayloadReference<T>` 属性、返回值和 propagated history，分别规划兼容的契约、写入偏好和存储访问权限。

### 事件负载处理

事件 API 不暴露 `TargetAppId` 或 `AllowPayloadReferences`，而是遵循发送方的 `WritePreference`：

| 事件路径 | 传出策略 |
| --- | --- |
| `context.SendEvent` | 使用 workflow 主机的 `WritePreference`。目标实例位于当前应用中；本地事件不会被强制内联。 |
| 客户端 `RaiseEventAsync` | 使用发布客户端配置的 `WritePreference`。目标由为该客户端配置的 sidecar 端点决定。 |

在 `PreferReference` 下，自动事件卸载由 `OffloadSites` 中的 `PayloadKind.ExternalEvent` 和 `OffloadThreshold` 控制。入站事件遵循标准的[入站处理规则](#入站处理保留已记录的表示形式)。

由于外部应用可以将客户端指向目标的 sidecar 并调用 `RaiseEventAsync`，同应用 Routing 并不能保证兼容的 SDK 支持。当从外部客户端发布到引用支持未知的应用时，请在该客户端上配置 `WritePreference = PayloadWritePreference.PreferInline`（注意这适用于该客户端的所有负载写入，并遵循相同的[要么内联成功、要么报错的限制](#限制与范围)）。

## 迁移、回滚与生命周期

### 在现有 workflow 中采用数据引用

**自动卸载是存储格式的变更；显式引用是应用契约的变更。**

| 方式 | 与已有 workflow 的兼容性 |
| --- | --- |
| 内联 | 默认保持不变。仅调用 `AddDaprWorkflow(...)` 并不会启用负载卸载。 |
| 自动卸载 | 可以在不进行版本化的情况下为运行中的 workflow 启用。已有的 `T` 契约保持不变；SDK 同时读取历史的内联值和新的引用信封。 |
| 显式引用 | 将 `T` 改为 `PayloadReference<T>` 对于包含内联 `T` 的历史记录而言是破坏性的契约变更。请保留旧契约，并在新的 workflow 版本中引入 `PayloadReference<T>`。 |

#### 安全地启用自动卸载

在 `WithBinaryStorePayloads(...)` 中启用 `WritePreference = PayloadWritePreference.PreferReference`。已有的内联值保持不变，并且只有在重放已消费已记录的操作之后，出站卸载才会应用于新发出的负载。在不同构建之间调整 `OffloadThreshold` 同样是安全的：它只决定新写入的历史记录项，并不影响已有的内联或引用负载如何被解析。相反，不要将 `MaxInMemoryRehydrationSize` 降到已有引用负载大小以下；参见[安全地调整 `MaxInMemoryRehydrationSize`](#安全地调整-maxinmemoryrehydrationsize)。

#### 通过基于文件的版本控制引入显式引用

通过将 workflow 复制到新文件并为类赋予带版本的名称（例如 `DocumentWorkflowV2`；仅重命名文件并不会创建版本），使用[name-based workflow versioning]({{% ref dotnet-workflow-versioning.md %}}#name-based-versioning)：

1. **添加新 activity 和 V2 workflow。**为任何变更后的 `PayloadReference<T>` 输入或输出契约创建名称不同的 activity，同时保留原有 activity 的注册。
2. **将新实例路由到 V2。**配置基于名称的版本控制，并保持两个 workflow 版本都已注册（自 SDK v1.17.0 起 workflow 不再需要手动注册，自 v1.18.0 起 activity 也不再需要）。V2 可以保留原有的 workflow 输入类型 `T`，并从其新 activity 中获取引用；但如果 V2 同时将其入口输入改为 `PayloadReference<T>`，则客户端必须在调度 V2 之前调用 `StoreAsync`。

请注意，自动卸载仍然是主机作用域的：在共享主机上启用 `PreferReference`，会同时影响 V1 和 V2 发出的符合条件的负载。

#### 何时适合使用基于补丁的版本控制

`context.IsPatched(...)` 可以保护一个新的分支，该分支调用生成引用的 activity，同时保持 workflow 的原始入口输入类型 `T`。它**无法**保护对 workflow 入口输入类型的更改，因为工作进程会在调用 workflow 体之前反序列化输入。

### 切换回内联负载

**切勿取消注册 `WithBinaryStorePayloads(...)`**，无论是在主应用中，还是在与其一起参与 multi-app workflow 的任何 .NET 应用中。请保留 `WithBinaryStorePayloads(...)` 及 Binary Store 配置，使使用过数据引用的历史 workflow 仍然可以读取，并通过优先使用内联负载来停止未来的卸载：

- **从自动卸载（普通 `T` 契约）切换：**设置 `WritePreference = PayloadWritePreference.PreferInline`：

  ```csharp
  builder.Services.AddDaprWorkflow().WithBinaryStorePayloads(options =>
  {
      options.StoreName = "workflow-payloads";
      options.WritePreference = PayloadWritePreference.PreferInline;
  });
  ```

  `PreferInline` 会让未来的普通值保持内联，并在写入前解析所有传出的引用，同时不重写已有历史记录，也不禁用引用读取。
- **从显式引用（`PayloadReference<T>` 契约）切换：**引入一个新的 workflow 版本，以及接受普通 `T` 契约的、单独命名的 activity，并在新路径中停止调用 `StoreAsync`。在新旧版本共享同一主机期间，请使用 `Preserve`（而不是 `PreferInline`，后者会把旧版本 `PayloadReference<T>` 接收方仍然期望的引用转换为内联内容），并且在任何仍期望引用的旧跨应用调用上保留 `AllowPayloadReferences: true`。

### 操作带有已存储负载的 workflow

#### 读取 workflow metadata 可能会下载负载

获取输入和输出的客户端方法会在返回之前尝试解析引用，而 `ReadInputAs<T>`、`ReadOutputAs<T>` 和 `ReadCustomStatusAs<T>` 仍然是同步的：

- `state.ReadOutputAs<DocumentPayload>()` 返回反序列化后的文档。
- `state.ReadOutputAs<PayloadReference<DocumentPayload>>()` 会暴露保留的引用（如果记录的值已被卸载），不过在获取 metadata 之后再请求引用，并不会撤销获取时已经执行的下载。
- 如果在获取 metadata 期间负载超过了 `MaxInMemoryRehydrationSize`，状态会保留该引用，因此你仍可以读取 `PayloadReference<T>` 并通过 `OpenAsync` 进行流式读取；而调用 `ReadOutputAs<T>()` 则会抛出 `PayloadRehydrationLimitException`。其他读取错误（对象缺失、完整性失败）会立即使 metadata 获取失败。

当你只需要完成状态时，请避免下载输入和输出（并保持 custom status 较小，因为它会被无条件解析）：

```csharp
var state = await client.WaitForWorkflowCompletionAsync(
    instanceId, getInputsAndOutputs: false);

if (state.RuntimeStatus != WorkflowRuntimeStatus.Completed)
{
    throw new InvalidOperationException($"Workflow {instanceId} ended with {state.RuntimeStatus}.");
}
```

#### 保留与清理负载

workflow 完成和历史记录清除**不会**自动删除二进制对象，并且删除仍被任何历史记录、结果、child workflow 或重新运行引用的对象，将破坏重放或检查：

1. **注册持久化 manifest：**默认的 `IWorkflowPayloadManifest` 是空操作。若要在重启之后跟踪对象以进行清理，请实现持久化的 `IWorkflowPayloadManifest`，并通过 `builder.Services.WithPayloadManifest<YourDurableManifest>()` 将其注册在 `WithBinaryStorePayloads` **之后**。
2. **在历史记录删除后清除：**仅当所属 workflow 历史记录已被清除，且没有其他 workflow 共享其引用（转发引用不会转移所有权，也不会对其进行引用计数）之后，才解析 `WorkflowPayloadCleaner` 并调用 `PurgeAsync(instanceId)`。还要考虑当后续调度调用失败时，通过 `StoreAsync` 上传的孤立负载。

## 基准测试对比

[SDK 基准测试](https://github.com/dapr/dotnet-sdk/tree/431e22f34e9384e63995e0e8bd68046837e139a7/benchmarks/Dapr.Workflow.Benchmarks)比较了三种方式，用于处理同一个经序列化的 **2,000,000 字节文档**，且该文档需经过**九个顺序 activity**。前八个 activity 使用小值协调工作，只有第九个 activity 需要该文档，三种模式计算出的校验和相同。

| 情况 | workflow 输入 | 存储与物化 |
| --- | --- | --- |
| `Inline` | `BenchmarkDocument` | 未注册负载。完整文档保存在 workflow 历史记录中；每次 workflow 执行时反序列化。 |
| `Automatic` | `BenchmarkDocument` | 数据位于 Binary Store 中，历史记录中为引用。每次执行及处理 activity 时自动获取并反序列化。 |
| `References` | `PayloadReference<BenchmarkDocument>` | 仅重放引用。仅在第九个 activity 中获取并反序列化一次。 |

当前基准测试对 `Automatic` 显式选择了 `PreferReference`，对 `References` 显式选择了 `Preserve`。以下示例结果不构成延迟或吞吐量的保证：

| 模式 | 总耗时中位数（ms） | 执行耗时中位数（ms） | 总耗时范围（ms） | workflow protobuf 字节数 | 二进制下载字节数 | 文档反序列化次数 | 分配字节数 | 总加速比 |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| Inline | 302.9 | 302.9 | 269.0..370.2 | 12,010,505 | 0 | 11 | 74,661,448 | 1.00x |
| Automatic | 224.9 | 202.9 | 175.2..769.2 | 12,254 | 22,000,000 | 11 | 103,614,880 | 1.35x |
| References | 122.7 | 113.4 | 109.6..204.6 | 12,288 | 2,000,000 | 1 | 14,869,544 | 2.47x |

除最小/最大范围外，所示测量值均为中位数。总耗时包括准备和执行。两种卸载情况都会在调度前显式存储初始文档，以便单独测量准备阶段（序列化/上传）。执行耗时涵盖从调度到完成的过程，包括之后的任何卸载。总加速比是内联模式的总耗时中位数除以该模式的总耗时中位数。

### 结果说明了什么

- **两种卸载方式都能减少 workflow 流量：**测得的 workflow protobuf 字节数下降约 **99.9%**，从 12.01 MB 降至约 12.3 KB。这是 workflow 消息流量，而不是持久化历史记录的大小，也不是总网络流量。
- **自动卸载的分配多于内联：**在本次运行中它快了 **1.35 倍**（总耗时减少 25.8%），但它反序列化了文档 11 次，下载了 22 MB，分配的托管字节数是内联处理的 **1.39 倍**。
- **推迟物化很重要：**显式引用比内联处理快 **2.47 倍**（总耗时减少 59.5%），分配的托管字节数减少 **80.1%**。与自动卸载相比，文档反序列化次数从 11 次降至 1 次，二进制下载量下降 **90.9%**，从 22 MB 降至 2 MB。
- **中位数加速比并不能消除计时的波动性：**自动卸载的总耗时范围（175.2..769.2 ms）与内联（269.0..370.2 ms）和显式引用（109.6..204.6 ms）的范围都有重叠。中位数加速比并不意味着每次运行都比另一种模式快。

这些结果支持在大多数 workflow 步骤都不需要文档时使用显式引用。自动卸载可以在较少改动应用的情况下减轻历史记录压力，但它只是把重复读取转移到了 Binary Store 上，而并没有消除这些读取。

### 测量范围与局限

workflow protobuf 字节数统计的是为调度、工作项、完成和历史获取而发送和接收的序列化消息体。它不包括状态查询、健康检查 ping、传输帧、头部、TLS 和后端流量。二进制下载字节数统计的是返回给 SDK 的文件内容；该表**不包括**二进制上传字节数。不要把 99.9% 的减少解读为总网络流量的等量减少。

“文档反序列化次数”是基准测试的 `Doc reads` 计数，而不是存储调用的计数：内联模式虽然没有进行任何 Binary Store 读取，但也有 11 次反序列化。分配字节数是测量窗口内**进程范围的托管分配**，而不是峰值内存或 sidecar 的分配。

连接预热、数据集生成、主机启动/关闭、结果检查和清理都不在计时窗口之内。完成等待不会请求输入或输出，从而避免额外的 metadata 下载。包括 protobuf 大小计算和 UTF-8 字节计数在内的检测会增加开销，并影响测得的耗时和分配。

基准测试提供的 component 是内存中的 Binary Store，这最大限度地减少了后端延迟。上述摘要未说明硬件、运行时版本、迭代次数或历史缓存设置；用于容量规划的结果应附带这些细节。该基准测试可以在启用或禁用历史缓存的情况下运行。缓存的历史记录可以减少重复的内联传输，但无法消除文档反序列化；不要把完整历史记录的结果推广到启用缓存的部署。

在为生产环境选择模式之前，请使用有代表性的负载、重放模式和持久化存储重新运行基准测试。请遵循基准测试 README 的说明，采集两种历史缓存配置以及单个样本的 JSON 报告。小负载，或每次执行都需要文档的 workflow，可能无法从外部存储中获益。

## 相关链接

- [Workflow data references 示例](https://github.com/dapr/dotnet-sdk/tree/622c5374db5b06d0cdf538e94927853f0beede88/examples/Workflow/WorkflowDataReferences)
- [workflow 序列化]({{% ref dotnet-workflow-serialization.md %}})
- [workflow 负载大小]({{% ref workflow-payload-size.md %}})
- [.NET SDK 中的 multi-application workflow]({{% ref dotnet-workflow-multi-app.md %}})
