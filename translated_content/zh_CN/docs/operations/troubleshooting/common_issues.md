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

请按以下几点排查错误：

1. [正确的容器正在运行。]({{% ref "install-dapr-selfhost.md#step-4-verify-containers-are-running" %}})
1. 在 Docker Desktop 中，确认已选中 **Allow the default Docker socket to be used (requires password)** 选项。

   <img src="/images/docker-desktop-setting.png" width=800 style="padding-bottom:15px;">

## 我没有看到 Dapr 边车注入到我的 pod 中

边车可能无法注入到 pod 中，原因有多种。
首先，检查你的 deployment 或 pod YAML 文件，确认在正确的位置设置了以下注解：

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

已知某些情况下可能无法正常工作：

- 如果你的 pod 规范模板已正确添加注解，但仍然没有看到边车注入，请确保在部署你的 deployment 或 pod 之前，Dapr 已经部署到集群中。

  如果是这种情况，重启 pod 即可解决此问题。

- 如果你在私有 GKE 集群上部署 Dapr，边车注入需要额外的步骤才能生效。请参阅[设置 Google Kubernetes Engine 集群]({{% ref setup-gke.md %}})。

  为了进一步诊断问题，请检查 Dapr 边车注入器的日志：

  ```bash
   kubectl logs -l app=dapr-sidecar-injector -n dapr-system
  ```

  *注意：如果你将 Dapr 安装到了其他命名空间，请将上面的 dapr-system 替换为所需的命名空间*

- 如果你在 Amazon EKS 上部署 Dapr 并使用 Calico 等覆盖网络，则需要将 `hostNetwork` 参数设置为 true。这是 EKS 与此类 CNI 配合使用时的限制。

  你可以通过 Helm `values.yaml` 文件设置此参数：

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
  
