---
type: docs
title: "Workflow serialization in the JavaScript SDK"
linkTitle: "workflow 序列化"
weight: 1400
description: "在 workflow 客户端和工作进程之间统一配置负载序列化"
---

JavaScript SDK 默认使用 JSON。使用 `@dapr/dapr` **3.19.0 或更高版本**时，客户端和工作进程可以通过各自的 `serializer` 选项共享自定义的 `IDaprSerializer`。序列化器的选择发生在客户端，它本身并不要求支持 Binary Store。

## 默认 JSON 行为

workflow 负载使用 `JSON.stringify` 和 `JSON.parse`。请使用与 JSON 兼容的应用契约：日期会被反序列化为字符串，原型不会被重建，`BigInt` 需要显式处理，循环引用的值无法被序列化。TypeScript 泛型描述的是预期的结果，但在运行时并不会校验或实例化该类型。

`WorkflowState.getInput<T>()`、`getOutput<T>()` 和 `getCustomStatus<T>()` 使用客户端的序列化器。它们对应的序列化形式是字符串，而不是已解析的应用值。

## 配置序列化器

序列化器契约用于在值与**字符串**之间相互转换：

```typescript
import {
  DaprWorkflowClient,
  JsonSerializer,
  WorkflowRuntime,
  type IDaprSerializer,
} from "@dapr/dapr";

const serializer: IDaprSerializer = new JsonSerializer();
const options = { daprHost: "127.0.0.1", daprPort: "50001", serializer };
const client = new DaprWorkflowClient(options);
const runtime = new WorkflowRuntime(options);
```

如需自定义格式，请实现 `serialize<T>(value: T): string` 和 `deserialize<T = unknown>(data: string): T`。可选的 `contentType` 用于标识媒体类型，供使用它的 SDK API 使用；它并不是 workflow 线路格式的协商机制。二进制格式可以使用 Base64 来满足字符串契约，代价是体积增大。序列化应当是确定性的，遇到无效输入时应抛出异常，而不是静默返回默认值。

{{% alert title="已持久化历史的兼容性" color="warning" %}}
请为参与该 workflow 的每个客户端、activity 工作进程和 workflow 工作进程部署兼容的序列化器。修改编码或模式可能会破坏已有的历史记录、结果、事件以及重新运行。SDK 不会自动迁移已持久化的数据，也不会在不同应用之间协商格式。请保留旧的解码器，或引入单独的 workflow 契约和注册名称。
{{% /alert %}}

对于跨语言 workflow，请就线路格式和属性名称达成一致。JavaScript 的默认 JSON 行为无法替代 .NET SDK 的大小写不敏感反序列化或其他语言特定的转换规则。

## 结合序列化与数据引用

[Workflow data references]({{% ref js-workflow-data-references.md %}})会将序列化后的 UTF-8 字符串卸载到 Binary Store。卸载与选择序列化器相互独立，并且是在**序列化之后**才进行判断。引用信封本身是带版本号的 JSON，与应用的序列化器无关。

请为 `BinaryStoreWorkflowPayloadResolver` 以及所有客户端和工作进程提供相同的序列化器。当 Workflow Client 或运行时设置了 `payloads` 但没有显式的 `serializer` 时，它会使用 `payloads.serializer`。显式设置的 `serializer` 会覆盖这一选择；不要在这两处配置不兼容的序列化器。只有顶层的 `PayloadReference` 对象会获得特殊的信封处理，嵌套在应用对象中的引用不会。
