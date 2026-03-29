---
type: docs
title: 历史保留策略
linkTitle: 历史保留策略
weight: 8000
description: "定义保留策略以管理工作流状态历史记录"
---

Dapr 工作流状态存储在[执行器状态存储]{{ %ref workflow-architecture.md#state-store-usage %}}中。
默认情况下，Dapr Workflows 会无限期保留工作流状态变更的完整历史记录。
这意味着历史工作流可以随时被查询和检查。
运行大量工作流或生成大量状态变更历史记录可能导致存储使用量增加，最终可能填满状态存储磁盘空间。

为帮助管理存储使用，Dapr Workflows 支持配置历史保留策略。
该保留策略定义了工作流状态变更历史在被删除前保留多长时间。
工作流只有在达到**终态**（`Completed`、`Failed` 或 `Terminated`）后才有资格被删除。
每个工作流**终态**都可以设置自定义的保留时长，也可以为未明确配置的终态设置默认保留时长。
时长定义为 [Go duration string](https://pkg.go.dev/time#ParseDuration)（例如，`72h` 表示 72 小时，`30m` 表示 30 分钟）。

为 `Completed` 工作流配置较短的保留时长可能很有用，同时为 `Failed` 和 `Terminated` 工作流保留较长时间以便进行调查。

以下示例配置设置了每个终态。
这里设置的 `anyTerminal` 属性不会生效，因为所有终态都已明确配置，但它包含在此处作为参考。

有关如何将配置应用到 Dapr 应用程序的更多信息，请参阅 [Dapr 配置文档]({{% ref configuration-overview.md %}})。

```
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    stateRetentionPolicy:
      anyTerminal: "360h"
      completed: "1m"
      failed: "720h"
      terminated: "360h"
```

## 相关链接

- [使用快速入门体验 Dapr Workflows]({{% ref workflow-quickstart.md %}})
- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/master/examples/demo_workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