- 请确保 kube api 服务器可以访问以下 webhook 服务：
  - [边车 Mutating Webhook 注入器服务](https://github.com/dapr/dapr/blob/44235fe8e8799589bb393a3124d2564db2dd6885/charts/dapr/charts/dapr_sidecar_injector/templates/dapr_sidecar_injector_deployment.yaml#L157)，端口 __4000__，由边车注入器提供。
  - [Resource Conversion Webhook Service](https://github.com/dapr/dapr/blob/44235fe8e8799589bb393a3124d2564db2dd6885/charts/dapr/charts/dapr_operator/templates/dapr_operator_service.yaml#L28)，端口 __19443__，由 operator 提供。
  
  请联系集群管理员，设置允许 kube api 服务器访问集群中上述端口 __4000__ 和 __19443__ 的入站规则。

## 我的 pod 处于 CrashLoopBackoff 或其他因 daprd 边车导致的失败状态

如果 Dapr 边车（`daprd`）初始化时间过长，Kubernetes 可能会将其显示为运行状况检查失败。

如果你的 pod 处于失败状态，应检查以下内容：

```bash
kubectl describe pod <name-of-pod>
```

你可能会在命令输出的末尾看到类似下面的表格：

```txt
  Normal   Created    7m41s (x2 over 8m2s)   kubelet, aks-agentpool-12499885-vmss000000  Created container daprd
  Normal   Started    7m41s (x2 over 8m2s)   kubelet, aks-agentpool-12499885-vmss000000  Started container daprd
  Warning  Unhealthy  7m28s (x5 over 7m58s)  kubelet, aks-agentpool-12499885-vmss000000  Readiness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused
  Warning  Unhealthy  7m25s (x6 over 7m55s)  kubelet, aks-agentpool-12499885-vmss000000  Liveness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused
  Normal   Killing    7m25s (x2 over 7m43s)  kubelet, aks-agentpool-12499885-vmss000000  Container daprd failed liveness probe, will be restarted
  Warning  BackOff    3m2s (x18 over 6m48s)  kubelet, aks-agentpool-12499885-vmss000000  Back-off restarting failed container
```

消息 `Container daprd failed liveness probe, will be restarted` 表示 Dapr 边车未通过运行状况检查，将被重启。消息 `Readiness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused` 和 `Liveness probe failed: Get http://10.244.1.10:3500/v1.0/healthz: dial tcp 10.244.1.10:3500: connect: connection refused` 表示运行状况检查失败，原因是无法建立到边车的连接。

此故障最常见的原因是某个组件（例如 state store）配置有误，导致初始化耗时过长。当初始化耗时较长时，运行状况检查可能会在边车输出任何有用的日志之前就终止边车。

要诊断根本原因：

- 显著增加存活探针的延迟时间 - [链接]({{% ref "arguments-annotations-overview.md" %}})
- 将边车的日志级别设置为 debug - [链接]({{% ref "logs-troubleshooting.md#setting-the-sidecar-log-level" %}})
- 观察日志，查找有用的信息 - [链接]({{% ref "logs-troubleshooting.md#viewing-logs-on-kubernetes" %}})

> 解决问题后，请记得将存活检查延迟和日志级别改回你所需的值。

## 我无法保存或获取状态

你是否在集群中安装了 Dapr state store？

要检查，请使用 kubectl 获取组件列表：

```bash
kubectl get components
```

如果没有 state store 组件，则说明你需要先设置一个。
请访问[此处]({{% ref "state-management" %}})了解详情。

如果一切设置正确，请确认凭据是否正确。
搜索 Dapr 运行时日志，查找 state store 错误：

```bash
kubectl logs <name-of-pod> daprd
```

## 我无法发布和接收事件

你是否在集群中安装了 Dapr 消息总线？

要检查，请使用 kubectl 获取组件列表：

```bash
kubectl get components
```

如果没有 pub/sub 组件，则说明你需要先设置一个。
请访问[此处]({{% ref "pubsub" %}})了解详情。

如果一切设置正确，请确认凭据是否正确。
搜索 Dapr 运行时日志，查找 pub/sub 错误：

```bash
kubectl logs <name-of-pod> daprd
```

## 调用 Dapr 时收到 500 错误响应

这意味着 Dapr 运行时内部出现了某些问题。
要诊断问题，请查看边车的日志：

```bash
kubectl logs <name-of-pod> daprd
```

## 调用 Dapr 时收到 404 Not Found 响应

这意味着你正在调用一个不存在的 Dapr API 端点，或者 URL 格式不正确。
请查看 Dapr API 参考[此处]({{% ref "api" %}})，并确保你调用的是正确的端点。

## 我没有收到来自其他服务的传入事件或调用

你是否指定了应用程序监听的端口？
在 Kubernetes 中，请确保指定了 `dapr.io/app-port` 注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "nodeapp"
  dapr.io/app-port: "3000"
```

如果使用 Dapr Standalone 和 Dapr CLI，请确保向 `dapr run` 命令传递了 `--app-port` 标志。

## 我的启用了 Dapr 的应用程序行为不正确

首先应检查 Dapr API 返回的 HTTP 错误代码（如果有）。
如果仍然找不到问题，请尝试为 Dapr 运行时启用 `debug` 日志级别。请参阅[此处]({{% ref "logs.md" %}})了解具体操作方法。

你可能还需要查看你自己进程的错误日志。如果在 Kubernetes 上运行，请找到包含你的应用程序的 pod，并执行以下命令：

```bash
kubectl logs <pod-name> <name-of-your-container>
```

如果以 Standalone 模式运行，你应该能在主控制台会话中看到应用程序的 stderr 和 stdout 输出。

## 在本地运行 Actor 时出现超时/连接错误

每个 Dapr 实例都会将其主机地址上报给放置服务（placement service）。然后，放置服务会将节点及其地址的表分发给所有 Dapr 实例。如果该主机地址不可达，你很可能会遇到套接字超时错误或其他各种请求失败错误。

除非通过将名为 `DAPR_HOST_IP` 的环境变量设置为可访问、可 ping 通的地址来指定主机名，否则 Dapr 会遍历网络接口，并选择找到的第一个非回环地址。

如上所述，要告诉 Dapr 应使用的主机名，只需设置名为 `DAPR_HOST_IP` 的环境变量即可。

以下示例展示了如何将主机 IP 环境变量设置为 `127.0.0.1`：

**注意：对于 <= 0.4.0 版本，请使用 `HOST_IP`**

```bash
export DAPR_HOST_IP=127.0.0.1
```

## 应用程序启动时没有加载任何组件，我一直收到 "Error component X cannot be found"

这通常是由以下问题之一导致的：

- 你可能在本地定义了 `NAMESPACE` 环境变量，或者将组件部署到了 Kubernetes 中的其他命名空间。请检查你的应用程序和组件部署到了哪个命名空间。有关详细信息，请阅读[将组件限定到一个或多个应用程序]({{% ref "component-scopes.md" %}})。
- 你可能没有为 Dapr `run` 命令提供 `--resources-path`，或者没有将组件放到你的操作系统的默认组件文件夹中。有关详细信息，请阅读[定义组件]({{% ref "get-started-component.md" %}})。
- 你的组件 YAML 文件中可能存在语法问题。请使用组件 [YAML 示例]({{% ref "components.md" %}})检查你的组件 YAML。

在本地运行时，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看每个应用程序已加载的组件，并流式查看 `daprd` 日志，以找出组件初始化错误。为避免 YAML 语法问题，你可以使用仪表板中的组件构建器创建组件文件。

## 服务调用失败，且我的 Dapr 服务缺少 appId（macOS）

某些组织部署的软件会过滤掉所有 UDP 流量，而 mDNS 正是基于 UDP 的。在 macOS 上，最常见的罪魁祸首是 `Microsoft Content Filter`。

要使 mDNS 正常工作，请确保 `Microsoft Content Filter` 处于非活动状态。

- 打开一个终端 shell。
- 输入 `mdatp system-extension network-filter disable` 并按回车键。
- 输入你的账户密码。

当输出为 "Success" 时，表示 Microsoft Content Filter 已被禁用。

> 某些组织会不时重新启用该过滤器。如果你反复遇到 app-id 缺失的情况，请先检查过滤器是否已被重新启用，再进行更深入的故障排除。

## Admission webhook 拒绝了请求

你可能会遇到与下面类似的错误，原因是边车注入器的 admission webhook 只处理来自已授权服务账号的请求。创建该 pod 的服务账号不在注入器的允许列表中。

```
root:[dapr]$ kubectl run -i --tty --rm debug --image=busybox --restart=Never -- sh
Error from server: admission webhook "sidecar-injector.dapr.io" denied the request: service account 'user-xdd5l' not on the list of allowed controller accounts
```

要解决此错误，可以采用以下任一方法：

1. 将该服务账号添加到注入器的授权列表中，方法是配置 `dapr_sidecar_injector.allowedServiceAccounts` Helm 值。支持 glob 模式（例如 `my-namespace:*` 可授权某个命名空间中的所有服务账号）。详情请参阅[边车注入器文档]({{% ref "sidecar-injector" %}})。

2. 或者为当前用户创建一个 `clusterrolebinding`：

   ```bash
   kubectl create clusterrolebinding dapr-<name-of-user> --clusterrole=dapr-operator-admin --user <name-of-user>
   ```

   你可以运行以下命令获取集群中的所有用户：

   ```bash
   kubectl config get-users
   ```

你可以在[这里](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)进一步了解 webhook。

## `dapr init` 期间端口不可用
在 Windows 上执行 `dapr init` 后，你可能会遇到以下错误：

> PS C:\Users\You> dapr init
Making the jump to hyperspace...
Container images will be pulled from Docker Hub
Installing runtime version 1.14.4
Downloading binaries and setting up components...
docker: Error response from daemon: Ports are not available: exposing port TCP 0.0.0.0:52379 -> 0.0.0.0:0: listen tcp4 0.0.0.0:52379: bind: An attempt was made to access a socket in a way forbidden by its access permissions.

要解决此错误，请在提升权限的终端中打开命令提示符，并运行：

```bash
net stop winnat
dapr init
net start winnat
```
