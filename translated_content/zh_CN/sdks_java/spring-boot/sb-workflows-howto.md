---
type: docs
title: "操作指南：使用 Spring Boot 编写和管理 Dapr 工作流"
linkTitle: "操作指南：使用 Spring Boot 编写和管理工作流"
weight: 40000
description: 如何使用 Spring Boot 集成快速上手工作流
---


遵循与 Spring Data 和 Spring Messaging 相同的方法，[`dapr-spring-boot-starter`](_index.md) 为 Spring Boot 用户带来了 Dapr 工作流集成。 

使用 Dapr 工作流，您可以在 Java 代码中定义复杂的编排（工作流）。Dapr Spring Boot Starter 通过将 `Workflow`s 和 `WorkflowActivity`s 作为 Spring Bean 进行管理，使您的开发更加便捷。

为了启用自动 bean 发现，您需要在 `@SpringBootApplication` 上添加 `@EnableDaprWorkflows` 注解：

```
@SpringBootApplication
@EnableDaprWorkflows
public class MySpringBootApplication {
  ...
}
```

通过添加此注解，所有的 `Workflow`s 和 `WorkflowActivity`s bean 都会被 Spring 自动发现并注册到工作流引擎中。 

## 创建工作流和活动

在您的 Spring Boot 应用程序中，您可以定义任意数量的工作流。为此，您需要创建新的 `Workflow` 接口实现。 

```
@Component
public class MyWorkflow implements Workflow {
    
    @Override
    public WorkflowStub create() {
      return ctx -> {
         <工作流逻辑>
      };
    }

}
```

在工作流定义内部，您可以执行服务间交互、调度定时器或接收外部事件。 

通过将所有 `WorkflowActivity`s 作为托管 bean，您可以使用 Spring 的 `@Autowired` 机制来注入工作流活动实现其功能所需的任何 bean。例如 `@RestTemplate`：

```
@Component
public class MyWorkflowActivity implements WorkflowActivity {

  @Autowired
  private RestTemplate restTemplate;
```

## 创建和与工作流交互


要创建和与工作流实例交互，您可以使用同样支持 `@Autowired` 的 `DaprWorkflowClient`。 

```
@Autowired
private DaprWorkflowClient daprWorkflowClient;
```

应用程序现在可以调度新的工作流实例并触发事件。

```
String instanceId = daprWorkflowClient.scheduleNewWorkflow(MyWorkflow.class, payload);
```

以及

```
daprWorkflowClient.raiseEvent(instanceId, "MyEvenet", event);
```

[在此处查看完整示例](https://github.com/dapr/java-sdk/blob/master/spring-boot-examples/workflows/patterns/src/main/java/io/dapr/springboot/examples/wfp/chain/ChainWorkflow.java)



## 后续步骤和资源

查看 [Baeldung 关于 Dapr 工作流和 Dapr 发布订阅的博客文章](https://www.baeldung.com/dapr-workflows-pubsub)，其中包含完整的工作示例。

查看 [Dapr 工作流文档](https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/)，了解如何使用 Dapr 工作流的更多信息。
