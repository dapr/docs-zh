---
type: docs
title: "Dapr API 日志"
linkTitle: "API 日志"
weight: 3000
description: "了解 Dapr 中的 API 日志记录是如何工作的以及如何查看日志"
---

API 日志记录使您能够查看您的应用程序向 Dapr 边车发出的 API 调用。这对于监控应用程序的行为或其他调试目的非常有用。您还可以将 Dapr API 日志记录与 Dapr 日志事件（参见 [配置和查看 Dapr 日志]({{% ref "logs-troubleshooting.md" %}})）结合到输出中，以便一起使用日志记录功能。

## 概述

默认情况下，API 日志记录是禁用的。

要启用 API 日志记录，可以在启动 `daprd` 进程时使用 `--enable-api-logging` 命令行选项。例如：

```bash
./daprd --enable-api-logging
```

## 在自托管模式下配置 API 日志记录

要在使用 Dapr CLI 运行应用程序时启用 API 日志记录，请传递 `--enable-api-logging` 标志：

```bash
dapr run \
  --enable-api-logging \
  -- node myapp.js
```

### 在自托管模式下查看 API 日志

当使用 Dapr CLI 运行 Dapr 时，您的应用程序日志输出和 Dapr 运行时日志输出都会被重定向到同一个会话中，以便于调试。

下面的示例显示了一些 API 日志：

```bash
$ dapr run --enable-api-logging -- node myapp.js

ℹ️  Starting Dapr with id order-processor on port 56730
✅  You are up and running! Both Dapr and your app logs will appear here.
.....
INFO[0000] HTTP API Called app_id=order-processor instance=mypc method="POST /v1.0/state/mystate" scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
== APP == INFO:root:Saving Order: {'orderId': '483'}
INFO[0000] HTTP API Called app_id=order-processor instance=mypc method="GET /v1.0/state/mystate/key123" scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
== APP == INFO:root:Getting Order: {'orderId': '483'}
INFO[0000] HTTP API Called app_id=order-processor instance=mypc method="DELETE /v1.0/state/mystate" scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
== APP == INFO:root:Deleted Order: {'orderId': '483'}
INFO[0000] HTTP API Called app_id=order-processor instance=mypc method="PUT /v1.0/metadata/cliPID" scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
```

## 在 Kubernetes 中配置 API 日志记录

您可以通过在 Pod 规范模板中添加以下注解来为边车启用 API 日志：

```yaml
annotations:
  dapr.io/enable-api-logging: "true"
```

### 在 Kubernetes 上查看 API 日志

Dapr API 日志会被写入 stdout 和 stderr，您可以在 Kubernetes 上查看 API 日志。

执行以下命令以查看 Kubernetes API 日志。

```bash
kubectl logs <pod_name> daprd -n <name_space>
```

下面的示例显示了 Kubernetes 中 `info` 级别的 API 日志记录（启用了 [URL 混淆](#在-http-api-日志记录中混淆-url)）。

```bash
time="2022-03-16T18:32:02.487041454Z" level=info msg="HTTP API Called" method="POST /v1.0/invoke/{id}/method/{method:*}" app_id=invoke-caller instance=invokecaller-f4f949886-cbnmt scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
time="2022-03-16T18:32:02.698387866Z" level=info msg="HTTP API Called" method="POST /v1.0/invoke/{id}/method/{method:*}" app_id=invoke-caller instance=invokecaller-f4f949886-cbnmt scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
time="2022-03-16T18:32:02.917629403Z" level=info msg="HTTP API Called" method="POST /v1.0/invoke/{id}/method/{method:*}" app_id=invoke-caller instance=invokecaller-f4f949886-cbnmt scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
time="2022-03-16T18:32:03.137830112Z" level=info msg="HTTP API Called" method="POST /v1.0/invoke/{id}/method/{method:*}" app_id=invoke-caller instance=invokecaller-f4f949886-cbnmt scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
time="2022-03-16T18:32:03.359097916Z" level=info msg="HTTP API Called" method="POST /v1.0/invoke/{id}/method/{method:*}" app_id=invoke-caller instance=invokecaller-f4f949886-cbnmt scope=dapr.runtime.http-info type=log useragent=Go-http-client/1.1 ver=edge
```

## API 日志记录配置

使用 [Dapr 配置规范]({{% ref "configuration-overview.md" %}}#sidecar-configuration)，您可以配置 Dapr 运行时中 API 日志记录的默认行为。

### 默认启用 API 日志记录

使用 Dapr 配置规范，您可以通过 `logging.apiLogging.enabled` 选项设置 `--enable-api-logging` 标志（以及在 Kubernetes 上运行时对应的注解）的默认值。此值适用于引用定义该选项的配置文档或资源的所有 Dapr 运行时。

- 如果 `logging.apiLogging.enabled` 设置为 `false`（默认值），则除非将 `--enable-api-logging` 设置为 `true`（或添加 `dapr.io/enable-api-logging: true` 注解），否则 Dapr 运行时的 API 日志记录将被禁用。
- 当 `logging.apiLogging.enabled` 为 `true` 时，Dapr 运行时默认启用 API 日志记录，可以通过设置 `--enable-api-logging=false` 或使用 `dapr.io/enable-api-logging: false` 注解来禁用。

例如：

```yaml
logging:
  apiLogging:
    enabled: true
```

### 在 HTTP API 日志记录中混淆 URL

默认情况下，HTTP 端点中 API 调用的日志包含被调用的完整 URL（例如，`POST /v1.0/invoke/directory/method/user-123`），其中可能包含个人身份信息（PII）。

为了降低 PII 意外包含在 API 日志中的风险（启用时），Dapr 可以改为记录被调用的抽象路由（例如，`POST /v1.0/invoke/{id}/method/{method:*}`）。这有助于确保遵守 GDPR 等隐私法规。

要在 Dapr 的 HTTP API 日志中启用 URL 混淆，请将 `logging.apiLogging.obfuscateURLs` 设置为 `true`。例如：

```yaml
logging:
  apiLogging:
    obfuscateURLs: true
```

Dapr gRPC API 发出的日志不受此配置选项的影响，因为它们仅包含被调用方法的名称，不包含参数。

### 从 API 日志记录中省略健康检查

当启用 API 日志记录时，对 Dapr API 服务器的所有调用都会被记录，包括对健康检查端点的调用（例如 `/v1.0/healthz`）。根据您的环境，这每分钟可能会生成多个日志行，并可能产生不必要的噪音。

您可以使用 Dapr 配置规范配置 Dapr 在启用 API 日志记录时不记录对健康检查端点的调用，方法是将 `logging.apiLogging.omitHealthChecks` 设置为 `true`。默认值为 `false`，这意味着健康检查调用会记录在 API 日志中。

例如：

```yaml
logging:
  apiLogging:
    omitHealthChecks: true
```
