---
type: docs
title: "操作指南：使用 Dapr JavaScript SDK 与大型语言模型 (LLM) 对话"
linkTitle: "操作指南：与 LLM 对话"
weight: 50010
description: 配置对话组件，并使用 Dapr JavaScript SDK 发送消息
---

使用 `client.conversation.converse(request)` 向已配置的对话组件发送基于角色的消息。你不需要 `DaprServer`，也不需要特定于提供商的 JavaScript SDK。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})，并且 **Dapr 运行时 1.16 或更高版本**
- [Node.js](https://nodejs.org/) 18 或更高版本
- [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包，**版本 3.19.0 或更高版本**

## 安装

在应用目录中，如果尚未初始化 npm 项目，请先初始化，然后安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 JavaScript ES 模块，并以 `.mjs` 文件运行，无需 TypeScript 编译器。相同的 API 同样适用于 TypeScript，请求和响应类型均从 `@dapr/dapr` 导出。

## 配置对话组件

创建一个 `components` 目录，并将以下内容保存为 `components\conversation.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

echo 组件会原样返回输入的文本，而不调用大型语言模型 (LLM)。使用它来检查本地连通性，而不是测试模型推理、结构化输出或工具调用。

组件的 `metadata.name`（即 `echo`）就是对话请求中传入的 `name`。它既不是组件类型，也不是 YAML 文件名。

## 发送消息

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

try {
  const response = await client.conversation.converse({
    name: "echo",
    inputs: [
      {
        messages: [
          { ofUser: { content: [{ text: "What is Dapr?" }] } },
        ],
      },
    ],
  });

  for (const output of response.outputs) {
    for (const choice of output.choices) {
      console.log("Finish reason:", choice.finishReason);
      if (choice.message) {
        console.log("Conversation output:", choice.message.content);
      }
    }
  }
} finally {
  await client.stop();
}
```

使用 Dapr 边车启动应用：

```sh
dapr run --app-id conversation-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path ./components -- node app.mjs
```

回显的消息位于 `response.outputs[0].choices[0].message.content`。与其他 SDK 中的 Alpha1 示例不同，JavaScript Alpha2 的响应中没有 `output.result` 属性。

要使用 gRPC，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。两种协议的请求和响应对象相同。

## 使用 LLM 提供商

将 echo 组件替换为[受支持的对话组件]({{% ref supported-conversation %}})。例如，以下 OpenAI 组件配合本地的环境变量机密存储使用：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: conversation-secrets
spec:
  type: secretstores.local.env
  version: v1
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: llm
spec:
  type: conversation.openai
  version: v1
  metadata:
    - name: key
      secretKeyRef:
        name: OPENAI_API_KEY
        key: OPENAI_API_KEY
    - name: model
      value: gpt-4o-mini
auth:
  secretStore: conversation-secrets
```

在 `dapr run` 继承的环境中设置 `OPENAI_API_KEY`，重启边车，并将请求中的 `name` 改为 `"llm"`。不要在请求的 `metadata` 中放置提供商凭据，也不要将其提交到组件文件中。有关提供商设置和模型支持，请参阅 [OpenAI 组件参考]({{% ref "/reference/components-reference/supported-conversation/openai.md" %}})。

## 后续步骤

阅读[客户端用法指南]({{% ref js-conversation-client-usage.md %}})，了解消息历史、结构化输出、缓存、令牌限制和错误处理。按照[工具调用指南]({{% ref js-conversation-tools-howto.md %}})，让模型请求应用程序定义的函数。
