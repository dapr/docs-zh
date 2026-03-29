---
type: docs
title: "daprd、CLI 和 Kubernetes 的 Dapr 参数与注解"
linkTitle: "参数与注解"
description: "在不同环境中配置 Dapr 时可用的参数和注解"
weight: 300
aliases:
  - "/operations/hosting/kubernetes/kubernetes-annotations/"
---

此表旨在帮助用户了解在不同上下文中运行 Dapr 边车时的等效选项：直接通过 [CLI]({{% ref cli-overview.md %}})、通过 daprd，或通过注解在 [Kubernetes]({{% ref kubernetes-overview.md %}}) 上运行。

| daprd | Dapr CLI | CLI 简写 | Kubernetes 注解 | 描述|
|----- | ------- | -----------| ----------| ------------ |
| `--allowed-origins`  | 不支持 |  | 不支持 | 允许的 HTTP 源（默认为 "*"）|
| `--app-id` | `--app-id` | `-i` | `dapr.io/app-id`  | 应用程序的唯一 ID。用于服务发现、状态封装和发布订阅的消费者 ID |
| `--app-port` | `--app-port` | `-p` | `dapr.io/app-port` | 此参数告诉 Dapr 你的应用程序正在监听的端口 |
| `--components-path`  | `--components-path` | `-d` | 不支持 | **已弃用**，请使用 `--resources-path` |
| `--resources-path`  | `--resources-path` | `-d` | 不支持 | 组件目录的路径。如果为空，则不会加载组件 |
| `--config`  | `--config` | `-c` | `dapr.io/config` | 告诉 Dapr 使用哪个配置资源 |
| `--control-plane-address` | 不支持 | | 不支持 | Dapr 控制平面的地址 |
| `--dapr-grpc-port` | `--dapr-grpc-port` | | `dapr.io/grpc-port` | 设置 Dapr API gRPC 端口（默认 `50001`）；所有集群服务必须使用相同的端口进行通信 |
| `--dapr-http-port` | `--dapr-http-port` | | 不支持 | Dapr API 监听的 HTTP 端口（默认 `3500`）|
| `--dapr-http-max-request-size` | `--dapr-http-max-request-size` | | `dapr.io/http-max-request-size` | **已弃用**，请使用 `--max-body-size`。增加请求最大 body 大小以处理使用 http 和 grpc 协议的大文件上传。默认为 `4` MB |
| `--max-body-size` | 不支持 | | `dapr.io/max-body-size` |  增加请求最大 body 大小以处理使用 http 和 grpc 协议的大文件上传。使用大小单位设置值（例如，`16Mi` 表示 16MB）。默认为 `4Mi` |
| `--dapr-http-read-buffer-size` | `--dapr-http-read-buffer-size` | | `dapr.io/http-read-buffer-size` | **已弃用**，请使用 `--read-buffer-size`。增加 http 头读取缓冲区的最大大小（以 KB 为单位）以支持更大的头值，例如 `16` 支持最大 16KB 的头。默认为 `16`，即 16KB |
| `--read-buffer-size` | 不支持 | | `dapr.io/read-buffer-size` | 增加 http 头读取缓冲区的最大大小（以 KB 为单位）以支持更大的头值。使用大小单位设置值，例如 `32Ki` 将支持最大 32KB 的头。默认为 `4Ki`，即 4KB |
| 不支持 | `--image` | | `dapr.io/sidecar-image` | Dapr 边车镜像。默认为 daprio/daprd:latest。Dapr 边车使用此镜像而不是最新的默认镜像。在构建自己的自定义 Dapr 镜像和/或[使用替代的稳定 Dapr 镜像]({{% ref "support-release-policy.md#build-variations" %}})时使用此选项 |
| `--internal-grpc-port` | 不支持 | | `dapr.io/internal-grpc-port` | 设置内部 Dapr gRPC 端口（默认 `50002`）；所有集群服务必须使用相同的端口进行通信 |
| `--enable-metrics` | 不支持 | | 配置规范 | 启用 [Prometheus 指标]({{% ref prometheus %}})（默认为 true）|
| `--enable-mtls` | 不支持 | | 配置规范 | 为 daprd 到 daprd 的通信通道启用自动 mTLS |
| `--enable-profiling` | `--enable-profiling` | | `dapr.io/enable-profiling` | [启用性能分析]({{% ref profiling-debugging %}}) |
| `--unix-domain-socket` | `--unix-domain-socket` | `-u` | `dapr.io/unix-domain-socket-path`  | 套接字文件的父目录。在 Linux 上，与 Dapr 边车通信时，使用 Unix 域套接字可以获得比 TCP 端口更低的延迟和更高的吞吐量。在 Windows 操作系统上不可用。 |
| `--log-as-json` | 不支持 | | `dapr.io/log-as-json` | 将此参数设置为 `true` 会输出 [JSON 格式的日志]({{% ref logs %}})。默认为 `false` |
| `--log-level` | `--log-level` | | `dapr.io/log-level` | 设置 Dapr 边车的[日志级别]({{% ref logs-troubleshooting %}})。允许的值为 `debug`、`info`、`warn`、`error`。默认为 `info` |
| `--enable-api-logging` | `--enable-api-logging` | | `dapr.io/enable-api-logging` | 为 Dapr 边车[启用 API 日志记录]({{% ref "api-logs-troubleshooting.md#configuring-api-logging-in-kubernetes" %}}) |
| `--app-max-concurrency` | `--app-max-concurrency` | | `dapr.io/app-max-concurrency` | 限制[应用程序的并发]({{% ref "control-concurrency.md#setting-app-max-concurrency" %}})。有效值是任何大于 `0` 的数字。默认值：`-1`，表示无并发限制。 |
| `--metrics-port` | `--metrics-port` | | `dapr.io/metrics-port` | 设置边车指标服务器的端口。默认为 `9090` |
| `--mode` | 不支持 | | 不支持 | Dapr 的运行时托管选项模式，可以是 `"standalone"` 或 `"kubernetes"`（默认为 `"standalone"`）。[了解更多。]({{% ref hosting %}}) |
| `--placement-host-address` | `--placement-host-address` | | `dapr.io/placement-host-address` | Dapr Actor 放置服务器的逗号分隔地址列表。 <br><br> 当未设置注解时，默认值由边车注入器设置。 <br><br> 当设置注解且值为单个空格（`' '`）或 "empty" 时，边车不连接到放置服务器。当边车中没有运行 actor 时可以使用此选项。 <br><br> 当设置注解且值不为空时，边车连接到配置的地址。例如：`127.0.0.1:50057,127.0.0.1:50058` |
| `--scheduler-host-address` | `--scheduler-host-address` | | `dapr.io/scheduler-host-address` | Dapr 调度器服务器的逗号分隔地址列表。 <br><br>当未设置注解时，默认值由边车注入器设置。 <br><br>当设置注解且值为单个空格（`' '`）或 "empty" 时，边车不连接到调度器服务器。 <br><br>当设置注解且值不为空时，边车连接到配置的地址。例如：`127.0.0.1:50055,127.0.0.1:50056` |
| `--actors-service` | 不支持 | | 不支持 | 提供 actor 放置信息的服务的配置。格式为 `<name>:<address>`。例如，将此值设置为 `placement:127.0.0.1:50057,127.0.0.1:50058` 是使用 `--placement-host-address` 标志的替代方案。 |
| `--reminders-service` | 不支持 | | 不支持 | 启用 actor 提醒的服务的配置。格式为 `<name>[:<address>]`。目前，唯一支持的值是 `"default"`（这也是默认值），它使用 Dapr 边车中的内置提醒子系统。 |
| `--profiling-port` | `--profiling-port` | | 不支持 | 性能分析服务器的端口（默认 `7777`）|
| `--app-protocol` | `--app-protocol` | `-P` | `dapr.io/app-protocol` | 配置 Dapr 用于与应用程序通信的协议。有效选项为 `http`、`grpc`、`https`（带 TLS 的 HTTP）、`grpcs`（带 TLS 的 gRPC）、`h2c`（HTTP/2 明文）。请注意，Dapr 不验证应用程序提供的 TLS 证书。默认为 `http` |
| `--enable-app-health-check` | `--enable-app-health-check` | | `dapr.io/enable-app-health-check` | 启用[健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})的布尔值。默认为 `false`。  |
| `--app-health-check-path` | `--app-health-check-path` | | `dapr.io/app-health-check-path` | 当应用通道为 HTTP 时，Dapr 调用健康探测的路径（如果应用通道使用 gRPC，则忽略此值）。需要[启用应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `/healthz`。 |
| `--app-health-probe-interval` | `--app-health-probe-interval` | | `dapr.io/app-health-probe-interval` | 每次健康探测之间的*秒*数。需要[启用应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `5` |
| `--app-health-probe-timeout` | `--app-health-probe-timeout` | | `dapr.io/app-health-probe-timeout` | 健康探测请求的*毫秒*超时时间。需要[启用应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `500` |
| `--app-health-threshold` | `--app-health-threshold` | | `dapr.io/app-health-threshold"` | 在应用程序被视为不健康之前的连续失败的最大次数。需要[启用应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `3` |
| `--sentry-address` | `--sentry-address` | | 不支持 | [Sentry CA 服务]({{% ref sentry %}})的地址 |
| `--version` | `--version` | `-v` | 不支持 | 打印运行时版本 |
| `--dapr-graceful-shutdown-seconds` | 不支持 | | `dapr.io/graceful-shutdown-seconds` | Dapr 的优雅关闭持续时间（秒），在等待所有进行中的请求完成时强制关闭之前的最大持续时间。默认为 `5`。如果你在 Kubernetes 模式下运行，此值不应大于 Kubernetes 终止宽限期，其默认值为 `30`。|
| `--dapr-block-shutdown-duration` | 不支持 | | `dapr.io/block-shutdown-duration` | 阻止关闭持续时间，如果设置，则会阻止优雅关闭程序（如上所述）启动，直到给定持续时间过去或应用程序变得不健康（通过应用程序健康选项配置）。这对于需要在其自己的终止过程中执行 Dapr API 的应用程序很有用。一旦阻止期结束，应用程序将无法再调用任何 Dapr API。接受 [Go duration](https://pkg.go.dev/time#ParseDuration) 字符串。 |
| 不支持 | 不支持 | | `dapr.io/enabled` | 将此参数设置为 true 会将 Dapr 边车注入到 pod 中 |
| 不支持 | 不支持 | | `dapr.io/api-token-secret` | 告诉 Dapr 使用哪个 Kubernetes 密钥进行[基于令牌的 API 身份验证]({{% ref api-token %}})。默认情况下，此参数未设置 |
| 不支持 | 不支持 | | `dapr.io/app-token-secret` | 告诉 Dapr 使用哪个 Kubernetes 密钥进行[基于令牌的应用程序身份验证]({{% ref app-api-token %}})。默认情况下，此参数未设置 |
| `--dapr-listen-addresses` | 不支持  | | `dapr.io/sidecar-listen-addresses`                       | 边车将监听的 IP 地址逗号分隔列表。在独立模式下默认为所有地址。在 Kubernetes 中默认为 `[::1],127.0.0.1`。要监听所有 IPv4 地址，使用 `0.0.0.0`。要监听所有 IPv6 地址，使用 `[::]`。|
| 不支持 | 不支持  | | `dapr.io/sidecar-cpu-limit`                       | Dapr 边车可以使用的最大 CPU 量。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。默认情况下，此参数未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-memory-limit`                    | Dapr 边车可以使用的最大内存量。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。默认情况下，此参数未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-cpu-request`                     | Dapr 边车请求的 CPU 量。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。默认情况下，此参数未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-memory-request`                  | Dapr 边车请求的内存量。请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)的有效值。默认情况下，此参数未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-delay-seconds`    | 边车容器启动后，启动存活探测之前的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-timeout-seconds`  | 边车存活探测超时后的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-period-seconds`   | 执行边车存活探测的频率（秒）。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `6`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-threshold`        | 当边车存活探测失败时，Kubernetes 将在放弃之前尝试 N 次。在这种情况下，Pod 将被标记为不健康。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多关于 `failureThreshold` 的信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-delay-seconds`   | 边车容器启动后，启动就绪探测之前的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-timeout-seconds` | 边车就绪探测超时后的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-period-seconds`  | 执行边车就绪探测的频率（秒）。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `6`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-threshold`       | 当边车就绪探测失败时，Kubernetes 将在放弃之前尝试 N 次。在这种情况下，Pod 将被标记为未就绪。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多关于 `failureThreshold` 的信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/env`                                     | 要注入到边车的环境变量列表。由 key=value 对组成的字符串，用逗号分隔。|
| 不支持 | 不支持 | | `dapr.io/env-from-secret`                         | 要从密钥注入到边车的环境变量列表。由 `"key=secret-name:secret-key"` 对组成的字符串，用逗号分隔。 |
| 不支持 | 不支持 | | `dapr.io/volume-mounts` | 要以只读模式[挂载到边车容器的 pod 卷]({{% ref "kubernetes-volume-mounts" %}})列表。由 `volume:path` 对组成的字符串，用逗号分隔。例如，`"volume-1:/tmp/mount1,volume-2:/home/root/mount2"`。 |
| 不支持 | 不支持 | | `dapr.io/volume-mounts-rw` | 要以读写模式[挂载到边车容器的 pod 卷]({{% ref "kubernetes-volume-mounts" %}})列表。由 `volume:path` 对组成的字符串，用逗号分隔。例如，`"volume-1:/tmp/mount1,volume-2:/home/root/mount2"`。 |
| `--disable-builtin-k8s-secret-store` | 不支持 | | `dapr.io/disable-builtin-k8s-secret-store` | 禁用内置 Kubernetes 密钥存储。默认值为 false。有关详细信息，请参阅 [Kubernetes 密钥存储组件]({{% ref "kubernetes-secret-store.md" %}})。 |
| `--disable-init-endpoints` | `--disable-init-endpoints` | | `dapr.io/disable-init-endpoints` | 要禁用的初始化端点的逗号分隔列表。支持的值为 `config`（禁用 `/dapr/config`）和 `subscribe`（禁用 `/dapr/subscribe`）。例如：`"config,subscribe"`。默认情况下，此参数未设置。 |
| 不支持 | 不支持 | | `dapr.io/sidecar-seccomp-profile-type` | 将边车容器的 `securityContext.seccompProfile.type` 设置为 `Unconfined`、`RuntimeDefault` 或 `Localhost`。默认情况下，此注解未在 Dapr 边车上设置，因此该字段从边车容器中省略。 |
| 不支持 | 不支持 | | `dapr.io/sidecar-svc-annotations` | 要应用于 operator 管理的 `-dapr` 边车服务的自定义注解。由 `key=value` 对组成的字符串，用逗号分隔。请参阅[此处]({{% ref "sidecar-service-annotations.md" %}})了解更多信息。 |
| 不支持 | 不支持 | | `dapr.io/enable-native-sidecar` | 设置为 `"true"` 时，将 daprd 作为 Kubernetes 原生边车注入（带有 `restartPolicy: Always` 的 init 容器，[KEP-753](https://github.com/kubernetes/enhancements/issues/753)）。覆盖全局 `dapr_sidecar_injector.nativeSidecar` Helm 设置。需要 Kubernetes 1.28+。默认未设置（继承全局 Helm 值）。 |
