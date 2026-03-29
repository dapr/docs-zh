---
type: docs
title: "Dapr 与 Spring Boot 入门"
linkTitle: "Spring Boot 集成"
weight: 4000
description: 如何开始使用 Dapr 与 Spring Boot  
---

通过结合 Dapr 和 Spring Boot，我们可以创建独立于基础设施的 Java 应用程序，这些应用程序可以部署到不同的环境中，支持广泛的本地和云提供商服务。

首先，我们将从一个涵盖 `DaprClient` 和 [Testcontainers](https://testcontainers.com/) 集成的简单集成开始，然后使用 Spring 和 Spring Boot 机制和编程模型来利用底层的 Dapr API。这有助于团队移除连接到特定环境的基础设施（数据库、键值存储、消息代理、配置/密钥存储等）所需的客户端和驱动程序等依赖项。

{{% alert title="注意" color="primary" %}}
Spring Boot 集成需要 Spring Boot 3.x+ 才能工作。这不适用于 Spring Boot 2.x。
Spring Boot 集成仍处于 alpha 阶段。我们需要您的帮助和反馈来使其毕业。
请加入 [#java-sdk discord 频道](https://discord.com/channels/778680217417809931/778749797242765342) 讨论或在 [dapr/java-sdk](https://github.com/dapr/java-sdk/issues) 中提出问题。

{{% /alert %}}


## 将 Dapr 和 Spring Boot 集成添加到您的项目

如果您已经有 Spring Boot 应用程序，可以直接将以下依赖项添加到您的项目中： 

```
	<dependency>
    <groupId>io.dapr.spring</groupId>
		<artifactId>dapr-spring-boot-starter</artifactId>
		<version>1.16.0</version>
	</dependency>
	<dependency>
		<groupId>io.dapr.spring</groupId>
		<artifactId>dapr-spring-boot-starter-test</artifactId>
		<version>1.16.0</version>
		<scope>test</scope>
	</dependency>
```

您可以在此处[找到最新发布的版本](https://central.sonatype.com/artifact/io.dapr.spring/dapr-spring-boot-starter)。 

通过添加这些依赖项，您可以： 
- 在应用程序内自动装配 `DaprClient` 以供使用
- 使用 Spring Data 和 Messaging 抽象以及编程模型，这些模型在底层使用 Dapr API
- 通过依赖 [Testcontainers](https://testcontainers.com/) 来引导 Dapr 控制平面服务和默认组件，从而改进您的内部开发循环

一旦这些依赖项在您的应用程序中，您就可以依赖 Spring Boot 自动配置来自动装配 `DaprClient` 实例：

```java
@Autowired
private DaprClient daprClient;

```

这将连接到默认的 Dapr gRPC 端点 `localhost:50001`，要求您在应用程序外部启动 Dapr。 

{{% alert title="注意" color="primary" %}}
默认情况下，以下属性是为 `DaprClient` 和 `DaprWorkflowClient` 预配置的：
```properties
dapr.client.httpEndpoint=http://localhost
dapr.client.httpPort=3500
dapr.client.grpcEndpoint=localhost
dapr.client.grpcPort=50001
dapr.client.apiToken=<your remote api token>
```
这些值是默认使用的，但您可以在 `application.properties` 文件中覆盖它们以适应您的环境。请注意，同时支持 kebab-case 和 camelCase。
{{% /alert %}}

您可以在应用程序的任何位置使用 `DaprClient` 与 Dapr API 交互，例如从 REST 端点内部： 

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

如果您希望在 Spring Boot 应用程序外部避免管理 Dapr，可以依赖 [Testcontainers](https://testcontainers.com/) 在应用程序旁边引导 Dapr 以用于开发目的。
为此，我们可以创建一个使用 `Testcontainers` 来引导使用 Dapr API 开发应用程序所需的所有内容的测试配置。

使用 [Testcontainers](https://testcontainers.com/) 和 Dapr 集成，我们让 `@TestConfiguration` 为我们的应用程序引导 Dapr。
请注意，对于此示例，我们正在使用一个名为 `kvstore` 的 Statestore 组件配置 Dapr，该组件连接到也由 Testcontainers 引导的 `PostgreSQL` 实例。

```java
@TestConfiguration(proxyBeanMethods = false)
public class DaprTestContainersConfig {
  @Bean
  @ServiceConnection
  public DaprContainer daprContainer(Network daprNetwork, PostgreSQLContainer<?> postgreSQLContainer){
    
    return new DaprContainer("daprio/daprd:1.16.0-rc.5")
            .withAppName("producer-app")
            .withNetwork(daprNetwork)
            .withComponent(new Component("kvstore", "state.postgresql", "v1", STATE_STORE_PROPERTIES))
            .withComponent(new Component("kvbinding", "bindings.postgresql", "v1", BINDING_PROPERTIES))
            .dependsOn(postgreSQLContainer);
  }
}
```

在测试类路径中，您可以添加一个使用此配置进行测试的新 Spring Boot 应用程序： 

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

现在您可以使用以下命令启动应用程序： 
```bash
mvn spring-boot:test-run
```

运行此命令将启动应用程序，使用提供的测试配置，其中包括 Testcontainers 和 Dapr 集成。在日志中，您应该能够看到为您的应用程序启动了 `daprd` 和 `placement` 服务容器。

除了之前的配置（`DaprTestContainersConfig`）之外，您的测试不应该测试 Dapr 本身，只测试应用程序暴露的 REST 端点。


## 利用 Spring 和 Spring Boot 编程模型与 Dapr

Java SDK 允许您与所有 [Dapr 构建块]({{% ref building-blocks %}}) 进行接口。
但是，如果您想利用 Spring 和 Spring Boot 编程模型，可以使用 `dapr-spring-boot-starter` 集成。
这包括 Spring Data（`KeyValueTemplate` 和 `CrudRepository`）的实现以及用于生产和消费消息的 `DaprMessagingTemplate`
（类似于 [Spring Kafka](https://spring.io/projects/spring-kafka)、[Spring Pulsar](https://spring.io/projects/spring-pulsar) 和 [Spring AMQP for RabbitMQ](https://spring.io/projects/spring-amqp)）和 Dapr 工作流。

## 使用 Spring Data `CrudRepository` 和 `KeyValueTemplate`

您可以使用众所周知的 Spring Data 构造，这些构造依赖于基于 Dapr 的实现。
使用 Dapr，您不需要添加任何与基础设施相关的驱动程序或客户端，使您的 Spring 应用程序更轻量，并且与其运行的环境解耦。

在底层，这些实现使用 Dapr Statestore 和 Binding API。

### 配置参数

使用 Spring Data 抽象，您可以配置 Dapr 将使用哪些 statestore 和绑定来连接到可用的基础设施。
这可以通过设置以下属性来完成：

```properties
dapr.statestore.name=kvstore
dapr.statestore.binding=kvbinding
```

然后您可以像这样 `@Autowire` `KeyValueTemplate` 或 `CrudRepository`： 

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

其中 `OrderRepository` 在一个扩展 Spring Data `CrudRepository` 接口的接口中定义：

```java 
public interface OrderRepository extends CrudRepository<Order, String> {}
```

请注意，`@EnableDaprRepositories` 注释完成了在 `CrudRespository` 接口下连接 Dapr API 的所有魔术。
因为 Dapr 允许用户从同一个应用程序与不同的 StateStores 交互，作为用户，您需要提供以下 bean 作为 Spring Boot `@Configuration`： 

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

类似于 Spring Kafka、Spring Pulsar 和 Spring AMQP，您可以使用 `DaprMessagingTemplate` 将消息发布到配置的基础设施。要消费消息，您可以使用 `@Topic` 注释（很快将重命名为 `@DaprListener`）。

要发布事件/消息，您可以在 Spring 应用程序中 `@Autowired` `DaprMessagingTemplate`。
对于此示例，我们将发布 `Order` 事件，并将消息发送到名为 `topic` 的主题。

```java
@Autowired
private DaprMessagingTemplate<Order> messagingTemplate;

@PostMapping("/orders")
public void storeOrder(@RequestBody Order order){
  repository.save(order);
  messagingTemplate.send("topic", order);
}

```

与 `CrudRepository` 类似，我们需要指定要使用哪个 PubSub 代理来发布和消费我们的消息。

```properties
dapr.pubsub.name=pubsub
```

因为使用 Dapr 您可以连接到多个 PubSub 代理，您需要提供以下 bean 以让 Dapr 知道您的 `DaprMessagingTemplate` 将使用哪个 PubSub 代理： 
```java
@Bean
public DaprMessagingTemplate<Order> messagingTemplate(DaprClient daprClient,
                                                             DaprPubSubProperties daprPubSubProperties) {
  return new DaprMessagingTemplate<>(daprClient, daprPubSubProperties.getName());
}
```

最后，因为 Dapr PubSub 需要在您的应用程序和 Dapr 之间建立双向连接，所以您需要使用几个参数扩展您的 Testcontainers 配置： 

```java
@Bean
@ServiceConnection
public DaprContainer daprContainer(Network daprNetwork, PostgreSQLContainer<?> postgreSQLContainer, RabbitMQContainer rabbitMQContainer){
    
    return new DaprContainer("daprio/daprd:1.16.0-rc.5")
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

现在，在 Dapr 配置中，我们包含了一个 `pubsub` 组件，它将连接到由 Testcontainers 启动的 RabbitMQ 实例。
我们还设置了两个重要参数 `.withAppPort(8080)` 和 `.withAppChannelAddress("host.testcontainers.internal")`，这允许 Dapr 
在代理中发布消息时联系回应用程序。

要监听事件/消息，您需要在应用程序中暴露一个负责接收消息的端点。
如果您暴露 REST 端点，可以使用 `@Topic` 注释让 Dapr 知道它也需要将事件/消息转发到哪里： 

```java
@PostMapping("subscribe")
@Topic(pubsubName = "pubsub", name = "topic")
public void subscribe(@RequestBody CloudEvent<Order> cloudEvent){
    events.add(cloudEvent);
}
```

在引导应用程序时，Dapr 将注册要转发到您的应用程序暴露的 `subscribe` 端点的消息订阅。

如果您正在为这些订阅者编写测试，您需要确保 Testcontainers 知道您的应用程序将在端口 8080 上运行，
因此使用 Testcontainers 启动的容器知道您的应用程序在哪里： 

```java
@BeforeAll
public static void setup(){
  org.testcontainers.Testcontainers.exposeHostPorts(8080);
}
```

您可以在此处[查看并运行完整的示例源代码](https://github.com/salaboy/dapr-spring-boot-docs-examples)。


## 后续步骤

了解有关[可添加到您的 Java 应用程序的 Dapr Java SDK 包](https://dapr.github.io/java-sdk/)的更多信息。

查看如何指南，[使用 Spring Boot 和 Testcontainers 进行 Dapr 工作流以获得本地工作流开发体验](sb-workflows-howto.md)。

## 相关链接
- [Java SDK 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples)
