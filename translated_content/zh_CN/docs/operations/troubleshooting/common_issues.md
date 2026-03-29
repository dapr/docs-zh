---
type: docs
title: "运行 Dapr 时的常见问题"
linkTitle: "常见问题"
weight: 1000
description: "运行 Dapr 应用程序时遇到的常见问题和故障"
---

本指南涵盖了在安装和运行 Dapr 时可能遇到的常见问题。

## 安装 Dapr CLI 时 Dapr 无法连接到 Docker

在安装和初始化 Dapr CLI 时，如果运行 `dapr init` 后看到以下错误消息：

```bash
⌛  Making the jump to hyperspace...
❌  could not connect to docker. docker may not be installed or running
```

通过确保以下内容来排查错误：

1. [正确的容器正在运行。]({{% ref "install-dapr-selfhost.md#step-4-verify-containers-are-running" %}})
1. 在 Docker Desktop 中，验证已选择 **Allow the default Docker socket to be used (requires password)** 选项。

   <img src="/images/docker-desktop-setting.png" width=800 style="padding-bottom:15px;">

## 我没有看到 Dapr 边车注入到我的 pod 中

边车可能无法注入到 pod 中有多种原因。
首先，检查您的 deployment 或 pod YAML 文件，并检查您是否在正确的位置具有以下注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "nodeapp"
  dapr.io/app-port: "3000"
```

### 示例 deployment：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodeapp
  namespace: default
  labels:
    app: node
spec:
  replicas: 1
  selector:
    matchLabels:
      app: node
  template:
    metadata:
      labels:
        app: node
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "nodeapp"
        dapr.io/app-port: "3000"
    spec:
      containers:
      - name: node
        image: dapriosamples/hello-k8s-node
        ports:
        - containerPort: 3000
        imagePullPolicy: Always
```

在某些已知情况下，这可能无法正常工作：

- 如果您的 pod 规范模板已正确注解，但您仍然没有看到边车注入，请确保 Dapr 在您的 deployment 或 pod 部署之前已部署到集群。

  如果是这种情况，重启 pod 将解决此问题。

- 如果您在私有 GKE 集群上部署 Dapr，边车注入在无需额外步骤的情况下无法工作。请参阅[设置 Google Kubernetes Engine 集群]({{% ref setup-gke.md %}})。

  为了进一步诊断任何问题，请检查 Dapr 边车注入器的日志：

  ```bash
   kubectl logs -l app=dapr-sidecar-injector -n dapr-system
  ```

  *注意：如果您将 Dapr 安装到不同的命名空间，请将上面的 dapr-system 替换为所需的命名空间*

- 如果您在 Amazon EKS 上部署 Dapr 并使用 Calico 等覆盖网络，您需要将 `hostNetwork` 参数设置为 true，这是使用此类 CNI 的 EKS 的限制。

  您可以使用 Helm `values.yaml` 文件设置此参数：

  ```
  helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --values values.yaml
  ```

  `values.yaml`
  ```yaml
  dapr_sidecar_injector:
    hostNetwork: true
  ```

  或使用命令行：

  ```
  helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set dapr_sidecar_injector.hostNetwork=true
  ```
  
