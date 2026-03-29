---
type: docs
title: "Dapr Scheduler 控制平面服务概述"
linkTitle: "Scheduler"
description: "Dapr Scheduler 服务概述"
---

Dapr Scheduler 服务用于调度不同类型的作业，支持在[自托管模式]({{% ref self-hosted %}})或 [Kubernetes]({{% ref kubernetes %}})上运行。
- 通过 Jobs API 创建的作业
- Actor reminder 作业（供 actor reminders 使用）
- 由 Workflow API 创建的 Actor reminder 作业（使用 actor reminders）

Scheduler 实例之间没有 leader 概念。
所有 Scheduler 服务副本被视为对等节点。
所有副本都会接收待调度的作业，并将作业分配给可用的 Scheduler 服务副本，以实现触发事件的负载均衡。

下图展示了当应用程序调用时，Scheduler 服务如何通过 Jobs API 被使用。所有由 Scheduler 服务跟踪的作业都存储在 Etcd 数据库中。

<img src="/images/scheduler/scheduler-architecture.png" alt="展示 Scheduler 控制平面服务和 Jobs API 的架构图">

默认情况下，Etcd 内嵌在 Scheduler 服务中，这意味着 Scheduler 服务运行着自己的 Etcd 实例。
有关如何配置 Scheduler 服务的更多信息，请参阅 [Scheduler 服务参数]({{% ref "#flag-tuning" %}})。

## 作业本地性

### 默认作业行为

当 Scheduler 服务触发作业时，会以随机负载均衡的方式将作业发送回为调度该作业的同一 app ID 服务的单个副本。
这为应用程序副本提供了基本的负载均衡，适用于大多数不需要严格本地性的场景。

### 使用 Actor Reminders 实现完美本地性

对于需要完美作业本地性（作业在创建它的同一台主机上触发）的用户，actor reminders 提供了一种解决方案。
要为作业强制实现完美本地性：

1. 创建一个具有随机 UUID 的 actor 类型，该 UUID 对于特定副本是唯一的
2. 使用此 actor 类型创建 actor reminder

此方法可确保作业始终在创建它的同一台主机上触发，而不会在副本之间随机分布。

## 作业触发

### 作业失败策略和暂存队列

当 Scheduler 服务触发作业并遇到客户端错误时，默认情况下会以 1 秒的间隔重试该作业，最多重试 3 次。

对于非客户端错误，例如当作业在触发时无法发送到可用的 Dapr 边车时，它会被放入 Scheduler 服务内的暂存队列中。作业会保留在此队列中，直到有合适的边车实例可用，届时它们会自动发送到相应的 Dapr 边车实例。

## 自托管模式

Scheduler 服务 Docker 容器作为 `dapr init` 的一部分自动启动。如果以 [slim-init 模式]({{% ref self-hosted-no-docker %}})运行，也可以手动作为进程运行。

在自托管部署中，Scheduler 可以同时以高可用性（HA）和非 HA 模式运行。但是，不建议将非 HA 模式用于生产环境。如果在非 HA 和 HA 模式之间切换，必须删除现有的数据目录，这会导致作业和 actor reminders 丢失。在进行此更改之前[执行备份]({{% ref "#back-up-and-restore-scheduler-data" %}})以避免数据丢失。

## Kubernetes 模式

Scheduler 服务作为 `dapr init -k` 的一部分或通过 Dapr Helm charts 部署。在 Kubernetes 部署中，Scheduler 始终以高可用性（HA）模式运行。由于内嵌数据存储的特性，增加或减少 Scheduler 服务副本数量都会导致数据丢失。[了解更多关于在 Kubernetes 服务中设置 HA 模式的信息。]({{% ref "kubernetes-production#individual-service-ha-helm-configuration" %}})。

删除 Kubernetes 命名空间时，该命名空间对应的所有 Job 和 Actor Reminders 也将被删除。

## Docker Compose 示例

以下是如何在 Docker Compose 配置中为独立模式暴露 etcd 端口。
在 HA 模式下运行时，只需为一个 scheduler 实例暴露端口即可执行备份操作。

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

Dapr 提供了 CLI 用于检查和管理所有调度的作业，无论其类型如何。
CLI 是查看、备份和删除作业的推荐方式。

Scheduler 管理的作业有多种不同类型：

- `app/{app-id}/{job-name}`: 通过 [Jobs API]({{% ref jobs_api %}}) 创建的作业
- `actor/{actor-type}/{actor-id}/{reminder-name}`: 通过 [Actor Reminders API]({{% ref "actors-timers-reminders#actor-reminders" %}}) 创建的 Actor reminder 作业
- `activity/{app-id}/{instance-id}::{generation-name}::{activity-index}`: 内部用于 [工作流 Activity reminders]({{% ref "workflow-features-concepts.md#workflow-activities" %}})
- `workflow/{app-id}/{instance-id}/{random-name}`: 内部用于 [工作流]({{% ref "workflow-overview.md" %}})。

有关如何使用 CLI 管理特定 reminders 的信息，请参阅[此处]({{% ref "actors-timers-reminders#managing-reminders-with-the-cli" %}})。

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

要获取更多详细信息，请使用 wide 输出格式：

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

### 获取作业详情

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

在生产环境中，建议按与恢复点目标一致的间隔定期备份此数据。
Dapr CLI 提供了将所有 Scheduler 数据导出到特定二进制文件的命令。
在 Kubernetes 模式下运行时使用 `-k` 标志。

