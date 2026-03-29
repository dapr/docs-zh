---
type: docs
title: "在本地环境中初始化 Dapr"
linkTitle: "在本地初始化 Dapr"
weight: 20
description: "使用 `dapr init` 获取 Dapr 边车二进制文件并在本地安装"
aliases:
  - /zh-hans/getting-started/set-up-dapr/install-dapr/
---

既然您已经[安装了 Dapr CLI]({{%ref install-dapr-cli.md%}})，请使用该 CLI 在您的本地机器上初始化 Dapr。

Dapr 作为边车与您的应用程序一起运行。在自托管模式下，这意味着它是您本地机器上的一个进程。通过初始化 Dapr，您可以：

- 获取并在本地安装 Dapr 边车二进制文件。
- 创建一个开发环境，以简化使用 Dapr 的应用程序开发。

Dapr 初始化包括：

1. 运行 **Redis 容器实例**，用作本地状态存储和消息代理。
1. 运行 **Zipkin 容器实例**以实现可观测性。
1. 创建一个**默认组件文件夹**，其中包含上述组件的定义。
1. 运行 **Dapr placement 服务容器实例**以支持本地 Actor。
1. 运行 **Dapr scheduler 服务容器实例**以进行作业调度。

{{% alert title="Kubernetes 开发环境" color="primary" %}}
要在本地或远程 **Kubernetes** 集群中初始化 Dapr 以进行开发（包括上面列出的 Redis 和 Zipkin 容器），请参阅[如何在 Kubernetes 上为开发初始化 Dapr]({{%ref "kubernetes-deploy.md#install-dapr-from-the-official-dapr-helm-chart-with-development-flag" %}})
{{% /alert %}}

{{% alert title="Docker" color="primary" %}}
推荐的开发环境需要 [Docker](https://docs.docker.com/install/)。虽然您可以[不依赖 Docker 来初始化 Dapr]({{% ref self-hosted-no-docker.md %}})，但本指南的后续步骤假定使用推荐的 Docker 开发环境。

您也可以安装 [Podman](https://podman.io/) 来代替 Docker。阅读更多关于[使用 Podman 初始化 Dapr]({{% ref dapr-init.md %}})的信息。
{{% /alert %}}

### 步骤 1：打开提升权限的终端

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

如果满足以下条件，您将需要在此快速入门中使用 `sudo`：

- 您使用 `sudo` 运行 Docker 命令，或
- 安装路径是 `/usr/local/bin`（默认安装路径）。

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

如果您使用 sudo 运行 Docker 命令，则需要使用：

```bash
sudo dapr init
```

如果您在带有 Docker 的 **Mac OS Silicon** 上安装，可能需要执行以下变通方法，以便在不使用 Kubernetes 的情况下启用 `dapr init` 与 Docker 通信。
1. 导航到 **Docker Desktop** > **Settings** > **Advanced**。
1. 选择**允许使用默认 Docker socket（需要密码）**复选框。

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

[如果您遇到有关 Docker 未安装或运行的任何错误消息，请查看故障排除指南。]({{% ref "common_issues.md#dapr-cant-connect-to-docker-when-installing-the-dapr-cli" %}})

### 步骤 3：验证 Dapr 版本

```bash
dapr --version
```

**输出：**  

`CLI version: {{% dapr-latest-version cli="true" %}}` <br>
`Runtime version: {{% dapr-latest-version long="true" %}}`

### 步骤 4：验证容器正在运行

如前所述，`dapr init` 命令会启动多个容器，帮助您开始使用 Dapr。验证您是否有运行 `daprio/dapr`、`openzipkin/zipkin` 和 `redis` 镜像的容器实例：

```bash
docker ps
```

**输出：**  

<img src="/images/install-dapr-selfhost/docker-containers.png">

### 步骤 5：验证组件目录已初始化

在 `dapr init` 时，CLI 还会创建一个默认组件文件夹，其中包含多个 YAML 文件，定义了状态存储、发布订阅和 Zipkin。Dapr 边车将读取这些组件并使用：

- Redis 容器进行状态管理和消息传递。
- Zipkin 容器收集追踪数据。

通过打开组件目录进行验证：

- 在 Windows 上，位于 `%UserProfile%\.dapr`
- 在 Linux/MacOS 上，位于 `~/.dapr`

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
您可以使用 PowerShell 或命令行进行验证。如果使用 PowerShell，请运行：
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

### Slim 初始化

要在不安装任何默认配置文件或 Docker 容器的情况下安装 CLI，请使用 `--slim`` 标志。[了解更多关于 `init` 命令及其标志的信息。]({{% ref dapr-init.md %}})

```bash
dapr init --slim
```

### 其他工具（可选）

#### Diagrid Dashboard for Dapr Workflow

如果您计划构建 Dapr Workflow 应用程序，可以安装 [Diagrid Dashboard](https://diagrid.ws/diagrid-dashboard-docs) 以在本地开发期间可视化工作流状态：

使用 Docker 启动 Diagrid Dashboard 容器：

```bash
docker run -p 8080:8080 ghcr.io/diagridio/diagrid-dashboard:latest
```

{{< button text="下一步：使用 Dapr API >>" page="getting-started/get-started-api.md" >}}
