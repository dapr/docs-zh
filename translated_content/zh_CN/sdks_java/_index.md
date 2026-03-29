---
type: docs
title: "Dapr Java SDK"
linkTitle: "Java"
weight: 1000
description: 用于开发 Dapr 应用程序的 Java SDK 软件包
cascade:
  github_repo: https://github.com/dapr/java-sdk
  github_subdir: daprdocs/content/en/java-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/java/
  github_branch: master
---

Dapr 提供了多种软件包来协助 Java 应用程序的开发。使用它们，你可以通过 Dapr 创建 Java 客户端、服务器和虚拟 Actor。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- JDK 11 或更高版本 - 已发布的 jar 文件与 Java 8 兼容：
    - [AdoptOpenJDK 11 - LTS](https://adoptopenjdk.net/)
    - [Oracle's JDK 15](https://www.oracle.com/java/technologies/javase-downloads.html)
    - [Oracle's JDK 11 - LTS](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html)
    - [OpenJDK](https://openjdk.java.net/)
- 安装以下任一 Java 构建工具：
    - [Maven 3.x](https://maven.apache.org/install.html)
    - [Gradle 6.x](https://gradle.org/install/)

## 导入 Dapr Java SDK

接下来，导入 Java SDK 软件包以开始使用。选择你首选的构建工具以了解如何导入。

{{< tabpane text=true >}}

{{% tab header="Maven" %}}
<!--Maven-->

对于 Maven 项目，将以下内容添加到你的 `pom.xml` 文件中：

```xml
<project>
  ...
  <dependencies>
    ...
    <!-- Dapr's core SDK with all features, except Actors. -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk</artifactId>
      <version>1.16.0</version>
    </dependency>
    <!-- Dapr's SDK for Actors (optional). -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-actors</artifactId>
      <version>1.16.0</version>
    </dependency>
    <!-- Dapr's SDK integration with SpringBoot (optional). -->
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

{{% tab header="Gradle" %}}
<!--Gradle-->

对于 Gradle 项目，将以下内容添加到你的 `build.gradle` 文件中：

```java
dependencies {
...
    // Dapr's core SDK with all features, except Actors.
    compile('io.dapr:dapr-sdk:1.16.0')
    // Dapr's SDK for Actors (optional).
    compile('io.dapr:dapr-sdk-actors:1.16.0')
    // Dapr's SDK integration with SpringBoot (optional).
    compile('io.dapr:dapr-sdk-springboot:1.16.0')
}
```

{{% /tab %}}

{{< /tabpane >}}

如果你还使用了 Spring Boot，可能会遇到一个常见问题：Dapr SDK 使用的 `OkHttp` 版本与 Spring Boot 的 _Bill of Materials_ 中指定的版本冲突。

你可以通过在项目中指定与 Dapr SDK 使用的版本兼容的 `OkHttp` 版本来解决此问题：

```xml
<dependency>
  <groupId>com.squareup.okhttp3</groupId>
  <artifactId>okhttp</artifactId>
  <version>1.16.0</version>
</dependency>
```

## 试用

测试 Dapr Java SDK。通过 Java 快速入门和教程来查看 Dapr 的实际效果：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [快速入门]({{% ref quickstarts %}}) | 在几分钟内使用 Java SDK 体验 Dapr 的 API 构建块。 |
| [SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples) | 克隆 SDK 仓库以尝试一些示例并开始使用。 |

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

- 有关输出绑定的完整指南，请访问 [操作指南：输出绑定]({{% ref howto-bindings.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http) 以获取代码示例和尝试输出绑定的说明。

## 可用软件包

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>客户端</b></h5>
      <p class="card-text">创建与 Dapr 边车和其他 Dapr 应用程序交互的 Java 客户端。</p>
      <a href="{{% ref java-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>工作流</b></h5>
      <p class="card-text">在 Java 中创建和管理与其他 Dapr API 协同工作的 workflow。</p>
      <a href="{{% ref workflow %}}" class="stretched-link"></a>
    </div>
  </div>
</div>
