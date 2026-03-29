---
type: docs
title: "快速入门：对话"
linkTitle: 对话
weight: 90
description: Dapr 对话构建块入门
---

{{% alert title="Alpha" color="warning" %}}
对话构建块目前处于 **alpha** 阶段。
{{% /alert %}}

让我们来看看 [Dapr 对话构建块]({{% ref conversation-overview %}}) 如何简化与大语言模型（LLMs）的交互。在这个快速入门中，你使用 echo 组件与模拟 LLM 通信，并要求它定义 Dapr。

你可以通过以下方式尝试此对话快速入门：

- [使用多应用运行模板文件运行此示例中的应用]({{% ref "#run-the-app-with-the-template-file" %}})，或
- [不使用模板运行应用]({{% ref "#run-the-app-without-the-template" %}})

{{% alert title="注意" color="primary" %}}
目前，在此快速入门示例中只能通过 HTTP 使用 JavaScript，而不能使用 JavaScript SDK。
{{% /alert %}}

## 使用模板文件运行应用

在继续快速入门之前，请选择你首选的语言特定的 Dapr SDK。

{{< tabpane text=true >}}

 <!-- Python -->
{{% tab "Python" %}}


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

```bash
cd conversation/python/sdk/conversation
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

### 步骤 3：启动对话服务


```bash
dapr run -f .
```

> **注意**：由于 Windows 中未定义 Python3.exe，你可能需要使用 `python app.py` 而不是 `python3 app.py`。

**预期输出**

```
== APP - conversation == Input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
```

### 发生了什么？

在此快速入门中运行 `dapr run -f .` 会启动 [app.py]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行 [多应用运行模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用。此快速入门只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: conversation
    appDirPath: ./conversation/
    command: ["python3", "app.py"]
```

#### Echo 模拟 LLM 组件

