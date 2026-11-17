---
type: docs
title: "Dapr Scheduler control plane 服务概述"
linkTitle: "Scheduler"
description: "Dapr Scheduler 服务概述"
---

Dapr Scheduler 服务用于调度不同类型的 job，可在[自托管模式]({{% ref self-hosted %}})或 [Kubernetes]({{% ref kubernetes %}})上运行。
- 通过 Jobs API 创建的 job
- Actor reminder job（由 Actor reminders 使用）
- 由 Workflow API 创建的 Actor reminder job（Workflow API 使用 Actor reminders）：workflow 的启动与唤醒 reminder、timer、activity reminder，以及在启用 [`WorkflowsFastPath` 预览功能]({{% ref "workflow-fast-path.md" %}})时，每个存活的 workflow 实例对应的一个周期性 janitor reminder

Scheduler 服务也可以替代独立的 [Placement 服务]({{% ref placement %}})提供 Actor placement。参见[提供 Actor placement](#提供-actor-placement)。

job 没有主 Scheduler 实例。
所有 Scheduler 服务副本都是对等的。
所有副本都会接收待调度的 job，并在可用的 Scheduler 服务副本之间分配 job，以实现触发事件的负载均衡。
当 Scheduler 提供 [Actor placement](#提供-actor-placement) 时，其中一个副本为 placement leader，其 `dapr_scheduler_placement_leader` 指标为 `1`。

下图展示了应用程序调用时，如何通过 jobs API 使用 Scheduler 服务。Scheduler 服务跟踪的所有 job 都存储在 Etcd 数据库中。

{{< diagram name="scheduler-architecture" width="85" >}}

默认情况下，Etcd 内嵌于 Scheduler 服务中，这意味着 Scheduler 服务会运行其自己的 Etcd 实例。
有关如何配置 Scheduler 服务的更多信息，请参阅 [Scheduler 服务标志]({{% ref "#flag-tuning" %}})。

## Job 位置性

### 默认 Job 行为

当 Scheduler 服务触发 job 时，它们会以随机负载均衡的方式被发送回调度该 job 的同一应用 ID 的单个副本。
这为应用程序的副本提供了基本的负载均衡，适用于大多数不需要严格位置性的场景。

### 使用 Actor reminders 实现完全位置性

对于需要完全 job 位置性（即 job 在创建它们的同一主机上被触发）的用户，Actor reminders 提供了一种解决方案。
要为某个 job 强制实现完全位置性：

1. 创建一个 Actor 类型，其中包含一个对该特定副本唯一的随机 UUID
2. 使用此 Actor 类型创建一个 Actor reminder

这种方法可确保该 job 始终在创建它的同一主机上被触发，而不是在副本之间随机分配。

## Job 触发

### Job 失败策略和暂存队列

当 Scheduler 服务触发 job 时遇到客户端错误，默认会以 1 秒的间隔重试该 job，最多重试 3 次。

对于非客户端错误，例如在触发时间无法将 job 发送到可用的 Dapr sidecar，该 job 会被放入 Scheduler 服务内的暂存队列中。job 会一直留在此队列中，直到出现合适的 sidecar 实例，届时会自动将其发送到相应的 Dapr sidecar 实例。

## 自托管模式

Scheduler 服务的 Docker 容器会作为 `dapr init` 的一部分自动启动。如果你在 [slim-init 模式]({{% ref self-hosted-no-docker %}})下运行，也可以将其作为进程手动运行。

在自托管部署中，Scheduler 可以以高可用（HA）模式或非 HA 模式运行。但不建议在生产环境中使用非 HA 模式。如果在非 HA 与 HA 模式之间切换，必须删除现有的数据目录，这会导致 job 和 Actor reminders 丢失。在进行此更改前，请[执行一次备份]({{% ref "#back-up-and-restore-scheduler-data" %}})，以免丢失数据。

## Kubernetes 模式

Scheduler 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。在 Kubernetes 部署中，Scheduler 始终以高可用（HA）模式运行。由于内嵌数据存储的特性，若不造成数据丢失，无法对 Scheduler 服务副本进行扩容或缩容。[了解更多有关在 Kubernetes 服务中设置 HA 模式的信息。]({{% ref "kubernetes-production#individual-service-ha-helm-configuration" %}})

删除 Kubernetes namespace 时，与该 namespace 对应的所有 job 和 Actor reminders 都会被删除。

Scheduler 需要在 Dapr control plane 所在的 namespace 中对 `pods` 具有 `get`、`list` 和 `watch` 权限，以检测是否部署了 Placement 服务。从 Dapr 1.19 开始，无论 Scheduler 是否提供 Actor placement，Helm chart 都会通过发布 namespace 中的 `dapr-scheduler-pods` Role 和 RoleBinding 授予该权限。`dapr-scheduler` ClusterRole（或在设置 `global.rbac.namespaced=true` 时为 Role）仅保留 `namespaces` 权限。如果你在 Helm chart 之外管理 control plane 的 RBAC，请在升级到 1.19 之前添加 `pods` 权限。

## Docker Compose 示例

以下示例演示如何在用于独立模式的 Docker Compose 配置中暴露 etcd 端口。
在 HA 模式下运行时，只需暴露一个 scheduler 实例的端口即可执行备份操作。

```yaml
version: "3.5"
services:
  scheduler-0:
    image: "docker.io/daprio/scheduler:{{% dapr-latest-version %}}"
    command:
    - "./scheduler"
    - "--etcd-data-dir=/var/run/dapr/scheduler"
    - "--id=scheduler-0"
    - "--etcd-initial-cluster=scheduler-0=http://scheduler-0:2380,scheduler-1=http://scheduler-1:2380,scheduler-2=http://scheduler-2:2380"
    ports:
      - 2379:2379
    volumes:
      - ./dapr_scheduler/0:/var/run/dapr/scheduler
  scheduler-1:
    image: "docker.io/daprio/scheduler:{{% dapr-latest-version %}}"
    command:
    - "./scheduler"
    - "--etcd-data-dir=/var/run/dapr/scheduler"
    - "--id=scheduler-1"
    - "--etcd-initial-cluster=scheduler-0=http://scheduler-0:2380,scheduler-1=http://scheduler-1:2380,scheduler-2=http://scheduler-2:2380"
    volumes:
      - ./dapr_scheduler/1:/var/run/dapr/scheduler
  scheduler-2:
    image: "docker.io/daprio/scheduler:{{% dapr-latest-version %}}"
    command:
    - "./scheduler"
    - "--etcd-data-dir=/var/run/dapr/scheduler"
    - "--id=scheduler-2"
    - "--etcd-initial-cluster=scheduler-0=http://scheduler-0:2380,scheduler-1=http://scheduler-1:2380,scheduler-2=http://scheduler-2:2380"
    volumes:
      - ./dapr_scheduler/2:/var/run/dapr/scheduler
```

## 使用 Dapr CLI 管理 job

Dapr 提供了一个 CLI，用于检查和管理所有已调度的 job，无论其类型如何。
CLI 是查看、备份和删除 job 的推荐方式。

Scheduler 管理着几种不同类型的 job：

- `app/{app-id}/{job-name}`：通过 [Jobs API]({{% ref jobs_api %}}) 创建的 job
- `actor/{actor-type}/{actor-id}/{reminder-name}`：通过 [Actor Reminders API]({{% ref "actors-timers-reminders#actor-reminders" %}}) 创建的 Actor reminder job
- `activity/{app-id}/{instance-id}::{task-id}::0`：内部用于 [Workflow Activity reminders]({{% ref "workflow-features-concepts.md#workflow-activities" %}})
- `workflow/{app-id}/{instance-id}/{random-name}`：内部用于 [Workflows]({{% ref "workflow-overview.md" %}})。

从 Dapr 1.19 开始，activity job 名称始终以 `::0` 结尾。早期运行时使用 workflow 实例的代次（generation）作为最后一段，例如首次运行时为 `::1`，因此更新脚本时需要相应地构造这些名称。

请参阅[此处，了解如何使用 CLI 专门管理 reminder]({{% ref "actors-timers-reminders#managing-reminders-with-the-cli" %}})。

### 列出 job

```bash
dapr scheduler list
```

示例输出：

```bash
NAME                                           BEGIN     COUNT  LAST TRIGGER
actor/myactortype/actorid1/test1               -3.89s    1      2025-10-03T16:58:55Z
actor/myactortype/actorid2/test2               -3.89s    1      2025-10-03T16:58:55Z
app/test-scheduler/test1                       -3.89s    1      2025-10-03T16:58:55Z
app/test-scheduler/test2                       -3.89s    1      2025-10-03T16:58:55Z
activity/test-scheduler/xyz1::0::0             -888.8ms  0
activity/test-scheduler/xyz2::0::0             -888.8ms  0
workflow/test-scheduler/abc1/timer-0-TVIQGkvu  +50.0h    0
workflow/test-scheduler/abc2/timer-0-OM2xqG9m  +50.0h    0
```

要获取更多详细信息，请使用宽输出格式：

```bash
dapr scheduler list -o wide
```

```yaml
NAMESPACE  NAME                                           BEGIN                 EXPIRATION            SCHEDULE         DUE TIME                   TTL     REPEATS  COUNT  LAST TRIGGER
default    actor/myactortype/actorid1/test1               2025-10-03T16:58:55Z                        @every 2h46m40s  2025-10-03T17:58:55+01:00          100      1      2025-10-03T16:58:55Z
default    actor/myactortype/actorid2/test2               2025-10-03T16:58:55Z                        @every 2h46m40s  2025-10-03T17:58:55+01:00          100      1      2025-10-03T16:58:55Z
default    app/test-scheduler/test1                       2025-10-03T16:58:55Z                        @every 100m      2025-10-03T17:58:55+01:00          1234     1      2025-10-03T16:58:55Z
default    app/test-scheduler/test2                       2025-10-03T16:58:55Z  2025-10-03T19:45:35Z  @every 100m      2025-10-03T17:58:55+01:00  10000s  56788    1      2025-10-03T16:58:55Z
default    activity/test-scheduler/xyz1::0::0             2025-10-03T16:58:58Z                                         0s                                          0
default    activity/test-scheduler/xyz2::0::0             2025-10-03T16:58:58Z                                         0s                                          0
default    workflow/test-scheduler/abc1/timer-0-TVIQGkvu  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
default    workflow/test-scheduler/abc2/timer-0-OM2xqG9m  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
```

### 获取 job 详细信息

```bash
dapr scheduler get app/my-app/job1 -o yaml
```

### 删除 job

删除一个或多个指定的 job：

```bash
dapr scheduler delete app/my-app/job1 actor/MyActor/123/reminder1
```

使用过滤器批量删除 job：

```bash
dapr scheduler delete-all all
dapr scheduler delete-all app/my-app
dapr scheduler delete-all actor/MyActorType
```

### 备份和恢复 job

在生产环境中，建议按照与恢复点目标（RPO）保持一致的间隔，定期备份这些数据。
Dapr CLI 提供了一个命令，用于将所有 Scheduler 数据导出到指定的二进制文件。
在 Kubernetes 模式下运行时，请使用 `-k` 标志。

```shell
dapr scheduler export -o scheduler-backup.bin
dapr scheduler export -k -o scheduler-backup.bin
```

要从备份文件恢复数据：

```shell
dapr scheduler import -f scheduler-backup.bin
dapr scheduler import -k -f scheduler-backup.bin
```

## 监控 Scheduler 的 etcd 指标

转发 Scheduler 实例的端口，并使用以下命令查看 etcd 的指标：

```shell
curl -s http://localhost:2379/metrics
```

根据需要[审查并配置 Scheduler 的 etcd 标志](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md#dapr-scheduler-options)，以微调内嵌的 etcd，使其满足你的需求。

## 提供 Actor placement

Scheduler 本身可以提供 Actor placement，因此无需运行独立的 Placement 服务。

在 Kubernetes 模式下，设置以下 Helm 值：

```
global.scheduler.placement.enabled=true
```

设置此值后，除非 `global.scheduler.enabled=true`、`global.actors.enabled=true` 和 `global.actors.serviceName=placement`（即默认值）同时满足，否则 Helm chart 将无法渲染。设置该值的升级会移除 Placement StatefulSet，Scheduler 会在几秒钟内接管 placement。同一次升级还会重启 Scheduler 以加载 `--placement-enabled=true`，因此在 Scheduler 再次就绪之前，请预期 Actor 与 workflow activity 会暂停。

在自托管模式下，使用 `--scheduler-placement` 标志初始化 Dapr，这会跳过 Placement 容器，并以 `--placement-enabled=true` 启动 Scheduler：

```bash
dapr init --scheduler-placement
```

Sidecar 会从控制平面公布的服务获取 Actor placement，因此应用程序无需任何自身配置，集群中始终只有一个 placement 权威。切换此设置的任一方向都无需重启 sidecar。[了解更多有关由 Scheduler 服务提供 placement 的信息。]({{% ref "placement#serving-placement-from-the-scheduler-service" %}})

要检查 sidecar 使用的是哪个服务，请在其日志中查找 `Connected to scheduler placement leader <address>`（Scheduler）或 `Connected to placement service: <address>`（Placement 服务）。在 Scheduler 上，`dapr_scheduler_placement_leader` 在 placement leader 上为 `1`，`dapr_scheduler_placement_streams_connected` 统计已连接的 sidecar placement 流数量，`dapr_scheduler_placement_incapable_sidecars` 统计版本早于 1.19 的已连接 sidecar 数量。请升级这些 sidecar：若没有 Placement 服务，它们的 Actor 与 workflow API 将会停滞。

启动时，sidecar 会最多等待 `--actors-placement-startup-timeout`（注解为 `dapr.io/actors-placement-startup-timeout`，默认值为 `30s`）让 Scheduler 公布 placement，之后回退到已配置的 Placement 服务。Scheduler 只有在 sidecar 的 jobs 流注册之后才会公布 placement，因此请将该超时设置为高于应用健康探针预算的值。

可以通过以下 Scheduler 标志调整由 Scheduler 提供的 placement 的 dissemination 行为：

```
--placement-enabled                       bool      When enabled, this scheduler serves actor placement to daprd sidecars, replacing the standalone placement service. All scheduler replicas in the cluster must set the same value. (default false)
--placement-disseminate-timeout           duration  The timeout for a placement dissemination round to daprd sidecars. Sidecars which fail to acknowledge within the timeout have their placement stream closed. (default 8s)
--placement-disseminate-coalesce-window   duration  The window in which placement membership changes are coalesced into a single dissemination round. 0 disseminates immediately. (default 0)
```

## 禁用 Scheduler 服务

如果你未使用任何需要 Scheduler 服务的功能（Jobs API、Actor reminders 或 Workflows），可以通过设置 `global.scheduler.enabled=false` 将其禁用。
当 Scheduler 正在提供 Actor placement（`global.scheduler.placement.enabled=true`）时，无法禁用 Scheduler 服务。
有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 故障行为

从 Dapr 1.19 开始，当 Scheduler 服务器因运行时错误而停止时（例如其内嵌的 Etcd 短暂不可用），Scheduler 会在 500 ms 至 10 s 的带抖动退避之后，在同一进程中重新创建服务器。在此期间，其 healthz 端点会报告未就绪，日志会显示 `Scheduler server failed, recreating in <delay>`。进程不会退出，因此统计 Scheduler Pod 重启次数的告警无法发现这种情况：请改用就绪状态或日志来判断。

端口绑定失败是例外：Scheduler 进程会退出，由 Kubernetes 重新启动它。Scheduler 端口 50006 位于 Linux 默认的临时端口范围内，因此进程自身的某个出站连接可能会占用该端口。若进程不退出，该副本将一直处于未就绪状态，直到其存活探针将其重启。使用 Chart 默认值时需要 230 s（先等待 180 s 的初始延迟，然后是 5 次间隔 10 s 的探测失败）。

## 标志调优

可以通过若干 Etcd 标志对 Scheduler 进行调优，以适应你的部署场景。

### 外部 Etcd 数据库

可以将 Scheduler 配置为使用外部 Etcd 数据库，而不是 Scheduler 服务副本内嵌的数据库。
由于集群或环境的管理方式，或所使用的存储后端，将存储卷与 Scheduler StatefulSet 或容器解耦可能会比较有意义。
也可能希望将持久化存储完全移到 scheduler 运行时之外，或者要复用某个现有的 Etcd 集群服务。
将 Etcd 数据库外部化也意味着可以随意地水平扩展 Scheduler 副本，但请注意，在扩缩容事件期间，job 触发会暂停。
Scheduler 副本数无需与 [Etcd 节点数量约束](https://etcd.io/docs/v3.3/faq/#what-is-maximum-cluster-size)保持一致。

要使用外部 Etcd 集群，请将 `--etcd-embed` 标志设置为 `false`，并通过 `--etcd-client-endpoints` 标志提供 Etcd 集群的端点。
如果 Etcd 集群需要认证，还可以选择性地加上 `--etcd-client-username` 和 `--etcd-client-password` 标志。

```
--etcd-embed              bool         When enabled, the Etcd database is embedded in the scheduler server. If false, the scheduler connects to an external Etcd cluster using the --etcd-client-endpoints flag. (default true)
--etcd-client-endpoints   stringArray  Comma-separated list of etcd client endpoints to connect to. Only used when --etcd-embed is false.
--etcd-client-username    string       Username for etcd client authentication. Only used when --etcd-embed is false.
--etcd-client-password    string       Password for etcd client authentication. Only used when --etcd-embed is false.
```

Helm：

```yaml
dapr_scheduler.etcdEmbed=true
dapr_scheduler.etcdClientEndpoints=[]
dapr_scheduler.etcdClientUsername=""
dapr_scheduler.etcdClientPassword=""
```

### Etcd 领导者选举调优

为了在发生故障时加快救援节点的领导者选举速度，可以使用以下标志来加速选举过程。

```
--etcd-initial-election-tick-advance  Whether to fast-forward initial election ticks on boot for faster election. When it is true, then local member fast-forwards election ticks to speed up “initial” leader election trigger. This benefits the case of larger election ticks. Disabling this would slow down initial bootstrap process for cross datacenter deployments. Make your own tradeoffs by configuring this flag at the cost of slow initial bootstrap.
```

Helm：

```yaml
dapr_scheduler.etcdInitialElectionTickAdvance=true
```

### 存储调优

以下选项可用于根据你的部署需求调优内嵌的 Etcd 存储。
若要更深入地了解这些标志的作用，请参阅 [Etcd 文档](https://etcd.io/docs/v3.5/op-guide/configuration/)。

{{% alert title="注意" color="primary" %}}
更改这些标志可能会极大地改变 Scheduler 的性能和行为，因此在修改 Dapr 设定的默认值时应谨慎。
更改这些设置时，应始终先在测试环境中进行，并在应用到生产环境前密切监控。
{{% /alert %}}

```
--etcd-backend-batch-interval string                            Maximum time before committing the backend transaction. (default "100ms")
--etcd-backend-batch-limit int                                  Maximum operations before committing the backend transaction. (default 10000)
--etcd-compaction-mode string                                   Compaction mode for etcd. Can be 'periodic' or 'revision' (default "revision")
--etcd-compaction-retention string                              Compaction retention for etcd. Can express time or number of revisions, depending on the value of 'etcd-compaction-mode' (default "10000")
--etcd-experimental-bootstrap-defrag-threshold-megabytes uint   Minimum number of megabytes needed to be freed for etcd to consider running defrag during bootstrap. Needs to be set to non-zero value to take effect. (default 100)
--etcd-max-snapshots uint                                       Maximum number of snapshot files to retain (0 is unlimited). (default 10)
--etcd-max-txn-ops uint                                         Maximum number of operations permitted in a single etcd transaction. (default 10000)
--etcd-max-wals uint                                            Maximum number of write-ahead logs to retain (0 is unlimited). (default 10)
--etcd-snapshot-count uint                                      Number of committed transactions to trigger a snapshot to disk. (default 100000)
```

Helm：

```yaml
dapr_scheduler.etcdBackendBatchInterval="100ms"
dapr_scheduler.etcdBackendBatchLimit=10000
dapr_scheduler.etcdCompactionMode="revision"
dapr_scheduler.etcdCompactionRetention="10000"
dapr_scheduler.etcdDefragThresholdMB=100
dapr_scheduler.etcdMaxSnapshots=10
dapr_scheduler.etcdMaxTxnOps=10000
```

从 Dapr 1.19 开始，默认压缩保留值为 `10000` 个修订版本（早期版本为 `1000000`）。每个修订版本都会保留其所写 job 的负载，因此在 workflow 负载下，旧的默认值会使数据库增长到占用数 GB 的磁盘与内存。保留参数限制的是修订版本的数量，而不是其大小。你自己设置的值会被保留，但 `helm upgrade --reuse-values` 会保留旧的 `1000000`，因此请传入新值或去掉该覆盖项。若 Scheduler 的 watch 落后超过 10,000 个修订版本（例如在写入突发期间发生领导者切换时），Etcd 会取消该 watch。随后 Scheduler 会重新读取 job 列表并重新连接，在其就绪之前，job API 调用会一直等待。

### Healthz 监听地址

```
--healthz-listen-address   string   Address the healthz server listens on. Empty (the default) listens on all interfaces.
```

设置此标志可将 Scheduler 的 healthz 端点绑定到特定网络接口，例如使其不暴露在公共网络上。截至 Dapr 1.19，它没有专用的 Helm 值。在自托管模式下，请将其直接传递给 Scheduler 二进制文件，例如在 Docker Compose 或 systemd 配置中。

## 相关链接

- [了解有关 Jobs API 的更多信息。]({{% ref jobs_api %}})
- [了解有关 Actor reminders 的更多信息。]({{% ref "actors-features-concepts#reminders" %}})
