---
type: docs
title: "Dapr bot 参考"
linkTitle: "Dapr bot"
weight: 70
description: "Dapr bot 功能列表。"
---

Dapr bot 由一系列命令触发，用于协助 Dapr 组织中的常见任务。它会为每个仓库单独设置（[示例](https://github.com/dapr/dapr/blob/master/.github/workflows/dapr-bot.yml)），可以配置为在特定事件上运行。以下是命令列表以及实现这些命令的仓库列表。

## 命令参考

| 命令             | 目标                 | 描述                                                                                                     | 谁可以使用                                                                                       | 仓库                                                                                               |
| ---------------- | -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/assign`        | Issue                | 将 issue 分配给用户或用户组                                                                              | 任何人                                                                                          | `dapr`、`docs`、`quickstarts`、`cli`、`components-contrib`、`go-sdk`、`js-sdk`、`java-sdk`、`python-sdk`、`dotnet-sdk`、`rust-sdk` |
| `/ok-to-test`    | Pull request         | `dapr`：触发端到端测试 <br/> `components-contrib`：触发 conformance 和 certification tests                | [bot](https://github.com/dapr/dapr/blob/master/.github/scripts/dapr_bot.js) 中列出的用户          | `dapr`、`components-contrib`                                                                        |
| `/ok-to-perf`    | Pull request         | 触发性能测试。                                                                                           | [bot](https://github.com/dapr/dapr/blob/master/.github/scripts/dapr_bot.js) 中列出的用户          | `dapr`                                                                                             |
| `/make-me-laugh` | Issue 或 pull request | 发布一个随机笑话                                                                                         | [bot](https://github.com/dapr/dapr/blob/master/.github/scripts/dapr_bot.js) 中列出的用户          | `dapr`、`components-contrib`                                                                        |

## 标签参考

你可以使用 `created-by/dapr-bot` 标签查询 Dapr bot 创建的 issue（[查询](https://github.com/search?q=org%3Adapr%20is%3Aissue%20label%3Acreated-by%2Fdapr-bot%20&type=issues)）。

| 标签                    | 目标                 | 作用                                                                 | 仓库               |
| ------------------------ | -------------------- | -------------------------------------------------------------------- | ------------------ |
| `docs-needed`            | Issue                | 在 `dapr/docs` 中创建新 issue 以跟踪文档工作                          | `dapr`             |
| `sdk-needed`             | Issue                | 跨 SDK 仓库创建新 issue 以跟踪 SDK 工作                               | `dapr`             |
| `documentation required` | Issue 或 pull request | 在 `dapr/docs` 中创建新 issue 以跟踪文档工作                          | `components-contrib` |
| `new component`          | Issue 或 pull request | 在 `dapr/dapr` 中创建新 issue 以注册新组件                            | `components-contrib` |
