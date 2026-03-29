---
type: docs
title: "Dapr Scheduler 控制平面服务概述"
linkTitle: "Scheduler"
description: "Dapr scheduler 服务概述"
---

Dapr Scheduler 服务用于调度不同类型的作业，可在[自托管模式]({{% ref self-hosted %}})或 [Kubernetes]({{% ref kubernetes %}})上运行。
- 通过 Jobs API 创建的作业
- Actor reminder 作业（由 actor reminders 使用）
- 由 Workflow API 创建的 actor reminder 作业（使用 actor reminders）

不存在主 Scheduler 实例的概念。
所有 Scheduler 服务副本均被视为对等节点。
所有副本都会接收待调度的作业，并在可用的 Scheduler 服务副本之间进行分配，以实现触发事件的负载均衡。

下图展示了从应用程序调用时，如何通过 Jobs API 使用 Scheduler 服务。Scheduler 服务跟踪的所有作业都存储在 Etcd 数据库中。

<img src="/images/scheduler/scheduler-architecture.png" alt="显示 Scheduler 控制平面服务和 Jobs API 的架构图">

默认情况下，Etcd 内嵌于 Scheduler 服务中，这意味着 Scheduler 服务会运行其自己的 Etcd 实例。
有关如何配置 Scheduler 服务的更多信息，请参阅 [Scheduler 服务标志]({{% ref "#flag-tuning" %}})。

## 作业位置性

### 默认作业行为

当 Scheduler 服务触发作业时，它们会被发送回调度该作业的同一应用 ID 的单个副本，以随机负载均衡的方式进行。
这会在应用程序的副本之间提供基本的负载均衡，适用于大多数不需要严格位置性的用例。

### 使用 Actor Reminders 实现完全位置性

对于需要完全作业位置性（让作业在创建它们的同一主机上触发）的用户，actor reminders 提供了一种解决方案。
要为作业强制执行完全位置性：

1. 创建一个 actor 类型，其中包含一个特定副本独有的随机 UUID
2. 使用此 actor 类型创建一个 actor reminder

这种方法确保作业始终在创建它的同一主机上触发，而不是在副本之间随机分布。

## 作业触发

### 作业失败策略和暂存队列

当 Scheduler 服务触发作业时遇到客户端错误，默认情况下会以 1 秒间隔重试，最多重试 3 次。

对于非客户端错误，例如，在触发时无法将作业发送到可用的 Dapr 边车，它会被放置在 Scheduler 服务内的暂存队列中。作业会保留在此队列中，直到找到合适的边车实例，此时它们会自动发送到相应的 Dapr 边车实例。

## 自托管模式

Scheduler 服务 Docker 容器作为 `dapr init` 的一部分自动启动。如果您在 [slim-init 模式]({{% ref self-hosted-no-docker %}})下运行，也可以作为进程手动运行。

在自托管部署中，Scheduler 可以在高可用（HA）和非 HA 模式下运行。但是，不建议在生产环境中使用非 HA 模式。如果在非 HA 和 HA 模式之间切换，必须删除现有的数据目录，这会导致作业和 actor reminders 丢失。在进行此更改之前，请[运行备份]({{% ref "#back-up-and-restore-scheduler-data" %}}) 以避免数据丢失。

## Kubernetes 模式

Scheduler 服务作为 `dapr init -k` 的一部分或通过 Dapr Helm charts 部署。在 Kubernetes 部署中，Scheduler 始终以高可用（HA）模式运行。由于内嵌数据存储的性质，无法在不造成数据丢失的情况下扩展或缩减 Scheduler 服务副本。[了解有关在 Kubernetes 服务中设置 HA 模式的更多信息。]({{% ref "kubernetes-production#individual-service-ha-helm-configuration" %}})

当删除 Kubernetes 命名空间时，与该命名空间对应的所有 Job 和 Actor Reminders 也会被删除。

## Docker Compose 示例

