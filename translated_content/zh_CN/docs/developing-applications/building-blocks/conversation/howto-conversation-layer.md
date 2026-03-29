---
type: docs
title: "How-To: 使用对话 API 与 LLM 对话"
linkTitle: "How-To: 对话"
weight: 2000
description: "了解如何抽象化与大语言模型交互的复杂性"
---

{{% alert title="Alpha" color="primary" %}}
对话 API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}}) 状态。
{{% /alert %}}

让我们开始使用[对话 API]({{% ref conversation-overview %}})。在本指南中，您将学习如何：

- 设置可与对话 API 配合使用的可用 Dapr 组件（echo）。
- 将对话客户端添加到您的应用程序。
- 使用 `dapr run` 运行连接。

## 设置对话组件

创建一个名为 `conversation.yaml` 的新配置文件，并保存到应用程序目录下的 components 或 config 子文件夹中。

选择您的[首选对话组件规范]({{% ref supported-conversation %}})用于您的 `conversation.yaml` 文件。

对于此场景，我们使用简单的 echo 组件。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

### 使用 OpenAI 组件

要与真实的 LLM 交互，请使用其他[支持的对话组件]({{% ref "supported-conversation" %}})，包括 OpenAI、Hugging Face、Anthropic、DeepSeek 等。

例如，要将 `echo` 模拟组件替换为 `OpenAI` 组件，请使用以下内容替换 `conversation.yaml` 文件。您需要将 API 密钥复制到组件文件中。

```
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openai
spec:
  type: conversation.openai
  metadata:
  - name: key
    value: <REPLACE_WITH_YOUR_KEY>
  - name: model
    value: gpt-4-turbo
```

## 连接对话客户端

以下示例使用 Dapr SDK 客户端与 LLM 进行交互。

{{< tabpane text=true >}}


 <!-- .NET -->
{{% tab ".NET" %}}
```csharp
using Dapr.AI.Conversation;
using Dapr.AI.Conversation.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprConversationClient();

var app = builder.Build();

var conversationClient = app.Services.GetRequiredService<DaprConversationClient>();
var response = await conversationClient.ConverseAsync("conversation",
    new List<DaprConversationInput>
    {
        new DaprConversationInput(
            "Please write a witty haiku about the Dapr distributed programming framework at dapr.io",
            DaprConversationRole.Generic)
    });

Console.WriteLine("conversation output: ");
foreach (var resp in response.Outputs)
{
    Console.WriteLine($"\t{resp.Result}");
}
```
{{% /tab %}}
<!-- Java -->
{{% tab "Java" %}}
```java
//dependencies
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprPreviewClient;
import io.dapr.client.domain.ConversationInput;
import io.dapr.client.domain.ConversationRequest;
import io.dapr.client.domain.ConversationResponse;
import reactor.core.publisher.Mono;

import java.util.List;

public class Conversation {

    public static void main(String[] args) {
        String prompt = "Please write a witty haiku about the Dapr distributed programming framework at dapr.io";

        try (DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient()) {
            System.out.println("Input: " + prompt);

            ConversationInput daprConversationInput = new ConversationInput(prompt);

            // Component name is the name provided in the metadata block of the conversation.yaml file.
            Mono<ConversationResponse> responseMono = client.converse(new ConversationRequest("echo",
                    List.of(daprConversationInput))
                    .setContextId("contextId")
                    .setScrubPii(true).setTemperature(1.1d));
            ConversationResponse response = responseMono.block();
            System.out.printf("conversation output: %s", response.getConversationOutputs().get(0).getResult());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
```
{{% /tab %}}
<!-- Python -->
{{% tab "Python" %}}
```python
#dependencies
from dapr.clients import DaprClient
from dapr.clients.grpc._request import ConversationInput

#code
with DaprClient() as d:
    inputs = [
        ConversationInput(content="Please write a witty haiku about the Dapr distributed programming framework at dapr.io", role='user', scrub_pii=True),
    ]

    metadata = {
        'model': 'modelname',
        'key': 'authKey',
        'responseCacheTTL': '10m',
    }

    response = d.converse_alpha1(
        name='echo', inputs=inputs, temperature=0.7, context_id='chat-123', metadata=metadata
    )

    for output in response.outputs:
        print(f'conversation output: {output.result}')
```
{{% /tab %}}


 <!-- Go -->
{{% tab "Go" %}}
```go
package main

import (
	"context"
	"fmt"
	dapr "github.com/dapr/go-sdk/client"
	"log"
)

func main() {
	client, err := dapr.NewClient()
	if err != nil {
		panic(err)
	}

	input := dapr.ConversationInput{
		Content: "Please write a witty haiku about the Dapr distributed programming framework at dapr.io",
		// Role:     "", // Optional
		// ScrubPII: false, // Optional
	}

	fmt.Printf("conversation input: %s\n", input.Content)

	var conversationComponent = "echo"

	request := dapr.NewConversationRequest(conversationComponent, []dapr.ConversationInput{input})

	resp, err := client.ConverseAlpha1(context.Background(), request)
	if err != nil {
		log.Fatalf("err: %v", err)
	}

	fmt.Printf("conversation output: %s\n", resp.Outputs[0].Result)
}
```
{{% /tab %}}


 <!-- Rust -->
{{% tab "Rust" %}}
```rust
use dapr::client::{ConversationInputBuilder, ConversationRequestBuilder};
use std::thread;
use std::time::Duration;

type DaprClient = dapr::Client<dapr::client::TonicClient>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Sleep to allow for the server to become available
    thread::sleep(Duration::from_secs(5));

    // Set the Dapr address
    let address = "https://127.0.0.1".to_string();

    let mut client = DaprClient::connect(address).await?;

    let input = ConversationInputBuilder::new("Please write a witty haiku about the Dapr distributed programming framework at dapr.io").build();

    let conversation_component = "echo";

    let request =
        ConversationRequestBuilder::new(conversation_component, vec![input.clone()]).build();

    println!("conversation input: {:?}", input.content);

    let response = client.converse_alpha1(request).await?;

    println!("conversation output: {:?}", response.outputs[0].result);
    Ok(())
}
```
{{% /tab %}}
{{< /tabpane >}}

