---
type: docs
title: "JavaScript SDK 中的 Workflow data references"
linkTitle: "数据引用（alpha）"
weight: 1500
description: 通过显式引用将大型 workflow 负载卸载到 Binary Store，并延后具体化
---

Workflow data references 可以让大型负载不进入内联的 workflow 历史。JavaScript SDK 会将序列化后的值存入 Dapr Binary Store，并记录一个小型、带版本号的引用信封。你可以保留普通的 workflow 输入，让 SDK 自动获取数据；也可以转发显式的 `PayloadReference` 值，在 workflow 中无需下载文档即可传递它。

{{% alert title="alpha 功能" color="warning" %}}
binary-store building block 以及本 SDK 集成均处于 alpha，可能发生变更。这些 API 需要 **`@dapr/dapr` 3.19.0 或更高版本**、Dapr runtime **1.19 或更高版本**，以及除常规 workflow 基础设施之外的一个 binary-store component。
{{% /alert %}}

## 选择如何处理负载

| 方式 | 行为 | 适用场景 |
| --- | --- | --- |
| 内联（默认） | 序列化后的值随 workflow 历史一起传递，无需访问 Binary Store。 | 小型负载。 |
| 自动卸载 | `PreferReference` 会存储符合条件的大值。普通的输入/结果契约会触发自动下载与反序列化。 | 在保持现有应用契约的同时减小历史体积。 |
| 显式引用 | 注册引用输入并请求引用结果；转发引用信封而不下载数据。仅在需要的地方解析或流式读取。 | 协调大型文档、但不检查其内容的 workflow。 |

### 性能与内存权衡

卸载会用小型引用替换重复出现的大型历史值，从而减少历史存储和 workflow 协议流量。但它并不让存储 I/O 变得免费：

- **自动卸载仍会具体化值。** 普通的 workflow 输入、activity 结果或事件在被使用时必须下载并反序列化。重放会重复这些读取；缓存的作用范围仅限于单次编排器执行，不会在多次重放之间共享。
- **显式引用可避免不必要的读取。** workflow 可以把同一个引用传递给多个 activity，而无需加载文档本身。只有需要内容的使用者才会解析或流式读取它。
- **流式读取可避免完整缓冲。** 它以反序列化对象的便利性为代价，换取对原始序列化字节的增量访问。

