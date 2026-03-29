---
type: docs
title: "Azure OpenAI binding 规范"
linkTitle: "Azure OpenAI"
description: "Azure OpenAI binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/openai/"
---

## 组件格式

若要设置 Azure OpenAI binding，请创建类型为 `bindings.azure.openai` 的组件。请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。
请参阅[此处](https://learn.microsoft.com/azure/cognitive-services/openai/overview/)获取 Azure OpenAI 服务的文档。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.openai
  version: v1
  metadata:
  - name: apiKey # 必填
    value: "1234567890abcdef"
  - name: endpoint # 必填
    value: "https://myopenai.openai.azure.com"
```
{{% alert title="警告" color="warning" %}}
上述示例将 `apiKey` 作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用 secret store 来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | Binding 支持 | 详情 | 示例 |
|--------------------|:--------:|--------|---------|---------|
| `endpoint` | Y | Output | Azure OpenAI 服务端点 URL。 | `"https://myopenai.openai.azure.com"` |
| `apiKey` | Y* | Output | Azure OpenAI 服务的访问密钥。仅在不使用 Microsoft Entra ID 身份验证时需要。 | `"1234567890abcdef"` |
| `azureTenantId` | Y* | Input | Azure OpenAI 资源的租户 ID。仅当未提供 `apiKey` 时需要。  | `"tenentID"` |
| `azureClientId` | Y* | Input | Binding 应使用的客户端 ID，用于创建或更新 Azure OpenAI 订阅并对传入消息进行身份验证。仅当未提供 `apiKey` 时需要。| `"clientId"` |
| `azureClientSecret` | Y* | Input | Binding 应使用的客户端密钥，用于创建或更新 Azure OpenAI 订阅并对传入消息进行身份验证。仅当未提供 `apiKey` 时需要。 | `"clientSecret"` |

### Microsoft Entra ID 身份验证

Azure OpenAI binding 组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息以及根据选择的 Microsoft Entra ID 身份验证机制需要提供的组件元数据字段，请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

#### 配置示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.openai
  version: v1
  metadata:
  - name: endpoint
    value: "https://myopenai.openai.azure.com"
  - name: azureTenantId
    value: "***"
  - name: azureClientId
    value: "***"
  - name: azureClientSecret
    value: "***"
```
## Binding 支持

此组件支持以下操作的**输出 binding**：

- `completion`：[补全 API](#completion-api)
- `chat-completion`：[聊天补全 API](#chat-completion-api)
- `get-embedding`：[嵌入 API](#get-embedding-api)

### Completion API

要使用提示调用补全 API，请使用 `POST` 方法调用 Azure OpenAI binding，并使用以下 JSON 请求体：

```json
{
  "operation": "completion",
  "data": {
    "deploymentId": "my-model",
    "prompt": "A dog is",
    "maxTokens":5
    }
}
```

数据参数包括：

- `deploymentId` - 指定要使用的模型部署 ID 的字符串。
- `prompt` - 指定要生成补全的提示的字符串。
- `maxTokens` - （可选）定义要生成的 token 最大数量。补全 API 默认为 16。
- `temperature` - （可选）定义 0 到 2 之间的采样温度。较高的值（如 0.8）会使输出更加随机，而较低的值（如 0.2）则使其更加聚焦和确定性。补全 API 默认为 1.0。
- `topP` - （可选）定义采样温度。补全 API 默认为 1.0。
- `n` - （可选）定义要生成的补全数量。补全 API 默认为 1。
- `presencePenalty` - （可选）介于 -2.0 和 2.0 之间的数字。正值会根据新 token 是否出现在已有文本中来对其进行惩罚，从而增加模型谈论新主题的可能性。补全 API 默认为 0.0。
- `frequencyPenalty` - （可选）介于 -2.0 和 2.0 之间的数字。正值会根据新 token 在已有文本中的现有频率对其进行惩罚，从而降低模型逐字重复同一行的可能性。补全 API 默认为 0.0。

在 [Azure OpenAI API 文档](https://learn.microsoft.com/azure/ai-services/openai/reference)中阅读有关这些参数的重要性和用法的更多信息。
#### 示例

{{< tabpane text=true >}}
  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "data": {"deploymentId: "my-model" , "prompt": "A dog is ", "maxTokens":15}, "operation": "completion" }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含以下 JSON：

```json
[
  {
    "finish_reason": "length",
    "index": 0,
    "text": " a pig in a dress.\n\nSun, Oct 20, 2013"
  },
  {
    "finish_reason": "length",
    "index": 1,
    "text": " the only thing on earth that loves you\n\nmore than he loves himself.\"\n\n"
  }
]

```

### Chat Completion API

要执行聊天补全操作，请使用 `POST` 方法调用 Azure OpenAI binding，并使用以下 JSON 请求体：

```json
{
    "operation": "chat-completion",
    "data": {
        "deploymentId": "my-model",
        "messages": [
            {
                "role": "system",
                "message": "You are a bot that gives really short replies"
            },
            {
                "role": "user",
                "message": "Tell me a joke"
            }
        ],
        "n": 2,
        "maxTokens": 30,
        "temperature": 1.2
    }
}
```

数据参数包括：

- `deploymentId` - 指定要使用的模型部署 ID 的字符串。
- `messages` - 将用于生成聊天补全的消息数组。
每条消息的格式为：
  - `role` - 指定消息角色的字符串。可以是 `user`、`system` 或 `assistant`。
  - `message` - 指定该角色的对话消息的字符串。
- `maxTokens` - （可选）定义要生成的 token 最大数量。聊天补全 API 默认为 16。
- `temperature` - （可选）定义 0 到 2 之间的采样温度。较高的值（如 0.8）会使输出更加随机，而较低的值（如 0.2）则使其更加聚焦和确定性。聊天补全 API 默认为 1.0。
- `topP` - （可选）定义采样温度。聊天补全 API 默认为 1.0。
- `n` - （可选）定义要生成的补全数量。聊天补全 API 默认为 1。
- `presencePenalty` - （可选）介于 -2.0 和 2.0 之间的数字。正值会根据新 token 是否出现在已有文本中来对其进行惩罚，从而增加模型谈论新主题的可能性。聊天补全 API 默认为 0.0。
- `frequencyPenalty` - （可选）介于 -2.0 和 2.0 之间的数字。正值会根据新 token 在已有文本中的现有频率对其进行惩罚，从而降低模型逐字重复同一行的可能性。聊天补全 API 默认为 0.0。

#### 示例

{{< tabpane text=true >}}

  {{% tab "Linux" %}}
  ```bash
curl -d '{
    "data": {
        "deploymentId": "my-model",
        "messages": [
            {
                "role": "system",
                "message": "You are a bot that gives really short replies"
            },
            {
                "role": "user",
                "message": "Tell me a joke"
            }
        ],
        "n": 2,
        "maxTokens": 30,
        "temperature": 1.2
    },
    "operation": "chat-completion"
}' \
http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含以下 JSON：

```json
[
  {
    "finish_reason": "stop",
    "index": 0,
    "message": {
      "content": "Why was the math book sad? Because it had too many problems.",
      "role": "assistant"
    }
  },
  {
    "finish_reason": "stop",
    "index": 1,
    "message": {
      "content": "Why did the tomato turn red? Because it saw the salad dressing!",
      "role": "assistant"
    }
  }
]

```

### Get Embedding API

`get-embedding` 操作返回给定输入的向量表示，可以轻松被机器学习模型和其他算法使用。
要执行 `get-embedding` 操作，请使用 `POST` 方法调用 Azure OpenAI binding，并使用以下 JSON 请求体：

```json
{
    "operation": "get-embedding",
    "data": {
        "deploymentId": "my-model",
        "message": "The capital of France is Paris."
    }
}
```

数据参数包括：

- `deploymentId` - 指定要使用的模型部署 ID 的字符串。
- `message` - 指定要嵌入的文本的字符串。

#### 示例

{{< tabpane text=true >}}

{{% tab "Linux" %}}
  ```bash
curl -d '{
    "data": {
        "deploymentId": "embeddings",
        "message": "The capital of France is Paris."
    },
    "operation": "get-embedding"
}' \
http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
{{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含以下 JSON：

```json
[0.018574921,-0.00023652936,-0.0057790717,.... (ada 总共 1536 个浮点数)]
```

## 了解有关 Azure OpenAI 输出 binding 的更多信息

观看[以下社区呼叫演示](https://youtu.be/rTovKpG0rhY?si=g7hZTQSpSEXz4pV1&t=80)以了解有关 Azure OpenAI 输出 binding 的更多信息。

{{< youtube id=rTovKpG0rhY start=80 >}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
- [Azure OpenAI Rest 示例](https://learn.microsoft.com/azure/ai-services/openai/reference)