## 运行对话连接

使用 `dapr run` 命令启动连接。例如，对于此场景，我们在一个 app ID 为 `conversation` 的应用程序上运行 `dapr run`，并指向 `./config` 目录中的对话 YAML 文件。

{{< tabpane text=true >}}

 <!-- .NET -->
{{% tab ".NET" %}}
```bash
dapr run --app-id conversation --dapr-grpc-port 50001 --log-level debug --resources-path ./config -- dotnet run
```
{{% /tab %}}


{{% tab "Java" %}}
```bash

dapr run --app-id conversation --dapr-grpc-port 50001 --log-level debug --resources-path ./config -- mvn spring-boot:run
```
{{% /tab %}}


{{% tab "Python" %}}
```bash

dapr run --app-id conversation --dapr-grpc-port 50001 --log-level debug --resources-path ./config -- python3 app.py
```
{{% /tab %}}


 <!-- Go -->
{{% tab "Go" %}}
```bash
dapr run --app-id conversation --dapr-grpc-port 50001 --log-level debug --resources-path ./config -- go run ./main.go
```
{{% /tab %}}


 <!-- Rust -->
{{% tab "Rust" %}}
```bash
dapr run --app-id=conversation --resources-path ./config --dapr-grpc-port 3500 -- cargo run --example conversation
```
{{% /tab %}}
{{< /tabpane >}}

**预期输出**

```
  - '== APP == conversation output: Please write a witty haiku about the Dapr distributed programming framework at dapr.io'
```

## 高级功能

对话 API 支持以下功能：

1. **提示缓存：** 允许开发者在 Dapr 中缓存提示，从而获得更快的响应时间，并降低 LLM 提供商缓存插入提示的出口成本。

1. **PII 清理：** 允许对进入和离开 LLM 的数据进行混淆处理。

1. **工具调用：** 允许 LLM 与外部函数和 API 进行交互。

要了解如何启用这些功能，请参阅[对话 API 参考指南]({{% ref conversation_api %}})。

## Dapr SDK 仓库中的对话 API 示例

使用支持 SDK 仓库中提供的完整示例来体验对话 API。


{{< tabpane text=true >}}

 <!-- .NET -->
{{% tab ".NET" %}}
[Dapr conversation example with the .NET SDK](https://github.com/dapr/dotnet-sdk/tree/master/examples/AI/ConversationalAI)
{{% /tab %}}


<!-- Java -->
{{% tab "Java" %}}
[Dapr conversation example with the Java SDK](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/conversation)
{{% /tab %}}


<!-- Python -->
{{% tab "Python" %}}
[Dapr conversation example with the Python SDK](https://github.com/dapr/python-sdk/tree/main/examples/conversation)
{{% /tab %}}


<!-- Go -->
{{% tab "Go" %}}
[Dapr conversation example with the Go SDK](https://github.com/dapr/go-sdk/tree/main/examples/conversation)
{{% /tab %}}


 <!-- Rust -->
{{% tab "Rust" %}}
[Dapr conversation example with the Rust SDK](https://github.com/dapr/rust-sdk/tree/main/examples/src/conversation)
{{% /tab %}}


{{< /tabpane >}}

## 下一步

- [对话快速入门]({{% ref conversation-quickstart %}})
- [对话 API 参考指南]({{% ref conversation_api %}})
- [可用的对话组件]({{% ref supported-conversation %}})
