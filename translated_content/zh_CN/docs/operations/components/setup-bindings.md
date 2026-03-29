---
type: docs
title: "Binding 组件"
linkTitle: "Bindings"
description: "设置 Dapr binding 组件的指南"
weight: 900
---

Dapr 与外部资源集成，允许应用既可以被外部事件触发，也可以与这些资源进行交互。每个 binding 组件都有一个名称，在与该资源交互时使用这个名称。

与其他构建块组件一样，binding 组件是可扩展的，可以在 [components-contrib repo](https://github.com/dapr/components-contrib) 中找到。

Dapr 中的 binding 使用 `Component` 文件描述，包含以下字段：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
  namespace: <NAMESPACE>
spec:
  type: bindings.<NAME>
  version: v1
  metadata:
  - name: <KEY>
    value: <VALUE>
  - name: <KEY>
    value: <VALUE>
...
```

binding 的类型由 `type` 字段决定，连接字符串和其他元数据等项放在 `.metadata` 部分。

不同的[支持的 binding]({{% ref supported-bindings %}})会有不同的特定字段需要配置。例如，为 [Azure Blob Storage]({{% ref blobstorage%}})配置 binding 时，文件会像这样：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: storageAccount
    value: myStorageAccountName
  - name: storageAccessKey
    value: ***********
  - name: container
    value: container1
  - name: decodeBase64
    value: <bool>
  - name: getBlobRetryCount
    value: <integer>
```

## 应用配置

创建组件的 YAML 文件后，根据你的托管环境按照以下说明进行配置：


{{< tabpane text=true >}}

{{% tab "自托管" %}}
要在本地运行，创建一个包含 YAML 文件的 `components` 目录，并通过 `--resources-path` 标志向 `dapr run` 命令提供该路径。
{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 中部署，假设你的组件文件名为 `mybinding.yaml`，运行：

```bash
kubectl apply -f mybinding.yaml
```
{{% /tab %}}

{{< /tabpane >}}

## 支持的 binding

访问 [binding 参考]({{% ref supported-bindings %}})获取支持的资源完整列表。

## 相关链接
- [Bindings 构建块]({{% ref bindings %}})
- [支持的 Bindings]({{%ref supported-bindings %}})
