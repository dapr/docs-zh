---
type: docs
title: "操作指南：持久化 Scheduler 作业"
linkTitle: "操作指南：持久化 Scheduler 作业"
weight: 50000
description: "配置 Scheduler 以持久化其数据库，使其能够抵御重启"
---

[Scheduler]({{% ref scheduler.md %}}) 服务负责将作业写入其 Etcd 数据库并调度它们执行。
默认情况下，Scheduler 服务数据库内嵌 Etcd，并将数据写入大小为 `1Gb` 的持久卷声明卷，使用集群的默认[存储类](https://kubernetes.io/docs/concepts/storage/storage-classes/)。
这意味着在大多数 Kubernetes 部署上可靠运行调度器服务不需要额外的参数，但如果默认的 StorageClass 不可用或在生产环境中运行，则需要[额外的配置](#storage-class)。

{{% alert title="警告" color="warning" %}}
Scheduler 的默认存储大小为 `1Gi`，这很可能不足以满足大多数生产部署的需求。
请记住，Scheduler 用于 [Actor Reminders]({{% ref actors-timers-reminders.md %}}) 和 [工作流]({{% ref workflow-overview.md %}})，以及 [Jobs API]({{% ref jobs_api.md %}})。
您可能需要考虑重新安装 Dapr，并使用更大的 Scheduler 存储，至少 `16Gi` 或更多。
有关更多信息，请参阅下面的 [ETCD 存储磁盘大小](#etcd-storage-disk-size) 部分。
{{% /alert %}}

## 生产环境设置

### ETCD 存储磁盘大小

Scheduler 的默认存储大小为 `1Gb`。
这个大小很可能不足以满足大多数生产部署的需求。
当超过存储大小时，Scheduler 将记录类似于以下的错误：

```
error running scheduler: etcdserver: mvcc: database space exceeded
```

了解存储大小的安全上限不是一门精确的科学，并且很大程度上取决于应用程序作业的数量、持久性和数据有效负载大小。
[Job API]({{% ref jobs_api.md %}}) 和 [Actor Reminders]({{% ref actors-timers-reminders.md %}}) 透明地一对一映射到您的应用程序使用情况。
工作流作为 Actor Reminders 创建大量作业，但这些作业是短暂的——与每个工作流执行的生命周期相匹配。
由工作流创建的作业的数据有效负载通常为空或很小。

Scheduler 使用 Etcd 作为其后端存储数据库。
根据设计，Etcd 以 [预写日志（WAL）和快照](https://etcd.io/docs/v3.5/learning/persistent-storage-files/) 的形式持久化历史事务和数据。
这意味着 Scheduler 的实际磁盘使用量将高于当前可观察的数据库状态，通常是多倍。

### 在安装时设置存储大小

如果需要增加**现有** Scheduler 存储大小，请参阅下面的[增加 Scheduler 存储大小](#increase-existing-scheduler-storage-size) 部分。
要为**全新** Dapr 安装增加存储大小（在此示例中为 `16Gi`），可以使用以下命令：

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}

```bash
dapr init -k --set dapr_scheduler.cluster.storageSize=16Gi --set dapr_scheduler.etcdSpaceQuota=16Gi
```

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}

```bash
helm upgrade --install dapr dapr/dapr \
--version={{% dapr-latest-version short="true" %}} \
--namespace dapr-system \
--create-namespace \
--set dapr_scheduler.cluster.storageSize=16Gi \
--set dapr_scheduler.etcdSpaceQuota=16Gi \
--wait
```

{{% /tab %}}
{{< /tabpane >}}

{{% alert title="注意" color="primary" %}}
对于不支持动态卷扩展的存储提供商：如果集群上曾经安装过 Dapr，则必须手动卸载 Scheduler 的持久卷声明，以便创建具有增加存储大小的新卷声明。
```bash
kubectl delete pvc -n dapr-system dapr-scheduler-data-dir-dapr-scheduler-server-0 dapr-scheduler-data-dir-dapr-scheduler-server-1 dapr-scheduler-data-dir-dapr-scheduler-server-2
```
持久卷声明不会在[卸载]({{% ref dapr-uninstall.md %}}) 时自动删除。这是一项旨在防止意外数据丢失的故意安全措施。
{{% /alert %}}

#### 增加现有 Scheduler 存储大小

{{% alert title="警告" color="warning" %}}
并非所有存储提供商都支持动态卷扩展。
请参阅您的存储提供商文档，以确定是否支持此功能，以及如果不支持该怎么做。
{{% /alert %}}

默认情况下，每个 Scheduler 将为每个 Scheduler 副本针对[默认 `standard` 存储类](#storage-class)创建大小为 `1Gi` 的持久卷和持久卷声明。
这些将类似于以下内容，在此示例中，我们在 HA 模式下运行 Scheduler。

```
NAMESPACE     NAME                                              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
dapr-system   dapr-scheduler-data-dir-dapr-scheduler-server-0   Bound    pvc-9f699d2e-f347-43b0-aa98-57dcf38229c5   1Gi        RWO            standard       <unset>                 3m25s
dapr-system   dapr-scheduler-data-dir-dapr-scheduler-server-1   Bound    pvc-f4c8be7b-ffbe-407b-954e-7688f2482caa   1Gi        RWO            standard       <unset>                 3m25s
dapr-system   dapr-scheduler-data-dir-dapr-scheduler-server-2   Bound    pvc-eaad5fb1-98e9-42a5-bcc8-d45dba1c4b9f   1Gi        RWO            standard       <unset>                 3m25s
```

```
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                                         STORAGECLASS   VOLUMEATTRIBUTESCLASS   REASON   AGE
pvc-9f699d2e-f347-43b0-aa98-57dcf38229c5   1Gi        RWO            Delete           Bound    dapr-system/dapr-scheduler-data-dir-dapr-scheduler-server-0   standard       <unset>                          4m24s
pvc-eaad5fb1-98e9-42a5-bcc8-d45dba1c4b9f   1Gi        RWO            Delete           Bound    dapr-system/dapr-scheduler-data-dir-dapr-scheduler-server-2   standard       <unset>                          4m24s
pvc-f4c8be7b-ffbe-407b-954e-7688f2482caa   1Gi        RWO            Delete           Bound    dapr-system/dapr-scheduler-data-dir-dapr-scheduler-server-1   standard       <unset>                          4m24s
```

要扩展 Scheduler 的存储大小，请按照以下步骤操作：

1. 首先，确保存储类支持卷扩展，并且如果 `allowVolumeExpansion` 字段尚未设置为 `true`，请将其设置为 `true`。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: my.driver
allowVolumeExpansion: true
...
```

2. 在保留绑定的持久卷声明的同时，删除 Scheduler StatefulSet。

```bash
kubectl delete sts -n dapr-system dapr-scheduler-server --cascade=orphan
```

3. 通过编辑 `spec.resources.requests.storage` 字段，将持久卷声明的大小增加到所需的大小。
同样在这种情况下，我们假设 Scheduler 在 HA 模式下运行，有 3 个副本。

```bash
kubectl edit pvc -n dapr-system dapr-scheduler-data-dir-dapr-scheduler-server-0 dapr-scheduler-data-dir-dapr-scheduler-server-1 dapr-scheduler-data-dir-dapr-scheduler-server-2
```

4. 通过[使用所需的存储大小安装 Dapr](#setting-the-storage-size-on-installation) 来重新创建 Scheduler StatefulSet。

### 存储类

如果您的 Kubernetes 部署没有默认存储类，或者您正在配置生产集群，则需要定义存储类。

持久卷由托管的云提供商或 Kubernetes 基础设施平台提供的真实磁盘支持。
磁盘大小取决于预期要一次持久化的作业数量；但是，对于大多数生产场景，64Gb 应该绰绰有余。
一些 Kubernetes 提供商建议使用 [CSI 驱动程序](https://kubernetes.io/docs/concepts/storage/volumes/#csi)来提供底层磁盘。
以下是有关为主要云提供商创建持久磁盘的相关文档的有用链接列表：
- [Google Cloud 持久磁盘](https://cloud.google.com/compute/docs/disks)
- [Amazon EBS 卷](https://aws.amazon.com/blogs/storage/persistent-storage-for-kubernetes/)
- [Azure AKS 存储选项](https://learn.microsoft.com/azure/aks/concepts-storage)
- [Digital Ocean 块存储](https://www.digitalocean.com/docs/kubernetes/how-to/add-volumes/)
- [VMWare vSphere 存储](https://docs.vmware.com/VMware-vSphere/7.0/vmware-vsphere-with-tanzu/GUID-A19F6480-40DC-4343-A5A9-A5D3BFC0742E.html)
- [OpenShift 持久存储](https://docs.openshift.com/container-platform/4.6/storage/persistent_storage/persistent-storage-aws-efs.html)
- [阿里云磁盘存储](https://www.alibabacloud.com/help/ack/ack-managed-and-ack-dedicated/user-guide/create-a-pvc)


一旦存储类可用，您可以使用以下命令安装 Dapr，其中 Scheduler 配置为使用存储类（将 `my-storage-class` 替换为存储类的名称）：

{{% alert title="注意" color="primary" %}}
如果已经安装了 Dapr，则需要完全[卸载]({{% ref dapr-uninstall.md %}}) 控制平面，以便使用新的持久卷重新创建 Scheduler `StatefulSet`。
{{% /alert %}}

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}

```bash
dapr init -k --set dapr_scheduler.cluster.storageClassName=my-storage-class
```

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}

```bash
helm upgrade --install dapr dapr/dapr \
--version={{% dapr-latest-version short="true" %}} \
--namespace dapr-system \
--create-namespace \
--set dapr_scheduler.cluster.storageClassName=my-storage-class \
--wait
```

{{% /tab %}}
{{< /tabpane >}}

## 临时存储

在非 HA 模式下运行时，可以选择让 Scheduler 使用临时存储，这是一种**不**能够抵御重启的内存存储。例如，所有作业数据在 Scheduler 重启后都会丢失。
这对于非生产部署或测试非常有用，在这些情况下存储不可用或不需要。

{{% alert title="注意" color="primary" %}}
如果已经安装了 Dapr，则需要完全[卸载]({{% ref dapr-uninstall.md %}}) 控制平面，以便在没有持久卷的情况下重新创建 Scheduler `StatefulSet`。
{{% /alert %}}

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}

```bash
dapr init -k --set dapr_scheduler.cluster.inMemoryStorage=true
```

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}

```bash
helm upgrade --install dapr dapr/dapr \
--version={{% dapr-latest-version short="true" %}} \
--namespace dapr-system \
--create-namespace \
--set dapr_scheduler.cluster.inMemoryStorage=true \
--wait
```

{{% /tab %}}
{{< /tabpane >}}