- 确保 kube api 服务器可以到达以下 webhook 服务：
  - 从边车注入器提供的端口 __4000__ 上的 [Sidecar Mutating Webhook Injector Service](https://github.com/dapr/dapr/blob/44235fe8e8799589bb393a3124d2564db2dd6885/charts/dapr/charts/dapr_sidecar_injector/templates/dapr_sidecar_injector_deployment.yaml#L157)。
  - 从 operator 提供的端口 __19443__ 上的 [Resource Conversion Webhook Service](https://github.com/dapr/dapr/blob/44235fe8e8799589bb393a3124d2564db2dd6885/charts/dapr/charts/dapr_operator/templates/dapr_operator_service.yaml#L28)。
  
  请与您的集群管理员联系，以设置允许从 kube api 服务器到集群中上述端口 __4000__ 和 __19443__ 的入站规则。

## 我的 pod 处于 CrashLoopBackoff 或其他由于 daprd 边车导致的失败状态

如果 Dapr 边车 (`daprd`) 初始化时间过长，这可能被 Kubernetes 显示为运行状况检查失败。

如果您的 pod 处于失败状态，您应该检查以下内容：

```bash
kubectl describe pod <name-of-pod>
```

您可能会在命令输出的末尾看到如下表格：

```txt
  Normal   Created    7m41s (x2 over 8m2s)   kubelet, aks-agentpool-12499885-vmss000000  Created container daprd
  Normal   Started    7m41s (x2 over 8m2s)   kubelet, aks-agentpool-12499885-vmss000000  Started container daprd
  Warning  Unhealthy  7m28s (x5 over 7m58s)  kubelet, aks-agentpool-12499885-vmss000000  Readiness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused
  Warning  Unhealthy  7m25s (x6 over 7m55s)  kubelet, aks-agentpool-12499885-vmss000000  Liveness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused
  Normal   Killing    7m25s (x2 over 7m43s)  kubelet, aks-agentpool-12499885-vmss000000  Container daprd failed liveness probe, will be restarted
  Warning  BackOff    3m2s (x18 over 6m48s)  kubelet, aks-agentpool-12499885-vmss000000  Back-off restarting failed container
```

消息 `Container daprd failed liveness probe, will be restarted` 表示 Dapr 边车未能通过其运行状况检查并将被重启。消息 `Readiness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused` 和 `Liveness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused` 显示运行状况检查失败，因为无法建立到边车的连接。

此失败的最常见原因是组件（例如状态存储）配置错误，导致初始化时间过长。当初始化耗时较长时，运行状况检查可能会在边车记录任何有用的信息之前终止边车。

要诊断根本原因：

- 显著增加存活探针延迟 - [链接]({{% ref "arguments-annotations-overview.md" %}})
- 将边车的日志级别设置为 debug - [链接]({{% ref "logs-troubleshooting.md#setting-the-sidecar-log-level" %}})
- 观察日志以获取有意义的信息 - [链接]({{% ref "logs-troubleshooting.md#viewing-logs-on-kubernetes" %}})

> 请记得在解决问题后将存活检查延迟和日志级别配置回所需的值。

## 我无法保存状态或获取状态

您是否在集群中安装了 Dapr 状态存储？

要检查，请使用 kubectl 获取组件列表：

```bash
kubectl get components
```

如果没有状态存储组件，这意味着您需要设置一个。
访问[这里]({{% ref "state-management" %}})了解更多详情。

如果一切设置正确，请确保您的凭据正确。
搜索 Dapr 运行时日志并查找任何状态存储错误：

```bash
kubectl logs <name-of-pod> daprd
```

## 我无法发布和接收事件

您是否在集群中安装了 Dapr 消息总线？

要检查，请使用 kubectl 获取组件列表：

```bash
kubectl get components
```

如果没有发布订阅组件，这意味着您需要设置一个。
访问[这里]({{% ref "pubsub" %}})了解更多详情。

如果一切设置正确，请确保您的凭据正确。
搜索 Dapr 运行时日志并查找任何发布订阅错误：

```bash
kubectl logs <name-of-pod> daprd
```

## 调用 Dapr 时收到 500 错误响应

这意味着 Dapr 运行时内部存在一些问题。
要诊断，请查看边车的日志：

```bash
kubectl logs <name-of-pod> daprd
```

## 调用 Dapr 时收到 404 Not Found 响应

这意味着您正在尝试调用一个不存在或 URL 格式错误的 Dapr API 端点。
查看[这里]({{% ref "api" %}})的 Dapr API 参考，并确保您调用了正确的端点。

## 我没有看到来自其他服务的传入事件或调用

您是否指定了您的应用程序正在侦听的端口？
在 Kubernetes 中，确保指定了 `dapr.io/app-port` 注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "nodeapp"
  dapr.io/app-port: "3000"
```

如果使用 Dapr Standalone 和 Dapr CLI，请确保将 `--app-port` 标志传递给 `dapr run` 命令。

## 我的启用 Dapr 的应用程序行为不正确

首先要做的是检查从 Dapr API 返回的 HTTP 错误代码（如果有）。
如果您仍然找不到问题，请尝试为 Dapr 运行时启用 `debug` 日志级别。请参阅[这里]({{% ref "logs.md" %}})了解如何执行此操作。

您可能还希望查看您自己进程的错误日志。如果在 Kubernetes 上运行，请找到包含您的应用程序的 pod，并执行以下命令：

```bash
kubectl logs <pod-name> <name-of-your-container>
```

如果在 Standalone 模式下运行，您应该在主控制台会话中看到来自您应用程序的 stderr 和 stdout 输出。

## 在本地运行 Actors 时出现超时/连接错误

每个 Dapr 实例都会将其主机地址报告给 placement 服务。然后，placement 服务将节点表及其地址分发给所有 Dapr 实例。如果该主机地址不可达，您可能会遇到套接字超时错误或其他请求失败的变体。

除非通过将名为 `DAPR_HOST_IP` 的环境变量设置为可访问、可 ping 的地址来指定主机名，否则 Dapr 将循环遍历网络接口并选择它找到的第一个非环回地址。

如上所述，为了告诉 Dapr 应该使用什么主机名，只需设置一个名为 `DAPR_HOST_IP` 的环境变量。

以下示例展示了如何将主机 IP 环境变量设置为 `127.0.0.1`：

**注意：对于 <= 0.4.0 版本，使用 `HOST_IP`**

```bash
export DAPR_HOST_IP=127.0.0.1
```

## 当我的应用程序启动时，我的组件都没有被加载。我一直收到"Error component X cannot be found"

这通常是由于以下问题之一

- 您可能在本地定义了 `NAMESPACE` 环境变量，或者将组件部署到 Kubernetes 中的不同命名空间。检查您的应用程序和组件部署到哪个命名空间。阅读[将组件限定为一个或多个应用程序]({{% ref "component-scopes.md" %}})以获取更多信息。
- 您可能没有为 Dapr `run` 命令提供 `--resources-path`，或者没有将组件放入您操作系统的默认组件文件夹中。阅读[定义组件]({{% ref "get-started-component.md" %}})以获取更多信息。
- 您可能在组件 YAML 文件中有语法问题。使用组件 [YAML 示例]({{% ref "components.md" %}})检查您的组件 YAML。

## 服务调用失败，我的 Dapr 服务缺少 appId（macOS）

某些组织将实现过滤掉所有 UDP 流量的软件，这是 mDNS 所基于的。最常见的是，在 MacOS 上，`Microsoft Content Filter` 是罪魁祸首。

为了使 mDNS 正常运行，请确保 `Microsoft Content Filter` 处于非活动状态。

- 打开终端 shell。
- 输入 `mdatp system-extension network-filter disable` 并按回车键。
- 输入您的帐户密码。

当输出为"Success"时，Microsoft Content Filter 已被禁用。

> 某些组织会不时重新启用过滤器。如果您反复遇到 app-id 值缺失的情况，在进行更广泛的故障排除之前，请首先检查过滤器是否已重新启用。

## Admission webhook 拒绝了请求

您可能会遇到与以下类似的错误，由于 admission webhook 对服务帐户创建或修改资源有允许列表。

```
root:[dapr]$ kubectl run -i --tty --rm debug --image=busybox --restart=Never -- sh
Error from server: admission webhook "sidecar-injector.dapr.io" denied the request: service account 'user-xdd5l' not on the list of allowed controller accounts
```

要解决此错误，您应该为当前用户创建一个 `clusterrolebind`：

```bash
kubectl create clusterrolebinding dapr-<name-of-user> --clusterrole=dapr-operator-admin --user <name-of-user>
```

您可以运行以下命令来获取集群中的所有用户：

```bash
kubectl config get-users
```

您可以在[这里](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)了解更多关于 webhook 的信息。

## `dapr init` 期间端口不可用
在 Windows 上尝试执行 `dapr init` 后，您可能会遇到以下错误：

> PS C:\Users\You> dapr init
Making the jump to hyperspace...
Container images will be pulled from Docker Hub
Installing runtime version 1.14.4
Downloading binaries and setting up components...
docker: Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:52379 -> 0.0.0.0:0: listen tcp4 0.0.0.0:52379: bind: An attempt was made to access a socket in a way forbidden by its access permissions.

要解决此错误，请在提升的终端中打开命令提示符并运行：

```bash
net stop winnat
dapr init
net start winnat
```
