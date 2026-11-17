---
type: docs
title: "Dapr 对话 JavaScript 客户端用法"
linkTitle: "对话客户端用法"
weight: 50020
description: 在 JavaScript 中配置对话请求、消息历史、结构化输出、缓存和响应处理
---

`DaprClient.conversation` 只暴露一个异步方法：

```typescript
converse(request: ConversationRequestAlpha2): Promise<ConversationResponseAlpha2>;
```

从 `@dapr/dapr` 导入这些类型，以及下文用到的其他 `Conversation*` 类型。本指南适用于 **3.19.0 或更高版本**。

## 运行时与提供商支持

| 能力 | 最低 Dapr runtime |
| ---------- | -------------------- |
| Alpha2 消息、工具调用、temperature 和 PII 清理 | 1.16 |
| `responseFormat`、`promptCacheRetention` 和 token 用量统计 | 1.17 |
| 响应中的模型名称 | 1.18 |
| `maxTokens` | 1.19 |

功能是否可用还取决于 conversation component 和模型。SDK 选项不会让不受支持的提供商功能变为可用。请参阅 [conversation API 参考]({{% ref conversation_api.md %}})和你所用的 [component 参考]({{% ref supported-conversation %}})。

## 客户端配置与生命周期

创建一个长期存活的 `DaprClient` 并在多个请求之间复用。应用关闭时调用 `await client.stop()`，不要在共享客户端的每次操作之后调用。

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

发送 HTTP 请求时，请将 `CommunicationProtocolEnum.HTTP` 与 sidecar 的 HTTP 端口一起使用。SDK 通过 HTTP 调用 `/v1.0-alpha2/conversation/{name}/converse`，通过 gRPC 调用 `ConverseAlpha2`。你传入的是普通的 JavaScript 对象，而不是 protobuf 消息或提供商原生的请求对象。

客户端还支持使用 `DAPR_HTTP_ENDPOINT` 和 `DAPR_GRPC_ENDPOINT` 配置端点。`DAPR_API_TOKEN` 用于向 sidecar 进行身份验证，它与 component 上配置的提供商 API 密钥是分开的。共享的客户端选项请参阅 [JavaScript 客户端配置]({{% ref js-client %}})。

## 消息与对话历史

一个请求包含一个或多个 `inputs`，每个 input 都带有非空的 `messages` 数组。每条消息必须**恰好包含一个**角色属性：

| 角色属性 | 内容 |
| ------------- | ------- |
| `ofDeveloper` | 开发者指令，可选带参与者 `name`。 |
| `ofSystem` | 系统指令，可选带参与者 `name`。 |
| `ofUser` | 用户输入，可选带参与者 `name`。 |
| `ofAssistant` | 助手此前的文本和/或 `toolCalls`，可选带参与者 `name`。对于仅包含工具调用的消息，可以省略内容。 |
| `ofTool` | 函数结果，必须带非空的 `name`、文本内容，以及用于与助手工具调用对应的 `toolId`。 |

消息内容是 `{ text: string }` 对象的数组，而不是单个字符串。SDK 的对话消息类型仅支持文本，不支持图片或音频内容部分。

以下示例复用已配置的 `client`，以及名为 `llm` 的大型语言模型 (LLM) component：

```javascript
const messages = [
  { ofSystem: { content: [{ text: "Give concise, factual answers." }] } },
  { ofUser: { name: "reader", content: [{ text: "What is Dapr?" }] } },
];

const response = await client.conversation.converse({
  name: "llm",
  contextId: "chat-123",
  inputs: [{ messages }],
});

const choice = response.outputs[0]?.choices[0];
if (!choice?.message || choice.finishReason !== "stop") {
  throw new Error("Expected a completed text response before continuing the chat");
}

messages.push(
  { ofAssistant: { content: [{ text: choice.message.content }] } },
  { ofUser: { content: [{ text: "How does it help with pub/sub?" }] } },
);

const followup = await client.conversation.converse({
  name: "llm",
  contextId: response.contextId || "chat-123",
  inputs: [{ messages }],
});
```

`contextId` 是关联值，**不是服务端的聊天记忆**。请在你的应用中保存历史，并在每个轮次中重新发送所需的消息。继续对话时，请选择一个助手回复候选（choice），不要把其他备选 choice 合并到同一段历史中。

## 请求选项

| 属性 | 说明 |
| -------- | ----------- |
| `name` | 必填，非空的 component 名称。 |
| `inputs` | 必填，非空的对话输入数组。 |
| `contextId` | 可选的关联值。 |
| `temperature` | 可选的有限数值，用于控制随机性。可接受的范围由 component 和模型决定。显式设置的 `0` 会被保留。 |
| `scrubPii` | 可选布尔值，用于对响应文本启用 PII 混淆。输入文本需要单独设置 `inputs[].scrubPii`。 |
| `metadata` | 可选的字符串到字符串的对话标签，不是提供商配置或凭据。 |
| `tools`、`toolChoice` | 可选的函数定义和工具选择策略。请参阅[工具调用]({{% ref js-conversation-tools-howto.md %}})。 |
| `responseFormat` | 可选的 JSON Schema 对象，用于结构化输出。 |
| `promptCacheRetention` | 可选的非负 `Temporal.Duration`，用于设置提示词缓存保留时间。 |
| `maxTokens` | 可选整数，范围为 `1` 到 `2147483647`，用于限制生成的补全 token 数。 |
| `parameters` | 可选的 JSON 对象，由 Dapr 保留。它不是通用的提供商选项容器。SDK 会在内部对其值进行编码。 |

### PII 清理与 metadata

输入和输出的清理是两项独立的设置：

