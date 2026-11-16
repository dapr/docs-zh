---
type: docs
title: "如何：在 .NET 中处理对话工具调用"
linkTitle: "处理工具调用"
weight: 50015
description: 声明对话工具、检查模型请求，并将工具结果返回给模型
---

SDK `1.19.0` 或更高版本中的对话客户端可以声明函数工具，并返回模型请求的工具调用。声明工具本身并不会执行它。你的应用需要校验请求、调用允许的操作，然后将结果发送回去。

## 声明函数

```csharp
using Dapr.AI.Conversation;
using Dapr.AI.Conversation.ConversationRoles;
using Dapr.AI.Conversation.Tools;

var messages = new List<IConversationMessage>
{
    new UserMessage { Content = [new MessageContent("What time is it in UTC?")] }
};

var options = new ConversationOptions("conversation")
{
    Tools =
    [
        new ToolFunction("get_utc_time")
        {
            Description = "Returns the current UTC time.",
            Parameters = new Dictionary<string, object?>
            {
                ["type"] = "object",
                ["properties"] = new Dictionary<string, object?>()
            }
        }
    ],
    ToolChoice = ToolChoice.Auto
};

var response = await conversationClient.ConverseAsync(
    [new ConversationInput(messages)], options, cancellationToken);
```

`ToolFunction.Parameters` 描述的是 JSON Schema，而不是用于执行的参数值字典。`ToolChoice.None`、`Auto` 和 `Required` 用于选择策略；或者使用 `new ToolChoice("get_utc_time")`，按区分大小写的函数名称指定某个函数。运行时或模型提供方对这些策略的支持可能各不相同。

## 返回工具结果

根据你的应用策略选择一个响应选项。在下一个请求中保留其中的助手工具调用，并将每个结果与返回的工具调用 ID 对应起来：

```csharp
if (response.Outputs.Count == 0 || response.Outputs[0].Choices.Count == 0)
{
    throw new InvalidOperationException("The model returned no conversation choices.");
}

var choice = response.Outputs[0].Choices[0];
if (choice.Message.ToolCalls.Count == 0)
{
    Console.WriteLine(choice.Message.Content);
    return;
}

messages.Add(new AssistantMessage
{
    Content = [new MessageContent(choice.Message.Content)],
    ToolCalls = choice.Message.ToolCalls
});

foreach (var toolCall in choice.Message.ToolCalls)
{
    if (toolCall is not CalledToolFunction call || call.Name != "get_utc_time")
    {
        throw new InvalidOperationException("The model requested an unsupported tool.");
    }

    messages.Add(new ToolMessage
    {
        Name = call.Name,
        Id = call.Id,
        Content = [new MessageContent(DateTimeOffset.UtcNow.ToString("O"))]
    });
}

var followUp = await conversationClient.ConverseAsync(
    [new ConversationInput(messages)],
    options with { ContextId = response.ConversationId, ToolChoice = ToolChoice.None },
    cancellationToken);
```

对于带参数的工具，`CalledToolFunction.JsonArguments` 包含模型输出的 JSON。在执行任何操作之前，请先将其解析为已知的 Schema，并校验参数值与授权。切勿直接根据模型输出派发任意方法名或命令。请限制工具调用的轮数，并让有副作用的工具具备幂等性。示例在后续请求中禁用了进一步的工具调用。

关于 Microsoft 抽象及其映射限制，请参阅 [Microsoft.Extensions.AI 集成]({{< ref dotnet-ai-extensions-howto.md >}})。
