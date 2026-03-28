---
type: docs
title: "Dapr Java SDK"
linkTitle: "Java"
weight: 1000
description: 用于开发 Dapr 应用程序的 Java SDK 包
cascade:
  github_repo: https://github.com/dapr/java-sdk
  github_subdir: daprdocs/content/en/java-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/java/
  github_branch: master
---

Dapr 提供多种包来帮助开发 Java 应用程序。使用这些包，你可以创建与 Dapr 交互的 Java 客户端、服务器和虚拟 Actor。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr_cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- JDK 11 或更高版本 - 已发布的 jar 包兼容 Java 8：
    - [AdoptOpenJDK 11 - LTS](https://adoptopenjdk.net/)
    - [Oracle's JDK 15](https://www.oracle.com/java/technologies/javase-downloads.html)
    - [Oracle's JDK 11 - LTS](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html)
    - [OpenJDK](https://openjdk.java.net/)
- 安装以下任一 Java 构建工具：
    - [Maven 3.x](https://maven.apache.org/install.html)
    - [Gradle 6.x](https://gradle.org/install/)

## 导入 Dapr Java SDK

接下来，导入 Java SDK 包以开始使用。选择你喜欢的构建工具，了解如何导入。

{{< tabpane text=true >}}

{{% tab header="Maven" %}}
<!--Maven-->

对于 Maven 项目，将以下内容添加到你的 `pom.xml` 文件中：

```xml
<project>
  ...
  <dependencies>
    ...
    <!-- Dapr 的核心 SDK，包含除 Actors 外的所有功能。 -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk</artifactId>
      <version>1.16.0</version>
    </dependency>
    <!-- Dapr 的 Actors SDK（可选）。 -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-actors</artifactId>
      <version>1.16.0</version>
    </dependency>
    <!-- Dapr 与 SpringBoot 的集成 SDK（可选）。 -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-springboot</artifactId>
      <version>1.16.0</version>
    </dependency>
    ...
  </dependencies>
  ...
</project>
```
{{% /tab %}}

##Try it out

Put the Dapr Java SDK to the test. Walk through the Java quickstarts and tutorials to see Dapr in action:

| SDK samples | Description |
| ----------- | ----------- |
| [Quickstarts]({{% ref quickstarts %}}) | Experience Dapr's API building blocks in just a few minutes using the Java SDK. |
| [SDK samples](https://github.com/dapr/java-sdk/tree/master/examples) | Clone the SDK repo to try out some examples and get started. |

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;

try (DaprClient client = (new DaprClientBuilder()).build()) {
  // sending a class with message; BINDING_OPERATION="create"
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, myClass).block();

  // sending a plain string
  client.invokeBinding(BINDING_NAME, BINDING_OPERATION, message).block();
}
```

- For a full guide on output bindings visit [How-To: Output bindings]({{% ref howto-bindings.md %}}).
- Visit [Java SDK examples](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http) for code samples and instructions to try out output bindings.

## Available packages

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Client</b></h5>
      <p class="card-text">Create Java clients that interact with a Dapr sidecar and other Dapr applications.</p>
      <a href="{{% ref java-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Workflow</b></h5>
      <p class="card-text">Create and manage workflows that work with other Dapr APIs in Java.</p>
      <a href="{{% ref workflow %}}" class="stretched-link"></a>
    </div>
  </div>
</div>
