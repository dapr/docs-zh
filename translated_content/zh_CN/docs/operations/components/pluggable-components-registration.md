---
type: docs
title: "How-To: 注册可插拔组件"
linkTitle: "注册可插拔组件"
weight: 1000
description: "了解如何注册可插拔组件"
---

[uds]: https://en.wikipedia.org/wiki/Unix_domain_socket

## 组件注册流程

[基于 gRPC 的可插拔组件]({{% ref pluggable-components-overview %}}) 通常作为容器或进程运行，需要通过 [Unix Domain Socket][uds]（简称 UDS）与 Dapr 运行时通信。它们通过以下步骤在运行时中被自动发现和注册：

1. 组件监听位于共享卷上的 [Unix Domain Socket][uds]。
2. Dapr 运行时列出共享卷中的所有 [Unix Domain Socket][uds]。
3. Dapr 运行时与每个 socket 建立连接，并使用 gRPC 反射从给定构建块 API 中发现该组件实现的所有 proto 服务。

单个组件可以同时实现多个组件接口。

<img src="/images/components-pluggable-register-grpc.png" width=50%>

虽然 Dapr 的内置组件[随运行时一起包含](https://github.com/dapr/components-contrib/blob/master/docs/developing-component.md)，但可插拔组件需要一些设置步骤才能与 Dapr 一起使用。

1. 可插拔组件需要在 Dapr 本身启动之前启动并准备好接收请求。
2. 用于可插拔组件通信的 [Unix Domain Socket][uds] 文件需要使 Dapr 和可插拔组件都能访问。

在独立模式下，可插拔组件作为进程或容器运行。在 Kubernetes 上，可插拔组件作为容器运行，并由 Dapr 的边车注入器自动注入到应用程序的 pod 中，允许通过标准的 [Kubernetes Container spec](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/#container-v1-core) 进行自定义。

这也会改变在 Dapr 和可插拔组件之间共享 [Unix Domain Socket][uds] 文件的方式。

{{% alert title="注意" color="primary" %}}
作为前提条件，操作系统必须支持 Unix Domain Socket，任何 UNIX 或类 UNIX 系统（Mac、Linux，或对于本地开发，Windows 用户可使用 [WSL](https://learn.microsoft.com/windows/wsl/install)）应该就足够了。
{{% /alert %}}

选择您的环境以开始使您的组件可被发现。

{{< tabpane text=true >}}

{{% tab "独立模式" %}}
[uds]: https://en.wikipedia.org/wiki/Unix_domain_socket

## 运行组件

在 Dapr 启动之前，您的组件和 Unix Socket 必须都在运行。

默认情况下，Dapr 边车会在 `/tmp/dapr-components-sockets` 中查找作为 [Unix Domain Socket][uds] 文件的组件。

此文件夹中的文件名对于组件注册很重要。它们必须通过将组件的**名称**附加您选择的文件扩展名来构成，更常见的是 `.sock`。例如，文件名 `my-component.sock` 是名为 `my-component` 的组件的有效 Unix Domain Socket 文件名。

由于您在与组件相同的主机上运行 Dapr，因此请验证此文件夹及其中的文件可被您的组件和 Dapr 访问和写入。如果您使用 Dapr 的边车注入器功能，则会自动创建并挂载此卷。

### 组件发现和多路复用

可通过 [Unix Domain Socket][UDS]（UDS）访问的可插拔组件可以托管多个不同的组件 API。在组件的初始发现过程中，Dapr 使用反射来枚举 UDS 后面的所有组件 API。上面示例中的 `my-component` 可插拔组件可以同时包含状态存储（`state`）和发布订阅（`pubsub`）组件 API。

通常，可插拔组件为实现单个组件 API 以进行打包和部署。但是，以增加其依赖关系和扩大其安全攻击面为代价，可插拔组件可以实现多个组件 API。这样做可以减轻部署和监控的负担。对于隔离、容错和安全的最佳实践是每个可插拔组件实现单个组件 API。


## 定义组件

使用[组件规范]({{% ref component-schema.md %}})定义您的组件。组件的 `spec.type` 值是通过将以下 2 个部分用 `.` 连接起来构成的：
1. 组件的 API（`state`、`pubsub`、`bindings` 等）
2. 组件的**名称**，源自 [Unix Domain Socket][uds] 文件名，不带文件扩展名。

您需要为可插拔组件的 [Unix Domain Socket][uds] 公开的每个 API 定义一个[组件规范]({{% ref component-schema.md %}})。上一个示例中的 Unix Domain Socket `my-component.sock` 公开了一个名为 `my-component` 的可插拔组件，它同时具有 `state` 和 `pubsub` API。需要两个组件规范，每个都在自己的 YAML 文件中，放置在 `resources-path` 中：一个用于 `state.my-component`，另一个用于 `pubsub.my-component`。

例如，`state.my-component` 的组件规范可以是：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-production-state-store
spec:
  type: state.my-component
  version: v1
  metadata:
```

在上面的示例中，请注意以下内容：
* 字段 `spec.type` 的内容是 `state.my-component`，指的是作为名为 `my-component` 的可插拔组件公开的状态存储。
* 字段 `metadata.name` 是此处定义的状态存储的名称，与可插拔组件名称无关。

将此文件作为 `component.yaml` 保存到 Dapr 的组件配置文件夹中。就像 `metadata.name` 字段的内容一样，此 YAML 文件的文件名没有影响，也不依赖于可插拔组件名称。

## 运行 Dapr

[初始化 Dapr]({{% ref get-started-api.md %}})，并确保您的组件文件放置在正确的文件夹中。

{{% alert title="注意" color="primary" %}}
Dapr 1.9.0 是支持可插拔组件的最低版本。从 1.11.0 版本开始，支持可插拔组件的容器自动注入。
{{% /alert %}}

<!-- We should list the actual command line the user will be typing here -->

就是这样！现在您可以通过 Dapr API 调用状态存储 API。通过运行以下命令查看实际效果。将 `$PORT` 替换为 Dapr HTTP 端口：

```shell
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "name", "value": "Bruce Wayne", "metadata": {}}]' http://localhost:$PORT/v1.0/state/prod-mystore
```

检索值，将 `$PORT` 替换为 Dapr HTTP 端口：

```shell
curl http://localhost:$PORT/v1.0/state/prod-mystore/name
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

[uds]: https://en.wikipedia.org/wiki/Unix_domain_socket

## 为可插拔组件构建并发布容器

确保您的组件作为容器运行，首先已发布并且您的 Kubernetes 集群可以访问。

## 在 Kubernetes 集群上部署 Dapr

按照 [在 Kubernetes 集群上部署 Dapr]({{% ref kubernetes-deploy.md %}}) 文档中提供的步骤进行操作。

## 在部署中添加可插拔组件容器

可插拔组件作为容器部署在与您的应用程序**相同的 pod** 中。

由于可插拔组件由 [Unix Domain Sockets][uds] 支持，因此使可插拔组件创建的 socket 可被 Dapr 运行时访问。将部署规范配置为：

1. 挂载卷
2. 向 Dapr 提示已挂载的 Unix socket 卷位置
3. 将卷附加到您的可插拔组件容器

在以下示例中，您配置的可插拔组件作为容器部署在与您的应用程序容器相同的 pod 中。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
      annotations:
        # 建议自动注入可插拔组件。
        dapr.io/inject-pluggable-components: "true" 
        dapr.io/app-id: "my-app"
        dapr.io/enabled: "true"
    spec:
      containers:
      # 您的应用程序的容器规范，照常。
        - name: app
           image: YOUR_APP_IMAGE:YOUR_APP_IMAGE_VERSION
```

建议将 `dapr.io/inject-pluggable-components` 注解设置为 "true"，表示 Dapr 的边车注入器此应用程序的 pod 将具有用于可插拔组件的其他容器。

或者，您可以跳过 Dapr 的边车注入功能，手动添加可插拔组件的容器并注释您的 pod，告诉 Dapr 该 pod 中的哪些容器是可插拔组件，如下面的示例所示：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
      annotations:
        dapr.io/pluggable-components: "component" ## 可插拔组件容器的名称用 `,` 分隔，例如 "componentA,componentB"。
        dapr.io/app-id: "my-app"
        dapr.io/enabled: "true"
    spec:
      containers:
      ### --------------------- 您的应用程序容器放在这里 -----------
        - name: app
           image: YOUR_APP_IMAGE:YOUR_APP_IMAGE_VERSION
      ### --------------------- 您的可插拔组件容器放在这里 -----------
        - name: component
          image: YOUR_IMAGE_GOES_HERE:YOUR_IMAGE_VERSION
```

在应用部署之前，让我们再添加一个配置：组件规范。

## 定义组件

可插拔组件使用[组件规范]({{% ref component-schema.md %}})定义。组件 `type` 派生自 socket 名称（不带文件扩展名）。在以下示例 YAML 中，替换：

- `your_socket_goes_here` 替换为您的组件 socket 名称（无扩展名）
- `your_component_type` 替换为您的组件类型

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: prod-mystore
  # 在 Kubernetes 上运行并自动容器注入时，添加以下注解：
  annotations:
    dapr.io/component-container: >
      {
        "name": "my-component",
        "image": "<registry>/<image_name>:<image_tag>"
      }
spec:
  type: your_component_type.your_socket_goes_here
  version: v1
  metadata:
scopes:
  - backend
```
当您希望 Dapr 的边车注入器为可插拔组件处理容器和卷注入时，`dapr.io/component-container` 注解在 Kubernetes 上是必需的。至少，您需要为 Dapr 的边车注入器提供 `name` 和 `image` 属性，以便成功将容器添加到应用程序的 pod 中。Unix Domain Socket 的卷由 Dapr 的边车注入器自动创建和挂载。

将[范围]({{% ref component-scopes %}})限定您的组件，以确保只有目标应用程序可以连接到可插拔组件，因为它只会在其部署中运行。否则，运行时在初始化组件时会失败。

就是这样！**[将创建的清单应用到您的 Kubernetes 集群](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#kubectl-apply)**，并通过 Dapr API 调用状态存储 API。

使用 [Kubernetes pod 转发器](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/) 访问 `daprd` 运行时。

通过运行以下命令查看实际效果。将 `$PORT` 替换为 Dapr HTTP 端口：

```shell
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "name", "value": "Bruce Wayne", "metadata": {}}]' http://localhost:$PORT/v1.0/state/prod-mystore
```

检索值，将 `$PORT` 替换为 Dapr HTTP 端口：

```shell
curl http://localhost:$PORT/v1.0/state/prod-mystore/name
```

{{% /tab %}}
{{< /tabpane >}}

## 后续步骤

使用此[示例代码](https://github.com/dapr/samples/tree/master/pluggable-components-dotnet-template)开始开发 .NET 可插拔组件
