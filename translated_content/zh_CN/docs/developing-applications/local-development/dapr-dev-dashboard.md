---
type: docs
title: "Dapr Dev Dashboard"
linkTitle: "Dapr Dev Dashboard"
weight: 100
description: "检查和调试在你的计算机上运行的 Dapr 应用"
---

免费的开源（Apache-2.0）[Diagrid Dapr Dev Dashboard](https://github.com/diagridio/dev-dashboard) 是用于本地 Dapr 开发的配套工具。它可以检查你通过 `dapr run` / `dapr run -f`、Aspire、Docker Compose 或 Dapr Testcontainers 启动的应用，并展示有关这些应用的所有信息：sidecar、workflow、Actor、state store、订阅、component、resiliency、配置和日志。它还可以帮助你编写 Dapr 资源。**component builder** 会引导你从完整的 Dapr 目录中选择 component 类型、填写其 metadata 字段并选择身份验证配置文件。**resiliency builder** 会组合 resiliency 策略（超时、重试、断路器），并将其应用于目标（应用、Actor、component）。两个构建器最终都会生成 YAML 预览，你可以将其复制或下载到项目中。

<img src="/images/dev-dashboard/applications.png" width=800 alt="Dapr Dev Dashboard 显示在本地计算机上运行的 Dapr 应用"/><br/>

{{% alert title="注意" color="primary" %}}
Dev Dashboard 仅供本地开发使用。它不适用于在 Kubernetes 集群中运行，也不适用于生产、预发布或任何共享环境。
{{% /alert %}}

## 安装 Dapr Dev Dashboard

该仪表板以独立二进制文件的形式发布在 [GitHub Releases](https://github.com/diagridio/dev-dashboard/releases) 上。通过终端下载并安装该仪表板：

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

该脚本会将仪表板安装到 `~/.local/bin`。

```bash
curl -sSL https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.sh | sh
```

若要安装特定版本，请在管道传递前设置 `VERSION`：

```bash
curl -sSL https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.sh | VERSION=vX.Y.Z sh
```

{{% /tab %}}

{{% tab "Windows" %}}

该脚本会将仪表板安装到 `%LOCALAPPDATA%\Programs\diagrid-dev-dashboard`。

```powershell
iwr -useb https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.ps1 | iex
```

若要安装特定版本，请设置 `VERSION`：

```powershell
$env:VERSION='vX.Y.Z'; iwr -useb https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.ps1 | iex
```

{{% /tab %}}

{{< /tabpane >}}

如果安装目录不在你的 `PATH` 中，脚本会输出你需要添加的那一行。

你也可以从 [GitHub Releases](https://github.com/diagridio/dev-dashboard/releases) 页面下载适用于你平台的存档文件，解压后将 `diagrid-dev-dashboard`（或 `diagrid-dev-dashboard.exe`）放到你的 `PATH` 中。

使用以下命令验证安装：

```bash
diagrid-dev-dashboard --version
```

## 运行 Dapr Dev Dashboard

使用以下命令启动仪表板：

```bash
diagrid-dev-dashboard
```

<!-- IGNORE_LINKS -->
仪表板会在浏览器中打开，地址为 [http://localhost:9090](http://localhost:9090)。使用 `--port` 标志可以在其他端口上运行仪表板：
<!-- END_IGNORE -->

```bash
diagrid-dev-dashboard --port 8080
```

无需进行其他设置。仪表板会像 `dapr list` 一样发现正在运行的 Dapr 应用，因此通过 `dapr run` / `dapr run -f`、Aspire、Docker Compose 或 Dapr Testcontainers 启动的任何应用，都会在一个刷新周期内显示出来。

## 更新 Dapr Dev Dashboard

启动时，仪表板会检查是否有更新的版本可用。如果有，仪表板会输出通知，界面也会显示**有可用更新**指示标记。若要更新到最新版本，请运行：

```bash
diagrid-dev-dashboard update
```

重启任何正在运行的仪表板以使用新版本。

## 功能

### 检查应用

**应用**页面会以实时表格显示所有正在运行的应用和 sidecar，包括应用 ID、运行状况、运行时、端口和进程 ID。深入查看单个应用，可以查看其命令、资源和配置路径、运行时 metadata、已启用的功能以及已加载的 component。

<img src="/images/dev-dashboard/application-detail.png" width=800 alt="Dapr Dev Dashboard 显示单个 Dapr 应用的详细信息"/><br/>

### 调试 workflow

**Workflows** 页面会列出所有应用中的 workflow 执行情况，并提供状态筛选和搜索功能。你可以终止和清除单个 workflow，也可以批量删除 workflow。

<img src="/images/dev-dashboard/workflow-overview.png" width=800 alt="Dapr Dev Dashboard 显示 workflow 执行概览"/><br/>

打开某个 workflow instance，可以查看其实时事件历史记录、输入和输出以及 custom status。

<img src="/images/dev-dashboard/workflow-detail.png" width=800 alt="Dapr Dev Dashboard 显示 workflow instance 的事件历史记录"/><br/>

仪表板会直接从本地 Redis、PostgreSQL、SQLite 和 MongoDB state store 中读取 workflow。对于其他 state store（例如内存存储），它会通过 sidecar 的 workflow API 读取 workflow，该 API 要求 Dapr 版本为 1.17 或更高版本。

### 复制 Dapr CLI 命令

**CLI** 抽屉会列出与你当前查看内容相对应的 Dapr CLI 命令，例如查看 workflow instance 的历史记录、引发 external event，或终止、清除并重新运行该实例。每个命令都链接到其文档，并带有**复制**按钮。该抽屉可在应用、Workflows、Actor 和订阅页面中使用，并且只列出自托管命令。

<img src="/images/dev-dashboard/cli-drawer.png" width=800 alt="Dapr Dev Dashboard 显示包含 workflow instance 的 Dapr CLI 命令的 CLI 抽屉"/><br/>

### 查看 Actor

**Actors** 页面会汇总所有应用中的 Actor 类型，并显示每种类型的活动 Actor 数量、其宿主应用以及 placement 状态。

<img src="/images/dev-dashboard/actors.png" width=800 alt="Dapr Dev Dashboard 显示 Actor 类型以及每种类型的活动 Actor 数量"/><br/>

### 查看订阅并发布测试消息

**订阅**页面会列出所有应用中的 pub/sub 订阅，包括 pub/sub component、主题、路由和订阅类型（声明式、编程式或流式）。使用订阅上的**发布**按钮，可通过应用的 sidecar 发送测试消息，这样你无需运行发布者应用就能测试订阅者。

<img src="/images/dev-dashboard/publish-message.png" width=800 alt="Dapr Dev Dashboard 显示用于向订阅发布测试消息的对话框"/><br/>

### 浏览状态记录

**状态**页面会列出已连接 state store 中的记录，包括键、应用、值、大小、版本（ETag）和 TTL。展开记录可查看其完整值，并使用*解码 base64* 切换开关来解码编码后的值。使用**+ 新建记录**可添加记录，也可以逐条删除或多选删除。默认情况下会隐藏 workflow 历史记录和 Actor 状态；选择**显示内部键**即可显示这些内容。

<img src="/images/dev-dashboard/state-records.png" width=800 alt="Dapr Dev Dashboard 显示 Redis state store 中的记录"/><br/>

### 查看和构建 component

**Components** 页面会显示 component 文件，以及加载每个 component 的应用。使用**+ 新建 component** 按钮可打开 component builder，为 Dapr 目录中的任意 component 类型生成 component YAML。**Resiliency** 页面提供了用于构建 resiliency 策略的类似构建器。

<img src="/images/dev-dashboard/components.png" width=800 alt="Dapr Dev Dashboard 显示已加载的 Dapr component"/><br/>

### 检查 control plane

**Control Plane** 页面会显示本地 Dapr control plane 服务（例如 Scheduler 和 placement service）的状态、端口和内存使用情况，并允许你重启或停止这些服务。

<img src="/images/dev-dashboard/control-plane.png" width=800 alt="Dapr Dev Dashboard 显示本地 Dapr control plane 服务"/><br/>

### 流式传输日志

**日志**页面会按应用流式传输 `daprd` 和应用日志，并提供级别着色、关键词高亮和跟随切换功能。

<img src="/images/dev-dashboard/logs.png" width=800 alt="Dapr Dev Dashboard 正在流式传输应用和 sidecar 日志"/><br/>

## 相关链接

- [GitHub 上的 Dev Dashboard 仓库](https://github.com/diagridio/dev-dashboard)
- [Multi-App Run]({{% ref multi-app-overview.md %}})
