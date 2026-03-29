---
type: docs
title: "在 Dapr 中启用 API 令牌身份验证"
linkTitle: "Dapr API 令牌身份验证"
weight: 3000
description: "要求每个传入的 Dapr API 请求都包含身份验证令牌，然后才允许该请求通过"
---

默认情况下，Dapr 依赖网络边界来限制对其公共 API 的访问。如果您计划将 Dapr API 暴露到该边界之外，或者您的部署需要额外的安全级别，请考虑为 Dapr API 启用令牌身份验证。这将导致 Dapr 要求每个传入的 gRPC 和 HTTP API 请求都包含身份验证令牌，然后才允许该请求通过。

## 创建令牌

Dapr 使用共享令牌进行 API 身份验证。您可以自由定义要使用的 API 令牌。

虽然 Dapr 对共享令牌的格式没有任何限制，但一个好的做法是生成一个随机字节序列并将其编码为 Base64。例如，以下命令生成一个随机的 32 字节密钥并将其编码为 Base64：

```sh
openssl rand 16 | base64
```

## 在 Dapr 中配置 API 令牌身份验证

令牌身份验证的配置在 Kubernetes 或自托管 Dapr 部署中略有不同：

### 自托管

在自托管场景中，Dapr 会检查是否存在 `DAPR_API_TOKEN` 环境变量。如果在 `daprd` 进程启动时设置了该环境变量，Dapr 将对其公共 API 强制执行身份验证：

```shell
export DAPR_API_TOKEN=<token>
```

要轮换已配置的令牌，请将 `DAPR_API_TOKEN` 环境变量更新为新值并重启 `daprd` 进程。

### Kubernetes

在 Kubernetes 部署中，Dapr 利用 Kubernetes 密钥存储来保存共享令牌。要配置 Dapr API 身份验证，首先创建一个新密钥：

```shell
kubectl create secret generic dapr-api-token --from-literal=token=<token>
```

> 注意，上述密钥需要在您希望启用 Dapr 令牌身份验证的每个命名空间中创建。

要指示 Dapr 使用该密钥来保护其公共 API，请在您的 Deployment 模板规范中添加注解：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/api-token-secret: "dapr-api-token" # Kubernetes 密钥的名称
```

部署后，Dapr 边车注入器将自动创建密钥引用并将实际值注入到 `DAPR_API_TOKEN` 环境变量中。

## 向客户端 API 调用添加 API 令牌

在 Dapr 中配置了令牌身份验证后，所有调用 Dapr API 的客户端都需要在每个请求中附加 `dapr-api-token` 令牌。

> **注意：** Dapr SDK 会读取 [DAPR_API_TOKEN]({{% ref environment %}}) 环境变量并默认为您设置，但是您仍必须确保您的应用程序有权访问该环境变量。

<img src="/images/tokens-auth.png" width=800 style="padding-bottom:15px;">

### HTTP

对于 HTTP，Dapr 要求在 `dapr-api-token` 标头中提供 API 令牌。例如：

```text
GET http://<daprAddress>/v1.0/metadata
dapr-api-token: <token>
```

使用 curl，您可以使用 `--header`（或 `-H`）选项传递标头。例如：

```sh
curl http://localhost:3500/v1.0/metadata \
  --header "dapr-api-token: my-token"
```

### gRPC

使用 gRPC 协议时，Dapr 将在 gRPC 元数据中检查传入调用是否包含 API 令牌：

```text
dapr-api-token[0].
```

## 从应用程序访问令牌

### Kubernetes

在 Kubernetes 中，当您的应用程序向 Dapr API 发起出站调用（服务调用 invoke、发布订阅 publish 等）时，需要将 API 令牌作为环境变量挂载到应用程序 Pod 中，否则请求将失败并返回 `Unauthorized` 错误。挂载环境变量是通过在应用程序 Pod 规范中提供 Kubernetes 密钥的名称来完成的，如下例所示，其中使用名为 `dapr-api-token` 的 Kubernetes 密钥来保存令牌。

```yaml
containers:
  - name: mycontainer
    image: myregistry/myapp
    env:
      - name: DAPR_API_TOKEN
        valueFrom:
          secretKeyRef:
            name: dapr-api-token
            key: token
```

### 自托管

在自托管模式下，您可以为应用程序将令牌设置为环境变量：

```sh
export DAPR_API_TOKEN=<my-dapr-token>
```

## 轮换令牌

### 自托管

要在自托管模式下轮换已配置的令牌，请将 `DAPR_API_TOKEN` 环境变量更新为新值并重启 `daprd` 进程。

### Kubernetes

要在 Kubernetes 中轮换已配置的令牌，请使用新令牌更新先前在每个命名空间中创建的密钥。您可以使用 `kubectl patch` 命令执行此操作，但在每个命名空间中更新这些密钥的一种更简单方法是使用清单：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dapr-api-token
type: Opaque
data:
  token: <your-new-token>
```

然后将其应用到每个命名空间：

```shell
kubectl apply --file token-secret.yaml --namespace <namespace-name>
```

要告诉 Dapr 开始使用新令牌，请对每个部署触发滚动升级：

```shell
kubectl rollout restart deployment/<deployment-name> --namespace <namespace-name>
```

> 假设您的服务配置了多个副本，密钥轮换过程不会导致任何停机时间。

## 相关链接

- 了解 [Dapr 安全概念]({{% ref security-concept.md %}})
- 了解 [如何使用令牌身份验证对来自 Dapr 的请求进行身份验证]({{% ref app-api-token.md %}})
