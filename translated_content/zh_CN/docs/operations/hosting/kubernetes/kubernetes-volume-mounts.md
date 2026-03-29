---
type: docs
title: "操作指南：将 Pod 卷挂载到 Dapr 边车"
linkTitle: "操作指南：挂载 Pod 卷"
weight: 90000
description: "配置 Dapr 边车以挂载 Pod 卷"
---

Dapr 边车可以被配置来挂载任何附加到应用 Pod 的 Kubernetes 卷。这些卷可以被 `daprd`（边车）容器以 _只读_ 或 _读写_ 模式访问。如果一个卷被配置为挂载但在 Pod 中不存在，Dapr 会记录警告并忽略它。

有关不同类型卷的更多信息，请查看 [Kubernetes 文档](https://kubernetes.io/docs/concepts/storage/volumes/)。

## 配置

你可以在部署 YAML 中设置以下注解：

| 注解 | 描述 |
| ---------- | ----------- |
| `dapr.io/volume-mounts` | 用于只读卷挂载 |
| `dapr.io/volume-mounts-rw` | 用于读写卷挂载 |

这些注解是逗号分隔的 `volume-name:path/in/container` 对。请验证相应的卷在 Pod 规范中存在。

在官方容器镜像中，Dapr 以用户 ID（UID）`65532` 运行进程。请确保挂载卷内的文件夹和文件根据需要可被用户 `65532` 写入或读取。

虽然可以在 Dapr 边车容器内的任何文件夹中挂载卷，但为了避免冲突并确保未来的平稳运行，请将所有挂载点放在以下位置之一，或其子文件夹内：

| 位置 | 描述 |
| -------- | ----------- |
| `/mnt` | 推荐用于包含持久化数据的卷，Dapr 边车进程可以读取和/或写入这些数据。 |
| `/tmp` | 推荐用于包含临时数据的卷，例如临时磁盘。 |

## 示例

### 基本部署资源示例

在下面的部署资源示例中：
- `my-volume1` 以只读模式在边车容器内的 `/mnt/sample1` 处可用
- `my-volume2` 以只读模式在边车容器内的 `/mnt/sample2` 处可用
- `my-volume3` 以读写模式在边车容器内的 `/tmp/sample3` 处可用

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
  labels:
    app: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/app-port: "8000"
        dapr.io/volume-mounts: "my-volume1:/mnt/sample1,my-volume2:/mnt/sample2"
        dapr.io/volume-mounts-rw: "my-volume3:/tmp/sample3"
    spec:
      volumes:
        - name: my-volume1
          hostPath:
            path: /sample
        - name: my-volume2
          persistentVolumeClaim:
            claimName: pv-sample
        - name: my-volume3
          emptyDir: {}
...
```

### 使用本地文件密钥存储的自定义密钥存储

由于任何类型的 Kubernetes 卷都可以附加到边车，你可以使用本地文件密钥存储从各种地方读取密钥。例如，如果你有一个运行在 `10.201.202.203` 的网络文件共享（NFS）服务器，密钥存储在 `/secrets/stage/secrets.json`，你可以将其用作密钥存储。

1. 配置应用 Pod 以挂载 NFS 并将其附加到 Dapr 边车。  
  
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: myapp
   ...
   spec:
     ...
     template:
       ...
         annotations:
           dapr.io/enabled: "true"
           dapr.io/app-id: "myapp"
           dapr.io/app-port: "8000"
           dapr.io/volume-mounts: "nfs-secrets-vol:/mnt/secrets"
       spec:
         volumes:
           - name: nfs-secrets-vol
             nfs:
               server: 10.201.202.203
               path: /secrets/stage
   ...
   ```

1. 将本地文件密钥存储组件指向附加的文件。  

   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Component
   metadata:
     name: local-secret-store
   spec:
     type: secretstores.local.file
     version: v1
     metadata:
     - name: secretsFile
       value: /mnt/secrets/secrets.json
   ```
  
1. 使用密钥。  
  
   ```
   GET http://localhost:<daprPort>/v1.0/secrets/local-secret-store/my-secret
   ```

## 相关链接

[Dapr Kubernetes Pod 注解规范]({{% ref arguments-annotations-overview.md %}})
