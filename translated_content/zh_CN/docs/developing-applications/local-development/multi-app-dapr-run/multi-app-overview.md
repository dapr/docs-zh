---
type: docs
title: Multi-App Run 概述
linkTitle: Multi-App Run 概述
weight: 1000
description: 使用一条 CLI 命令运行多个应用程序
---

{{% alert title="Note" color="primary" %}}
 适用于 **Kubernetes** 的 Multi-App Run 目前为预览功能。
{{% /alert %}}

假设您想在本地运行多个应用程序以进行联合测试，类似于生产环境的场景。Multi-App Run 允许您同时启动和停止一组应用程序，可以选择：
- 使用进程在本地/自托管环境中运行，或
- 通过构建容器镜像并部署到 Kubernetes 集群
   - 您可以使用本地 Kubernetes 集群或部署到云

Multi-App Run 模板文件描述了如何启动多个应用程序，就像您执行了多个单独的 CLI `run` 命令一样。默认情况下，此模板文件名为 `dapr.yaml`。

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

## Multi-App Run 模板文件

当您执行 `dapr run -f .` 时，它会启动当前目录中存在的多应用模板文件（名为 `dapr.yaml`）以运行所有应用程序。

您可以使用首选名称来命名模板文件，而不是使用默认名称。例如 `dapr run -f ./<your-preferred-file-name>.yaml`。

以下示例包括一些您可以为应用程序自定义的模板属性。在该示例中，您可以同时启动 2 个应用程序，其应用 ID 为 `processor` 和 `emit-metrics`。

```yaml
version: 1
apps:
  - appID: processor
    appDirPath: ../apps/processor/
    appPort: 9081
    daprHTTPPort: 3510
    command: ["go","run", "app.go"]
  - appID: emit-metrics
    appDirPath: ../apps/emit-metrics/
    daprHTTPPort: 3511
    env:
      DAPR_HOST_ADD: localhost
    command: ["go","run", "app.go"]
```

有关更深入的示例和模板属性的解释，请参阅 [多应用模板]({{% ref multi-app-template.md %}})。

## 资源和配置文件的位置

在使用 Multi-App Run 时，您可以选择放置应用程序资源和配置文件的位置。

### 指向一个文件位置（使用约定）

您可以在 `~/.dapr` 根目录下设置所有应用程序资源和配置。当所有应用程序共享相同的资源路径时（例如在本地机器上测试时），这很有帮助。

### 为每个应用程序指定单独的文件位置（使用约定）

使用 Multi-App Run 时，每个应用程序目录可以有一个 `.dapr` 文件夹，其中包含 `config.yaml` 文件和 `resources` 目录。否则，如果应用程序目录中不存在 `.dapr` 目录，则使用默认的 `~/.dapr/resources/` 和 `~/.dapr/config.yaml` 位置。

如果您决定在每个应用程序目录中添加 `.dapr` 目录，其中包含 `/resources` 目录和 `config.yaml` 文件，则可以为每个应用程序指定不同的资源路径。此方法通过使用默认的 `~/.dapr` 保持约定。

### 指向单独的位置（自定义）

您还可以将每个应用目录的 `.dapr` 目录命名为 `.dapr` 以外的名称，例如 `webapp` 或 `backend`。如果您想明确资源或应用程序目录路径，这很有帮助。

## 日志

运行模板为每个应用程序及其关联的 daprd 进程提供两个日志目标字段：

1. `appLogDestination`：此字段配置应用程序的日志目标。可能的值为 `console`、`file` 和 `fileAndConsole`。默认值为 `fileAndConsole`，其中应用程序日志默认写入控制台和文件。

1. `daprdLogDestination`：此字段配置 `daprd` 进程的日志目标。可能的值为 `console`、`file` 和 `fileAndConsole`。默认值为 `file`，其中 `daprd` 日志默认写入文件。

### 日志文件格式

应用程序和 `daprd` 的日志捕获在单独的文件中。这些日志文件在应用程序目录（模板中的 `appDirPath`）下的 `.dapr/logs` 目录下自动创建。这些日志文件名遵循以下模式：

- `<appID>_app_<timestamp>.log`（`app` 日志的文件名格式）
- `<appID>_daprd_<timestamp>.log`（`daprd` 日志的文件名格式）

即使您决定将资源文件夹重命名为 `.dapr` 以外的名称，日志文件也只会写入 `.dapr/logs` 文件夹（在应用程序目录中创建）。

