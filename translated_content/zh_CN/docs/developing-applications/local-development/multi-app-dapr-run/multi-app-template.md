---
type: docs
title: "操作指南：使用多应用运行模板文件"
linkTitle: "操作指南：使用多应用运行模板"
weight: 2000
description: 解析多应用运行模板文件及其属性
---

{{% alert title="注意" color="primary" %}}
 **Kubernetes** 的多应用运行目前为预览功能。
{{% /alert %}}

多应用运行模板文件是一个 YAML 文件，可用于一次运行多个应用程序。在本指南中，您将学习如何：
- 使用多应用模板
- 查看已启动的应用程序
- 停止多应用模板
- 构建多应用模板文件结构

## 使用多应用模板

您可以通过以下两种方式之一使用多应用模板文件：

### 通过提供目录路径执行

当您提供目录路径时，CLI 将尝试在目录中查找名为 `dapr.yaml`（默认名称）的多应用运行模板文件。如果未找到该文件，CLI 将返回错误。

执行以下 CLI 命令以读取多应用运行模板文件，默认名称为 `dapr.yaml`：

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

```cmd
# 如果给定目录路径，模板文件需要默认命名为 `dapr.yaml`

dapr run -f <dir_path>
```
{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

```cmd
dapr run -f <dir_path> -k 
```
{{% /tab %}}

{{< /tabpane >}}

### 通过提供文件路径执行

如果多应用运行模板文件的名称不是 `dapr.yaml`，那么您可以向命令提供相对或绝对文件路径：

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

```cmd
dapr run -f ./path/to/<your-preferred-file-name>.yaml
```

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

```cmd
dapr run -f ./path/to/<your-preferred-file-name>.yaml -k 
```
{{% /tab %}}

{{< /tabpane >}}

## 查看已启动的应用程序

多应用模板运行后，您可以使用以下命令查看已启动的应用程序：

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

```cmd
dapr list
```

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

```cmd
dapr list -k 
```
{{% /tab %}}

{{< /tabpane >}}

## 停止多应用模板

随时使用以下任一命令停止多应用运行模板：

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

```cmd
# 如果给定目录路径，模板文件需要默认命名为 `dapr.yaml`

dapr stop -f <dir_path>
```
或：

```cmd
dapr stop -f ./path/to/<your-preferred-file-name>.yaml
```

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

```cmd
# 如果给定目录路径，模板文件需要默认命名为 `dapr.yaml`

dapr stop -f <dir_path> -k
```
或：

```cmd
dapr stop -f ./path/to/<your-preferred-file-name>.yaml -k 
```

{{% /tab %}}

{{< /tabpane >}}


## 模板文件结构

多应用运行模板文件可以包含以下属性。以下是一个示例模板，展示了配置了部分属性的两个应用程序。

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

```yaml
version: 1
common: # 可选部分，用于在应用程序之间共享的变量
  resourcesPath: ./app/components # 任何在应用程序之间共享的 dapr 资源
  env:  # 任何在应用程序之间共享的环境变量
    DEBUG: true
apps:
  - appID: webapp # 可选
    appDirPath: .dapr/webapp/ # 必需
    resourcesPath: .dapr/resources # 已弃用
    resourcesPaths: .dapr/resources # 逗号分隔的资源路径。（可选）可按约定保留为默认值。
    appChannelAddress: 127.0.0.1 # 应用程序监听的网络地址。（可选）可按约定保留为默认值。
    configFilePath: .dapr/config.yaml # （可选）也可以按约定默认，如果未找到文件则忽略。
    appProtocol: http
    appPort: 8080
    appHealthCheckPath: "/healthz"
    command: ["python3", "app.py"]
    appLogDestination: file # （可选），可以是 file、console 或 fileAndConsole。默认为 fileAndConsole。
    daprdLogDestination: file # （可选），可以是 file、console 或 fileAndConsole。默认为 file。
  - appID: backend # 可选
    appDirPath: .dapr/backend/ # 必需
    appProtocol: grpc
    appPort: 3000
    unixDomainSocket: "/tmp/test-socket"
    env:
      DEBUG: false
    command: ["./backend"]
```

模板文件中所有路径适用以下规则：
 - 如果路径是绝对路径，则按原样使用。
 - common 部分下的所有相对路径应相对于模板文件路径提供。
 - apps 部分下的 `appDirPath` 应相对于模板文件路径提供。
 - apps 部分下的所有其他相对路径应相对于 `appDirPath` 提供。

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

```yaml
version: 1
common: # 可选部分，用于在应用程序之间共享的变量
  env:  # 任何在应用程序之间共享的环境变量
    DEBUG: true
apps:
  - appID: webapp # 可选
    appDirPath: .dapr/webapp/ # 必需
    appChannelAddress: 127.0.0.1 # 应用程序监听的网络地址。（可选）可按约定保留为默认值。
    appProtocol: http
    appPort: 8080
    appHealthCheckPath: "/healthz"
    appLogDestination: file # （可选），可以是 file、console 或 fileAndConsole。默认为 fileAndConsole。
    daprdLogDestination: file # （可选），可以是 file、console 或 fileAndConsole。默认为 file。
    containerImage: ghcr.io/dapr/samples/hello-k8s-node:latest # （可选）部署到 Kubernetes 开发/测试环境时要使用的容器镜像 URI。
    containerImagePullPolicy: IfNotPresent # （可选），如果本地不存在容器镜像则下载，否则使用本地镜像。
    createService: true # （可选）部署到开发/测试环境时为应用程序创建 Kubernetes 服务。
  - appID: backend # 可选
    appDirPath: .dapr/backend/ # 必需
    appProtocol: grpc
    appPort: 3000
    unixDomainSocket: "/tmp/test-socket"
    env:
      DEBUG: false
```

模板文件中所有路径适用以下规则：
 - 如果路径是绝对路径，则按原样使用。
 - apps 部分下的 `appDirPath` 应相对于模板文件路径提供。
 - app 部分下的所有相对路径应相对于 `appDirPath` 提供。

{{% /tab %}}

{{< /tabpane >}}

## 模板属性

{{< tabpane text=true >}}

{{% tab "Self-hosted" %}}
<!--selfhosted-->

多应用运行模板的属性与 `dapr run` CLI 标志一致，[在 CLI 参考文档中列出]({{% ref "dapr-run.md#flags" %}})。

{{% table "table table-white table-striped table-bordered" %}}

| 属性               | 必需 | 详情 | 示例 |
|--------------------------|:--------:|--------|---------|
| `appDirPath`             | 是        | 应用程序代码的路径 | `./webapp/`、`./backend/` |
| `appID`                  | 否        | 应用程序的 app ID。如果未提供，将从 `appDirPath` 派生 | `webapp`、`backend` |
| `resourcesPath`          | 否        | **已弃用**。Dapr 资源的路径。可按约定使用默认值| `./app/components`、`./webapp/components` |
| `resourcesPaths`         | 否        | Dapr 资源的逗号分隔路径。可按约定使用默认值 | `./app/components`、`./webapp/components` |
| `appChannelAddress`      | 否        | 应用程序监听的网络地址。可按约定保留为默认值。 | `127.0.0.1` | `localhost` |
| `configFilePath`         | 否        | 应用程序配置文件的路径 | `./webapp/config.yaml` |
| `appProtocol`            | 否        | Dapr 用于与应用程序通信的协议。 | `http`、`grpc` |
| `appPort`                | 否        | 应用程序监听的端口 | `8080`、`3000` |
| `daprHTTPPort`           | 否        | Dapr HTTP 端口 |  |
| `daprGRPCPort`           | 否        | Dapr GRPC 端口 |  |
| `daprInternalGRPCPort`   | 否        | Dapr 内部 API 监听的 gRPC 端口；用于从本地 DNS 组件解析值时使用 |  |
| `metricsPort`            | 否        | Dapr 将其指标信息发送到的端口 |  |
| `unixDomainSocket`       | 否        | Unix 域套接字目录挂载的路径。如果指定，与 Dapr 边车的通信使用 Unix 域套接字，与使用 TCP 端口相比，具有更低的延迟和更高的吞吐量。在 Windows 上不可用。 | `/tmp/test-socket` |
| `profilePort`            | 否        | 性能分析服务器监听的端口 |  |
| `enableProfiling`        | 否        | 通过 HTTP 端点启用性能分析 |  |
| `apiListenAddresses`     | 否        | Dapr API 监听地址 |  |
| `logLevel`               | 否        | 日志详细程度。 |  |
| `appMaxConcurrency`      | 否        | 应用程序的并发级别；默认为无限制 |  |
| `placementHostAddress`   | 否        | Dapr placement 服务器的逗号分隔地址列表 | `127.0.0.1:50057,127.0.0.1:50058` |
| `schedulerHostAddress`   | 否        | Dapr Scheduler Service 主机地址 | `localhost:50006` |
| `appSSL`                 | 否        | 当 Dapr 调用应用程序时启用 HTTPS |  |
| `maxBodySize`            | 否        | 请求正文的最大大小（以 MB 为单位）。使用大小单位设置值（例如，`16Mi` 表示 16MB）。默认为 `4Mi` |  |
| `readBufferSize`         | 否        | HTTP 读取缓冲区的最大大小（以 KB 为单位）。这也限制了 HTTP 标头的最大大小。使用大小单位设置值，例如 `32Ki` 将支持最大 32KB 的标头。默认为 `4Ki`（4KB） |  |
| `enableAppHealthCheck`   | 否        | 在应用程序上启用应用程序运行状况检查 | `true`、`false` |
| `appHealthCheckPath`     | 否        | 运行状况检查文件的路径 | `/healthz` |
| `appHealthProbeInterval` | 否        | 探测应用程序运行状况的间隔（以秒为单位） |  |
| `appHealthProbeTimeout`  | 否        | 应用程序运行状况探测的超时时间（以毫秒为单位） |  |
| `appHealthThreshold`     | 否        | 应用程序被视为不健康之前的连续失败次数 |  |
| `enableApiLogging`       | 否        | 启用从应用程序到 Dapr 的所有 API 调用的日志记录 |  |
| `runtimePath`            | 否        | Dapr 运行时安装路径 |  |
| `env`                    | 否        | 映射到环境变量；应用于每个应用程序的环境变量将覆盖在应用程序之间共享的环境变量 | `DEBUG`、`DAPR_HOST_ADD` |
| `appLogDestination`                    | 否        | 用于输出应用程序日志的日志目标；其值可以是 file、console 或 fileAndConsole。默认为 fileAndConsole | `file`、`console`、`fileAndConsole` |
| `daprdLogDestination`                    | 否        | 用于输出 daprd 日志的日志目标；其值可以是 file、console 或 fileAndConsole。默认为 file | `file`、`console`、`fileAndConsole` |

{{% /table %}}

## 后续步骤

观看[此视频了解多应用运行的概述](https://youtu.be/s1p9MNl4VGo?t=2456)：

{{< youtube id=s1p9MNl4VGo start=2456 >}}

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!--kubernetes-->

多应用运行模板的属性与 `dapr run -k` CLI 标志一致，[在 CLI 参考文档中列出]({{% ref "dapr-run.md#flags" %}})。

{{% table "table table-white table-striped table-bordered" %}}

| 属性                 | 必需 | 详情                                                                                                                                                                                                                 | 示例                                        |
|----------------------------|:--------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| `appDirPath`               |    是     | 应用程序代码的路径                                                                                                                                                                                       | `./webapp/`、`./backend/`                      |
| `appID`                    |    否     | 应用程序的 app ID。如果未提供，将从 `appDirPath` 派生                                                                                                                                                | `webapp`、`backend`                            |
| `appChannelAddress`        |    否     | 应用程序监听的网络地址。可按约定保留为默认值。                                                                                                                         | `127.0.0`、`localhost`                         |
| `appProtocol`              |    否     | Dapr 用于与应用程序通信的协议。                                                                                                                                                                      | `http`、`grpc`                                 |
| `appPort`                  |    否     | 应用程序监听的端口                                                                                                                                                                               | `8080`、`3000`                                 |
| `daprHTTPPort`             |    否     | Dapr HTTP 端口                                                                                                                                                                                                          |                                                |
| `daprGRPCPort`             |    否     | Dapr GRPC 端口                                                                                                                                                                                                          |                                                |
| `daprInternalGRPCPort`     |    否     | Dapr 内部 API 监听的 gRPC 端口；用于从本地 DNS 组件解析值时使用                                                                                                                |                                                |
| `metricsPort`              |    否     | Dapr 将其指标信息发送到的端口                                                                                                                                                                     |                                                |
| `unixDomainSocket`         |    否     | Unix 域套接字目录挂载的路径。如果指定，与 Dapr 边车的通信使用 Unix 域套接字，与使用 TCP 端口相比，具有更低的延迟和更高的吞吐量。在 Windows 上不可用。 | `/tmp/test-socket`                             |
| `profilePort`              |    否     | 性能分析服务器监听的端口                                                                                                                                                                            |                                                |
| `enableProfiling`          |    否     | 通过 HTTP 端点启用性能分析                                                                                                                                                                                   |                                                |
| `apiListenAddresses`       |    否     | Dapr API 监听地址                                                                                                                                                                                               |                                                |
| `logLevel`                 |    否     | 日志详细程度。                                                                                                                                                                                                      |                                                |
| `appMaxConcurrency`        |    否     | 应用程序的并发级别；默认为无限制                                                                                                                                                          |                                                |
| `placementHostAddress`     |    否     | Dapr placement 服务器的逗号分隔地址列表                                                                                                                                                            | `127.0.0.1:50057,127.0.0.1:50058`              |
| `schedulerHostAddress`     |    否     | Dapr Scheduler Service 主机地址                                                                                                                                                                                     | `127.0.0.1:50006`                              |
| `appSSL`                   |    否     | 当 Dapr 调用应用程序时启用 HTTPS                                                                                                                                                                          |                                                |
| `maxBodySize`              |    否     | 请求正文的最大大小（以 MB 为单位）。使用大小单位设置值（例如，`16Mi` 表示 16MB）。默认为 `4Mi`                                                                                                        | `16Mi`                                         |
| `readBufferSize`           |    否     | HTTP 读取缓冲区的最大大小（以 KB 为单位）。这也限制了 HTTP 标头的最大大小。使用大小单位设置值，例如 `32Ki` 将支持最大 32KB 的标头。默认为 `4Ki`（4KB）                | `32Ki`                                         |
| `enableAppHealthCheck`     |    否     | 在应用程序上启用应用程序运行状况检查                                                                                                                                                                          | `true`、`false`                                |
| `appHealthCheckPath`       |    否     | 运行状况检查文件的路径                                                                                                                                                                                           | `/healthz`                                     |
| `appHealthProbeInterval`   |    否     | 探测应用程序运行状况的间隔（以秒为单位）                                                                                                                                                                  |                                                |
| `appHealthProbeTimeout`    |    否     | 应用程序运行状况探测的超时时间（以毫秒为单位）                                                                                                                                                                           |                                                |
| `appHealthThreshold`       |    否     | 应用程序被视为不健康之前的连续失败次数                                                                                                                                                   |                                                |
| `enableApiLogging`         |    否     | 启用从应用程序到 Dapr 的所有 API 调用的日志记录                                                                                                                                                            |                                                |
| `env`                      |    否     | 映射到环境变量；应用于每个应用程序的环境变量将覆盖在应用程序之间共享的环境变量                                                                                                                                             | `DEBUG`、`DAPR_HOST_ADD`                       |
| `appLogDestination`        |    否     | 用于输出应用程序日志的日志目标；其值可以是 file、console 或 fileAndConsole。默认为 fileAndConsole                                                                                                    | `file`、`console`、`fileAndConsole`            |
| `daprdLogDestination`      |    否     | 用于输出 daprd 日志的日志目标；其值可以是 file、console 或 fileAndConsole。默认为 file                                                                                                            | `file`、`console`、`fileAndConsole`            |
| `containerImage`           |    否     | 部署到 Kubernetes 开发/测试环境时要使用的容器镜像 URI。                                                                                                                                | `ghcr.io/dapr/samples/hello-k8s-python:latest` |
| `containerImagePullPolicy` |    否     | 容器镜像拉取策略（默认为 `Always`）。                                                                                                                                                                  | `Always`、`IfNotPresent`、`Never`              |
| `createService`            |    否     | 部署到开发/测试环境时为应用程序创建 Kubernetes 服务。                                                                                                                                 | `true`、`false`                                |

{{% /table %}}

## 后续步骤

观看[此视频了解 Kubernetes 中多应用运行的概述](https://youtu.be/nWatANwaAik?si=O8XR-TUaiY0gclgO&t=1024)：

{{< youtube id=nWatANwaAik start=1024 >}}

{{% /tab %}}

{{< /tabpane >}}
