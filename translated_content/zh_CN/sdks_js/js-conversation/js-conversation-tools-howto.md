---
type: docs
title: "操作方法：使用 Dapr Conversation JavaScript SDK 调用工具"
linkTitle: "操作方法：调用工具"
weight: 50030
description: 使用 JavaScript 定义对话工具、校验函数参数，并将工具结果发送回大型语言模型 (LLM)
---

工具调用让模型可以请求应用程序定义的函数。Dapr 和 JavaScript SDK 负责传输工具定义与调用；**你的应用需要校验参数、授权并执行函数，然后把结果发送回模型**。

## 前提条件

完成[对话设置指南]({{% ref js-conversation-howto.md %}})，使用 `@dapr/dapr` **3.19.0 或更高版本**、Dapr 运行时 **1.16 或更高版本**，以及支持工具调用的组件与模型。仅有 echo 组件并不足够。

## 定义工具并处理其结果

以下示例使用设置指南中配置的 `llm` 组件。将其保存为 `tools.mjs`，并使用相同的 `dapr run` 命令运行，把其中的 `app.mjs` 替换为 `tools.mjs`。

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient({ daprHost: "127.0.0.1", daprPort: "3500" });
const messages = [
  { ofUser: { content: [{ text: "Look up the description of Dapr." }] } },
];
const tools = [
  {
    function: {
      name: "lookupProject",
      description: "Look up a project description by its exact name.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", enum: ["Dapr"] } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

try {
  const first = await client.conversation.converse({
    name: "llm",
    inputs: [{ messages }],
    tools,
    toolChoice: "lookupProject",
  });

  const choice = first.outputs[0]?.choices[0];
  const calls = choice?.message?.toolCalls;
  if (choice?.finishReason !== "tool_calls" || !calls?.length) {
    throw new Error("Expected the model to request a tool");
  }

  messages.push({
    ofAssistant: {
      content: [{ text: choice.message.content }],
      toolCalls: calls,
    },
  });

  const seenIds = new Set();
  for (const call of calls) {
    if (!call.id || seenIds.has(call.id)) {
      throw new Error("Missing or duplicate tool call ID");
    }
    seenIds.add(call.id);
    if (call.function.name !== "lookupProject") {
      throw new Error("Unexpected tool function");
    }

    const args = JSON.parse(call.function.arguments);
    if (
      args === null ||
      typeof args !== "object" ||
      Array.isArray(args) ||
      args.name !== "Dapr" ||
      Object.keys(args).length !== 1
    ) {
      throw new Error("Invalid lookupProject arguments");
    }

    const result = {
      name: args.name,
      description: "Dapr provides APIs for building distributed applications.",
    };
    messages.push({
      ofTool: {
        toolId: call.id,
        name: call.function.name,
        content: [{ text: JSON.stringify(result) }],
      },
    });
  }

  const final = await client.conversation.converse({
    name: "llm",
    contextId: first.contextId,
    inputs: [{ messages }],
    tools,
    toolChoice: "none",
  });

  const answer = final.outputs[0]?.choices[0];
  if (!answer?.message || answer.finishReason !== "stop") {
    throw new Error("Expected a completed answer after the tool results");
  }
  console.log(answer.message.content);
} finally {
  await client.stop();
}
```

工具定义使用 `{ function: { name, description, parameters } }` 结构。不要添加服务商原生的 `type: "function"` 包装。`parameters` 是 JSON Schema 对象；函数的 `name` 必须非空。

返回的 `call.function.arguments` 是模型生成的**字符串数据**，不是已解析的对象，也不是可信的指令。示例通过允许列表只放行一个只读函数，并校验其参数的精确形式。对于真实的工具，在产生副作用之前还需强制执行授权、输入限制以及所需的确认。切勿使用 `eval`，也不要派发模型提供的任意函数名。

## 保留工具调用历史

对于每个选中的助手选项，先追加包含原始工具调用的助手消息，然后为**每一个**调用追加一条工具结果。保留每个调用的 `id`、函数名和参数。将工具结果的 `toolId` 设为该调用的 ID，而不是函数名。

仅包含工具调用的助手消息可以省略 `content`。工具结果消息需要非空的 `name` 和 `content` 数组。助手可能在一个轮次中请求多个调用，因此不要只处理 `toolCalls[0]`。备选的响应选项是各自独立的对话分支。

在下一次请求中，按顺序重新发送原始消息、助手的工具调用以及工具结果。仅传递 `contextId` 并不能保留这段历史。

## 选择工具策略

| `toolChoice` | 行为 |
| ------------ | -------- |
| `"auto"` | 模型可以直接回答，也可以请求工具。 |
| `"none"` | 模型必须在不调用工具的情况下回答。 |
| `"required"` | 模型必须请求一个或多个工具。 |
| 精确的函数名，例如 `"lookupProject"` | 请求调用该特定函数。 |

所选的组件和模型必须支持该策略。指定的函数名必须与已声明的某个工具匹配；要求调用工具却不提供工具定义是无效的。

示例在第一次请求时强制调用指定的工具，在第二次请求时禁用工具，从而将交互限制为两次请求。如果你在重复的工具循环中使用 `"auto"`，请处理直接的文本响应，限制轮次数和调用次数，并把失败报告出来，而不是无限重试。