在 quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/tree/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要与真实的 LLM 交互，请将模拟组件替换为[支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `app.py` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 "What is dapr?"。
- 模拟 LLM 回显 "What is dapr?"。

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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

```bash
cd conversation/javascript/http/conversation
```

安装依赖项：

```bash
npm install
```

### 步骤 3：启动对话服务

返回到 `http` 目录，并使用以下命令启动对话服务：

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

在此快速入门中运行 `dapr run -f .` 会启动 [conversation.go]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行 [多应用运行模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用。此快速入门只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

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

在 quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/tree/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要与真实的 LLM 交互，请将模拟组件替换为[支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `index.js` 对话应用

在应用代码的第一部分中：
- 应用向 echo 模拟 LLM 组件发送输入 "What is dapr?"。
- 模拟 LLM 回显 "What is dapr?"。

```javascript
const daprHost = process.env.DAPR_HOST || "http://localhost";
const daprHttpPort = process.env.DAPR_HTTP_PORT || "3500";

const reqURL = `${daprHost}:${daprHttpPort}/v1.0-alpha2/conversation/${conversationComponentName}/converse`;

// Plain conversation
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
- 应用发送输入 "What is the weather like in San Francisco in celsius"，同时提供可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 "What is the weather like in San Francisco in celsius?" 和函数定义，这些内容会在响应中被检测到。

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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET 8 SDK+](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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

在此快速入门中运行 `dapr run -f .` 会启动 [conversation Program.cs]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行 [多应用运行模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用。此快速入门只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

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

在 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/tree/master/conversation/components/conversation.yaml) 配置了 echo 模拟 LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要与真实的 LLM 交互，请将模拟组件替换为[支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `Program.cs` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 "What is dapr?"。
- 模拟 LLM 回显 "What is dapr?"。
- 应用发送输入 "What is the weather like in San Francisco in celsius"，同时提供可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 "What is the weather like in San Francisco in celsius?" 和函数定义，这些内容会在响应中被检测到。


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
// Setup

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
// Simple Conversation

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
// Tool Calling

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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
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

从 Quickstarts 目录的根目录，导航到 conversation 目录：

```bash
cd conversation/java/sdk/conversation
```

安装依赖项：

```bash
mvn clean install
```

### 步骤 3：启动对话服务

返回到 sdk 目录，并使用以下命令启动对话服务：

```bash
dapr run -f .
```

**预期输出**

```
== APP - conversation == Input: What is Dapr?
== APP - conversation == Output response: What is Dapr?
```

### 发生了什么？

在此快速入门中运行 `dapr run -f .` 会启动 [Conversation.java]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行 [多应用运行模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用。此快速入门只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

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

在 quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/tree/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要与真实的 LLM 交互，请将模拟组件替换为[支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `Conversation.java` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 "What is dapr?"。
- 模拟 LLM 回显 "What is dapr?"。

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

      // Component name is the name provided in the metadata block of the conversation.yaml file.
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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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

在此快速入门中运行 `dapr run -f .` 会启动 [conversation.go]({{% ref "#programcs-conversation-app" %}})。

#### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行 [多应用运行模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用。此快速入门只有一个应用，因此 `dapr.yaml` 文件包含以下内容：

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

在 quickstart 的 [`conversation/components`](https://github.com/dapr/quickstarts/tree/master/conversation/components) 目录中，[`conversation.yaml` 文件](https://github.com/dapr/quickstarts/tree/master/conversation/components/conversation.yaml) 配置了 echo LLM 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

要与真实的 LLM 交互，请将模拟组件替换为[支持的对话组件之一]({{% ref "supported-conversation" %}})。例如，要使用 OpenAI 组件，请参阅[对话操作指南中的示例]({{% ref "howto-conversation-layer#use-the-openai-component" %}})

#### `conversation.go` 对话应用

在应用代码中：
- 应用向 echo 模拟 LLM 组件发送输入 "What is dapr?"。
- 模拟 LLM 回显 "What is dapr?"。
- 应用发送输入 "What is the weather like in San Francisco in celsius"，同时提供可用工具 `get_weather` 的定义。
- 模拟 LLM 回显 "What is the weather like in San Francisco in celsius?" 和函数定义，这些内容会在响应中被检测到。

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

// createMapOfArgsForEcho is a helper function to deal with the issue with the echo component not returning args as a map but in csv format
func createMapOfArgsForEcho(s string) ([]byte, error) {
  m := map[string]any{}
  for _, p := range strings.Split(s, ",") {
    m[p] = p
  }
  return json.Marshal(m)
}

// getWeatherInLocation is an example function to use as a tool call
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

// GenerateFunctionTool helper method to create jsonschema input
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

// createUserMessageInput is a helper method to create user messages in expected proto format
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

    // parse the arguments and execute tool
    args := []byte(toolCalls.ToolTypes.Arguments)
    if conversationComponent == "echo" {
      // The echo component does not return a compliant tool calling response in json format but rather returns a csv
      args, err = createMapOfArgsForEcho(toolCalls.ToolTypes.Arguments)
      if err != nil {
        log.Fatalf("err: %v", err)
      }
    }

    // find the tool (only one in this case) and execute
    for _, toolInfo := range requestWithTool.Tools {
      if toolInfo.Name == toolCalls.ToolTypes.Name && toolInfo.Name == "getWeather" {
        var reqArgs GetDegreesWeatherRequest
        if err = json.Unmarshal(args, &reqArgs); err != nil {
          log.Fatalf("err: %v", err)
        }
        // execute tool
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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

```bash
cd conversation/python/sdk/conversation
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

### 步骤 3：启动对话服务

返回到 `sdk` 目录，并使用以下命令启动对话服务：

```bash
dapr run --app-id conversation --resources-path ../../../components -- python3 app.py
```

> **注意**：由于 Windows 中未定义 Python3.exe，你可能需要使用 `python app.py` 而不是 `python3 app.py`。

**预期输出**

```
== APP - conversation == Input sent: What is dapr?
== APP - conversation == Output response: What is dapr?
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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


### 步骤 1：先决条件

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

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
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

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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


### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/conversation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录，导航到 conversation 目录：

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

观看 [Diagrid 的 Dapr v1.15 庆祝活动](https://www.diagrid.io/videos/dapr-1-15-deep-dive) 中展示的演示，了解对话 API 如何使用 .NET SDK 工作。

{{< youtube id=NTnwoDhHIcQ start=5444 >}}

## 告诉我们你的想法！

我们一直在努力改进我们的快速入门示例，并重视你的反馈。你是否觉得这个快速入门有帮助？你有改进建议吗？

加入我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 参与讨论。

## 后续步骤

- 此快速入门的 HTTP 示例：
  - [Python](https://github.com/dapr/quickstarts/tree/master/conversation/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/conversation/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/conversation/csharp/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/conversation/go/http)
- 了解更多关于[对话构建块]({{% ref conversation-overview %}})的信息

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