以下是在 Docker Compose 配置中为独立模式暴露 etcd 端口的方法。
在 HA 模式下运行时，只需暴露一个 scheduler 实例的端口以执行备份操作。

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

## 使用 Dapr CLI 管理作业

Dapr 提供了一个 CLI 用于检查和管理所有调度的作业，无论类型如何。
CLI 是查看、备份和删除作业的推荐方式。

Scheduler 管理着几种不同类型的作业：

- `app/{app-id}/{job-name}`：通过 [Jobs API]({{% ref jobs_api %}}) 创建的作业
- `actor/{actor-type}/{actor-id}/{reminder-name}`：通过 [Actor Reminders API]({{% ref "actors-timers-reminders#actor-reminders" %}}) 创建的 actor reminder 作业
- `activity/{app-id}/{instance-id}::{generation-name}::{activity-index}`：用于 [Workflow Activity reminders]({{% ref "workflow-features-concepts.md#workflow-activities" %}}) 内部
- `workflow/{app-id}/{instance-id}/{random-name}`：用于 [工作流]({{% ref "workflow-overview.md" %}}) 内部。

请参阅[此处了解如何使用 CLI 专门管理 reminders]({{% ref "actors-timers-reminders#managing-reminders-with-the-cli" %}})。

### 列出作业

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
activity/test-scheduler/xyz1::0::1             -888.8ms  0
activity/test-scheduler/xyz2::0::1             -888.8ms  0
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
default    activity/test-scheduler/xyz1::0::1             2025-10-03T16:58:58Z                                         0s                                          0
default    activity/test-scheduler/xyz2::0::1             2025-10-03T16:58:58Z                                         0s                                          0
default    workflow/test-scheduler/abc1/timer-0-TVIQGkvu  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
default    workflow/test-scheduler/abc2/timer-0-OM2xqG9m  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
```

### 获取作业详细信息

```bash
dapr scheduler get app/my-app/job1 -o yaml
```

### 删除作业

删除一个或多个特定作业：

```bash
dapr scheduler delete app/my-app/job1 actor/MyActor/123/reminder1
```

使用过滤器批量删除作业：

```bash
dapr scheduler delete-all all
dapr scheduler delete-all app/my-app
dapr scheduler delete-all actor/MyActorType
```

### 备份和恢复作业

在生产环境中，建议定期备份此数据，备份间隔应与您的恢复点目标保持一致。
Dapr CLI 提供了一个命令，用于将所有 Scheduler 数据导出到特定的二进制文件。
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

转发 Scheduler 实例的端口并使用以下命令查看 etcd 的指标：

```shell
curl -s http://localhost:2379/metrics
```

通过[根据需要审查和配置 Scheduler 的 etcd 标志](https://github.com/dapr/dapr/blob/master/charts/dapr/README#dapr-scheduler-options)来微调内嵌的 etcd 以满足您的需求。

## 禁用 Scheduler 服务

如果您未使用任何需要 Scheduler 服务的功能（Jobs API、Actor Reminders 或 Workflows），可以通过设置 `global.scheduler.enabled=false` 来禁用它。
有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 标志调优

Scheduler 上暴露了许多 Etcd 标志，可用于针对您的部署用例进行调优。

### 外部 Etcd 数据库

可以将 Scheduler 配置为使用外部 Etcd 数据库，而不是 Scheduler 服务副本内部内嵌的数据库。
由于集群或环境的管理局以及所使用的存储后端，将存储卷与 Scheduler StatefulSet 或容器解耦可能是很有意义的。
也可能完全将持久存储移出 scheduler 运行时，或者有一些现有的 Etcd 集群提供者将被重用。
外部化 Etcd 数据库也意味着 Scheduler 副本可以随意水平扩展，但请注意，在扩展事件期间，作业触发将会暂停。
Scheduler 副本计数不需要与 [Etcd 节点计数约束](https://etcd.io/docs/v3.3/faq/#what-is-maximum-cluster-size) 匹配。

要使用外部 Etcd 集群，请将 `--etcd-embed` 标志设置为 `false`，并提供 `--etcd-client-endpoints` 标志以及您的 Etcd 集群的端点。
如果 Etcd 集群需要身份验证，还可以选择包括 `--etcd-client-username` 和 `--etcd-client-password` 标志。

```
--etcd-embed              bool         启用时，Etcd 数据库内嵌于 scheduler 服务器中。如果为 false，scheduler 使用 --etcd-client-endpoints 标志连接到外部 Etcd 集群。（默认为 true）
--etcd-client-endpoints   stringArray  要连接的 etcd 客户端端点的逗号分隔列表。仅在 --etcd-embed 为 false 时使用。
--etcd-client-username    string       etcd 客户端身份验证的用户名。仅在 --etcd-embed 为 false 时使用。
--etcd-client-password    string       etcd 客户端身份验证的密码。仅在 --etcd-embed 为 false 时使用。
```

Helm：

```yaml
dapr_scheduler.etcdEmbed=true
dapr_scheduler.etcdClientEndpoints=[]
dapr_scheduler.etcdClientUsername=""
dapr_scheduler.etcdClientPassword=""
```

### Etcd 领导者选举调优

为了在故障发生时提高救援节点的领导者选举速度，可以使用以下标志来加快选举过程。

```
--etcd-initial-election-tick-advance  是否在启动时快进初始选举 ticks 以加快选举。当它为 true 时，本地成员快进选举 ticks 以加速"初始"领导者选举触发。这有利于更大的选举 ticks 的情况。禁用此功能会减慢跨数据中心部署的初始引导过程。通过配置此标志，以缓慢的初始引导为代价来权衡。
```

Helm：

```yaml
dapr_scheduler.etcdInitialElectionTickAdvance=true
```

### 存储调优

以下选项可用于根据您的部署需求调优内嵌的 Etcd 存储。
可以在 [Etcd 文档](https://etcd.io/docs/v3.5/op-guide/configuration/)中找到有关这些标志作用的更深入理解。

{{% alert title="注意" color="primary" %}}
更改这些标志会极大地改变 Scheduler 的性能和行为，因此在从 Dapr 设置的默认值修改它们时需要谨慎。
更改这些设置应始终先在测试环境中进行，并在应用于生产环境之前进行密切监控。
{{% /alert %}}

```
--etcd-backend-batch-interval string                            提交后端事务之前的最大时间。（默认 "50ms"）
--etcd-backend-batch-limit int                                  提交后端事务之前的最大操作数。（默认 5000）
--etcd-compaction-mode string                                   etcd 的压缩模式。可以是 'periodic' 或 'revision'（默认 "periodic"）
--etcd-compaction-retention string                              etcd 的压缩保留。可以表示时间或修订数，取决于 'etcd-compaction-mode' 的值（默认 "10m"）
--etcd-experimental-bootstrap-defrag-threshold-megabytes uint   etcd 在引导期间考虑运行碎片整理所需释放的最小兆字节数。需要设置为非零值才能生效。（默认 100）
--etcd-max-snapshots uint                                       要保留的快照文件的最大数量（0 为无限制）。（默认 10）
--etcd-max-wals uint                                            要保留的预写日志的最大数量（0 为无限制）。（默认 10）
--etcd-snapshot-count uint                                      触发快照到磁盘的已提交事务数。（默认 10000）
```

Helm：

```yaml
dapr_scheduler.etcdBackendBatchInterval="50ms"
dapr_scheduler.etcdBackendBatchLimit=5000
dapr_scheduler.etcdCompactionMode="periodic"
dapr_scheduler.etcdCompactionRetention="10m"
dapr_scheduler.etcdDefragThresholdMB=100
dapr_scheduler.etcdMaxSnapshots=10
```

## 相关链接

- [了解有关 Jobs API 的更多信息。]({{% ref jobs_api %}})
- [了解有关 Actor Reminders 的更多信息。]{{% ref "actors-features-concepts#reminders" %}})
