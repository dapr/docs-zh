---
type: docs
title: "daprd、CLI 和 Kubernetes 的 Dapr 参数与注解"
linkTitle: "参数与注解"
description: "在不同环境中配置 Dapr 时可用的参数和注解"
weight: 300
aliases:
  - "/zh-hans/operations/hosting/kubernetes/kubernetes-annotations/"
---

此表旨在帮助用户了解在不同上下文中运行 Dapr sidecar 时的等效选项：直接通过 [CLI]({{% ref cli-overview.md %}})、通过 daprd，或通过注解在 [Kubernetes]({{% ref kubernetes-overview.md %}}) 上运行。

| daprd | Dapr CLI | CLI 简写 | Kubernetes 注解 | 描述|
|----- | ------- | -----------| ----------| ------------ |
| `--allowed-origins`  | 不支持 |  | 不支持 | 允许的 HTTP 源（默认为 “*”）|
| `--app-id` | `--app-id` | `-i` | `dapr.io/app-id`  | 应用程序的唯一 ID。用于服务发现、状态封装和 pub/sub 消费者 ID |
| `--app-port` | `--app-port` | `-p` | `dapr.io/app-port` | 此参数告诉 Dapr 你的应用程序正在监听的端口 |
| `--components-path`  | `--components-path` | `-d` | 不支持 | **已弃用**，请改用 `--resources-path` |
| `--resources-path`  | `--resources-path` | `-d` | 不支持 | component 目录的路径。如果为空，则不会加载 component |
| `--config`  | `--config` | `-c` | `dapr.io/config` | 告诉 Dapr 使用哪个配置资源 |
| `--control-plane-address` | 不支持 | | 不支持 | Dapr control plane 的地址 |
| `--dapr-grpc-port` | `--dapr-grpc-port` | | `dapr.io/grpc-port` | 设置 Dapr API gRPC 端口（默认 `50001`）；所有集群服务必须使用相同的端口进行通信 |
| `--dapr-http-port` | `--dapr-http-port` | | 不支持 | Dapr API 监听的 HTTP 端口（默认 `3500`） |
| `--dapr-http-max-request-size` | `--dapr-http-max-request-size` | | `dapr.io/http-max-request-size` | **已弃用**，请改用 `--max-body-size`。增大请求最大 body 大小，以处理使用 http 和 grpc 协议的大文件上传。默认为 `4` MB |
| `--max-body-size` | 不支持 | | `dapr.io/max-body-size` |  HTTP/gRPC 请求和响应 body 的最大大小。适用于发送到 Dapr sidecar 的传入请求、Actor 操作以及 binding component 的响应。适用于处理大文件的上传和下载。使用大小单位设置该值（例如，`16Mi` 表示 16MB）。默认为 `4Mi`。注意：binding component 响应的大小限制在 Dapr v1.16.3 中添加。 |
| `--dapr-http-read-buffer-size` | `--dapr-http-read-buffer-size` | | `dapr.io/http-read-buffer-size` | **已弃用**，请改用 `--read-buffer-size`。增大 HTTP 头读取缓冲区的最大大小（以 KB 为单位），以支持更大的头值，例如 `16` 支持最大 16KB 的头。默认为 `16`，即 16KB |
| `--read-buffer-size` | 不支持 | | `dapr.io/read-buffer-size` | 增大 HTTP 头读取缓冲区的最大大小（以 KB 为单位），以支持更大的头值。使用大小单位设置该值，例如 `32Ki` 将支持最大 32KB 的头。默认为 `4Ki`，即 4KB |
| 不支持 | `--image` | | `dapr.io/sidecar-image` | Dapr sidecar 镜像。默认为 daprio/daprd:latest。Dapr sidecar 使用此镜像而不是最新的默认镜像。在构建自己的 Dapr 自定义镜像和/或[使用替代的稳定 Dapr 镜像]({{% ref "support-release-policy.md#build-variations" %}})时使用此参数 |
| `--internal-grpc-port` | 不支持 | | `dapr.io/internal-grpc-port` | 设置内部 Dapr gRPC 端口（默认 `50002`）；所有集群服务必须使用相同的端口进行通信 |
| `--enable-metrics` | 不支持 | | `dapr.io/enable-metrics` | 启用 [Prometheus 指标]({{% ref prometheus %}})导出器（默认为 true）。将其设置为 `false` 会关闭指标端口，但不会阻止 Dapr sidecar 记录指标。要停止记录，请在[配置资源]({{% ref "metrics-overview.md#configuring-metrics-using-application-configuration" %}})中设置 `spec.metrics.enabled: false` |
| `--enable-mtls` | 不支持 | | configuration spec | 为 daprd 到 daprd 的通信通道启用自动 mTLS |
| `--enable-profiling` | `--enable-profiling` | | `dapr.io/enable-profiling` | [启用性能分析]({{% ref profiling-debugging %}}) |
| `--unix-domain-socket` | `--unix-domain-socket` | `-u` | `dapr.io/unix-domain-socket-path`  | 套接字文件的父目录。在 Linux 上，与 Dapr sidecar 通信时，相比 TCP 端口，使用 Unix 域套接字可获得更低的延迟和更高的吞吐量。不适用于 Windows 操作系统。 |
| `--log-as-json` | 不支持 | | `dapr.io/log-as-json` | 将此参数设置为 `true` 时，会输出 [JSON 格式的日志]({{% ref logs %}})。默认为 `false` |
| `--log-level` | `--log-level` | | `dapr.io/log-level` | 设置 Dapr sidecar 的[日志级别]({{% ref logs-troubleshooting %}})。允许的值为 `debug`、`info`、`warn`、`error`。默认为 `info` |
| `--enable-api-logging` | `--enable-api-logging` | | `dapr.io/enable-api-logging` | 为 Dapr sidecar [启用 API 日志]({{% ref "api-logs-troubleshooting.md#configuring-api-logging-in-kubernetes" %}}) |
| `--app-max-concurrency` | `--app-max-concurrency` | | `dapr.io/app-max-concurrency` | 限制[应用程序的并发数]({{% ref "control-concurrency.md#setting-app-max-concurrency" %}})。有效值为大于 `0` 的任意数字。默认值：`-1`，表示不施加并发限制。 |
| `--metrics-port` | `--metrics-port` | | `dapr.io/metrics-port` | 设置 sidecar 指标服务器的端口。默认为 `9090` |
| `--mode` | 不支持 | | 不支持 | Dapr 的运行时托管模式选项，可选 `"standalone"` 或 `"kubernetes"`（默认为 `"standalone"`）。[了解更多。]({{% ref hosting %}}) |
| `--placement-host-address` | `--placement-host-address` | | `dapr.io/placement-host-address` | Dapr Actor placement 服务器地址的逗号分隔列表。<br><br>未设置注解时，默认值由 sidecar injector 设置。<br><br>当注解已设置且值为单个空格（`' '`）或“empty”时，sidecar 不会连接 Placement 服务器。当 sidecar 中没有运行 Actor 时，可以使用此设置。<br><br>当注解已设置且值不为空时，sidecar 会连接到配置的地址。例如：`127.0.0.1:50057,127.0.0.1:50058` |
| `--scheduler-host-address` | `--scheduler-host-address` | | `dapr.io/scheduler-host-address` | Dapr Scheduler 服务器地址的逗号分隔列表。<br><br>未设置注解时，默认值由 sidecar injector 设置。<br><br>当注解已设置且值为单个空格（`' '`）或“empty”时，sidecar 不会连接 Scheduler 服务器。<br><br>当注解已设置且值不为空时，sidecar 会连接到配置的地址。例如：`127.0.0.1:50055,127.0.0.1:50056` |
| `--actors-service` | 不支持 | | 不支持 | 提供 actor placement 信息的服务的配置。格式为 `<name>:<address>`。例如，将此值设置为 `placement:127.0.0.1:50057,127.0.0.1:50058` 可替代使用 `--placement-host-address` 参数。 |
| `--actors-disseminate-timeout` | 不支持 | | `dapr.io/actors-disseminate-timeout` | daprd 端 actor placement dissemination 轮次的超时时间（默认为 `30s`）。如果某一轮超过此超时时间，daprd 会重置其 placement 流并停止其托管的 Actor。该值应大于 Placement 服务的 `--disseminate-timeout`（默认为 `8s`） |
| `--actors-placement-startup-timeout` | 不支持 | | `dapr.io/actors-placement-startup-timeout` | sidecar 在启动时等待 [Scheduler 通告 actor placement]({{% ref "scheduler.md#serving-actor-placement" %}}) 的时长，超时后将回退到已配置的 Placement 服务（默认为 `30s`）。必须为正值。请将其设置得高于应用程序的 health probe 预算，因为 Scheduler 只有在 sidecar 的 jobs stream 注册之后才会通告 placement。从 Dapr 1.19 起可用 |
| `--reminders-service` | 不支持 | | 不支持 | 用于启用 Actor reminder 的服务的配置。格式为 `<name>[:<address>]`。目前唯一支持的值为 `"default"`（也是默认值），它使用 Dapr sidecar 中内置的 reminders 子系统。 |
| `--profiling-port` | `--profiling-port` | | 不支持 | 性能分析服务器的端口（默认为 `7777`） |
| `--app-protocol` | `--app-protocol` | `-P` | `dapr.io/app-protocol` | 配置 Dapr 与应用程序通信所使用的协议。有效选项为 `http`、`grpc`、`https`（带 TLS 的 HTTP）、`grpcs`（带 TLS 的 gRPC）、`h2c`（HTTP/2 明文）。注意，Dapr 不会验证应用程序出示的 TLS 证书。默认为 `http` |
| `--enable-app-health-check` | `--enable-app-health-check` | | `dapr.io/enable-app-health-check` | 布尔值，用于启用[应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `false`。  |
| `--app-health-check-path` | `--app-health-check-path` | | `dapr.io/app-health-check-path` | 当应用程序通道为 HTTP 时，Dapr 在执行 health probe 时调用的路径（如果应用程序通道使用 gRPC，则忽略此值）。需要启用[应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `/healthz`。 |
| `--app-health-probe-interval` | `--app-health-probe-interval` | | `dapr.io/app-health-probe-interval` | 每次 health probe 之间的秒数。需要启用[应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `5` |
| `--app-health-probe-timeout` | `--app-health-probe-timeout` | | `dapr.io/app-health-probe-timeout` | health probe 请求的超时时间（毫秒）。需要启用[应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `500` |
| `--app-health-threshold` | `--app-health-threshold` | | `dapr.io/app-health-threshold"` | 应用程序被视为不健康之前允许的最大连续失败次数。需要启用[应用健康检查]({{% ref "app-health.md#configuring-app-health-checks" %}})。默认为 `3` |
| `--app-binding-options-timeout` | 不支持 | | `dapr.io/app-binding-options-timeout` | Dapr 在启动时发送给应用程序的 input binding 订阅发现请求（HTTP `OPTIONS` 请求或 gRPC `ListInputBindings` 调用）的超时时间。接受 [Go duration](https://pkg.go.dev/time#ParseDuration) 格式的字符串。对于启动较慢的应用程序（例如 JVM/JIT 工作负载），请增大此值。默认为 `3s` |
| `--sentry-address` | `--sentry-address` | | 不支持 | [Sentry CA 服务]({{% ref sentry %}})的地址 |
| `--version` | `--version` | `-v` | 不支持 | 打印运行时版本 |
| `--dapr-graceful-shutdown-seconds` | 不支持 | | `dapr.io/graceful-shutdown-seconds` | Dapr 优雅关闭的时长（秒），即等待所有进行中的请求完成时，强制关闭前的最长时间。默认为 `5`。如果在 Kubernetes 模式下运行，此值不应大于 Kubernetes 的终止宽限期，后者的默认值为 `30`。|
| `--dapr-block-shutdown-duration` | 不支持 | | `dapr.io/block-shutdown-duration` | 阻塞关闭时长。如果设置，将阻塞上述优雅关闭流程的开始，直到给定的时长过去，或应用程序根据应用程序健康选项的配置变为不健康。这适用于需要在自身终止过程中调用 Dapr API 的应用程序。区块到期后，应用程序将无法再发起任何新的 Dapr API 调用。接受 [Go duration](https://pkg.go.dev/time#ParseDuration) 格式的字符串。 |
| 不支持 | 不支持 | | `dapr.io/enabled` | 将此参数设置为 true 时，会将 Dapr sidecar 注入到 Pod 中 |
| 不支持 | 不支持 | | `dapr.io/api-token-secret` | 告诉 Dapr 使用哪个 Kubernetes secret 进行[基于令牌的 API 认证]({{% ref api-token %}})。默认未设置 |
| 不支持 | 不支持 | | `dapr.io/app-token-secret` | 告诉 Dapr 使用哪个 Kubernetes secret 进行[基于令牌的应用程序认证]({{% ref app-api-token %}})。默认未设置 |
| `--dapr-listen-addresses` | 不支持  | | `dapr.io/sidecar-listen-addresses`                       | sidecar 将监听的 IP 地址的逗号分隔列表。在独立模式下默认为所有地址。在 Kubernetes 中默认为 `[::1],127.0.0.1`。要监听所有 IPv4 地址，请使用 `0.0.0.0`。要监听所有 IPv6 地址，请使用 `[::]`。|
| 不支持 | 不支持  | | `dapr.io/sidecar-cpu-limit`                       | Dapr sidecar 可使用的最大 CPU 量。有效值请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)。默认未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-memory-limit`                    | Dapr sidecar 可使用的最大内存量。有效值请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)。默认未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-cpu-request`                     | Dapr sidecar 请求的 CPU 量。有效值请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)。默认未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-memory-request`                  | Dapr sidecar 请求的内存量。有效值请参阅[此处](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/quota-memory-cpu-namespace/)。默认未设置|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-delay-seconds`    | sidecar 容器启动后，开始存活探测前等待的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `180`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-timeout-seconds`  | sidecar 存活探测超时之前的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `3`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-period-seconds`   | 执行 sidecar 存活探测的频率（秒）。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `10`|
| 不支持 | 不支持 | | `dapr.io/sidecar-liveness-probe-threshold`        | 当 sidecar 存活探测失败时，Kubernetes 会在放弃之前尝试 N 次。在这种情况下，Pod 将被标记为不健康。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解有关 `failureThreshold` 的更多信息。默认为 `5`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-delay-seconds`   | sidecar 容器启动后，开始就绪探测前等待的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `1`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-timeout-seconds` | sidecar 就绪探测超时之前的秒数。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `1`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-period-seconds`  | 执行 sidecar 就绪探测的频率（秒）。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解更多信息。默认为 `1`|
| 不支持 | 不支持 | | `dapr.io/sidecar-readiness-probe-threshold`       | 当 sidecar 就绪探测失败时，Kubernetes 会在放弃之前尝试 N 次。在这种情况下，Pod 将被标记为未就绪。请参阅[此处](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes)了解有关 `failureThreshold` 的更多信息。默认为 `5`|
| 不支持 | 不支持 | | `dapr.io/env`                                     | 要注入到 sidecar 中的环境变量列表。由 key=value 对组成的字符串，以逗号分隔。|
| 不支持 | 不支持 | | `dapr.io/env-from-secret`                         | 要从 secret 注入到 sidecar 中的环境变量列表。由 `"key=secret-name:secret-key"` 对组成的字符串，以逗号分隔。 |
| 不支持 | 不支持 | | `dapr.io/volume-mounts` | 要以只读模式[挂载到 sidecar 容器的 Pod 卷]({{% ref "kubernetes-volume-mounts" %}})列表。由 `volume:path` 对组成的字符串，以逗号分隔。例如，`"volume-1:/tmp/mount1,volume-2:/home/root/mount2"`。 |
| 不支持 | 不支持 | | `dapr.io/volume-mounts-rw` | 要以读写模式[挂载到 sidecar 容器的 Pod 卷]({{% ref "kubernetes-volume-mounts" %}})列表。由 `volume:path` 对组成的字符串，以逗号分隔。例如，`"volume-1:/tmp/mount1,volume-2:/home/root/mount2"`。 |
| `--disable-builtin-k8s-secret-store` | 不支持 | | `dapr.io/disable-builtin-k8s-secret-store` | 禁用内置 Kubernetes secret store。默认值为 false。有关详细信息，请参阅 [Kubernetes secret store 组件]({{% ref "kubernetes-secret-store.md" %}})。 |
| `--disable-init-endpoints` | `--disable-init-endpoints` | | `dapr.io/disable-init-endpoints` | 要禁用的初始化端点的逗号分隔列表。支持的值为 `config`（禁用 `/dapr/config`）和 `subscribe`（禁用 `/dapr/subscribe`）。例如：`"config,subscribe"`。默认未设置。 |
| 不支持 | 不支持 | | `dapr.io/sidecar-seccomp-profile-type` | 将 sidecar 容器的 `securityContext.seccompProfile.type` 设置为 `Unconfined`、`RuntimeDefault` 或 `Localhost`。默认情况下，此注解不会在 Dapr sidecar 上设置，因此该字段将从 sidecar 容器中省略。 |
| 不支持 | 不支持 | | `dapr.io/sidecar-svc-annotations` | 要应用于由 operator 管理的 `-dapr` sidecar 服务的自定义注解。由 `key=value` 对组成的字符串，以逗号分隔。请参阅[此处]({{% ref "sidecar-service-annotations.md" %}})了解更多信息。 |
| 不支持 | 不支持 | | `dapr.io/enable-native-sidecar` | 设置为 `"true"` 时，会将 daprd 注入为 Kubernetes 原生 sidecar（带有 `restartPolicy: Always` 的 init 容器，[KEP-753](https://github.com/kubernetes/enhancements/issues/753)）。覆盖全局 `dapr_sidecar_injector.nativeSidecar` Helm 设置。需要 Kubernetes 1.28+。默认未设置（继承全局 Helm 值）。 |
