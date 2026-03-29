---
type: docs
title: "run CLI 命令参考"
linkTitle: "run"
description: "run CLI 命令的详细信息"
---

### 说明

运行 Dapr 以及（可选的）您的应用程序。有关 daprd 参数、CLI 参数和 Kubernetes 注解的完整对比列表，请参见[此处]({{% ref arguments-annotations-overview.md %}})。

### 支持的平台

- [Self-Hosted（自托管）]({{% ref self-hosted %}})

### 用法

```bash
dapr run [flags] [command]
```

### 标志

| 名称                           | 环境变量             | 默认值                                                                             | 说明                                                                                                  |
| ------------------------------ | -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--app-id`, `-a`               | `APP_ID`             |                                                                                    | 您的应用程序的 id，用于服务发现。不能包含点。                                                             |
| `--app-max-concurrency`        |                      | `unlimited`                                                                        | 应用程序的并发级别；默认为 unlimited（无限制）                                                             |
| `--app-port`, `-p`             | `APP_PORT`           |                                                                                    | 您的应用程序监听的端口                                                                                  |
| `--app-protocol`, `-P` | | `http` | Dapr 用于与应用程序通信的协议。有效值为：`http`、`grpc`、`https`（带 TLS 的 HTTP）、`grpcs`（带 TLS 的 gRPC）、`h2c`（HTTP/2 明文） |
| `--resources-path`, `-d`      |                      | Linux/Mac: `$HOME/.dapr/components` <br/>Windows: `%USERPROFILE%\.dapr\components`   | 资源目录的路径。如果您将资源组织到多个文件夹中（例如，组件在一个文件夹中，弹性策略在另一个文件夹中），您可以定义多个资源路径。请参见下面的[示例]({{% ref "#examples" %}})。                                                                 |
| `--app-channel-address` | | `127.0.0.1` | 应用程序监听的网络地址 |
| `--runtime-path`                  |        |  | Dapr 运行时安装路径 |
| `--config`, `-c`               |                      | Linux/Mac: `$HOME/.dapr/config.yaml` <br/>Windows: `%USERPROFILE%\.dapr\config.yaml` | Dapr 配置文件                                                                                         |
| `--dapr-grpc-port`, `-G`       | `DAPR_GRPC_PORT`     | `50001`                                                                            | Dapr 监听的 gRPC 端口                                                                                  |
| `--dapr-internal-grpc-port`, `-I` |                      | `50002`                                                                            | Dapr 内部 API 监听的 gRPC 端口。在开发过程中为遇到因 mDNS 缓存导致服务调用失败暂时性错误的应用程序设置，或在防火墙后配置 Dapr 边车时设置。可以是大于 1024 的任何值，并且每个应用程序必须不同。         |
| `--dapr-http-port`, `-H`       | `DAPR_HTTP_PORT`     | `3500`                                                                             | Dapr 监听的 HTTP 端口                                                                                  |
| `--enable-profiling`           |                      | `false`                                                                            | 通过 HTTP 端点启用 "pprof" 性能分析                                                                    |
| `--help`, `-h`                 |                      |                                                                                    | 打印帮助信息                                                                                          |
| `--run-file`, `-f`                 |                      |  Linux/MacOS: `$HOME/.dapr/dapr.yaml`                              | 使用多应用运行模板文件一次运行多个应用程序。目前处于 [alpha 阶段]({{% ref "support-preview-features.md" %}})，仅在 Linux/MacOS 上可用                                                                     |
| `--image`                      |                      |                                                                                    | 使用自定义 Docker 镜像。Docker Hub 的格式为 `repository/image`，自定义注册表的格式为 `example.com/repository/image`。 |
| `--log-level`                  |                      | `info`                                                                             | 日志详细程度。有效值为：`debug`、`info`、`warn`、`error`、`fatal` 或 `panic`                                  |
| `--enable-api-logging`         |                      | `false`                                                                            | 启用从应用程序到 Dapr 的所有 API 调用的日志记录                                      |
| `--metrics-port`               | `DAPR_METRICS_PORT`  | `9090`                                                                             | Dapr 将其指标信息发送到的端口                                                                           |
| `--profile-port`               |                      | `7777`                                                                             | 性能分析服务器监听的端口                                                                               |
| `--placement-host-address`      |                      | Linux/Mac: `$HOME/.dapr/components` <br/>Windows: `%USERPROFILE%\.dapr\components` | 在 Docker 网络内的任何容器中运行。使用 `<hostname>` 或 `<hostname>:<port>`。如果省略端口，将默认为：<ul><li>Linux/MacOS: `50005`</li><li>Windows: `6050`</li></ul> |
| `--scheduler-host-address`      |                      | Linux/Mac: `$HOME/.dapr/components` <br/>Windows: `%USERPROFILE%\.dapr\components` | 在 Docker 网络内的任何容器中运行。使用 `<hostname>` 或 `<hostname>:<port>`。如果省略端口，将默认为：<ul><li>Linux/MacOS: `50006`</li><li>Windows: `6060`</li></ul> |
| `--enable-app-health-check`    |                      | `false`                                                                            | 使用 app-protocol 定义的协议为应用程序启用健康检查 |
| `--app-health-check-path`      |                      |                                                                                    | 用于健康检查的路径；仅限 HTTP |
| `--app-health-probe-interval`  |                      |                                                                                    | 探测应用程序健康状态的间隔（秒） |
| `--app-health-probe-timeout`   |                      |                                                                                    | 应用程序健康探测的超时时间（毫秒） |
| `--app-health-threshold`       |                      |                                                                                    | 将应用程序视为不健康的连续失败次数 |
| `--unix-domain-socket`, `-u`   |                      |                                                                                    | Unix 域套接字目录挂载路径。如果指定，与 Dapr 边车的通信使用 Unix 域套接字，与使用 TCP 端口相比，延迟更低且吞吐量更大。Windows 上不可用。 |
| `--dapr-http-max-request-size` |                      | `4`                                                                                | 请求正文的最大大小（MB）。 |
| `--dapr-http-read-buffer-size` |                      | `4`                                                                                | HTTP 读取缓冲区的最大大小（KB）。这也限制了 HTTP 标头的最大大小。默认为 4 KB |
| `--kubernetes`, `-k`             |            |                                                                                    | 在 Kubernetes 上运行 Dapr，用于 [Kubernetes 上的多应用运行模板文件]({{% ref multi-app-dapr-run %}})。                                                            |
| `--components-path`, `-d`      |                      | Linux/Mac: `$HOME/.dapr/components` <br/>Windows: `%USERPROFILE%\.dapr\components` | **已弃用**，推荐使用 `--resources-path`                                                      |

### 示例

```bash
# 运行 .NET 应用程序
dapr run --app-id myapp --app-port 5000 -- dotnet run

# 使用 Unix 域套接字运行 .Net 应用程序
dapr run --app-id myapp --app-port 5000 --unix-domain-socket /tmp -- dotnet run

# 运行 Java 应用程序
dapr run --app-id myapp -- java -jar myapp.jar

# 运行监听端口 3000 的 NodeJs 应用程序
dapr run --app-id myapp --app-port 3000 -- node myapp.js

# 运行 Python 应用程序
dapr run --app-id myapp -- python myapp.py

# 仅运行边车
dapr run --app-id myapp

# 运行用 Go 编写的 gRPC 应用程序（监听端口 3000）
dapr run --app-id myapp --app-port 5000 --app-protocol grpc -- go run main.go

# 运行启用 API 日志记录的监听端口 3000 的 NodeJs 应用程序
dapr run --app-id myapp --app-port 3000 --enable-api-logging  -- node myapp.js

# 传递多个资源路径
dapr run --app-id myapp --resources-path path1 --resources-path path2

# 运行多应用运行模板文件
dapr run -f dapr.yaml

# 在 Kubernetes 上运行多应用运行模板文件
dapr run -k -f dapr.yaml
```