```shell
dapr scheduler export -o scheduler-backup.bin
dapr scheduler export -k -o scheduler-backup.bin
```

从备份文件恢复数据：

```shell
dapr scheduler import -f scheduler-backup.bin
dapr scheduler import -k -f scheduler-backup.bin
```

## 监控 Scheduler 的 etcd 指标

使用以下命令对 Scheduler 实例进行端口转发并查看 etcd 的指标：

```shell
curl -s http://localhost:2379/metrics
```

通过[查看和配置 Scheduler 的 etcd 参数](https://github.com/dapr/dapr/blob/master/charts/dapr/README#dapr-scheduler-options)来微调内嵌的 etcd 以满足您的需求。

## 禁用 Scheduler 服务

如果您不使用任何需要 Scheduler 服务的功能（Jobs API、Actor Reminders 或工作流），可以通过设置 `global.scheduler.enabled=false` 来禁用它。
有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 参数调优

Scheduler 上暴露了多个 Etcd 参数，可用于根据您的部署用例进行调优。

### 外部 Etcd 数据库

可以将 Scheduler 配置为使用外部 Etcd 数据库，而不是 Scheduler 服务副本内的内嵌 Etcd。
由于集群或环境的管理方式或使用的存储后端，将存储卷与 Scheduler StatefulSet 或容器解耦可能会很有意义。
也可能完全将持久化存储移到调度器运行时之外是可取的，或者存在一些将被重用的现有 Etcd 集群提供者。
将 Etcd 数据库外部化也意味着可以随意水平扩展 Scheduler 副本，但请注意，在扩展事件期间，作业触发将暂停。
Scheduler 副本数量不需要匹配 [Etcd 节点数量约束](https://etcd.io/docs/v3.3/faq/#what-is-maximum-cluster-size)。

要使用外部 Etcd 集群，请将 `--etcd-embed` 参数设置为 `false`，并提供 `--etcd-client-endpoints` 参数以及 Etcd 集群的端点。
如果 Etcd 集群需要身份验证，还可以包含 `--etcd-client-username` 和 `--etcd-client-password` 参数。

```
--etcd-embed              bool         启用时，Etcd 数据库内嵌在 scheduler 服务器中。如果为 false，scheduler 使用 --etcd-client-endpoints 参数连接到外部 Etcd 集群。(默认 true)
--etcd-client-endpoints   stringArray  要连接的 Etcd 客户端端点列表，用逗号分隔。仅在 --etcd-embed 为 false 时使用。
--etcd-client-username    string       Etcd 客户端身份验证的用户名。仅在 --etcd-embed 为 false 时使用。
--etcd-client-password    string       Etcd 客户端身份验证的密码。仅在 --etcd-embed 为 false 时使用。
```

Helm：

```yaml
dapr_scheduler.etcdEmbed=true
dapr_scheduler.etcdClientEndpoints=[]
dapr_scheduler.etcdClientUsername=""
dapr_scheduler.etcdClientPassword=""
```

### Etcd leader 选举调优

为提高故障发生时救援节点 leader 选举的速度，可使用以下参数来加快选举过程。

```
--etcd-initial-election-tick-advance  是否在启动时快进初始选举 ticks 以加快选举速度。当为 true 时，本地成员会快进选举 ticks 以加快"初始" leader 选举触发。这对于较大的选举 ticks 有好处。禁用此功能会减慢跨数据中心部署的初始引导过程。请通过配置此参数进行自己的权衡，以换取慢速初始引导。
```

Helm：

```yaml
dapr_scheduler.etcdInitialElectionTickAdvance=true
```

### 存储调优

以下选项可用于根据部署需求调优内嵌的 Etcd 存储。
有关这些参数作用的更深入理解，请参阅 [Etcd 文档](https://etcd.io/docs/v3.5/op-guide/configuration/)。

{{% alert title="注意" color="primary" %}}
更改这些参数会极大地改变 Scheduler 的性能和行为，因此在从 Dapr 默认设置修改时要谨慎。
更改这些设置应始终首先在测试环境中进行，在应用到生产环境之前密切监控。
{{% /alert }}

```
--etcd-backend-batch-interval string                            提交后端事务前的最长时间。(默认 "50ms")
--etcd-backend-batch-limit int                                  提交后端事务前的最大操作数。(默认 5000)
--etcd-compaction-mode string                                   Etcd 的压缩模式。可以是 'periodic' 或 'revision'。(默认 "periodic")
--etcd-compaction-retention string                              Etcd 的压缩保留期。根据 'etcd-compaction-mode' 的值，可以表示时间或修订版本数。(默认 "10m")
--etcd-experimental-bootstrap-defrag-threshold-megabytes uint   需要释放的最小兆字节数，以便 Etcd 在引导期间考虑运行碎片整理。需要设置为非零值才能生效。(默认 100)
--etcd-max-snapshots uint                                       要保留的快照文件的最大数量（0 表示无限制）。(默认 10)
--etcd-max-wals uint                                           要保留的预写日志的最大数量（0 表示无限制）。(默认 10)
--etcd-snapshot-count uint                                      触发快照到磁盘的已提交事务数。(默认 10000)
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

- [了解更多关于 Jobs API 的信息。]({{% ref jobs_api %}})
- [了解更多关于 Actor Reminders 的信息。]({{% ref "actors-features-concepts#reminders" %}})
