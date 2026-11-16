---
type: docs
title: "性能结果"
linkTitle: "性能结果"
weight: 10000
description: "Dapr API 的性能基准和图表"
---

本页的图表展示了本版本 Dapr 各 API 的性能基准测试结果，按 API 分别列出。每一节首先是 **每资源吞吐量** 表格（以迭代次数/秒计，对应应用及其 Dapr 边车合计消耗的 CPU 和内存），随后是每个场景的延迟、吞吐量、资源和数据量图表。

要查看其他 Dapr 版本的结果，请使用文档顶部的版本选择器。

## 数据的生成方式

每个 Dapr 版本发布时，都会在 [`dapr-perf`](https://github.com/dapr/dapr/tree/master/tests/perf) 测试套件中运行基准测试。原始报告是事实依据，提交在 [dapr/dapr](https://github.com/dapr/dapr/tree/master/tests/perf/report/data) 仓库中；渲染后的图表发布到 `perf-charts` 分支，并自动拉取到本页。本页内容与版本无关，所显示的结果始终与你正在查看的 Dapr 版本一致。

{{< dapr-perf-results >}}
