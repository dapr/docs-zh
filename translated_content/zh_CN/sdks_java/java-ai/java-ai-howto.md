---
type: docs
title: "操作指南：使用 Java SDK 编写和管理 Dapr Conversation AI"
linkTitle: "操作指南：编写和管理 Conversation AI"
weight: 20000
description: 如何使用 Dapr Java SDK 快速上手 Conversation AI
---

在本次演示中，我们将介绍如何使用 Conversation API 与大语言模型（LLM）进行对话。该 API 会返回给定提示词的 LLM 响应。通过[提供的 conversation ai 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/conversation)，你将：

- 使用 [Conversation AI 示例](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/conversation/DemoConversationAI.java) 提供提示词
- 过滤个人身份信息（PII）。

此示例使用[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)下 `dapr init` 的默认配置。

## 前置条件

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 11（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

## 设置环境

克隆 [Java SDK 仓库](https://github.com/dapr/java-sdk) 并进入该目录。

```bash
git clone https://github.com/dapr/java-sdk.git
cd java-sdk
```

运行以下命令以安装使用 Dapr Java SDK 运行 Conversation AI 示例所需的依赖。

```bash
mvn clean install -DskipTests
```

从 Java SDK 根目录进入示例目录。

```bash
cd examples
```

运行 Dapr 边车。

```sh
dapr run --app-id conversationapp --dapr-grpc-port 51439 --dapr-http-port 3500 --app-port 8080
```

> 现在，Dapr 正在 `http://localhost:3500` 监听 HTTP 请求，在 `http://localhost:51439` 监听 gRPC 请求。

## 向 Conversation AI API 发送包含个人身份信息（PII）的提示词

在 `DemoConversationAI` 中，包含使用 `DaprPreviewClient` 下的 `converse` 方法发送提示词的步骤。

```java
public class DemoConversationAI {
  /**
   * 启动客户端的 main 方法。
   *
   * @param args 输入参数（未使用）。
   */
  public static void main(String[] args) {
    try (DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient()) {
      System.out.println("Sending the following input to LLM: Hello How are you? This is the my number 672-123-4567");

      ConversationInput daprConversationInput = new ConversationInput("Hello How are you? "
              + "This is the my number 672-123-4567");

      // 组件名称是在 conversation.yaml 文件的 metadata 块中提供的名称。
      Mono<ConversationResponse> responseMono = client.converse(new ConversationRequest("echo",
              List.of(daprConversationInput))
              .setContextId("contextId")
              .setScrubPii(true).setTemperature(1.1d));
      ConversationResponse response = responseMono.block();
      System.out.printf("Conversation output: %s", response.getConversationOutputs().get(0).getResult());
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}
```

使用以下命令运行 `DemoConversationAI`。

```sh
java -jar target/dapr-java-sdk-examples-exec.jar io.dapr.examples.conversation.DemoConversationAI
```

### 示例输出
```
== APP == Conversation output: Hello How are you? This is the my number <ISBN>
```

如输出所示，发送到 API 的号码已被混淆并以 `<ISBN>` 的形式返回。
上面的示例使用了一个["echo"](https://docs.dapr.io/developing-applications/building-blocks/conversation/howto-conversation-layer/#set-up-the-conversation-component)
组件进行测试，该组件只是简单地返回输入消息。
当与 OpenAI 或 Claude 等 LLM 集成时，你将收到有意义的响应，而不是回显的输入。

## 后续步骤
- [了解更多关于 Conversation AI]({{% ref conversation-overview.md %}})
- [Conversation AI API 参考]({{% ref conversation_api.md %}})
