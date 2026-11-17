---
type: docs
title: "init CLI 命令参考"
linkTitle: "init"
description: "init CLI 命令的详细信息"
---

### 说明

在支持的托管平台上安装 Dapr。

### 支持的平台

- [自托管]({{% ref self-hosted %}})
- [Kubernetes]({{% ref kubernetes %}})

### 用法

```bash
dapr init [flags]
```

### 标志

| 名称                  | 环境变量 | 默认值       | 描述                                                                          |
| --------------------- | -------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `--enable-ha`         |                      | `false`       | 启用高可用（HA）模式                                                   |
| `--enable-mtls`       |                      | `true`        | 在集群中启用 mTLS                                                          |
| `--from-dir`          |                      |               | 包含已下载的“Dapr Installer Bundle”发行版的本地目录路径，用于在隔离环境中 `init`      |
| `--help`, `-h`        |                      |               | 打印此帮助信息                                                              |
| `--image-registry`    |                      |               | 从给定的镜像仓库拉取 Dapr 所需的容器镜像                    |
| `--kubernetes`, `-k`  |                      | `false`       | 将 Dapr 部署到 Kubernetes 集群                                                  |
| `--namespace`, `-n`   |                      | `dapr-system` | 安装 Dapr 的 Kubernetes namespace                                          |
| `--network`           |                      |               | 在其上安装和部署 Dapr runtime 的 Docker 网络                                          |
| `--runtime-version`   |                      | `latest`      | 要安装的 Dapr runtime 版本，例如：`1.0.0`                     |
| `--image-variant`   |                      |                 | 用于 Dapr runtime 的镜像变体，例如：`mariner`               |
| `--set`               |                      |               | 在命令行上配置选项，以便在安装时传递给 Dapr Helm chart 和 Kubernetes 集群。可以在逗号分隔的列表中指定多个值，例如：`key1=val1,key2=val2`                     |
| `--slim`, `-s`        |                      | `false`       | 在自托管安装中排除 placement service、Scheduler service，以及 Redis 和 Zipkin 容器 |
| `--timeout`           |                      | `300`         | Kubernetes 安装的等待超时时间                                     |
| `--wait`              |                      | `false`       | 等待 Kubernetes 初始化完成                                       |
|        N/A            |DAPR_DEFAULT_IMAGE_REGISTRY|          | 用于指定拉取镜像时默认使用的容器仓库。当其值设置为 `GHCR` 或 `ghcr` 时，将从 Github 容器仓库拉取所需镜像。要默认使用 Docker Hub，请取消设置该环境变量或将其留空|
|        N/A            |DAPR_HELM_REPO_URL|          | 指定私有 Dapr Helm chart URL|
|        N/A            | DAPR_HELM_REPO_USERNAME | 私有 Helm chart 的用户名 | 访问私有 Dapr Helm chart 所需的用户名。如果可以公开访问，则无需设置此环境变量|
|        N/A            | DAPR_HELM_REPO_PASSWORD | 私有 Helm chart 的密码  |访问私有 Dapr Helm chart 所需的密码。如果可以公开访问，则无需设置此环境变量| |
|  `--container-runtime`  |              |    `docker`      | 用于传入除 Docker 之外的其他容器运行时。支持的容器运行时包括：`docker`、`podman` |
|  `--dev`  |              |          | 在 Kubernetes 中运行时创建 Redis 和 Zipkin 部署。 |
|  `--scheduler-volume`  |              |          | 仅限自托管。可选地，您可以为 Scheduler service 的数据目录指定一个卷。默认情况下，如果不使用此标志，Scheduler 数据不会持久化，并且对重启没有弹性。 |
|  `--scheduler-override-broadcast-host-port`  |  |  localhost:50006（Windows 上为 6060）  | 仅限自托管。指定 Scheduler 广播主机和端口，例如：192.168.42.42:50006。 |
|  `--scheduler-placement`  |              |  `false`  | 仅限自托管。由 Scheduler service 提供 Actor placement，而不运行 placement service。需要 Dapr 1.19 或更高版本。不能与 `--slim` 同时使用。 |


### 示例

{{< tabpane text=true >}}

{{% tab "自托管" %}}

**安装**

通过拉取 Placement、Scheduler、Redis 和 Zipkin 的容器镜像来安装 Dapr。默认情况下，这些镜像从 Docker Hub 拉取。

> 默认情况下，会为 Scheduler service 创建一个 `dapr_scheduler` 本地卷，用作数据库目录。该卷在主机上的文件位置可能位于 `/var/lib/docker/volumes/dapr_scheduler/_data` 或 `~/.local/share/containers/storage/volumes/dapr_scheduler/_data`，具体取决于您的容器运行时。

```bash
dapr init
```

Dapr 也可以在没有 Docker 的情况下运行 [Slim 自托管模式]({{% ref self-hosted-no-docker.md %}})。

```bash
dapr init -s
```

