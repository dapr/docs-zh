---
type: docs
title: "在本地环境中初始化 Dapr"
linkTitle: "在本地初始化 Dapr"
weight: 20
description: "获取 Dapr 边车二进制文件并使用 `dapr init` 在本地安装"
aliases:
  - /zh-hans/getting-started/set-up-dapr/install-dapr/
---

既然你已经[安装了 Dapr CLI]({{%ref install-dapr-cli.md%}})，请使用该 CLI 在本地计算机上初始化 Dapr。

Dapr 作为边车与应用程序一起运行。在自托管模式下，这意味着它是本地计算机上的一个进程。初始化 Dapr 后，你可以：

- 在本地获取并安装 Dapr 边车二进制文件。
- 创建一个开发环境，以简化使用 Dapr 开发应用程序的过程。

Dapr 初始化包括：

1. 运行 **Redis 容器实例**，将其用作本地状态存储和消息代理。
1. 运行 **Zipkin 容器实例**，用于可观测性。
1. 创建一个**默认组件文件夹**，其中包含上述组件的定义。
1. 运行 **Dapr placement 服务容器实例**，以支持本地 Actor。
1. 运行 **Dapr scheduler 服务容器实例**，用于作业调度。

{{% alert title="Kubernetes 开发环境" color="primary" %}}
要在本地或远程 **Kubernetes** 集群中初始化 Dapr 以用于开发（包括上面列出的 Redis 和 Zipkin 容器），请参阅[如何在 Kubernetes 上使用开发标志初始化 Dapr]({{%ref "kubernetes-deploy.md#install-dapr-from-the-official-dapr-helm-chart-with-development-flag" %}})
{{% /alert %}}

{{% alert title="Docker" color="primary" %}}
推荐的开发环境需要 [Docker](https://docs.docker.com/install/)。虽然你可以[在不依赖 Docker 的情况下初始化 Dapr]({{% ref self-hosted-no-docker.md %}})，但本指南的后续步骤假定你使用推荐的 Docker 开发环境。

如果你没有 Docker 且无法安装，请不要执行本指南中的 `dapr init` 步骤。请改为按照[操作指南：在没有 Docker 的情况下以自托管模式运行 Dapr]({{% ref self-hosted-no-docker.md %}})进行操作。

你也可以安装 [Podman](https://podman.io/) 来代替 Docker。详细了解[使用 Podman 初始化 Dapr]({{% ref dapr-init.md %}})。
{{% /alert %}}

### 步骤 1：打开提升权限的终端

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

如果符合以下任一情况，你需要在此快速入门中使用 `sudo`：

- 你使用 `sudo` 运行 Docker 命令，或
- 安装路径为 `/usr/local/bin`（默认安装路径）。

{{% /tab %}}

{{% tab "Windows" %}}

以管理员身份运行 Windows Terminal 或命令提示符。

1. 右键单击 Windows Terminal 或命令提示符图标。
1. 选择**以管理员身份运行**。

{{% /tab %}}

{{< /tabpane >}}

### 步骤 2：运行 init CLI 命令

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

安装最新的 Dapr 运行时二进制文件：

```bash
dapr init
```

如果你使用 sudo 运行 Docker 命令，则需要运行：

```bash
sudo dapr init
```

如果你在搭载 Docker 的 **Mac OS Silicon** 上安装，可能需要执行以下变通方法，才能在不使用 Kubernetes 的情况下让 `dapr init` 与 Docker 通信。
1. 导航到 **Docker Desktop** > **Settings** > **Advanced**。
1. 选中**允许使用默认 Docker socket（需要密码）**复选框。

{{% /tab %}}

{{% tab "Windows" %}}

安装最新的 Dapr 运行时二进制文件：

```bash
dapr init
```

{{% /tab %}}

{{< /tabpane >}}

**预期输出：**

<img src="/images/install-dapr-selfhost/dapr-init-output.png" style=
"padding-bottom: 5px" >

[如果你遇到有关 Docker 未安装或未运行的错误消息，请参阅故障排除指南。]({{% ref "common_issues.md#dapr-cant-connect-to-docker-when-installing-the-dapr-cli" %}})

### 步骤 3：验证 Dapr 版本

```bash
dapr --version
```

**输出：**

`CLI version: {{% dapr-latest-version cli="true" %}}` <br>
`Runtime version: {{% dapr-latest-version long="true" %}}`

### 步骤 4：验证容器正在运行

如前所述，`dapr init` 命令会启动多个容器，帮助你开始使用 Dapr。请确认有使用 `daprio/dapr`、`openzipkin/zipkin` 和 `redis` 镜像运行的容器实例：

```bash
docker ps
```

**输出：**

<img src="/images/install-dapr-selfhost/docker-containers.png">

### 步骤 5：验证组件目录已初始化

运行 `dapr init` 时，CLI 还会创建一个默认组件文件夹，其中包含多个 YAML 文件，定义了状态存储、发布订阅和 Zipkin。Dapr 边车会读取这些组件并使用：

- Redis 容器进行状态管理和消息传递。
- Zipkin 容器收集追踪数据。

打开组件目录进行验证：

- Windows：`%UserProfile%\.dapr`
- Linux/MacOS：`~/.dapr`

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

```bash
ls $HOME/.dapr
```

**输出：**

`bin  components  config.yaml`

<br>

{{% /tab %}}

{{% tab "Windows" %}}
你可以使用 PowerShell 或命令行进行验证。如果使用 PowerShell，请运行：
```powershell
explorer "$env:USERPROFILE\.dapr"
```

如果使用命令行，请运行：
```cmd
explorer "%USERPROFILE%\.dapr"
```

**结果：**

<img src="/images/install-dapr-selfhost/windows-view-components.png" width=600>

{{% /tab %}}

{{< /tabpane >}}

### 精简初始化

要在安装 CLI 时不安装任何默认配置文件或 Docker 容器，请使用 `--slim` 标志。[详细了解 `init` 命令及其标志。]({{% ref dapr-init.md %}})

```bash
dapr init --slim
```

### 其他推荐工具

#### Dapr Dev Dashboard

免费的 [Diagrid Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 是用于本地 Dapr 开发的配套工具。它可以让你深入了解应用程序、边车、组件、状态存储、订阅、Actor、工作流和日志。你还可以使用它创建 Dapr 组件文件和弹性策略，而无需手动编辑 yaml。

<img src="/images/install-dapr-selfhost/diagrid-dashboard-applications.png" width=800 alt="显示本地 Dapr 应用程序的 Diagrid Dev Dashboard"/><br/>

{{< tabpane text=true >}}

通过终端下载并安装 Dashboard：

{{% tab "Linux/MacOS" %}}

```bash
curl -sSL https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.sh | sh
```

{{% /tab %}}

{{% tab "Windows" %}}

```bash
iwr -useb https://raw.githubusercontent.com/diagridio/dev-dashboard/main/scripts/install.ps1 | iex
```

{{% /tab %}}

{{< /tabpane >}}

使用以下命令启动 Dapr Dev Dashboard：

```bash
diagrid-dev-dashboard
```

<!-- IGNORE_LINKS -->
Dashboard 将在浏览器中打开，地址为 [http://localhost:9090](http://localhost:9090)。
<!-- END_IGNORE -->

{{< button text="下一步：使用 Dapr API >>" page="getting-started/get-started-api.md" >}}
