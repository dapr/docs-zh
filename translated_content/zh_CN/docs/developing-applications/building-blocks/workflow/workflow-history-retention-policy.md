---
type: docs
title: 历史保留策略
linkTitle: 历史保留策略
weight: 8000
description: "定义保留策略以管理 workflow 状态历史记录"
---

Dapr workflow 状态存储在 [actor state store]({{% ref "workflow-architecture.md#state-store-usage" %}}) 中。
默认情况下，Dapr Workflows 会无限期保留 workflow 状态变更的完整历史记录。
这意味着历史 workflow 可以随时被查询和检查。
运行大量 workflow，或 workflow 生成大量状态变更历史记录，可能会导致存储用量增加，最终可能耗尽状态存储的磁盘空间。

为帮助管理存储用量，Dapr Workflows 支持配置历史保留策略。
保留策略定义了在删除之前保留 workflow 状态变更历史的时长。
只有达到**终态**（`Completed`、`Failed` 或 `Terminated`）的 workflow 才有资格被删除。
每个 workflow **终态**都可以设置自定义的保留时长，也可以为未明确配置的终态设置默认保留时长。
时长以 [Go duration string](https://pkg.go.dev/time#ParseDuration) 的形式定义（例如，`72h` 表示 72 小时，`30m` 表示 30 分钟）。

{{% alert title="注意" color="primary" %}}
为 `Completed` workflow 配置较短的保留时长，同时为 `Failed` 和 `Terminated` workflow 保留较长时间以便排查问题，这种做法可能很有用。
{{% /alert %}}

{{% alert title="重要" color="warning" %}}
添加或修改保留策略时，该策略只对在其产生效果之后**新近达到**已配置终态的 workflow 生效。它**不会**追溯清理已经处于终态的 workflow。

要追溯清除现有的终态 workflow，请使用 Dapr CLI：

```bash
# 清除所有早于指定时长的终态 workflow
dapr workflow purge --app-id <app-id> --all-older-than <duration>

# 仅清除早于指定时长且具有特定状态的 workflow
dapr workflow purge --app-id <app-id> --all-older-than <duration> --all-filter-status COMPLETED
dapr workflow purge --app-id <app-id> --all-older-than <duration> --all-filter-status FAILED
dapr workflow purge --app-id <app-id> --all-older-than <duration> --all-filter-status TERMINATED
```

清除 workflow 时，请确保为同一 `app-id` 运行了 workflow client，以便 workflow 状态机能够正确推进。在 workflow 实例可能仍处于活动状态时，请避免使用 `--force` 选项，因为这可能会破坏 workflow 状态机。

有关 purge 命令及其他注意事项的更多详情，请参阅 [How to: Manage workflows]({{% ref howto-manage-workflow.md %}})。
{{% /alert %}}

下面的示例配置设置了每个终态。
这里设置的 `anyTerminal` 属性不会产生效果，因为所有终态都已明确配置，但仍将其包含在此处作为参考。

有关如何将配置应用到 Dapr 应用程序的更多信息，请参阅 [Dapr Configuration 文档]({{% ref configuration-overview.md %}})。

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

- [使用 Quickstart 体验 Dapr Workflows]({{% ref workflow-quickstart.md %}})
- [workflow 概述]({{% ref workflow-overview.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