> 要将 Dapr Github 容器仓库切换为默认仓库，请将 `DAPR_DEFAULT_IMAGE_REGISTRY` 环境变量的值设置为 `GHCR`。要切换回 Docker Hub 作为默认仓库，请取消设置此环境变量。

**指定运行时版本**

您还可以指定特定的运行时版本。默认情况下，使用最新版本。

```bash
dapr init --runtime-version 1.13.4
```

**使用镜像变体安装**

您还可以使用特定的镜像变体安装 Dapr，例如：[mariner]({{% ref "kubernetes-deploy.md#using-mariner-based-images" %}})。

```bash
dapr init --image-variant mariner
```

**使用 Dapr Installer Bundle**

在离线或隔离环境中，您可以[下载 Dapr Installer Bundle](https://github.com/dapr/installer-bundle/releases)，并使用它来安装 Dapr，而不是从网络拉取镜像。

```bash
dapr init --from-dir <path-to-installer-bundle-directory>
```

Dapr 也可以在隔离环境中以 Slim 自托管模式运行，无需 Docker。

```bash
dapr init -s --from-dir <path-to-installer-bundle-directory>
```

**指定私有仓库**

您还可以指定私有仓库来拉取容器镜像。这些镜像需要按如下所示发布到私有仓库，以便 Dapr CLI 能够通过 `dapr init` 命令成功拉取它们：

1. Dapr runtime 容器镜像（dapr）（用于运行 Placement）- dapr/dapr:<version>
2. Redis 容器镜像（rejson）- dapr/3rdparty/rejson
3. Zipkin 容器镜像（zipkin）- dapr/3rdparty/zipkin

Dapr 所需的所有镜像都必须位于 `dapr` 路径下。第三方镜像必须发布在 `dapr/3rdparty` 路径下。

`image-registry` URI 遵循 `docker.io/<username>` 格式。

```bash
dapr init --image-registry docker.io/username
```

此命令会按如下方式解析完整的镜像 URI：
1. Placement 容器镜像（dapr）- docker.io/username/dapr/dapr:<version>
2. Redis 容器镜像（rejson）- docker.io/username/dapr/3rdparty/rejson
3. Zipkin 容器镜像（zipkin）- docker.io/username/dapr/3rdparty/zipkin

设置 Dapr 时，您可以指定不同的容器运行时。如果省略 `--container-runtime` 标志，则默认容器运行时为 Docker。

```bash
dapr init --container-runtime podman
```

**使用 Docker 网络**

您可以将本地容器部署到 Docker 网络中，这在部署到不同网络，或在使用 Docker Compose 进行本地开发以部署应用程序时非常有用。

创建 Docker 网络。

```bash
docker network create mynet
```

初始化 Dapr，并指定所创建的 Docker 网络。

```bash
dapr init --network mynet
```

验证所有容器都在指定网络中运行。

```bash
docker ps
```

从该 Docker 网络中卸载 Dapr。

```bash
dapr uninstall --all --network mynet
```

**指定 Scheduler 广播主机和端口**

您可以指定 Scheduler 广播主机和端口，例如：192.168.42.42:50006。

当您必须使用不同的主机和端口连接到 Scheduler 时，这是必要的，因为 Scheduler 只允许与此主机和端口匹配的连接。

默认情况下，Scheduler 将使用 localhost:50006（Windows 上为 6060）。

```bash
dapr init --scheduler-override-broadcast-host-port 192.168.42.42:50006
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

```bash
dapr init -k
```

使用 `--dev` 标志以开发模式初始化 Dapr，其中包括 Zipkin 和 Redis。
```bash
dapr init -k --dev
```


您可以使用 `--wait` 标志等待安装完成部署。
默认超时时间为 300 秒（5 分钟），但可以使用 `--timeout` 标志进行自定义。

```bash
dapr init -k --wait --timeout 600
```

您还可以指定特定的运行时版本。

```bash
dapr init -k --runtime-version 1.4.0
```

在 Dapr 安装期间，使用 `--set` 标志配置一组 [Helm Chart 值](https://github.com/dapr/dapr/tree/master/charts/dapr#configuration)，以帮助设置 Kubernetes 集群。

```bash
dapr init -k --set global.tag=1.0.0 --set dapr_operator.logLevel=error
```

您还可以指定私有仓库来拉取容器镜像。截至目前，`dapr init -k` 不会为 sentry、operator、placement、Scheduler 和 sidecar 使用特定镜像，而是仅依赖 Dapr runtime 容器镜像 `dapr` 来提供所有这些镜像。

场景 1：dapr 镜像直接托管在私有仓库的根文件夹下 -
```bash
dapr init -k --image-registry docker.io/username
```
场景 2：dapr 镜像托管在私有仓库中的新/不同目录下 -
```bash
dapr init -k --image-registry docker.io/username/<directory-name>
```

{{% /tab %}}

{{< /tabpane >}}
