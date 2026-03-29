---
type: docs
title: "使用令牌认证对来自 Dapr 的请求进行身份验证"
linkTitle: "App API 令牌认证"
weight: 4000
description: "要求来自 Dapr 的每个入站 API 请求都包含身份验证令牌"
---

对于某些构建块，例如发布订阅、服务调用和输入绑定，Dapr 通过 HTTP 或 gRPC 与应用程序通信。
为了使应用程序能够对来自 Dapr 边车的传入请求进行身份验证，您可以配置 Dapr 在调用应用程序时发送 API 令牌，作为标头（在 HTTP 请求中）或元数据（在 gRPC 请求中）。

## 创建令牌

Dapr 使用共享令牌进行 API 身份验证。您可以自由定义要使用的 API 令牌。

虽然 Dapr 不对共享令牌施加任何格式限制，但一个良好的做法是生成一个随机字节序列并将其编码为 Base64。例如，以下命令生成一个随机的 32 字节密钥并将其编码为 Base64：

```sh
openssl rand 16 | base64
```

## 在 Dapr 中配置应用 API 令牌认证

令牌身份验证配置在 Kubernetes 或自托管 Dapr 部署中略有不同：

### 自托管

在自托管场景中，Dapr 会查找 `APP_API_TOKEN` 环境变量。如果在 `daprd` 进程启动时设置了该环境变量，Dapr 会在调用应用程序时包含令牌：

```shell
export APP_API_TOKEN=<token>
```

要轮换配置的令牌，请将 `APP_API_TOKEN` 环境变量更新为新值并重启 `daprd` 进程。

### Kubernetes

在 Kubernetes 部署中，Dapr 利用 Kubernetes secrets 存储来保存共享令牌。首先，创建一个新的 secret：

```shell
kubectl create secret generic app-api-token --from-literal=token=<token>
```

> 注意，上述 secret 需要在您希望启用应用令牌身份验证的每个命名空间中创建

要指示 Dapr 在向应用程序发送请求时使用 secret 中的令牌，请在您的 Deployment 模板规范中添加一个 annotation：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-token-secret: "app-api-token" # Kubernetes secret 的名称
```

部署后，Dapr Sidecar Injector 会自动创建 secret 引用并将实际值注入 `APP_API_TOKEN` 环境变量。

## 轮换令牌

### 自托管

要在自托管环境中轮换配置的令牌，请将 `APP_API_TOKEN` 环境变量更新为新值并重启 `daprd` 进程。

### Kubernetes

要在 Kubernetes 中轮换配置的令牌，请使用新令牌更新每个命名空间中先前创建的 secret。您可以使用 `kubectl patch` 命令执行此操作，但在每个命名空间中更新这些 secret 的更简单方法是使用清单：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-api-token
type: Opaque
data:
  token: <your-new-token>
```

然后将其应用到每个命名空间：

```shell
kubectl apply --file token-secret.yaml --namespace <namespace-name>
```

要告知 Dapr 开始使用新令牌，请触发每个部署的滚动升级：

```shell
kubectl rollout restart deployment/<deployment-name> --namespace <namespace-name>
```

> 假设您的服务配置了多个副本，密钥轮换过程不会导致任何停机时间。

## 对来自 Dapr 的请求进行身份验证

一旦使用环境变量或 Kubernetes secret `app-api-token` 配置了应用令牌身份验证，Dapr 边车在调用应用程序时始终包含 HTTP 标头/gRPC 元数据 `dapr-api-token: <token>`。在应用程序端，确保您使用 `dapr-api-token` 值进行身份验证，该值使用您设置的 `app-api-token` 来对来自 Dapr 的请求进行身份验证。

<img src="/images/tokens-auth.png" width=800 style="padding-bottom:15px;">

### HTTP

在您的代码中，在传入请求中查找 HTTP 标头 `dapr-api-token`：

```text
dapr-api-token: <token>
```

### gRPC

使用 gRPC 协议时，检查传入调用中的 gRPC 元数据上的 API 令牌：

```text
dapr-api-token[0].
```

## 从应用程序访问令牌

### Kubernetes

在 Kubernetes 中，建议将 secret 作为环境变量挂载到您的 pod 中。
假设我们创建了一个名为 `app-api-token` 的 secret 来保存令牌：

```yaml
containers:
  - name: mycontainer
    image: myregistry/myapp
    envFrom:
    - secretRef:
      name: app-api-token
```

### 自托管

在自托管模式下，您可以为应用程序将令牌设置为环境变量：

```sh
export APP_API_TOKEN=<my-app-token>
```

## 相关链接

- 了解 [Dapr 安全概念]({{% ref security-concept.md %}})
- 了解 [如何在 Dapr 中启用 API 令牌身份验证]({{% ref api-token.md %}})
