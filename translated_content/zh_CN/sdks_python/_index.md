---
type: docs
title: "Dapr Python SDK"
linkTitle: "Python"
weight: 1000
description: 用于开发 Dapr 应用程序的 Python SDK 软件包
no_list: true
cascade:
  github_repo: https://github.com/dapr/python-sdk
  github_subdir: daprdocs/content/en/python-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/python/
  github_branch: master
---

Dapr 提供了多种子包来帮助开发 Python 应用程序。使用它们，你可以使用 Dapr 创建 Python 客户端、服务器和 virtual Actor。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.10+](https://www.python.org/downloads/)

## 安装

要开始使用 Python SDK，请安装主要的 Dapr Python SDK 软件包。

{{< tabpane text=true >}}

{{% tab header="Stable" %}}
<!--stable-->
```bash
pip install dapr
```
{{% /tab %}}

{{% tab header="Development" %}}
<!--dev-->
> **注意：** 开发版本将包含与 Dapr 运行时预发布版本兼容的功能和行为。只有带标签的正式版本会发布到 PyPI，因此请从 GitHub 仓库安装开发版本。安装前请确保卸载所有稳定版本的 Python SDK。

```bash
pip install "dapr @ git+https://github.com/dapr/python-sdk.git@main"
```

{{% /tab %}}

{{< /tabpane >}}

SDK 需要 `protobuf` 6.33.5 或更高版本，以及 `grpcio` 和 `grpcio-status` 1.81.1 或更高版本。`pip` 会自动安装匹配的版本。如果你的项目将 `protobuf`、`grpcio` 或 `grpcio-status` 固定到了更早的版本，请先更新这些固定版本，再升级 SDK。

### 安装扩展

从 Dapr 1.19 开始，SDK 扩展是 `dapr` 包的可选 extras。请在安装 SDK 的同一条命令中安装你需要的 extras，例如：

```bash
pip install "dapr[workflow]"
pip install "dapr[fastapi,grpc]"
```

| Extra | 扩展 | 导入路径 |
| ----- | --------- | ----------- |
| `dapr[fastapi]` | [FastAPI]({{% ref python-fastapi %}}) | `dapr.ext.fastapi` |
| `dapr[flask]` | [Flask]({{% ref python-flask %}}) | `dapr.ext.flask` |
| `dapr[grpc]` | [gRPC]({{% ref python-grpc %}}) | `dapr.ext.grpc` |
| `dapr[workflow]` | [Workflow]({{% ref python-workflow-ext %}}) | `dapr.ext.workflow` |
| `dapr[databricks]` | [Databricks]({{% ref python-databricks-ext %}}) | `dapr.ext.databricks` |
| `dapr[langgraph]` | LangGraph checkpoint 持久化 | `dapr.ext.langgraph` |
| `dapr[strands]` | Strands 代理会话管理 | `dapr.ext.strands` |

如需安装所有扩展，请使用 `pip install "dapr[all]"`。

{{% alert title="从 Dapr 1.18 或更早版本升级" color="warning" %}}
`dapr-ext-fastapi`、`dapr-ext-grpc`、`dapr-ext-langgraph`、`dapr-ext-strands`、`dapr-ext-workflow` 和 `flask-dapr` 包已不再发布。扩展代码现在随 `dapr` 包一起发布，`dapr.ext.*` 下的导入路径保持不变。

如果你安装了任何旧包，请按顺序运行以下命令。卸载旧包会删除新 `dapr` 包所安装的扩展文件，因此之后必须重新安装 `dapr`：

```bash
pip uninstall -y dapr-ext-fastapi dapr-ext-grpc dapr-ext-langgraph dapr-ext-strands dapr-ext-workflow flask-dapr
pip install --force-reinstall --no-deps dapr
pip install "dapr[fastapi,workflow]"
```

请将最后一条命令中的 extras 替换为你的应用所使用的 extras。如果跳过这些步骤，`import dapr` 会输出一条带有恢复命令的 `FutureWarning`。你可以通过设置 `DAPR_SKIP_LEGACY_CHECK=1` 来屏蔽该警告。
{{% /alert %}}


## 可用的子包

### SDK 导入

Python SDK 导入是随主 SDK 安装包含的子包，但在使用时需要导入。Dapr Python SDK 提供的最常见导入包括：

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Client</b></h5>
      <p class="card-text">编写 Python 应用程序以与 Dapr sidecar 和其他 Dapr 应用程序交互，包括 Python 中的有状态 virtual Actor</p>
      <a href="{{% ref python-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Actor</b></h5>
      <p class="card-text">创建并与 Dapr 的 Actor 框架交互。</p>
      <a href="{{% ref python-actor %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>对话</b></h5>
      <p class="card-text">使用 Dapr Conversation API（Alpha）进行大型语言模型 (LLM) 交互、工具调用和多轮流程。</p>
      <a href="{{% ref conversation %}}" class="stretched-link"></a>
    </div>
  </div>
</div>

了解有关 _所有_ [可用的 Dapr Python SDK 导入](https://github.com/dapr/python-sdk/tree/master/dapr) 的更多信息。

### SDK 扩展

SDK 扩展主要用作接收 pub/sub 事件、以编程方式创建 pub/sub 订阅，以及处理 input binding 事件的实用工具。虽然你可以在不使用扩展的情况下完成所有这些任务，但使用 Python SDK 扩展会更加方便。

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>gRPC</b></h5>
      <p class="card-text">使用 gRPC 服务器扩展创建 Dapr 服务。</p>
      <a href="{{% ref python-grpc %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>FastAPI</b></h5>
      <p class="card-text">使用 Dapr FastAPI 扩展与 Dapr Python virtual Actor 和 pub/sub 集成。</p>
      <a href="{{% ref python-fastapi %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Flask</b></h5>
      <p class="card-text">使用 Dapr Flask 扩展与 Dapr Python virtual Actor 集成。</p>
      <a href="{{% ref python-flask %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Workflow</b></h5>
      <p class="card-text">在 Python 中编写与其他 Dapr API 配合使用的 workflow。</p>
      <a href="{{% ref python-workflow %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Databricks</b></h5>
      <p class="card-text">将 Databricks Lakeflow 流式记录转换为持久的 Dapr Workflow 执行。</p>
      <a href="{{% ref python-databricks-ext %}}" class="stretched-link"></a>
    </div>
  </div>
</div>

了解有关 [Dapr Python SDK 扩展](https://github.com/dapr/python-sdk/tree/master/ext) 的更多信息。

## 试用

克隆 Python SDK 仓库。

```bash
git clone https://github.com/dapr/python-sdk.git
```

浏览 Python Quickstarts、教程和示例，查看 Dapr 的实际运行情况：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [Quickstarts]({{% ref quickstarts %}}) | 使用 Python SDK，在几分钟内体验 Dapr 的 API building blocks。 |
| [SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples) | 克隆 SDK 仓库，试用其中的一些示例并开始使用。 |
| [Bindings 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings) | 了解 Dapr Python SDK 如何与其他 Dapr SDK 协同工作以启用 binding。 |
| [分布式计算器教程](https://github.com/dapr/quickstarts/tree/master/tutorials/distributed-calculator/python) | 使用 Dapr Python SDK 处理方法调用和状态持久化功能。 |
| [Hello World 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world) | 了解如何使用 Python SDK 在本地机器上启动并运行 Dapr。 |
| [Hello Kubernetes 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes) | 在 Kubernetes 集群中快速上手 Dapr Python SDK。 |
| [observability 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/observability) | 使用 Python SDK 探索 Dapr 的指标收集、链路追踪、日志记录和健康检查功能。 |
| [pub/sub 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 了解 Dapr Python SDK 如何与其他 Dapr SDK 协同工作以启用 pub/sub 应用。 |


## 更多信息

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>序列化</b></h5>
      <p class="card-text">了解有关 Dapr SDK 序列化的更多信息。</p>
      <a href="{{% ref sdk-serialization %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>PyPI</b></h5>
      <p class="card-text">Python 软件包索引</p>
      <a href="https://pypi.org/user/dapr.io/" class="stretched-link"></a>
    </div>
  </div>
</div>
