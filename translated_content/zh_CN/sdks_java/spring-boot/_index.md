---
type: docs
title: "Dapr 与 Spring Boot 入门"
linkTitle: "Spring Boot 集成"
weight: 4000
description: 如何开始使用 Dapr 与 Spring Boot
---

通过结合 Dapr 和 Spring Boot，我们可以创建独立于基础设施的 Java 应用程序，这些应用程序可以部署到不同的环境中，支持广泛的本地和云提供商服务。

首先，我们将从一个涵盖 `DaprClient` 和 [Testcontainers](https://testcontainers.com/) 集成的简单示例开始，然后使用 Spring 和 Spring Boot 的机制与编程模型，在底层利用 Dapr API。这有助于团队移除连接特定环境基础设施（数据库、键值存储、消息代理、配置/secret store 等）所需的客户端和驱动程序等依赖项。

{{% alert title="注意" color="primary" %}}
从 Dapr Java SDK 1.19 起，Spring Boot 集成要求 Spring Boot 4.0，不再适用于 Spring Boot 3.x 或 2.x。
如果你使用 Spring Boot 3.5，请继续使用 Dapr Java SDK 1.18.x。这两种组合二进制不兼容，会在运行时失败，例如抛出 `NoClassDefFoundError` 或 `NoSuchMethodError`。
Spring Boot 集成仍处于 alpha 阶段。我们需要你的帮助和反馈，才能使其正式发布。
请加入 [#java-sdk discord 频道](https://discord.com/channels/778680217417809931/778749797242765342) 的讨论，或在 [dapr/java-sdk](https://github.com/dapr/java-sdk/issues) 中提出问题。

{{% /alert %}}

## 将 Dapr 和 Spring Boot 集成添加到你的项目

如果你已经有 Spring Boot 应用程序，可以直接将以下依赖项添加到项目中：

```
	<dependency>
    <groupId>io.dapr.spring</groupId>
		<artifactId>dapr-spring-boot-starter</artifactId>
		<version>1.19.0</version>
	</dependency>
	<dependency>
		<groupId>io.dapr.spring</groupId>
		<artifactId>dapr-spring-boot-starter-test</artifactId>
		<version>1.19.0</version>
		<scope>test</scope>
	</dependency>
```

你可以在此处[找到最新发布的版本](https://central.sonatype.com/artifact/io.dapr.spring/dapr-spring-boot-starter)。

{{% alert title="从 Spring Boot 4 构件升级" color="warning" %}}
SDK 1.19 移除了单独的 Spring Boot 4 构件，因为主构件现在以 Spring Boot 4.0 为目标。如果你使用过这些构件，请更改依赖项和导入：

| 旧名称 | 从 SDK 1.19 起 |
| ------ | ------------- |
| `dapr-spring-boot-4-starter` | `dapr-spring-boot-starter` |
| `dapr-spring-boot-4-starter-test` | `dapr-spring-boot-starter-test` |
| `dapr-spring-boot-4-autoconfigure` | `dapr-spring-boot-autoconfigure` |
| `dapr-spring-6-data` | `dapr-spring-data` |
| `io.dapr.spring6.data`（导入） | `io.dapr.spring.data` |

{{% /alert %}}

添加这些依赖项后，你可以：
- 自动装配 `DaprClient`，在应用程序中使用
- 使用 Spring Data 和 Messaging 抽象以及编程模型，它们在底层使用 Dapr API
- 依赖 [Testcontainers](https://testcontainers.com/) 引导 Dapr control plane 服务和默认 component，从而改进你的内部开发循环

将这些依赖项加入应用程序后，你就可以依赖 Spring Boot 自动配置来自动装配 `DaprClient` 实例：

```java
@Autowired
private DaprClient daprClient;

```

这将连接到默认的 Dapr gRPC 端点 `localhost:50001`，因此你需要在应用程序外部启动 Dapr。

{{% alert title="注意" color="primary" %}}
默认情况下，以下属性已为 `DaprClient` 和 `DaprWorkflowClient` 预先配置：
```properties
dapr.client.httpEndpoint=http://localhost
dapr.client.httpPort=3500
dapr.client.grpcEndpoint=localhost
dapr.client.grpcPort=50001
dapr.client.apiToken=<your remote api token>
```
这些值为默认值，你可以在 `application.properties` 文件中覆盖它们，以适应你的环境。请注意，同时支持 kebab-case 和 camelCase。
{{% /alert %}}

你可以在应用程序的任意位置使用 `DaprClient` 与 Dapr API 交互，例如在 REST 端点内部：

```java 
@RestController
public class DemoRestController {
  @Autowired
  private DaprClient daprClient;

  @PostMapping("/store")
  public void storeOrder(@RequestBody Order order){
    daprClient.saveState("kvstore", order.orderId(), order).block();
  }
}

record Order(String orderId, Integer amount){}
```

如果你希望在 Spring Boot 应用程序之外不必管理 Dapr，可以依赖 [Testcontainers](https://testcontainers.com/)，在应用程序旁边为开发目的引导 Dapr。
为此，我们可以创建一个测试配置，使用 `Testcontainers` 引导使用 Dapr API 开发应用程序所需的全部 component。

借助 [Testcontainers](https://testcontainers.com/) 和 Dapr 集成，我们让 `@TestConfiguration` 为应用程序引导 Dapr。
请注意，在此示例中，我们使用名为 `kvstore` 的 Statestore component 配置 Dapr，该 component 连接到同样由 Testcontainers 引导的 `PostgreSQL` 实例。

```java
@TestConfiguration(proxyBeanMethods = false)
public class DaprTestContainersConfig {
  @Bean
  @ServiceConnection
  public DaprContainer daprContainer(Network daprNetwork, PostgreSQLContainer<?> postgreSQLContainer){
    
    return new DaprContainer("daprio/daprd:1.19.0")
            .withAppName("producer-app")
            .withNetwork(daprNetwork)
            .withComponent(new Component("kvstore", "state.postgresql", "v1", STATE_STORE_PROPERTIES))
            .withComponent(new Component("kvbinding", "bindings.postgresql", "v1", BINDING_PROPERTIES))
            .dependsOn(postgreSQLContainer);
  }
}
```

在测试类路径中，你可以添加一个使用此配置进行测试的新 Spring Boot 应用程序：

```java
@SpringBootApplication
public class TestProducerApplication {

  public static void main(String[] args) {

    SpringApplication
            .from(ProducerApplication::main)
            .with(DaprTestContainersConfig.class)
            .run(args);
  }
  
}
```

现在可以使用以下命令启动应用程序：

```bash
mvn spring-boot:test-run
```

运行此命令将启动应用程序，并使用提供的测试配置，其中包括 Testcontainers 和 Dapr 集成。在日志中，你应当能看到为应用程序启动了 `daprd` 和 `placement` 服务容器。

除了之前的配置（`DaprTestContainersConfig`）之外，你的测试不应测试 Dapr 本身，而只需测试应用程序暴露的 REST 端点。


## 利用 Spring 和 Spring Boot 编程模型与 Dapr

Java SDK 允许你与所有 [Dapr building block]({{% ref building-blocks %}}) 交互。
但如果你想利用 Spring 和 Spring Boot 编程模型，可以使用 `dapr-spring-boot-starter` 集成。
它包括 Spring Data（`KeyValueTemplate` 和 `CrudRepository`）的实现，以及用于生产和消费消息的 `DaprMessagingTemplate`
（类似于 [Spring Kafka](https://spring.io/projects/spring-kafka)、[Spring Pulsar](https://spring.io/projects/spring-pulsar) 和 [Spring AMQP for RabbitMQ](https://spring.io/projects/spring-amqp)），以及 Dapr workflow。

## 使用 Spring Data `CrudRepository` 和 `KeyValueTemplate`

你可以使用广为人知的 Spring Data 构造，它们依赖基于 Dapr 的实现。
借助 Dapr，你无需添加任何与基础设施相关的驱动程序或客户端，这使你的 Spring 应用程序更轻量，并与其运行环境解耦。

在底层，这些实现使用 Dapr Statestore 和 binding API。

### 配置参数

借助 Spring Data 抽象，你可以配置 Dapr 使用哪些 statestore 和 binding 来连接可用的基础设施。
这可以通过设置以下属性完成：

```properties
dapr.statestore.name=kvstore
dapr.statestore.binding=kvbinding
```

然后，你可以像这样 `@Autowire` `KeyValueTemplate` 或 `CrudRepository`：

```java
@RestController
@EnableDaprRepositories
public class OrdersRestController {
  @Autowired
  private OrderRepository repository;
  
  @PostMapping("/orders")
  public void storeOrder(@RequestBody Order order){
    repository.save(order);
  }

  @GetMapping("/orders")
  public Iterable<Order> getAll(){
    return repository.findAll();
  }


}
```

其中 `OrderRepository` 定义在一个接口中，该接口扩展了 Spring Data `CrudRepository` 接口：

```java 
public interface OrderRepository extends CrudRepository<Order, String> {}
```

请注意，`@EnableDaprRepositories` 注解完成了在 `CrudRespository` 接口下连接 Dapr API 的全部工作。
由于 Dapr 允许用户在同一应用程序中与不同的 StateStore 交互，作为用户，你需要将以下 bean 作为 Spring Boot `@Configuration` 提供：

```java
@Configuration
@EnableConfigurationProperties({DaprStateStoreProperties.class})
public class ProducerAppConfiguration {
  
  @Bean
  public KeyValueAdapterResolver keyValueAdapterResolver(DaprClient daprClient, ObjectMapper mapper, DaprStateStoreProperties daprStatestoreProperties) {
    String storeName = daprStatestoreProperties.getName();
    String bindingName = daprStatestoreProperties.getBinding();

    return new DaprKeyValueAdapterResolver(daprClient, mapper, storeName, bindingName);
  }

  @Bean
  public DaprKeyValueTemplate daprKeyValueTemplate(KeyValueAdapterResolver keyValueAdapterResolver) {
    return new DaprKeyValueTemplate(keyValueAdapterResolver);
  }
  
}
```

## 使用 Spring Messaging 生产和消费事件

与 Spring Kafka、Spring Pulsar 和 Spring AMQP 类似，你可以使用 `DaprMessagingTemplate` 将消息发布到已配置的基础设施。要消费消息，你可以使用 `@Topic` 注解（该注解即将重命名为 `@DaprListener`）。

要发布事件/消息，你可以在 Spring 应用程序中 `@Autowired` `DaprMessagingTemplate`。
在此示例中，我们将发布 `Order` 事件，并把消息发送到名为 `topic` 的主题。

```java
@Autowired
private DaprMessagingTemplate<Order> messagingTemplate;

@PostMapping("/orders")
public void storeOrder(@RequestBody Order order){
  repository.save(order);
  messagingTemplate.send("topic", order);
}

```

与 `CrudRepository` 类似，我们需要指定用于发布和消费消息的 PubSub broker。

```properties
dapr.pubsub.name=pubsub
```

由于使用 Dapr 时可以连接多个 PubSub broker，你需要提供以下 bean，让 Dapr 知道你的 `DaprMessagingTemplate` 将使用哪个 PubSub broker：
```java
@Bean
public DaprMessagingTemplate<Order> messagingTemplate(DaprClient daprClient,
                                                             DaprPubSubProperties daprPubSubProperties) {
  return new DaprMessagingTemplate<>(daprClient, daprPubSubProperties.getName());
}
```

最后，由于 Dapr PubSub 需要在应用程序与 Dapr 之间建立双向连接，你需要为 Testcontainers 配置添加几个参数：

```java
@Bean
@ServiceConnection
public DaprContainer daprContainer(Network daprNetwork, PostgreSQLContainer<?> postgreSQLContainer, RabbitMQContainer rabbitMQContainer){
    
    return new DaprContainer("daprio/daprd:1.19.0")
            .withAppName("producer-app")
            .withNetwork(daprNetwork)
            .withComponent(new Component("kvstore", "state.postgresql", "v1", STATE_STORE_PROPERTIES))
            .withComponent(new Component("kvbinding", "bindings.postgresql", "v1", BINDING_PROPERTIES))
            .withComponent(new Component("pubsub", "pubsub.rabbitmq", "v1", rabbitMqProperties))
            .withAppPort(8080)
            .withAppChannelAddress("host.testcontainers.internal")
            .dependsOn(rabbitMQContainer)
            .dependsOn(postgreSQLContainer);
}
```

现在，在 Dapr 配置中，我们包含了一个 `pubsub` component，它将连接到由 Testcontainers 启动的 RabbitMQ 实例。
我们还设置了两个重要参数 `.withAppPort(8080)` 和 `.withAppChannelAddress("host.testcontainers.internal")`，它们允许 Dapr 在消息发布到 broker 时回连应用程序。

要监听事件/消息，你需要在应用程序中暴露一个负责接收消息的端点。
如果你暴露了 REST 端点，可以使用 `@Topic` 注解告诉 Dapr 将事件/消息转发到何处：

```java
@PostMapping("subscribe")
@Topic(pubsubName = "pubsub", name = "topic")
public void subscribe(@RequestBody CloudEvent<Order> cloudEvent){
    events.add(cloudEvent);
}
```

在启动应用程序时，Dapr 会注册 subscription，把消息转发到应用程序暴露的 `subscribe` 端点。

如果你要为这些订阅者编写测试，需要确保 Testcontainers 知道你的应用程序将运行在 8080 端口，
这样由 Testcontainers 启动的容器才能找到你的应用程序：

```java
@BeforeAll
public static void setup(){
  org.testcontainers.Testcontainers.exposeHostPorts(8080);
}
```

你可以在此处[查看并运行完整的示例源代码](https://github.com/salaboy/dapr-spring-boot-docs-examples)。

## 其他 Testcontainers 配置

从 Dapr 1.19 起，`testcontainers-dapr` 模块的 `Configuration` 类接受额外的设置对象，因此你可以在 Java 中构建 Dapr [Configuration 资源]({{% ref configuration-overview.md %}})，而不必使用 YAML，并通过 `daprContainer.withConfiguration(configuration)` 将其附加到容器上：

- `MtlsConfigurationSettings` — `mtls` 块。
- `LoggingConfigurationSettings` — `logging` 块。
- `MetricsConfigurationSettings` — `metrics` 块。
- `NameResolutionConfigurationSettings` — `nameResolution` 块。
- `ComponentsConfigurationSettings` — `components` 块（例如，拒绝某些 component 类型）。
- `SecretsConfigurationSettings` — `secrets` 块（限定 secret store 的访问范围）。
- `HttpPipeline` — `httpPipeline` 块（用于处理发送到 Dapr sidecar 的传入 HTTP 请求的 middleware 处理程序）。`Configuration` 类此前已接受 `appHttpPipeline` 块对应的 `AppHttpPipeline`。

每个设置类都对应 Configuration 资源上的同名字段；各字段的作用请参阅 [Configuration 概述]({{% ref configuration-overview.md %}})。

例如，以下配置向 `httpPipeline` 添加了 `uppercase` 和 `ratelimit` middleware 处理程序。`httpPipeline` 是 `Configuration` 构造函数的最后一个参数，因此对于不使用的设置，请传入 `null`：

```java
HttpPipeline httpPipeline = new HttpPipeline(List.of(
    new ListEntry("uppercase", "middleware.http.uppercase"),
    new ListEntry("ratelimit", "middleware.http.ratelimit")));

Configuration configuration =
    new Configuration("my-config", null, null, null, null, null, null, null, null, httpPipeline);

DaprContainer daprContainer = new DaprContainer("daprio/daprd:1.19.0")
    .withAppName("my-app")
    .withConfiguration(configuration);
```

处理程序的 `name` 必须与你添加到容器中的某个[middleware component]({{% ref middleware.md %}})的名称一致。

此外，`Subscription` 现在接受 `scopes` 列表（即允许使用该订阅的 App ID），与 declarative subscription 上的 `scopes` 字段对应。

{{% alert title="注意" color="primary" %}}
这些是 Dapr 1.19 中的新增内容。请查看 [Testcontainers Dapr 模块 Javadoc](https://javadoc.io/doc/io.dapr/testcontainers-dapr/latest/index.html)，了解每个设置类完整的构造函数签名。
{{% /alert %}}

## 后续步骤

了解有关[可添加到 Java 应用程序中的 Dapr Java SDK 包](https://dapr.github.io/java-sdk/)的更多信息。

查看如何指南：[使用 Spring Boot 和 Testcontainers 进行 Dapr workflow，获得本地 workflow 开发体验](sb-workflows-howto.md)。

## 相关链接
- [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples)