```javascript
const response = await client.conversation.converse({
  name: "llm",
  inputs: [
    {
      scrubPii: true,
      messages: [
        { ofUser: { content: [{ text: "Contact me at reader@example.com." }] } },
      ],
    },
  ],
  scrubPii: true,
  temperature: 0,
  metadata: { user_id: "user-123", session_id: "chat-123" },
});
```

metadata 最多支持 16 对键值，键最长 64 个字符，值最长 512 个字符。请将 API 密钥和 component 连接设置保存在 component 配置中，或保存在被引用的 secrets 中。

### 结构化输出

直接将 JSON Schema 作为 `responseFormat` 传入，而不是 OpenAI 的 `response_format` 包装对象，也不是 JSON 编码的字符串：

```javascript
const response = await client.conversation.converse({
  name: "llm",
  inputs: [
    {
      messages: [
        { ofUser: { content: [{ text: "Answer with the name of Dapr's pub/sub building block." }] } },
      ],
    },
  ],
  responseFormat: {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
    additionalProperties: false,
  },
});

const choice = response.outputs[0]?.choices[0];
if (!choice?.message || choice.finishReason !== "stop") {
  throw new Error("Expected a completed structured response");
}
const value = JSON.parse(choice.message.content);
if (
  value === null ||
  typeof value !== "object" ||
  Array.isArray(value) ||
  typeof value.answer !== "string" ||
  Object.keys(value).length !== 1
) {
  throw new Error("Response does not match the expected answer schema");
}
console.log(value.answer);
```

SDK 以字符串形式返回内容；它不会解析生成的 JSON，也不会按你的 schema 进行校验。请处理 JSON 解析失败的情况，并在使用前校验结果。被截断或被过滤的响应可能不包含完整的 JSON。

### 提示词缓存保留与 token 限制

从 SDK 导入 `Temporal`，用于构造保留时长：

```javascript
import { Temporal } from "@dapr/dapr";

const response = await client.conversation.converse({
  name: "llm",
  inputs: [
    {
      messages: [
        { ofUser: { content: [{ text: "Explain Dapr in one paragraph." }] } },
      ],
    },
  ],
  promptCacheRetention: Temporal.Duration.from({ minutes: 30 }),
  maxTokens: 200,
});
```

`promptCacheRetention` 必须是固定的非负时长。支持天、小时、分钟、秒和亚秒字段；不支持日历意义上的年、月和周。各字段必须是安全整数，且总时长必须能放入 protobuf 的时长范围内。不要传入毫秒数字，也不要用时长字符串代替 `Temporal.Duration`。

保留时长是对 component 或提供商发出的请求，不保证一定命中缓存，也不保证对话历史会被存储。提供商特定的缓存限制仍然适用。

部分 component 还会在其 YAML metadata 中暴露 `responseCacheTTL`，用于缓存完整响应。这属于 component 配置，与 `promptCacheRetention` 相互独立；不要尝试通过请求的 `metadata` 来配置它。

`maxTokens` 需要 Dapr 1.19 或更高版本，并在支持的情况下覆盖 component 的 token 上限。应检查 `finishReason` 是否为 `"length"`，而不是把被截断的回答当作完整回答。

## 响应与 token 用量

SDK 返回 `ConversationResponseAlpha2`，其中包含可选的 `contextId` 和一个 `outputs` 数组。每个 output 包含 `choices`、可选的 `model` 和可选的 `usage`。每个 choice 包含 `index`、`finishReason` 和可选的 `message`。message 具有字符串类型的 `content` 和一个 `toolCalls` 数组。

不要假定只有一个 output 或 choice，也不要假定每个 choice 都有文本。常见的结束原因包括 `"stop"`、`"length"`、`"tool_calls"` 和 `"content_filter"`；其他提供商返回的值也需要处理。

```javascript
for (const output of response.outputs) {
  console.log("Model:", output.model);
  if (output.usage) {
    console.log("Total tokens:", output.usage.totalTokens);
    console.log("Prompt tokens:", output.usage.promptTokens);
    console.log("Completion tokens:", output.usage.completionTokens);
    console.log("Cached tokens:", output.usage.promptTokensDetails?.cachedTokens);
    console.log("Reasoning tokens:", output.usage.completionTokensDetails?.reasoningTokens);
  }
}
```

提示词 token 明细还包含 `audioTokens`。补全 token 明细包含 `acceptedPredictionTokens`、`rejectedPredictionTokens`、`audioTokens` 和 `reasoningTokens`。这些都是提供商报告的统计数据，并不代表 SDK 支持音频输入。用量对象和明细对象可能不存在；某些 component 在提供商未返回用量时会返回零值计数。

token 计数和 choice 索引是 JavaScript 数字。SDK 会拒绝超出安全整数范围的值，而不是悄悄丢失精度。

## 错误与 API 限制

`converse` 会在本地输入无效、sidecar 错误、提供商失败或响应转换失败时拒绝其 Promise。无效的消息角色或内容以及无效的 JSON 对象会产生 `TypeError`；无效的数值限制和时长可能产生 `RangeError`。Schema 与参数（parameters）对象只能包含有限的 JSON 值，不能包含循环引用、`undefined`、`BigInt` 或类实例。

请在应用的错误边界处捕获错误，并进行报告或继续向上抛出。不要把失败的请求变成成功的空回答。提供商错误可能包括速率限制、无效的工具历史、不受支持的选项和身份验证失败；它们在 HTTP 和 gRPC 中的表示形式可能不同。

该方法返回的是完整响应。它**不**提供流式补全、自动工具执行，也不提供按请求设置的 `AbortSignal`、超时或取消参数。如需为 sidecar 到提供商之间的超时和重试设置限制，请配置 [Dapr resiliency 策略]({{% ref resiliency-overview.md %}})。仅靠 JavaScript 的 `Promise.race` 超时并不会取消底层请求。
