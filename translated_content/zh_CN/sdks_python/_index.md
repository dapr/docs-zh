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

Dapr 提供了多种子包来帮助开发 Python 应用程序。使用它们，你可以使用 Dapr 创建 Python 客户端、服务器和虚拟 actor。

## 前提条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Python 3.9+](https://www.python.org/downloads/)

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
> **注意：** 开发包将包含与 Dapr 运行时预发布版本兼容的功能和行为。在安装 dapr-dev 软件包之前，请确保卸载任何稳定版本的 Python SDK。

```bash
pip install dapr-dev
```

{{% /tab %}}

{{< /tabpane >}}


## 可用的子包

### SDK 导入

Python SDK 导入是随主 SDK 安装包含的子包，但在使用时需要导入。Dapr Python SDK 提供的最常见导入包括：

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Client</b></h5>
      <p class="card-text">编写 Python 应用程序以与 Dapr 边车和其他 Dapr 应用程序交互，包括 Python 中的有状态虚拟 actor</p>
      <a href="{{% ref python-client %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Actors</b></h5>
      <p class="card-text">创建并与 Dapr 的 Actor 框架交互。</p>
      <a href="{{% ref python-actor %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Conversation</b></h5>
      <p class="card-text">使用 Dapr Conversation API（Alpha）进行 LLM 交互、工具和多轮流程。</p>
      <a href="{{% ref conversation %}}" class="stretched-link"></a>
    </div>
  </div>
</div>

了解有关 _所有_ [可用的 Dapr Python SDK 导入](https://github.com/dapr/python-sdk/tree/master/dapr) 的更多信息。 

### SDK 扩展

SDK 扩展主要用作接收发布订阅事件、以编程方式创建发布订阅订阅以及处理输入绑定事件的实用工具。虽然你可以在不使用扩展的情况下完成所有这些任务，但使用 Python SDK 扩展会更加方便。

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
      <p class="card-text">使用 Dapr FastAPI 扩展与 Dapr Python 虚拟 actor 和发布订阅集成。</p>
      <a href="{{% ref python-fastapi %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Flask</b></h5>
      <p class="card-text">使用 Dapr Flask 扩展与 Dapr Python 虚拟 actor 集成。</p>
      <a href="{{% ref python-sdk-extensions %}}" class="stretched-link"></a>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>Workflow</b></h5>
      <p class="card-text">在 Python 中编写与其他 Dapr API 配合使用的工作流。</p>
      <a href="{{% ref python-workflow %}}" class="stretched-link"></a>
    </div>
  </div>
</div>

了解有关 [Dapr Python SDK 扩展](https://github.com/dapr/python-sdk/tree/master/ext) 的更多信息。

## 试用

克隆 Python SDK 仓库。

```bash
git clone https://github.com/dapr/python-sdk.git
```

浏览 Python 快速入门、教程和示例，查看 Dapr 的实际运行情况：

| SDK 示例 | 描述 |
| ----------- | ----------- |
| [快速入门]({{% ref quickstarts %}}) | 在几分钟内使用 Python SDK 体验 Dapr 的 API 构建块。 |
| [SDK 示例](https://github.com/dapr/python-sdk/tree/master/examples) | 克隆 SDK 仓库以试用一些示例并开始使用。 |
| [绑定教程](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings) | 了解 Dapr Python SDK 如何与其他 Dapr SDK 配合工作以启用绑定。 |
| [分布式计算器教程](https://github.com/dapr/quickstarts/tree/master/tutorials/distributed-calculator/python) | 使用 Dapr Python SDK 处理方法调用和状态持久化功能。 |
| [Hello World 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world) | 了解如何使用 Python SDK 在本地机器上启动和运行 Dapr。 |
| [Hello Kubernetes 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes) | 在 Kubernetes 集群中使用 Dapr Python SDK 启动和运行。 |
| [可观测性教程](https://github.com/dapr/quickstarts/tree/master/tutorials/observability) | 使用 Python SDK 探索 Dapr 的指标收集、链路追踪、日志记录和健康检查功能。 |
| [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 了解 Dapr Python SDK 如何与其他 Dapr SDK 配合工作以启用发布订阅应用程序。 |


## 更多信息

<div class="card-deck">
  <div class="card">
    <div class="card-body">
      <h5 class="card-title"><b>序列化</b></h5>
      <p class="card-text">了解有关 Dapr SDK 中序列化的更多信息。</p>
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