## 观看演示

观看 [此视频了解 Multi-App Run 的概述](https://youtu.be/s1p9MNl4VGo?t=2456)：

{{< youtube id=s1p9MNl4VGo start=2456 >}}

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

## Multi-App Run 模板文件

当您执行 `dapr run -k -f .` 或 `dapr run -k -f dapr.yaml` 时，`dapr.yaml` Multi-App Run 模板文件中定义的应用程序将在 Kubernetes 默认命名空间中启动。

> **注意：** 目前，Multi-App Run 模板只能在默认 Kubernetes 命名空间中启动应用程序。

Kubernetes 的必要默认服务和部署定义会在 `.dapr/deploy` 文件夹中为 `dapr.yaml` 模板中的每个应用程序生成。

如果在 `dapr.yaml` 模板中为某个应用程序将 `createService` 字段设置为 `true`，则会在该应用程序的 `.dapr/deploy` 文件夹中生成 `service.yaml` 文件。

否则，只为设置了 `containerImage` 字段的每个应用程序生成 `deployment.yaml` 文件。

`service.yaml` 和 `deployment.yaml` 文件用于在 Kubernetes 中的 `default` 命名空间中部署应用程序。此功能专门针对在 Kubernetes 中的开发/测试环境中运行多个应用程序。

您可以使用任何首选名称来命名模板文件，而不是使用默认名称。例如：

```bash
dapr run -k -f ./<your-preferred-file-name>.yaml
```

以下示例包括一些您可以为应用程序自定义的模板属性。在该示例中，您可以同时启动 2 个应用程序，其应用 ID 为 `nodeapp` 和 `pythonapp`。

```yaml
version: 1
common:
apps:
  - appID: nodeapp
    appDirPath: ./nodeapp/
    appPort: 3000
    containerImage: ghcr.io/dapr/samples/hello-k8s-node:latest
    containerImagePullPolicy: Always
    createService: true
    env:
      APP_PORT: 3000
  - appID: pythonapp
    appDirPath: ./pythonapp/
    containerImage: ghcr.io/dapr/samples/hello-k8s-python:latest
```

> **注意：**
> - 如果未指定 `containerImage` 字段，`dapr run -k -f` 会产生错误。
> - containerImagePullPolicy 表示始终为此应用程序下载新的容器镜像。
> - `createService` 字段在 Kubernetes 中定义一个基本服务（ClusterIP 或 LoadBalancer），该服务针对模板中指定的 `--app-port`。如果未指定 `createService`，则应用程序无法从集群外部访问。

有关更深入的示例和模板属性的解释，请参阅 [多应用模板]({{% ref multi-app-template.md %}})。

## 日志

运行模板为每个应用程序及其关联的 daprd 进程提供两个日志目标字段：

1. `appLogDestination`：此字段配置应用程序的日志目标。可能的值为 `console`、`file` 和 `fileAndConsole`。默认值为 `fileAndConsole`，其中应用程序日志默认写入控制台和文件。

2. `daprdLogDestination`：此字段配置 `daprd` 进程的日志目标。可能的值为 `console`、`file` 和 `fileAndConsole`。默认值为 `file`，其中 `daprd` 日志默认写入文件。

### 日志文件格式

应用程序和 `daprd` 的日志捕获在单独的文件中。这些日志文件在应用程序目录（模板中的 `appDirPath`）下的 `.dapr/logs` 目录下自动创建。这些日志文件名遵循以下模式：

- `<appID>_app_<timestamp>.log`（`app` 日志的文件名格式）
- `<appID>_daprd_<timestamp>.log`（`daprd` 日志的文件名格式）

即使您决定将资源文件夹重命名为 `.dapr` 以外的名称，日志文件也只会写入 `.dapr/logs` 文件夹（在应用程序目录中创建）。

## 观看演示

观看 [此视频了解 Kubernetes 中 Multi-App Run 的概述](https://youtu.be/nWatANwaAik?si=O8XR-TUaiY0gclgO&t=1024)：

 {{< youtube id=nWatANwaAik start=1024 >}}

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

- [了解 Multi-App Run 模板文件结构及其属性]({{% ref multi-app-template.md %}})
- [使用服务调用快速入门尝试自托管 Multi-App Run 模板]({{% ref serviceinvocation-quickstart.md %}})
- [使用 `hello-kubernetes` 教程尝试 Kubernetes Multi-App Run 模板](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)
