---
type: docs
title: "操作指南：持久化 Scheduler Jobs"
linkTitle: "操作指南：持久化 Scheduler Jobs"
weight: 50000
description: "配置 Scheduler 以持久化其数据库，使其能够抵御重启"
---

[Scheduler]({{% ref scheduler.md %}}) 服务负责将 jobs 写入其 Etcd 数据库，并调度它们执行。
在全新安装的 Dapr v1.17.7+ 中，Scheduler 服务数据库内嵌 Etcd，并将数据写入大小为 `16Gi` 的持久卷声明卷，使用集群默认的 [storage class](https://kubernetes.io/docs/concepts/storage/storage-classes/)。早期版本默认为 `1Gi`，从这些版本升级的集群会保留其原始的持久卷声明大小，因为现有 StatefulSet 上的 `spec.volumeClaimTemplates` 是不可变的；Helm Chart 会检测到现有的 StatefulSet，并将 `storageSize` 固定为当前正在使用的值。
这意味着在大多数 Kubernetes 部署上可靠运行 scheduler 服务无需额外参数，但如果默认的 StorageClass 不可用或在生产环境中运行，则需要[额外配置](#storage-class)。

{{% alert title="警告" color="warning" %}}
从 Dapr v1.17.7 之前版本升级的集群会保留原有的 Scheduler PVC 大小（通常为 `1Gi`），这很可能无法满足大多数生产部署的需求。
请记住，Scheduler 用于 [Actor Reminders]({{% ref actors-timers-reminders.md %}}) 和 [Workflows]({{% ref workflow-overview.md %}})，以及 [Jobs API]({{% ref jobs_api.md %}})。
如果您的集群处于这种状态，请参阅下方的[增加现有 Scheduler 存储大小](#increase-existing-scheduler-storage-size)，以原地扩展 PVC，或者使用更大的 Scheduler 存储重新安装 Dapr。
更多信息请参阅下方的 [ETCD 存储磁盘大小](#etcd-storage-disk-size) 部分。
{{% /alert %}}

## 生产环境设置

### ETCD Storage Disk Size

在全新安装的 Dapr v1.17.7+ 中，Scheduler 的默认存储大小为 `16Gi`；早期版本（以及从这些版本升级的集群）的默认存储大小为 `1Gi`。
旧版的 `1Gi` 很可能无法满足大多数生产部署的需求，即使是新的 `16Gi` 默认值，对于高吞吐量的工作负载也可能需要提高。
当超出存储大小时，Scheduler 会记录类似以下的错误：

```
error running scheduler: etcdserver: mvcc: database space exceeded
```

了解存储大小的安全上限并不是一门精确的科学，它很大程度上取决于应用程序 jobs 的数量、持久性以及数据负载的大小。
[Job API]({{% ref jobs_api.md %}}) 和 [Actor Reminders]({{% ref actors-timers-reminders.md %}}) 会与您应用程序的用量一对一地透明映射。
Workflows 会创建大量作为 Actor Reminders 的 jobs，但这些 jobs 是短暂的——与每次 workflow 执行的生命周期相匹配。
由 Workflows 创建的 jobs 的数据负载通常为空或很小。

Scheduler 使用 Etcd 作为其后端存储数据库。
按设计，Etcd 会以[预写日志（WAL）和快照](https://etcd.io/docs/v3.5/learning/persistent-storage-files/)的形式持久化历史事务和数据。
这意味着 Scheduler 的实际磁盘占用会高于当前可观察到的数据库状态，通常会高出数倍。

### Setting the Storage Size on Installation

如果需要增加**现有** Scheduler 存储大小，请参阅下方的[增加 Scheduler 存储大小](#increase-existing-scheduler-storage-size)部分。
要为**全新** Dapr 安装显式设置存储大小（本例与 `16Gi` 默认值一致），可以使用以下命令：

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
对于不支持动态卷扩展的存储提供商：如果集群上曾经安装过 Dapr，则必须手动删除 Scheduler 的持久卷声明，才能创建具有更大存储大小的新持久卷声明。
```bash
kubectl delete pvc -n dapr-system dapr-scheduler-data-dir-dapr-scheduler-server-0 dapr-scheduler-data-dir-dapr-scheduler-server-1 dapr-scheduler-data-dir-dapr-scheduler-server-2
```
持久卷声明不会在[卸载]({{% ref dapr-uninstall.md %}})时自动删除。这是一项旨在防止意外数据丢失的刻意安全措施。
{{% /alert %}}

#### Increase existing Scheduler Storage Size

{{% alert title="警告" color="warning" %}}
并非所有存储提供商都支持动态卷扩展。
请参阅您的存储提供商文档，确认是否支持该功能，以及不支持时应如何处理。
{{% /alert %}}

在从 Dapr v1.17.7 之前版本升级的集群上，每个 Scheduler 副本对应的 PVC 通常为 `1Gi`（沿用早期默认值），使用的是[默认的 `standard` storage class](#storage-class)。无论起始大小如何，只要需要扩大现有 PVC，都可以使用以下步骤。
这些输出类似于以下内容，本例中 Scheduler 以 HA 模式运行。

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

1. 首先，确保 storage class 支持卷扩展，并确保 `allowVolumeExpansion` 字段设置为 `true`（如果尚未设置）。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: my.driver
allowVolumeExpansion: true
...
```

2. 删除 Scheduler StatefulSet，同时保留处于 Bound 状态的持久卷声明。

```bash
kubectl delete sts -n dapr-system dapr-scheduler-server --cascade=orphan
```

3. 通过编辑 `spec.resources.requests.storage` 字段，将持久卷声明的大小增加到所需大小。
同样，在这种情况下，我们假设 Scheduler 以 HA 模式运行，有 3 个副本。

```bash
kubectl edit pvc -n dapr-system dapr-scheduler-data-dir-dapr-scheduler-server-0 dapr-scheduler-data-dir-dapr-scheduler-server-1 dapr-scheduler-data-dir-dapr-scheduler-server-2
```

4. 通过[使用所需的存储大小安装 Dapr](#setting-the-storage-size-on-installation) 来重新创建 Scheduler StatefulSet。

### Persistent Volume Write Access (fsGroup)

Scheduler 进程以非 root 用户（UID/GID `65532`）运行。为使挂载的持久卷可由该进程写入，Pod 的 `securityContext` 可以指定 `fsGroup`，这会使 kubelet 在挂载时更改卷的属主（chown）。不过，某些存储驱动已经正确设置了属主和权限，因此这未必总是必要的。

`dapr_scheduler.securityContext.fsGroup` 默认为 `65532`，且 Chart 仅在其有值时才会渲染它。若要在没有 `fsGroup` 的情况下运行，请将其设置为 `null`。

指导原则如下：

- **标准 Kubernetes**（GKE、EKS、AKS 以及大多数自管理集群）：保留默认值。kubelet 会在挂载时更改卷的属主，而对于通过 CSI 驱动挂载的块存储卷（例如 AWS EBS 磁盘），非 root 进程需要这一操作才能写入。

- **OpenShift**：将 `fsGroup` 设置为 `null`。每个项目的 Security Context Constraints（SCC）会从允许的范围内分配 `fsGroup`，超出该范围的显式值会被拒绝，导致 Pod 无法启动。仅不设置该标志是不够的，因为 Chart 默认值仍会生效：

  {{< tabpane text=true >}}
  <!-- Dapr CLI -->
  {{% tab "Dapr CLI" %}}

  ```bash
  dapr init -k --set dapr_scheduler.securityContext.fsGroup=null
  ```

  {{% /tab %}}

  <!-- Helm -->
  {{% tab "Helm" %}}

  ```bash
  helm upgrade --install dapr dapr/dapr \
  --version={{% dapr-latest-version short="true" %}} \
  --namespace dapr-system \
  --create-namespace \
  --set dapr_scheduler.securityContext.fsGroup=null \
  --wait
  ```

  {{% /tab %}}
  {{< /tabpane >}}

{{% alert title="注意" color="primary" %}}
许多托管 Kubernetes 存储提供商（例如 AWS EBS CSI 和 GCE PD CSI）无需显式设置 `fsGroup`，即可自动为卷设置正确的属主。请查阅您的 storage class 文档，确认是否会自动授予写入权限。
{{% /alert %}}

### Storage Class

如果您的 Kubernetes 部署没有默认的 storage class，或者您正在配置生产集群，则必须定义 storage class。

持久卷由托管云提供商或 Kubernetes 基础设施平台提供的真实磁盘支撑。
磁盘大小取决于预计同时持久化的 jobs 数量；不过，对于大多数生产场景，64Gb 应该绰绰有余。
在生产环境中，请使用由高级 SSD 支持的 storage class，以便为 Etcd 提供其所需的 IOPS 和延迟特性。在较低等级的 storage class 上，Scheduler 内嵌的 Etcd 可能会记录慢磁盘心跳警告（`leader failed to send out heartbeat on time; took too long, leader is overloaded likely from slow disk`）。

在支持的情况下，还应优先选择支持多可用区故障转移的 storage class（例如区域冗余或区域级持久磁盘），以免 Scheduler 的 PVC 被锁定在单个可用区。被锁定在某个可用区的 PVC 可能会在集群升级或可用区故障期间阻碍 Scheduler 恢复，直到原可用区重新可用为止。

一些 Kubernetes 提供商建议使用 [CSI 驱动程序](https://kubernetes.io/docs/concepts/storage/volumes/#csi)来预配底层磁盘。
以下是有关为主要云提供商创建持久磁盘的相关文档的有用链接列表：
- [Google Cloud 持久磁盘](https://cloud.google.com/compute/docs/disks)
- [Amazon EBS 卷](https://aws.amazon.com/blogs/storage/persistent-storage-for-kubernetes/)
- [Azure AKS 存储选项](https://learn.microsoft.com/azure/aks/concepts-storage)
- [Digital Ocean 块存储](https://www.digitalocean.com/docs/kubernetes/how-to/add-volumes/)
- [VMWare vSphere 存储](https://docs.vmware.com/VMware-vSphere/7.0/vmware-vsphere-with-tanzu/GUID-A19F6480-40DC-4343-A5A9-A5D3BFC0742E.html)
- [OpenShift 持久存储](https://docs.openshift.com/container-platform/4.6/storage/persistent_storage/persistent-storage-aws-efs.html)
- [阿里云磁盘存储](https://www.alibabacloud.com/help/ack/ack-managed-and-ack-dedicated/user-guide/create-a-pvc)


storage class 可用后，您可以使用以下命令安装 Dapr，并将 Scheduler 配置为使用该 storage class（将 `my-storage-class` 替换为 storage class 的名称）：

{{% alert title="注意" color="primary" %}}
如果已经安装了 Dapr，则需要将 control plane 完全[卸载]({{% ref dapr-uninstall.md %}})，才能使用新的持久卷重新创建 Scheduler `StatefulSet`。
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

在非 HA 模式下运行时，可以选择让 Scheduler 使用临时存储，即基于内存的存储，它**无法**抵御重启。例如，Scheduler 重启后，所有 jobs 数据都会丢失。
这在非生产部署，或在无需或无法使用持久存储的测试场景中很有用。

{{% alert title="注意" color="primary" %}}
如果已经安装了 Dapr，则需要将 control plane 完全[卸载]({{% ref dapr-uninstall.md %}})，才能在没有持久卷的情况下重新创建 Scheduler `StatefulSet`。
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
