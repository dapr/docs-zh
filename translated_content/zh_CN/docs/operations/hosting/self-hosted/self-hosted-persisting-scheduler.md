---
type: docs
title: "操作指南：持久化 Scheduler 任务"
linkTitle: "操作指南：持久化 Scheduler 任务"
weight: 50000
description: "配置 Scheduler 使其数据库持久化，使其在重启后保持弹性"
---

[Scheduler]({{% ref scheduler.md %}}) 服务负责将任务写入其 Etcd 数据库并调度它们执行。
默认情况下，Scheduler 服务数据库将此数据写入本地卷 `dapr_scheduler`，意味着**此数据在重启后会被持久化**。

此本地卷的主机文件位置通常位于 `/var/lib/docker/volumes/dapr_scheduler/_data` 或 `~/.local/share/containers/storage/volumes/dapr_scheduler/_data`，具体取决于您的容器运行时。
请注意，如果您使用 Docker Desktop，此卷位于 Docker Desktop VM 的文件系统中，可以使用以下命令访问：

```bash
docker run -it --privileged --pid=host debian nsenter -t 1 -m -u -n -i sh
```

Scheduler 持久化卷可以通过预先存在的自定义卷或由 Dapr 创建的卷来修改。

{{% alert title="注意" color="primary" %}}
默认情况下，`dapr init` 会在您的驱动器上创建一个名为 `dapr_scheduler` 的本地持久化卷。如果 Dapr 已安装，则需要完全[卸载]({{% ref dapr-uninstall.md %}})控制平面，以便使用新的持久化卷重新创建 Scheduler 容器。
{{% /alert %}}

```bash
dapr init --scheduler-volume my-scheduler-volume
```
