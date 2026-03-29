---
type: docs
title: 工作流执行并发
linkTitle: 工作流执行并发
weight: 9000
description: "为 Dapr 工作流配置并发，以限制工作流和活动的执行速率。"
---

您可以使用以下配置来设置在任何时候可以执行的最大并发工作流和活动数量。
这些限制是按每个边车实例实施的，这意味着如果您的工作流应用有 10 个副本，则有效限制将是配置值的 10 倍。

设置这些限制可以帮助防止您的 Dapr 边车和应用程序出现资源耗尽，或者在活动突发导致资源争用时帮助减少积压的工作流。
这些限制不会区分不同的工作流或活动定义，因此它们适用于在边车中运行的所有工作流和活动。

有关如何将配置应用到您的 Dapr 应用程序的更多信息，请参阅 [Dapr 配置文档]({{% ref configuration-overview.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    maxConcurrentWorkflowInvocations: 100 # 默认为无限
    maxConcurrentActivityInvocations: 1000 # 默认为无限
```

## 相关链接

- [使用快速入门试用 Dapr 工作流]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
