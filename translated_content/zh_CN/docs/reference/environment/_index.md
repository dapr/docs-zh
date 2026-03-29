---
type: docs
title: "环境变量参考"
linkTitle: "环境变量"
description: "Dapr 使用的环境变量列表"
weight: 300
---

下表列出了 Dapr 运行时、CLI 或应用程序内部使用的环境变量：

| 环境变量 | 使用方 | 描述 |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| APP_ID               | 您的应用程序 | 应用程序的 ID，用于服务发现  |
| APP_PORT             | Dapr 边车 | 应用程序正在监听的端口  |
| APP_API_TOKEN        | 您的应用程序 | 应用程序用于验证来自 Dapr API 的请求的令牌。阅读[使用令牌身份验证验证来自 Dapr 的请求]({{% ref app-api-token %}})以了解更多信息。 |
| DAPR_HTTP_PORT       | 您的应用程序 | Dapr 边车正在监听的 HTTP 端口。您的应用程序应使用此变量连接到 Dapr 边车，而不是硬编码端口值。由 Dapr CLI run 命令在自托管模式下设置，或由 `dapr-sidecar-injector` 注入到 Pod 中的所有容器中。                                   |
| DAPR_GRPC_PORT       | 您的应用程序 | Dapr 边车正在监听的 gRPC 端口。您的应用程序应使用此变量连接到 Dapr 边车，而不是硬编码端口值。由 Dapr CLI run 命令在自托管模式下设置，或由 `dapr-sidecar-injector` 注入到 Pod 中的所有容器中。                                   |
| DAPR_API_TOKEN  | Dapr 边车     | 用于来自应用程序的请求的 Dapr API 身份验证令牌。[在 Dapr 中启用 API 令牌身份验证]({{% ref api-token %}})。 |
| NAMESPACE | Dapr 边车 | 用于指定组件在[自托管模式下的命名空间]({{% ref component-scopes %}})。 |
| DAPR_DEFAULT_IMAGE_REGISTRY | Dapr CLI | 在自托管模式下，用于指定从中拉取镜像的默认容器注册表。当其值设置为 `GHCR` 或 `ghcr` 时，它从 Github 容器注册表拉取所需的镜像。要默认使用 Docker hub，请取消设置此环境变量。 |
| SSL_CERT_DIR | Dapr 边车 | 指定所有受信任证书颁发机构 (CA) 的公共证书所在的位置。当边车作为进程在自托管模式下运行时不适用。|
| DAPR_HELM_REPO_URL | 您的私有 Dapr Helm chart url  | 指定私有 Dapr Helm chart URL，默认为官方 Helm chart URL：`https://dapr.github.io/helm-charts`|
| DAPR_HELM_REPO_USERNAME | 私有 Helm chart 的用户名 | 访问私有 Dapr Helm chart 所需的用户名。如果可以公开访问，则无需设置此环境变量|
| DAPR_HELM_REPO_PASSWORD | 私有 Helm chart 的密码  |访问私有 Dapr helm chart 所需的密码。如果可以公开访问，则无需设置此环境变量| 
| OTEL_EXPORTER_OTLP_ENDPOINT | OpenTelemetry 追踪 | 设置 Open Telemetry (OTEL) 服务器地址，开启追踪。（示例：`http://localhost:4318`） |
| OTEL_EXPORTER_OTLP_INSECURE | OpenTelemetry 追踪 | 将与端点的连接设置为未加密。（`true`、`false`） |
| OTEL_EXPORTER_OTLP_PROTOCOL | OpenTelemetry 追踪 | 要使用的 OTLP 协议传输协议。（`grpc`、`http/protobuf`、`http/json`） |
| DAPR_COMPONENTS_SOCKETS_FOLDER | Dapr 运行时以及 .NET、Go 和 Java 可插拔组件 SDK | Dapr 在其中查找可插拔组件 Unix 域套接字文件的位置或路径。如果未设置，此位置默认为 `/tmp/dapr-components-sockets` |
| DAPR_COMPONENTS_SOCKETS_EXTENSION | .NET 和 Java 可插拔组件 SDK | 每个 SDK 的配置，指示应用于 SDK 创建的套接字文件的默认文件扩展名。不是 Dapr 强制的行为。 |
| DAPR_PLACEMENT_METADATA_ENABLED | Dapr Placement | 为 Placement 服务启用一个端点，该端点公开有关 Actor 使用情况的 Placement 表信息。在自托管模式下设置为 `true` 以启用。[了解有关 Placement API 的更多信息]({{% ref placement_api.md %}}) |
| DAPR_HOST_IP | Dapr 边车 | 主机选择的 IP 地址。如果未指定，将遍历网络接口并选择它找到的第一个非环回地址。|
| DAPR_HEALTH_TIMEOUT | SDK | 设置"等待边车"可用性的时间。覆盖默认的 60 秒超时设置。 |
| DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK | Dapr 控制平面和边车 | 禁用确保 Dapr 容器在 Kubernetes Linux 上不以 root 身份运行的检查。不建议在生产环境中使用。设置为 `true` 以禁用检查。 |