对于经过多个步骤转发的大小为 `S` 的文档，内联历史会反复携带约 `S` 量级的数据；基于引用的历史则反复携带小得多的信封。这只是一个流量模型，而不是 JavaScript 的延迟或分配基准测试。实际性能取决于文档大小、重放频率、存储延迟，以及有多少使用者会具体化数据。小型值内联时可能更快。请不要把 [.NET 基准测试结果]({{% ref dotnet-workflow-data-references.md %}}#benchmark-comparison) 套用到 JavaScript 上；请测量你自己的工作负载。

## 设置负载支持

### 配置 binary-store component

如果只是一次性的本地实验，请将以下内容保存为 `components\workflow-payloads.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflow-payloads
spec:
  type: binarystore.in-memory
  version: v1
  metadata:
    - name: maxSize
      value: "4Mi"
    - name: maxTotalSize
      value: "512Mi"
```

{{% alert title="In-memory 存储仅用于实验" color="warning" %}}
In-memory 负载会在 sidecar 停止时消失，并且不会在多个 sidecar 之间共享。而持久化的 workflow 历史可能比这些对象存活得更久，从而变得无法读取。对于必须在重启后继续运行的 workflow，请使用持久化的 Binary Store，并在历史或下游使用者仍在引用对象期间保留这些对象。
{{% /alert %}}

有关 component 和传输的详细信息，请参阅 [binary-store 指南]({{% ref js-binarystore-howto.md %}})。仅添加 component 本身不会启用 workflow 卸载。

### 在客户端与工作进程上注册解析器

```javascript
import {
  BinaryStoreWorkflowPayloadResolver,
  CommunicationProtocolEnum,
  DaprClient,
  DaprWorkflowClient,
  PayloadWritePreference,
  WorkflowRuntime,
} from "@dapr/dapr";

const connection = { daprHost: "127.0.0.1", daprPort: "50001" };
const dapr = new DaprClient({
  ...connection,
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});
const payloads = new BinaryStoreWorkflowPayloadResolver(dapr.binaryStore, {
  storeName: "workflow-payloads",
  writePreference: PayloadWritePreference.PreferReference,
  offloadThreshold: 64 * 1024,
});
const client = new DaprWorkflowClient({ ...connection, payloads });
const runtime = new WorkflowRuntime({ ...connection, payloads });
```

解析器使用 `DaprClient.binaryStore`，它支持 HTTP 或 gRPC；workflow 传输本身仍使用 gRPC。如果客户端连接到不同的端点，请保持端点和 API 令牌配置一致。`storeName` 必须与 component 名称一致。所有读取方都需要能访问被引用的存储/键，并使用兼容的序列化方式。仅仅构造解析器时使用的是 `Preserve`，而不是自动卸载；上面的示例显式选择了 `PreferReference`。

## 使用自动卸载

沿用上面的注册方式，保留普通输入：

```javascript
function* documentWorkflow(ctx, document) {
  return yield ctx.callActivity("measureDocument", document);
}

async function measureDocument(_ctx, document) {
  return document.content.length;
}

runtime.registerWorkflow(documentWorkflow).registerActivity(measureDocument);

try {
  await runtime.start();
  const id = await client.scheduleNewWorkflow(documentWorkflow, {
    content: "a".repeat(128 * 1024),
  });
  const state = await client.waitForWorkflowCompletion(id, true, 60);
  console.log(state?.getOutput());
} finally {
  await runtime.stop();
  await client.stop();
  await dapr.stop();
}
```

将此片段与上面的导入语句和解析器设置合并到 `app.mjs` 中，然后运行：

```sh
dapr run --app-id document-workflow --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

文档超过阈值，因此会在符合条件的边界处被卸载。workflow 仍然接收到普通对象，并在重放时下载它；较小的数字结果则保持内联。

## 显式传递引用

JavaScript 类型在运行时会被擦除。仅有 TypeScript 注解（如 `PayloadReference<DocumentPayload>`）并**不会**改变输入的读取方式。必须为每个接受引用信封的 workflow 和 activity 注册 **`{ inputAsReference: true }`**。

以下是自动卸载示例的替代写法，解析器设置相同：

```javascript
function* referenceWorkflow(ctx, documentReference) {
  return yield ctx.callActivity("measureReference", documentReference);
}

async function measureReference(ctx, documentReference) {
  const document = await ctx.payloads.resolve(documentReference);
  return document.content.length;
}

runtime
  .registerWorkflow(referenceWorkflow, { inputAsReference: true })
  .registerActivity(measureReference, { inputAsReference: true });

try {
  await runtime.start();
  const instanceId = "document-reference-1";
  const reference = await payloads.store(
    { content: "a".repeat(128 * 1024) },
    instanceId,
  );
  await client.scheduleNewWorkflow(referenceWorkflow, reference, instanceId);
  const state = await client.waitForWorkflowCompletion(instanceId, true, 60);
  console.log(state?.getOutput());
} finally {
  await runtime.stop();
  await client.stop();
  await dapr.stop();
}
```

`store(value, instanceId, signal?)` 会显式存储序列化后的值，与自动阈值或写入偏好无关。workflow 只转发其引用；activity 负责下载文档。引用输入契约会拒绝内联值，而不是静默地存储或转换它。

### 将 activity 和子 workflow 结果保留为引用

activity 可以返回由 `ctx.payloads.store(value, ctx.getWorkflowInstanceId())` 创建的引用。在 `ctx.callActivity` 或 `ctx.callChildWorkflow` 上请求 `resultAsReference: true`，即可接收该引用而不自动解析它：

```javascript
function* documentPipeline(ctx, input) {
  const reference = yield ctx.callActivity("createDocument", input, {
    resultAsReference: true,
  });
  return yield ctx.callActivity("measureReference", reference);
}
```

生成结果的 activity 必须真正返回引用，否则其结果必须由策略进行卸载。内联结果会导致引用结果契约失败，即使该结果小于卸载阈值也是如此。`resultAsReference` 并不会强制写入。请直接转发 `PayloadReference` 对象，而不是包含引用的普通对象：嵌套的引用不会被递归转换或解析。

### 仅在必要时在 workflow 内解析

`ctx.hasPayloadResolver()` 用于报告是否已配置负载支持。`yield ctx.resolvePayload(reference)` 会通过 SDK 任务下载并反序列化数据。`yield ctx.openPayload(reference)` 会获取一个原始的 Node.js 可读流；异步消费它需要使用异步生成器。这些只读 API 受支持，但在重放期间会重复执行，并且会失去将文档保留在编排器之外这一主要好处。应优先在 activity 中解析或流式读取。不要在 workflow 代码中执行任意的存储写入操作。

## 在 activity 中流式读取负载

`ctx.payloads.open(reference, signal?)` 返回一个 Node.js `Readable`，其内容为原始存储的 UTF-8 序列化字节。它不会反序列化文档：

```javascript
async function countStoredBytes(ctx, reference) {
  const stream = ctx.payloads.open(reference);
  let bytes = 0;
  try {
    for await (const chunk of stream) {
      bytes += chunk.length;
    }
  } finally {
    stream.destroy();
  }
  return bytes;
}

runtime.registerActivity(countStoredBytes, { inputAsReference: true });
```

流式读取会绕过 `maxInMemoryRehydrationSize`，但同时也会绕过带缓冲的 SHA-256 校验以及负载阶段的还原。如有需要，请在消费流的同时计算并校验哈希值。提前退出时应销毁流，并处理流错误。仅创建流本身并不会下载全部数据。字节计数包括 JSON 语法与编码，而不仅仅是应用字符串的长度。

## 配置与策略参考

卸载使用序列化值的 **UTF-8 字节数**，而不是 JavaScript 字符串长度。键的格式为 `<keyPrefix>/<instanceId>/<sha256>`。引用包含存储、键、大小、SHA-256 哈希、格式版本以及可选的阶段 metadata。版本 1 的线上信封使用保留属性 `$daprRef`。

| 解析器选项 | 默认值与行为 |
| --- | --- |
| `storeName` | 必填的 Binary Store component 名称。读取时使用每个引用中记录的存储。 |
| `keyPrefix` | `"workflow-payloads"`；新的内容寻址键的前缀。 |
| `writePreference` | `PayloadWritePreference.Preserve`。参见下方的策略表。 |
| `offloadSites` | `PayloadKind.All`；符合条件的边界类型的按位组合。 |
| `offloadThreshold` | `64 * 1024` 字节（含边界）。正整数；`null` 表示在 `PreferReference` 下卸载每个符合条件的非空序列化快照。 |
| `skipWriteIfExists` | `true`；容忍已存在的内容寻址对象，而不是覆盖它。这并不意味着 SDK 会跳过每一次上传尝试。 |
| `maxInMemoryRehydrationSize` | `16 * 1024 * 1024` 字节。同时针对信封大小和实际缓冲字节数进行强制限制。 |
| `verifyIntegrityOnRead` | `true`；缓冲读取会校验 SHA-256 哈希。 |
| `resolutionCacheSize` | 每次编排器执行 `128` 个条目。`0` 禁用缓存。 |
| `resolutionCacheBytes` | 每次执行中信封字节总和的上限为 `64 * 1024 * 1024`。`0` 禁用缓存；超出预算的值会被读取但不缓存。 |
| `manifest` | 可选的、持久且幂等的 `IWorkflowPayloadManifest` 实现，用于显式清理。 |

缓存保存的是序列化的读取结果，而不是跨重放持久的对象缓存。条目数和字节数两个上限都会生效。

| 写入偏好 | 普通值 | 已有的顶层引用 |
| --- | --- | --- |
| `Preserve` | 保持内联。 | 直接透传，但跨应用输入需要内联时除外。 |
| `PreferReference` | 在符合卸载位置与阈值的情况下卸载。 | 直接透传，但跨应用输入需要内联时除外。 |
| `PreferInline` | 保持内联。 | 在写入待发送的值之前先解析。 |

`offloadSites` 可组合以下类型：`PayloadKind.WorkflowInput`、`WorkflowOutput`、`ActivityInput`、`ActivityOutput`、`ExternalEvent`、`ContinueAsNewInput`、`CustomStatus`、`ChildWorkflowInput` 和 `ChildWorkflowOutput`。例如，`PayloadKind.ActivityInput | PayloadKind.ActivityOutput` 会将自动卸载限定在 activity 边界。`PayloadKind.None` 会禁用新的自动卸载，但不会禁用读取或转发。detached workflow 的输入使用 `WorkflowInput`，终止输出使用 `WorkflowOutput`，重新运行时替换的输入同样使用 `WorkflowInput`。

### 读取限制与错误

带缓冲的解析会拒绝分阶段的引用，因为 JavaScript 未实现阶段还原。超过配置的上限时会抛出 `PayloadRehydrationLimitError`；对象缺失时抛出 `PayloadNotFoundError`；启用校验时哈希不匹配会抛出 `PayloadIntegrityError`。`PayloadNotResolvableError` 表示缺少解析器支持。无效或不受支持的保留引用信封会直接抛出错误，而不会被当作普通应用数据处理。

更改写入阈值只影响新写入。降低内存中重新水化上限可能会破坏**已有的**普通值使用者以及 `PreferInline` 转换。请针对所有保留的负载规划此类更改；对于不能被完整缓冲的值，请使用显式引用和流式读取。

## 读取客户端结果

`getWorkflowState` 以及各种等待方法会在返回之前准备好引用的输入、输出和 custom status。如果存在兼容的解析器，普通的 getter 会使用已解析的序列化数据。这意味着即使你只想检查引用，获取负载也可能触发下载。

`state.getInputReference()`、`getOutputReference()` 和 `getCustomStatusReference()` 会暴露原始引用。如果由于缺少解析器或大小超出上限而拒绝了带缓冲的解析，引用仍然可以访问，而对应的类型化 getter 会抛出准备阶段的错误：

```javascript
const state = await client.getWorkflowState(instanceId, true);
const reference = state?.getOutputReference();
if (reference) {
  const stream = payloads.open(reference);
  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
  } finally {
    stream.destroy();
  }
}
```

对于打算流式读取大型结果的客户端，请使用合适的重新水化上限。缺失的对象和完整性校验失败会直接使状态请求被拒绝，而不会被延迟处理。当准备阶段无法解析时，序列化 getter 仍可能包含原始信封；请勿把该信封当作应用对象使用。仅读取 metadata 的状态请求会省略输入/输出字段。历史记录检索和 propagated history 视图会保留其线上负载，不会对其进行水化。

## 跨应用与跨语言调用

跨应用的 activity、子 workflow 及 detached workflow 的输入，即使在 `PreferReference` 下也**默认内联**。发送方会在提交前解析已有的顶层引用；如果读取失败，则阻止提交。目标端应接受该输入的普通值。

要转发引用，请在调用上显式允许：

```javascript
const result = yield ctx.callActivity("remoteDocumentConsumer", reference, {
  targetAppId: "document-service",
  allowPayloadReferences: true,
});
```

这会允许解析器的写入策略生效；但它不会强制卸载，也不会覆盖 `PreferInline`。每个读取方都必须通过各自的 sidecar，将记录的存储与键解析为**同一个二进制对象**。独立的 in-memory component 无法满足这一要求。

JavaScript 与 .NET SDK 共享版本 1 的信封，但跨语言使用还需要兼容的序列化方式和契约。JavaScript 的带缓冲读取不会还原 .NET 的负载阶段。对此类调用请使用未分阶段且兼容的负载；不应假定其他 SDK 支持该方案。

默认内联只保护顶层**调用输入**。它不会内联嵌套引用、返回值、external event，也不会内联传播的祖先历史中的引用。在启用负载支持之前，请协调整个拓扑中的负载支持；不要在同一个 App ID 下混用支持负载的工作进程与不支持负载的工作进程。

## 事件与延续

`client.raiseEvent` 和 workflow 中的 `ctx.sendEvent` 会应用 `ExternalEvent` 写入策略。`ctx.waitForExternalEvent(name)` 会将被卸载的事件作为普通值解析；如需在不下载的情况下接收信封，请使用 `ctx.waitForExternalEvent(name, { asReference: true })`。发送方必须确实提供引用，或为该事件生成被卸载的数据，才能满足该契约。

`continueAsNew` 会应用 `ContinueAsNewInput` 策略。使用 `saveEvents: true` 保留的、未被消费的引用事件会被原样携带到下一代，而不会被具体化。请确保下一代的输入契约与新输入兼容。

## 在现有应用中采用引用

首先在所有可能读取历史记录的位置以 `Preserve` 部署解析器支持。这样新的普通值仍保持内联，同时允许读取已有的引用。接下来，在评估存储持久性、读取上限以及每个下游使用者之后，再在选定的位置启用 `PreferReference`。

将普通输入改为 `inputAsReference: true` 是一项**契约变更**：旧的内联历史无法满足该契约。请引入新的注册名称或版本，将新实例路由到该契约，同时为已有实例保留旧实现。同理，`resultAsReference` 和 `asReference` 不得引入到仍包含内联结果或事件的历史中。

若要停止创建新的自动引用，请使用 `Preserve`；若还要将外发引用内联，请使用 `PreferInline`。**只要任何历史、结果、事件或使用者仍可能包含引用，就请保持解析器已注册。** 切换写入策略不会重写已保留的历史。

## 保留与清理

workflow 完成和 `purgeWorkflow` 都不会删除 Binary Store 对象。失败的调度请求也可能留下已上传的对象。应为挂起的 workflow、重放、重新运行、子孙 workflow 以及被转发的引用保留对象；删除源实例的对象可能会破坏仍在使用它的其他实例。

若需显式清理，请提供一个持久的 `IWorkflowPayloadManifest`，它需实现异步方法 `record(instanceId, reference, signal?)`、`list(instanceId, signal?)` 和 `clear(instanceId, signal?)`，然后仅在没有使用者需要这些对象时调用 `await payloads.deletePayloads(instanceId)`。解析器会将写入记录到 manifest 中，但它无法发现每个被转发引用的使用者。没有 manifest 时进行清理会抛出错误。删除时会容忍缺失的对象；其他错误会继续向上传播，且只有在所有删除成功之后才会清空 manifest。

请根据数据的性质采用适当的应用层保留和访问控制策略。引用只是定位符，既不是授权凭据，也不能替代对 Binary Store component 本身的保护。
