---
type: docs
title: "Quickstart: Conversation"
linkTitle: 对话
weight: 90
description: "开始使用 Dapr conversation building block"
---

{{% alert title="Alpha" color="warning" %}}
conversation building block 目前处于 **alpha** 阶段。 
{{% /alert %}}

让我们来看看 [Dapr conversation building block]({{% ref conversation-overview %}})如何让与大型语言模型 (LLM) 的交互变得更简单。在本 Quickstart 中，你将使用 echo component 与模拟 LLM 通信，并让它定义 Dapr。 

你可以通过以下任一方式试用本对话 Quickstart：

- [使用 Multi-App Run 模板文件运行本示例中的应用]({{% ref "#run-the-app-with-the-template-file" %}})，或
- [不使用模板运行应用]({{% ref "#run-the-app-without-the-template" %}})

{{% alert title="注意" color="primary" %}}
目前，Quickstart 示例只能通过 HTTP 使用 JavaScript，而不能使用 JavaScript SDK。  
{{% /alert %}}

## 使用 Multi-App Run 模板文件运行应用

在继续本 Quickstart 之前，请选择你偏好的特定语言 Dapr SDK。

{{< tabpane text=true >}}

 <!-- Python -->
{{% tab "Python" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 `python/sdk` 目录。`dapr.yaml` 文件位于此目录中：

```bash
cd conversation/python/sdk
```

安装依赖项：

```bash
uv sync
```

### 步骤 3：启动对话服务


```bash
uv run dapr run -f .
```


**预期输出**

```
== APP - conversation == Input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
```

### 发生了什么？

在本 Quickstart 中运行 `dapr run -f .` 会启动 [app.py]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 运行 `dapr run -f .` 会启动项目中的所有应用。本 Quickstart 只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: conversation
    appDirPath: ./conversation/
    command: ["uv", "run", "python", "app.py"]
```

#### Echo 模拟 LLM 组件

在 Quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/blob/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要对接真实的 LLM，请将模拟组件替换为[受支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，若要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `app.py` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 “What is dapr?”。
- 模拟 LLM 回显 “What is dapr?”。

```python
from dapr.clients import DaprClient
from dapr.clients.grpc.conversation import ConversationInputAlpha2, ConversationMessage, ConversationMessageContent, ConversationMessageOfUser

with DaprClient() as d:
  text_input = "What is dapr?"
  provider_component = "echo"

  inputs = [
    ConversationInputAlpha2(messages=[ConversationMessage(of_user=ConversationMessageOfUser(content=[ConversationMessageContent(text=text_input)]))],
                            scrub_pii=True),
  ]

  print(f'Input sent: {text_input}')

  response = d.converse_alpha2(name=provider_component, inputs=inputs, temperature=0.7, context_id='chat-123')

  for output in response.outputs:
    print(f'Output response: {output.choices[0].message.content}')
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [Ollama](https://ollama.com/) 已安装并正在运行，且已拉取 `llama3.2:latest` 模型（`ollama pull llama3.2:latest`）。该示例会将输入发送给 `ollama` conversation component，因此响应来自该模型。它与下面的预期输出不同，后者来自 echo 模拟 LLM。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/javascript/http/conversation
```

安装依赖项：

```bash
npm install
```

### 步骤 3：启动对话服务

切换回 `http` 目录，并使用以下命令启动对话服务：

```bash
dapr run -f .
```

**预期输出**

```
== APP - conversation == Conversation input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
== APP - conversation == Tool calling input sent: What is the weather like in San Francisco in celsius?
== APP - conversation == Output message: { outputs: [ { choices: [Array] } ] }
== APP - conversation == Output message: What is the weather like in San Francisco in celsius?
== APP - conversation == Tool calls detected: [{"id":"0","function":{"name":"get_weather","arguments":"location,unit"}}]
```

### 发生了什么？

在本 Quickstart 中运行 `dapr run -f .` 会启动 [conversation.go]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 运行 `dapr run -f .` 会启动项目中的所有应用。本 Quickstart 只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: conversation
    appDirPath: ./conversation/
    daprHTTPPort: 3502
    command: ["npm", "run", "start"]
```

#### Echo 模拟 LLM 组件

在 Quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/blob/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。 

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要对接真实的 LLM，请将模拟组件替换为[受支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，若要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `index.js` 对话应用

在应用代码的第一部分中：
- 应用向 echo 模拟 LLM 组件发送输入 “What is dapr?”。
- 模拟 LLM 回显 “What is dapr?”。 

```javascript
const daprHost = process.env.DAPR_HOST || "http://localhost";
const daprHttpPort = process.env.DAPR_HTTP_PORT || "3500";

const reqURL = `${daprHost}:${daprHttpPort}/v1.0-alpha2/conversation/${conversationComponentName}/converse`;

// 普通对话
try {
  const converseInputBody = {
    inputs: [
      {
        messages: [
          {
            ofUser: {
              content: [
                {
                  text: "What is dapr?",
                },
              ],
            },
          },
        ],
      },
    ],
    parameters: {},
    metadata: {},
  };
  const response = await fetch(reqURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(converseInputBody),
  });

  console.log("Conversation input sent: What is dapr?");

  const data = await response.json();
  const result = data.outputs[0].choices[0].message.content;
  console.log("Output response:", result);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
```

在应用代码的第二部分中：
- 应用发送输入 “What is the weather like in San Francisco in celsius”，并附带可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 “What is the weather like in San Francisco in celsius?” 以及在响应中检测到的函数定义。

```javascript
try {
  const toolCallingInputBody = {
    inputs: [
      {
        messages: [
          {
            ofUser: {
              content: [
                {
                  text: "What is the weather like in San Francisco in celsius?",
                },
              ],
            },
          },
        ],
        scrubPii: false,
      },
    ],
    metadata: {
      api_key: "test-key",
      version: "1.0",
    },
    scrubPii: false,
    temperature: 0.7,
    tools: [
      {
        function: {
          name: "get_weather",
          description: "Get the current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
              },
              unit: {
                type: "string",
                enum: ["celsius", "fahrenheit"],
                description: "The temperature unit to use",
              },
            },
            required: ["location"],
          },
        },
      },
    ],
    toolChoice: "auto",
  };
  const response = await fetch(reqURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toolCallingInputBody),
  });

  console.log(
          "Tool calling input sent: What is the weather like in San Francisco in celsius?"
  );

  const data = await response.json();

  const result = data?.outputs?.[0]?.choices?.[0]?.message?.content;
  console.log("Output message:", result);

  if (data?.outputs?.[0]?.choices?.[0]?.message?.toolCalls) {
    console.log(
            "Tool calls detected:",
            JSON.stringify(data.outputs[0].choices[0].message?.toolCalls)
    );
  } else {
    console.log("No tool calls in response");
  }
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET 8 SDK 或更高版本](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/csharp/sdk
```

### 步骤 3：启动对话服务

使用以下命令启动对话服务：

```bash
dapr run -f .
```

**预期输出**

```
== APP - conversation == Conversation input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
== APP - conversation == Tool calling input sent: What is the weather like in San Francisco in celsius?
== APP - conversation == Output message: What is the weather like in San Francisco in celsius?
== APP - conversation == Tool calls detected:
== APP - conversation == Tool call: {"id":0,"function":{"name":"get_weather","arguments":"location,unit"}}
== APP - conversation == Function name: get_weather
== APP - conversation == Function arguments: location,unit
```

### 发生了什么？

在本 Quickstart 中运行 `dapr run -f .` 会启动 [conversation Program.cs]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 运行 `dapr run -f .` 会启动项目中的所有应用。本 Quickstart 只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appDirPath: ./conversation/
    appID: conversation
    daprHTTPPort: 3500
    command: ["dotnet", "run"]
```

#### Echo 模拟 LLM 组件

在 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/blob/master/conversation/components/conversation.yaml) 配置了 echo 模拟 LLM 组件。 

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要对接真实的 LLM，请将模拟组件替换为[受支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，若要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `Program.cs` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 “What is dapr?”。
- 模拟 LLM 回显 “What is dapr?”。
- 应用发送输入 “What is the weather like in San Francisco in celsius”，并附带可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 “What is the weather like in San Francisco in celsius?” 以及在响应中检测到的函数定义。


```csharp
using System.Text.Json;
using Dapr.AI.Conversation;
using Dapr.AI.Conversation.ConversationRoles;
using Dapr.AI.Conversation.Extensions;
using Dapr.AI.Conversation.Tools;

const string conversationComponentName = "echo";
const string conversationText = "What is dapr?";
const string toolCallInput = "What is the weather like in San Francisco in celsius?";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprConversationClient();
var app = builder.Build();

//
// 设置

var conversationClient = app.Services.GetRequiredService<DaprConversationClient>();

var conversationOptions = new ConversationOptions(conversationComponentName)
{
    ScrubPII = false,
    ToolChoice = ToolChoice.Auto,
    Temperature = 0.7,
    Tools = [
        new ToolFunction("function")
        {
            Name = "get_weather",
            Description = "Get the current weather for a location",
            Parameters = JsonSerializer.Deserialize<Dictionary<string, object?>>("""
            {
              "type": "object",
              "properties": {
                "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                  "type": "string",
                  "enum": ["celsius", "fahrenheit"],
                  "description": "The temperature unit to use"
                }
              },
              "required": ["location"]
            }
            """) ?? throw new("Unable to parse tool function parameters."),
        },
    ],
};

//
// 简单对话

var conversationResponse = await conversationClient.ConverseAsync(
    [new ConversationInput(new List<IConversationMessage>
    {
        new UserMessage {
            Name = "TestUser",
            Content = [
                new MessageContent(conversationText),
            ],
        },
    })], 
    conversationOptions
);

Console.WriteLine($"Conversation input sent: {conversationText}");
Console.WriteLine($"Output response: {conversationResponse.Outputs.First().Choices.First().Message.Content}");

//
// 工具调用

var toolCallResponse = await conversationClient.ConverseAsync(
    [new ConversationInput(new List<IConversationMessage>
    {
        new UserMessage {
            Name = "TestUser",
            Content = [
                new MessageContent(toolCallInput),
            ],
        },
    })], 
    conversationOptions
);

Console.WriteLine($"Tool calling input sent: {toolCallInput}");
Console.WriteLine($"Output message: {toolCallResponse.Outputs.First().Choices.First().Message.Content}");
Console.WriteLine("Tool calls detected:");

var functionToolCall = toolCallResponse.Outputs.First().Choices.First().Message.ToolCalls.First() as CalledToolFunction
    ?? throw new("Unexpected tool call type for demo.");

var toolCallJson = JsonSerializer.Serialize(new
{
    id = 0,
    function = new
    {
        name = functionToolCall.Name,
        arguments = functionToolCall.JsonArguments,
    },
});
Console.WriteLine($"Tool call: {toolCallJson}");
Console.WriteLine($"Function name: {functionToolCall.Name}");
Console.WriteLine($"Function arguments: {functionToolCall.JsonArguments}");
```

{{% /tab %}}



 <!-- Java -->
{{% tab "Java" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17 或更高版本：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/java/sdk/conversation
```

安装依赖项：

```bash
mvn clean install
```

### 步骤 3：启动对话服务

切换回 sdk 目录，并使用以下命令启动对话服务：

```bash
dapr run -f .
```

**预期输出**

```
== APP - conversation == Input: What is Dapr?
== APP - conversation == Output response: What is Dapr?
```

### 发生了什么？

在本 Quickstart 中运行 `dapr run -f .` 会启动 [Conversation.java]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 运行 `dapr run -f .` 会启动项目中的所有应用。本 Quickstart 只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components
apps:
  - appID: conversation
    appDirPath: ./conversation/target
    command: ["java", "-jar", "ConversationAIService-0.0.1-SNAPSHOT.jar"]
```

#### Echo 模拟 LLM 组件

在 Quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/blob/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要对接真实的 LLM，请将模拟组件替换为[受支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，若要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `Conversation.java` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 “What is dapr?”。
- 模拟 LLM 回显 “What is dapr?”。

```java
package com.service;

import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.ConversationInput;
import io.dapr.client.domain.ConversationRequest;
import io.dapr.client.domain.ConversationResponse;
import reactor.core.publisher.Mono;

import java.util.List;

public class Conversation {

  public static void main(String[] args) {
    String prompt = "What is Dapr?";

    try (DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient()) {
      System.out.println("Input: " + prompt);

      ConversationInput daprConversationInput = new ConversationInput(prompt);

      // 组件名称即 conversation.yaml 文件 metadata 块中提供的名称。
      Mono<ConversationResponse> responseMono = client.converse(new ConversationRequest("echo",
              List.of(daprConversationInput))
              .setContextId("contextId")
              .setScrubPii(true).setTemperature(1.1d));
      ConversationResponse response = responseMono.block();
      System.out.printf("Output response: %s", response.getConversationOutputs().get(0).getResult());
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Go 的最新版本](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [Ollama](https://ollama.com/) 已安装并正在运行，且已拉取 `llama3.2:latest` 模型（`ollama pull llama3.2:latest`）。该示例会将输入发送给 `ollama` conversation component，因此响应来自该模型。它与下面的预期输出不同，后者来自 echo 模拟 LLM。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/go/sdk
```

### 步骤 3：启动对话服务

使用以下命令启动对话服务：

```bash
dapr run -f .
```

**预期输出**

```
== APP - conversation-sdk == Input sent: What is dapr?
== APP - conversation-sdk == Output response: What is dapr?
== APP - conversation-sdk == Tool calling input sent: What is the weather like in San Francisco in celsius?'
== APP - conversation-sdk == Tool Call: Name: getWeather - Arguments: location,unit
== APP - conversation-sdk == Tool Call Output: The weather in San Francisco is 25 degrees Celsius
```

### 发生了什么？

在本 Quickstart 中运行 `dapr run -f .` 会启动 [conversation.go]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 运行 `dapr run -f .` 会启动项目中的所有应用。本 Quickstart 只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appDirPath: ./conversation/
    appID: conversation
    daprHTTPPort: 3501
    command: ["go", "run", "."]
```

#### Echo 模拟 LLM 组件

在 Quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/blob/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要对接真实的 LLM，请将模拟组件替换为[受支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，若要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `conversation.go` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 “What is dapr?”。
- 模拟 LLM 回显 “What is dapr?”。
- 应用发送输入 “What is the weather like in San Francisco in celsius”，并附带可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 “What is the weather like in San Francisco in celsius?” 以及在响应中检测到的函数定义。

```go
import (
  "context"
  "encoding/json"
  "fmt"
  "log"
  "strings"

  "github.com/invopop/jsonschema"
  "google.golang.org/protobuf/encoding/protojson"
  "google.golang.org/protobuf/types/known/structpb"

  dapr "github.com/dapr/go-sdk/client"
)

// createMapOfArgsForEcho 是一个辅助函数，用于处理 echo 组件不以 map 形式返回参数而是以 CSV 格式返回的问题
func createMapOfArgsForEcho(s string) ([]byte, error) {
  m := map[string]any{}
  for _, p := range strings.Split(s, ",") {
    m[p] = p
  }
  return json.Marshal(m)
}

// getWeatherInLocation 是一个用作工具调用的示例函数
func getWeatherInLocation(request GetDegreesWeatherRequest, defaultValues GetDegreesWeatherRequest) string {
  location := request.Location
  unit := request.Unit
  if location == "location" {
    location = defaultValues.Location
  }
  if unit == "unit" {
    unit = defaultValues.Unit
  }
  return fmt.Sprintf("The weather in %s is 25 degrees %s", location, unit)
}

type GetDegreesWeatherRequest struct {
  Location string `json:"location" jsonschema:"title=Location,description=The location to look up the weather for"`
  Unit     string `json:"unit" jsonschema:"enum=celsius,enum=fahrenheit,description=Unit"`
}

// GenerateFunctionTool 辅助方法，用于创建 jsonschema 输入
func GenerateFunctionTool[T any](name, description string) (*dapr.ConversationToolsAlpha2, error) {
  reflector := jsonschema.Reflector{
    AllowAdditionalProperties: false,
    DoNotReference:            true,
  }
  var v T

  schema := reflector.Reflect(v)

  schemaBytes, err := schema.MarshalJSON()
  if err != nil {
    return nil, err
  }

  var protoStruct structpb.Struct
  if err := protojson.Unmarshal(schemaBytes, &protoStruct); err != nil {
    return nil, fmt.Errorf("converting jsonschema to proto Struct: %w", err)
  }

  return (*dapr.ConversationToolsAlpha2)(&dapr.ConversationToolsFunctionAlpha2{
    Name:        name,
    Description: &description,
    Parameters:  &protoStruct,
  }), nil
}

// createUserMessageInput 是一个辅助方法，用于按预期的 proto 格式创建用户消息
func createUserMessageInput(msg string) *dapr.ConversationInputAlpha2 {
  return &dapr.ConversationInputAlpha2{
    Messages: []*dapr.ConversationMessageAlpha2{
      {
        ConversationMessageOfUser: &dapr.ConversationMessageOfUserAlpha2{
          Content: []*dapr.ConversationMessageContentAlpha2{
            {
              Text: &msg,
            },
          },
        },
      },
    },
  }
}

func main() {
  client, err := dapr.NewClient()
  if err != nil {
    panic(err)
  }

  inputMsg := "What is dapr?"
  conversationComponent := "echo"

  request := dapr.ConversationRequestAlpha2{
    Name:   conversationComponent,
    Inputs: []*dapr.ConversationInputAlpha2{createUserMessageInput(inputMsg)},
  }

  fmt.Println("Input sent:", inputMsg)

  resp, err := client.ConverseAlpha2(context.Background(), request)
  if err != nil {
    log.Fatalf("err: %v", err)
  }

  fmt.Println("Output response:", resp.Outputs[0].Choices[0].Message.Content)

  tool, err := GenerateFunctionTool[GetDegreesWeatherRequest]("getWeather", "get weather from a location in the given unit")
  if err != nil {
    log.Fatalf("err: %v", err)
  }

  weatherMessage := "Tool calling input sent: What is the weather like in San Francisco in celsius?'"
  requestWithTool := dapr.ConversationRequestAlpha2{
    Name:   conversationComponent,
    Inputs: []*dapr.ConversationInputAlpha2{createUserMessageInput(weatherMessage)},
    Tools:  []*dapr.ConversationToolsAlpha2{tool},
  }

  resp, err = client.ConverseAlpha2(context.Background(), requestWithTool)
  if err != nil {
    log.Fatalf("err: %v", err)
  }

  fmt.Println(resp.Outputs[0].Choices[0].Message.Content)
  for _, toolCalls := range resp.Outputs[0].Choices[0].Message.ToolCalls {
    fmt.Printf("Tool Call: Name: %s - Arguments: %v\n", toolCalls.ToolTypes.Name, toolCalls.ToolTypes.Arguments)

    // 解析参数并执行工具
    args := []byte(toolCalls.ToolTypes.Arguments)
    if conversationComponent == "echo" {
      // echo 组件不会以 JSON 格式返回符合规范的工具调用响应，而是返回 CSV
      args, err = createMapOfArgsForEcho(toolCalls.ToolTypes.Arguments)
      if err != nil {
        log.Fatalf("err: %v", err)
      }
    }

    // 查找工具（本例中只有一个）并执行
    for _, toolInfo := range requestWithTool.Tools {
      if toolInfo.Name == toolCalls.ToolTypes.Name && toolInfo.Name == "getWeather" {
        var reqArgs GetDegreesWeatherRequest
        if err = json.Unmarshal(args, &reqArgs); err != nil {
          log.Fatalf("err: %v", err)
        }
        // 执行工具
        toolExecutionOutput := getWeatherInLocation(reqArgs, GetDegreesWeatherRequest{Location: "San Francisco", Unit: "Celsius"})
        fmt.Printf("Tool Call Output: %s\n", toolExecutionOutput)
      }
    }
  }
}
```

{{% /tab %}}

{{< /tabpane >}}

## 不使用模板运行应用

{{< tabpane text=true >}}

 <!-- Python -->
{{% tab "Python" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/python/sdk/conversation
```

安装依赖项：

```bash
uv sync
```

### 步骤 3：启动对话服务

在 `conversation` 目录中，使用以下命令启动对话服务：

```bash
dapr run --app-id conversation --resources-path ../../../components -- uv run python app.py
```


**预期输出**

```
== APP - conversation == Input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [Ollama](https://ollama.com/) 已安装并正在运行，且已拉取 `llama3.2:latest` 模型（`ollama pull llama3.2:latest`）。该示例会将输入发送给 `ollama` conversation component，因此响应来自该模型。它与下面的预期输出不同，后者来自 echo 模拟 LLM。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/javascript/http/conversation
```

安装依赖项：

```bash
npm install
```

### 步骤 3：启动对话服务


```bash
dapr run --app-id conversation --resources-path ../../../components -- npm run start
```

**预期输出**

```
== APP == Conversation input sent: What is dapr?
== APP == Output response: What is dapr?
== APP == Tool calling input sent: What is the weather like in San Francisco in celsius?
== APP == Output message: What is the weather like in San Francisco in celsius?
== APP == Tool calls detected: [{"id":"0","function":{"name":"get_weather","arguments":"location,unit"}}]
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET 8+ SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/csharp/sdk/conversation
```

安装依赖项：

```bash
dotnet build
```

### 步骤 3：启动对话服务

使用以下命令启动对话服务：

```bash
dapr run --app-id conversation --resources-path ../../../components/ -- dotnet run
```

**预期输出**

```
== APP == Conversation input sent: What is dapr?
== APP == Output response: What is dapr?
== APP == Tool calling input sent: What is the weather like in San Francisco in celsius?
== APP == Output message: What is the weather like in San Francisco in celsius?
== APP == Tool calls detected:
== APP == Tool call: {"id":0,"function":{"name":"get_weather","arguments":"location,unit"}}
== APP == Function name: get_weather
== APP == Function arguments: location,unit
```

{{% /tab %}}
 
 <!-- Java -->
{{% tab "Java" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17 或更高版本：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/java/sdk/conversation
```

安装依赖项：

```bash
mvn clean install
```

### 步骤 3：启动对话服务

使用以下命令启动对话服务：

```bash
dapr run --app-id conversation --resources-path ../../../components/ -- java -jar target/ConversationAIService-0.0.1-SNAPSHOT.jar com.service.Conversation
```

**预期输出**

```
== APP == Input: What is Dapr?
== APP == Output response: What is Dapr?
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}


### 步骤 1：前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Go 的最新版本](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [Ollama](https://ollama.com/) 已安装并正在运行，且已拉取 `llama3.2:latest` 模型（`ollama pull llama3.2:latest`）。该示例会将输入发送给 `ollama` conversation component，因此响应来自该模型。它与下面的预期输出不同，后者来自 echo 模拟 LLM。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 conversation 目录：

```bash
cd conversation/go/sdk/conversation
```

安装依赖项：

```bash
go build .
```

### 步骤 3：启动对话服务

使用以下命令启动对话服务：

```bash
dapr run --app-id conversation --resources-path ../../../components/ -- go run .
```

**预期输出**

```
== APP == dapr client initializing for: 127.0.0.1:53826
== APP == Input sent: What is dapr?
== APP == Output response: What is dapr?
== APP == Tool calling input sent: What is the weather like in San Francisco in celsius?'
== APP == Tool Call: Name: getWeather - Arguments: location,unit
== APP == Tool Call Output: The weather in San Francisco is 25 degrees Celsius
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看 [Diagrid 的 Dapr v1.15 庆典](https://www.diagrid.io/videos/dapr-1-15-deep-dive)期间展示的演示，了解如何使用 .NET SDK 调用 conversation API。

{{< youtube id=NTnwoDhHIcQ start=5444 >}}

## 告诉我们你的想法！

我们正在持续改进 Quickstart 示例，并重视你的反馈。你是否觉得本 Quickstart 有帮助？你对改进有什么建议？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 本 Quickstart 的 HTTP 示例：
  - [Python](https://github.com/dapr/quickstarts/tree/master/conversation/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/conversation/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/conversation/csharp/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/conversation/go/http)
- 了解更多关于 [conversation building block]({{% ref conversation-overview %}}) 的内容

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
