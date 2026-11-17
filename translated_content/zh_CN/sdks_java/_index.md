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

Dapr 提供了多种软件包来协助 Java 应用程序的开发。使用它们，你可以通过 Dapr 创建 Java 客户端、服务器和 virtual Actor。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- JDK 17 或更高版本：
    - [Eclipse Temurin](https://adoptium.net/)
    - [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
    - [OpenJDK](https://openjdk.org/)
- 安装以下任一 Java 构建工具：
    - [Maven 3.x](https://maven.apache.org/install.html)
    - [Gradle 6.x](https://gradle.org/install/)

## 导入 Dapr Java SDK

接下来，导入 Java SDK 软件包以开始使用。选择你首选的构建工具，了解如何导入。

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
      <version>1.19.0</version>
    </dependency>
    <!-- Dapr's SDK for Actors (optional). -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-actors</artifactId>
      <version>1.19.0</version>
    </dependency>
    <!-- Dapr's SDK integration with SpringBoot (optional). -->
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-springboot</artifactId>
      <version>1.19.0</version>
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
    compile('io.dapr:dapr-sdk:1.19.0')
    // Dapr's SDK for Actors (optional).
    compile('io.dapr:dapr-sdk-actors:1.19.0')
    // Dapr's SDK integration with SpringBoot (optional).
    compile('io.dapr:dapr-sdk-springboot:1.19.0')
}
```

{{% /tab %}}

{{< /tabpane >}}

### Spring Boot 兼容性

从 SDK 1.19 起，Spring Boot 集成模块（`dapr-sdk-springboot` 和 `dapr-spring-*` 模块）需要 Spring Boot 4.0。如果要使用 Spring Boot 3.5，请继续使用 SDK 1.18.x。更多信息请参阅 [Spring Boot 集成]({{% ref spring-boot %}})。

### Netty 版本

Dapr Java SDK 通过 gRPC 使用 Netty。从 SDK 1.19 开始，SDK 会传递性地引入 Netty 4.2.x。如果项目直接锁定了 Netty 4.1.x，或使用了管理 Netty 4.1.x 的依赖管理文件，就可能出现依赖冲突。

你可以移除 Netty 4.1.x 的锁定来解决此问题。也可以导入 `dapr-sdk-bom`，它会管理与 SDK 所用 gRPC 版本相匹配的 Netty 版本：

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.dapr</groupId>
      <artifactId>dapr-sdk-bom</artifactId>
      <version>1.19.0</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

对于 Spring Boot 项目，请改为导入 `io.dapr.spring:dapr-spring-bom`，它会导入 `dapr-sdk-bom`。

## 试用

测试 Dapr Java SDK。通过 Java Quickstart 和教程，查看 Dapr 的实际效果：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [Quickstart]({{% ref quickstarts %}}) | 在几分钟内使用 Java SDK 体验 Dapr 的 API building block。 |
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

- 有关 output binding 的完整指南，请访问 [操作指南：output binding]({{% ref howto-bindings.md %}})。
- 访问 [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/bindings/http)，获取代码示例并尝试 output binding 的相关说明。

## 可用软件包

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>客户端</b></h5>
      <p class="card-text">创建与 Dapr sidecar 和其他 Dapr 应用程序交互的 Java 客户端。</p>
      <a href="{{% ref java-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>workflow</b></h5>
      <p class="card-text">在 Java 中创建和管理与其他 Dapr API 协同工作的 workflow。</p>
      <a href="{{% ref workflow %}}" class="stretched-link"></a>
    </div>
  </div>
</div>
