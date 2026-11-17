---
type: docs
no_list: true
---
# Dapr 文档

## 面向 workflow 与 AI 代理的持久执行引擎

Dapr 提供持久、可验证执行的能力，使你的 workflow 和 AI 代理在发生故障后依然能够存活并持续运行至完成。其持久执行 workflow 引擎保证每个步骤即使遇到崩溃、重启和网络中断，也会运行至完成，并从中断处精确恢复状态。每个 workflow 的执行历史都经过[加密签名且可验证]({{% ref workflow-history-signing.md %}})，使运行过的内容具备防篡改性且可审计。同一引擎也驱动持久 AI 代理，使其能够推理、调用工具，并从任何故障点恢复而不丢失进度。作为 CNCF 分布式应用运行时，Dapr 基于与基础设施无关的 API，为你提供跨云和跨环境的可移植性，并具备生产系统所需的安全性、resiliency 与 observability。

{{< button text="开始使用" page="getting-started.md" >}}

### 使用场景

<div class="d-card-grid">
  <a class="d-card c-blue" href="{{% ref workflow-overview %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/workflow.svg" alt="" width="40" height="40"><span class="d-card-title">持久 workflow</span></span><span class="d-card-desc">编排持久、可验证的 workflow，确保它们始终运行至完成。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref "../developing-ai" %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/dapr-agents.svg" alt="" width="40" height="40"><span class="d-card-title">持久 AI 代理</span></span><span class="d-card-desc">构建能够从任何故障中恢复的持久 AI 代理。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref service-invocation-overview %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/service-invocation.svg" alt="" width="40" height="40"><span class="d-card-title">微服务</span></span><span class="d-card-desc">使用 Dapr service invocation API 构建具有弹性的微服务。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref pubsub-overview %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/pub-sub.svg" alt="" width="40" height="40"><span class="d-card-title">事件驱动架构</span></span><span class="d-card-desc">使用 Dapr pub/sub API 创建事件驱动应用程序。</span><span class="d-card-more">了解更多 →</span></a>
</div>

### 语言

<div class="d-card-grid cols-3">
  <a class="d-card c-blue" href="{{% ref dotnet %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/dotnet.png" alt="" width="40" height="40"><span class="d-card-title">.NET</span></span><span class="d-card-desc">了解 .NET SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref python %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/python.png" alt="" width="40" height="40"><span class="d-card-title">Python</span></span><span class="d-card-desc">了解 Python SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref js %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/javascript.png" alt="" width="40" height="40"><span class="d-card-title">JavaScript</span></span><span class="d-card-desc">了解 JavaScript SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref java %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/javalang.png" alt="" width="40" height="40"><span class="d-card-title">Java</span></span><span class="d-card-desc">了解 Java SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref go %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/golang.svg" alt="" width="40" height="40"><span class="d-card-title">Go</span></span><span class="d-card-desc">了解 Go SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref php %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/php.png" alt="" width="40" height="40"><span class="d-card-title">PHP</span></span><span class="d-card-desc">了解 PHP SDK 的更多信息。</span><span class="d-card-more">了解更多 →</span></a>
</div>

### 开始使用 Dapr 进行开发

<div class="d-card-grid cols-3">
  <a class="d-card c-blue" href="{{% ref getting-started %}}"><span class="d-card-title">入门指南</span><span class="d-card-desc">如何在几分钟内在你的环境中启动并运行 Dapr。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref quickstarts %}}"><span class="d-card-title">Quickstarts</span><span class="d-card-desc">一系列包含代码示例的教程，帮助你快速上手 Dapr。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref concepts %}}"><span class="d-card-title">概念</span><span class="d-card-desc">了解 Dapr，包括其主要特性和能力。</span><span class="d-card-more">了解更多 →</span></a>
</div>

### 了解更多关于 Dapr

<div class="d-card-grid cols-3">
  <a class="d-card c-blue" href="{{% ref developing-applications %}}"><span class="d-card-title">开发应用程序</span><span class="d-card-desc">关于如何使用 Dapr 构建应用程序的工具、提示和信息。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref building-blocks-concept %}}"><span class="d-card-title">building block</span><span class="d-card-desc">解决分布式应用程序常见开发挑战的能力。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref operations %}}"><span class="d-card-title">运维</span><span class="d-card-desc">托管选项、最佳实践，以及在 Dapr 上运行应用程序的其他指南。</span><span class="d-card-more">了解更多 →</span></a>
</div>

### 附加信息

<div class="d-card-grid cols-3">
  <a class="d-card c-blue" href="{{% ref reference %}}"><span class="d-card-title">参考</span><span class="d-card-desc">关于 Dapr API、CLI、bindings 等的详细文档。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref contributing %}}"><span class="d-card-title">贡献</span><span class="d-card-desc">如何为 Dapr 项目和各个代码仓库做出贡献。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="{{% ref roadmap.md %}}"><span class="d-card-title">路线图</span><span class="d-card-desc">了解 Dapr 的路线图和变更流程。</span><span class="d-card-more">了解更多 →</span></a>
</div>

### 工具和资源

<div class="d-card-grid cols-3">
  <a class="d-card c-blue" href="{{% ref dapr-dev-dashboard.md %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/dashboard.svg" alt="" width="40" height="40"><span class="d-card-title">Dapr Dev Dashboard</span></span><span class="d-card-desc">在本地开发期间，检查和调试在你的机器上运行的应用、workflow、Actor 和 component。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-sky" href="{{% ref sdks %}}"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/code.svg" alt="" width="40" height="40"><span class="d-card-title">语言 SDK</span></span><span class="d-card-desc">使用 Dapr SDK，以你偏好的语言创建 Dapr 应用程序。</span><span class="d-card-more">了解更多 →</span></a>
  <a class="d-card c-blue" href="https://www.diagrid.io/dapr-university"><span class="d-card-head"><img class="d-card-icon" src="/images/homepage/dark-blue-dapr.svg" alt="" width="40" height="40"><span class="d-card-title">Dapr University</span></span><span class="d-card-desc">通过一系列免费的实践课程，在基于云的沙箱环境中学习 Dapr。</span><span class="d-card-more">了解更多 →</span></a>
</div>
