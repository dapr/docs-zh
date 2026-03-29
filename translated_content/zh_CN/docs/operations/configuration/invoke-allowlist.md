---
type: docs
title: "如何：为服务调用应用访问控制列表配置"
linkTitle: "服务调用访问控制"
weight: 4000
description: "限制调用应用程序可以执行的操作"
---

使用访问控制，您可以配置策略，通过服务调用限制_调用_应用程序可以对_被调用_应用程序执行的操作。您可以在 Configuration 架构中定义访问控制策略规范来限制访问：
- 从特定操作到被调用应用程序，以及
- 从调用应用程序到 HTTP 动词。

访问控制策略在 Configuration 中指定，并应用于_被调用_应用程序的 Dapr 边车。对被调用应用程序的访问基于匹配的策略操作。

您可以为所有调用应用程序提供默认的全局操作。如果未指定访问控制策略，则默认行为是允许所有调用应用程序访问被调用应用程序。

[查看访问策略示例。](#example-scenarios)

## 术语

### `trustDomain`

"信任域"（trust domain）是管理信任关系的逻辑组。每个应用程序都分配有一个信任域，可以在访问控制列表策略规范中指定。如果未定义策略规范或指定了空的信任域，则使用默认值 "public"。此信任域用于在 TLS 证书中生成应用程序的身份。

### 应用程序身份

Dapr 请求 sentry 服务为所有应用程序生成 [SPIFFE](https://spiffe.io/) ID。此 ID 附加在 TLS 证书中。

SPIFFE ID 的格式为：`**spiffe://\<trustdomain>/ns/\<namespace\>/\<appid\>**`。

为了匹配策略，调用应用程序的信任域、命名空间和应用程序 ID 值从调用应用程序的 TLS 证书中的 SPIFFE ID 中提取。这些值与策略规范中指定的信任域、命名空间和应用程序 ID 值进行匹配。如果这三个值都匹配，则会进一步匹配更具体的策略。

## 配置属性

下表列出了访问控制、策略和操作的不同属性：

### 访问控制

| 属性      | 类型   | 描述 |
|---------------|--------|-------------|
| `defaultAction` | string | 当没有其他策略匹配时的全局默认操作
| `trustDomain`   | string | 分配给应用程序的信任域。默认为 "public"。
| `policies`      | string | 用于确定调用应用程序可以对被调用应用程序执行的操作的策略

### 策略

| 属性      | 类型   | 描述 |
|---------------|--------|-------------|
| `app`           | string | 要允许/拒绝服务调用的调用应用程序的 AppId
| `namespace`     | string | 需要与调用应用程序的命名空间匹配的命名空间值
| `trustDomain`   | string | 需要与调用应用程序的信任域匹配的信任域。默认为 "public"
| `defaultAction` | string | 应用程序级别的默认操作，当找到应用程序但没有匹配特定操作时使用
| `operations`    | string | 从调用应用程序允许的操作

### 操作

| 属性 | 类型   | 描述                                                  |
| -------- | ------ | ------------------------------------------------------------ |
| `name`     | string | 被调用应用程序上允许的操作的路径名称。可以在路径中使用通配符 "*" 进行匹配。可以使用通配符 "**" 在多个路径下进行匹配。 |
| `httpVerb` | list   | 列出调用应用程序可以使用的特定 http 动词。可以使用通配符 "*" 匹配任何 http 动词。对于 grpc 调用未使用。 |
| `action`   | string | 访问修饰符。接受的值为 "allow"（默认）或 "deny" |

## 策略规则

1. 如果未指定访问策略，则默认行为是允许所有应用程序访问被调用应用程序上的所有方法。
1. 如果未指定全局默认操作且未定义应用程序特定策略，则空访问策略被视为未指定访问策略。默认行为是允许所有应用程序访问被调用应用程序上的所有方法。
1. 如果未指定全局默认操作但已定义某些应用程序特定策略，则我们采用更安全的选项，即假设全局默认操作拒绝访问被调用应用程序上的所有方法。
1. 如果定义了访问策略并且无法验证传入应用程序的身份凭证，则全局默认操作生效。
1. 如果传入应用程序的信任域或命名空间与应用程序策略中指定的值不匹配，则应用程序策略将被忽略，全局默认操作生效。

## 策略优先级

与匹配的最具体策略对应的操作按以下顺序生效：
1. HTTP 情况下的特定 HTTP 动词，或 GRPC 情况下的操作级别操作。
1. 应用程序级别的默认操作
1. 全局级别的默认操作

## 示例场景

以下是一些使用服务调用访问控制列表的示例场景。请参阅[配置指南]({{% ref "configuration-concept.md" %}})以了解应用程序边车的可用配置设置。

### 场景 1： 

拒绝所有应用程序的访问，除了 `trustDomain` = `public`、`namespace` = `default`、`appId` = `app1`

使用此配置，允许 `appId` = `app1` 的所有调用方法。来自其他应用程序的所有其他调用请求都被拒绝。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: allow
      trustDomain: 'public'
      namespace: "default"
```

### 场景 2： 

拒绝所有应用程序的访问，除了 `trustDomain` = `public`、`namespace` = `default`、`appId` = `app1`、`operation` = `op1`

使用此配置，只允许 `appId` = `app1` 的方法 `op1`。来自所有其他应用程序的所有其他方法请求（包括 `app1` 上的其他方法）都被拒绝。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: deny
      trustDomain: 'public'
      namespace: "default"
      operations:
      - name: /op1
        httpVerb: ['*']
        action: allow
```

### 场景 3： 

拒绝所有应用程序的访问，除非匹配 HTTP 的特定动词和 GRPC 的特定操作

使用此配置，仅允许以下场景访问。来自所有其他应用程序的所有其他方法请求（包括 `app1` 或 `app2` 上的其他方法）都被拒绝。

- `trustDomain` = `public`、`namespace` = `default`、`appID` = `app1`、`operation` = `op1`、`httpVerb` = `POST`/`PUT`
- `trustDomain` = `"myDomain"`、`namespace` = `"ns1"`、`appID` = `app2`、`operation` = `op2` 且应用程序协议为 GRPC

只允许 `appId` = `app1` 的方法 `op1` 上的 `httpVerb` `POST`/`PUT`。来自所有其他应用程序的所有其他方法请求（包括 `app1` 上的其他方法）都被拒绝。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: deny
      trustDomain: 'public'
      namespace: "default"
      operations:
      - name: /op1
        httpVerb: ['POST', 'PUT']
        action: allow
    - appId: app2
      defaultAction: deny
      trustDomain: 'myDomain'
      namespace: "ns1"
      operations:
      - name: /op2
        action: allow
```

### 场景 4： 

允许所有方法的访问，除了 `trustDomain` = `public`、`namespace` = `default`、`appId` = `app1`、`operation` = `/op1/*`、所有 `httpVerb`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: allow
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: allow
      trustDomain: 'public'
      namespace: "default"
      operations:
      - name: /op1/*
        httpVerb: ['*']
        action: deny
```

### 场景 5： 

允许 `trustDomain` = `public`、`namespace` = `ns1`、`appId` = `app1` 的所有方法的访问，并拒绝 `trustDomain` = `public`、`namespace` = `ns2`、`appId` = `app1` 的所有方法的访问

此场景展示了如何指定具有相同应用程序 ID 但属于不同命名空间的应用程序。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: allow
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: allow
      trustDomain: 'public'
      namespace: "ns1"
    - appId: app1
      defaultAction: deny
      trustDomain: 'public'
      namespace: "ns2"
```

### 场景 6： 

允许所有方法的访问，除了 `trustDomain` = `public`、`namespace` = `default`、`appId` = `app1`、`operation` = `/op1/**/a`、所有 `httpVerb`

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  accessControl:
    defaultAction: allow
    trustDomain: "public"
    policies:
    - appId: app1
      defaultAction: allow
      trustDomain: 'public'
      namespace: "default"
      operations:
      - name: /op1/**/a
        httpVerb: ['*']
        action: deny
```

## "hello world" 示例

在这些示例中，您将学习如何对 [hello world](https://github.com/dapr/quickstarts/tree/master/tutorials) 教程应用访问控制。

访问控制列表依赖 Dapr [Sentry 服务]({{% ref "security-concept.md" %}}) 来生成带有用于身份验证的 SPIFFE ID 的 TLS 证书。这意味着 Sentry 服务必须在本地运行或部署到您的托管环境（例如 Kubernetes 集群）。

下面的 `nodeappconfig` 示例展示了如何**拒绝** `pythonapp` 对 `neworder` 方法的访问，其中 Python 应用程序位于 `myDomain` 信任域和 `default` 命名空间中。Node.js 应用程序位于 `public` 信任域中。

### nodeappconfig.yaml

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: nodeappconfig
spec:
  tracing:
    samplingRate: "1"
  accessControl:
    defaultAction: allow
    trustDomain: "public"
    policies:
    - appId: pythonapp
      defaultAction: allow
      trustDomain: 'myDomain'
      namespace: "default"
      operations:
      - name: /neworder
        httpVerb: ['POST']
        action: deny
```

### pythonappconfig.yaml

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pythonappconfig
spec:
  tracing:
    samplingRate: "1"
  accessControl:
    defaultAction: allow
    trustDomain: "myDomain"
```

### 自托管模式

在完成本教程时，您将：
- 在本地运行启用了 mTLS 的 Sentry 服务
- 设置必要的环境变量以访问证书
- 启动 Node 应用和 Python 应用，每个应用都引用 Sentry 服务以应用 ACL

#### 先决条件

- 熟悉在启用 mTLS 的情况下以自托管模式运行 [Sentry 服务]({{% ref "mtls.md" %}})
- 克隆 [hello world](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world/README.md) 教程

#### 运行 Node.js 应用

1. 在命令提示符中，设置这些环境变量：

    {{< tabpane text=true >}}

    {{% tab "Linux/MacOS" %}}

      ```bash
      export DAPR_TRUST_ANCHORS=`cat $HOME/.dapr/certs/ca.crt`
      export DAPR_CERT_CHAIN=`cat $HOME/.dapr/certs/issuer.crt`
      export DAPR_CERT_KEY=`cat $HOME/.dapr/certs/issuer.key`
      export NAMESPACE=default
      ```

    {{% /tab %}}

    {{% tab Windows %}}

      ```powershell
      $env:DAPR_TRUST_ANCHORS=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\ca.crt)
      $env:DAPR_CERT_CHAIN=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.crt)
      $env:DAPR_CERT_KEY=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.key)
      $env:NAMESPACE="default"
      ```

    {{% /tab %}}
    
    {{< /tabpane >}}

1. 运行 daprd 以启动 Node.js 应用的 Dapr 边车，启用 mTLS，并引用本地 Sentry 服务：

   ```bash
   daprd --app-id nodeapp --dapr-grpc-port 50002 -dapr-http-port 3501 --log-level debug --app-port 3000 --enable-mtls --sentry-address localhost:50001 --config nodeappconfig.yaml
   ```

1. 在单独的命令提示符中运行 Node.js 应用：

   ```bash
   node app.js
   ```

#### 运行 Python 应用

1. 在另一个命令提示符中，设置这些环境变量：

    {{< tabpane text=true >}}

    {{% tab "Linux/MacOS" %}}

    ```bash
    export DAPR_TRUST_ANCHORS=`cat $HOME/.dapr/certs/ca.crt`
    export DAPR_CERT_CHAIN=`cat $HOME/.dapr/certs/issuer.crt`
    export DAPR_CERT_KEY=`cat $HOME/.dapr/certs/issuer.key`
    export NAMESPACE=default
   ```
   {{% /tab %}}

   {{% tab Windows %}}

   ```powershell
   $env:DAPR_TRUST_ANCHORS=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\ca.crt)
   $env:DAPR_CERT_CHAIN=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.crt)
   $env:DAPR_CERT_KEY=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.key)
   $env:NAMESPACE="default"
   ```
  
   {{% /tab %}}

   {{< /tabpane >}}

1. 运行 daprd 以启动 Python 应用的 Dapr 边车，启用 mTLS，并引用本地 Sentry 服务：

   ```bash
   daprd --app-id pythonapp   --dapr-grpc-port 50003 --metrics-port 9092 --log-level debug --enable-mtls --sentry-address localhost:50001 --config pythonappconfig.yaml
   ```
1. 在单独的命令提示符中运行 Python 应用：

   ```bash
   python app.py
   ```

您应该看到在 Python 应用命令提示符中调用 Node.js 应用失败，这是由于 `nodeappconfig` 文件中的 **deny** 操作操作。将此操作更改为 **allow** 并重新运行应用程序以查看此调用成功。

### Kubernetes 模式

#### 先决条件

- 熟悉在启用 mTLS 的情况下以自托管模式运行 [Sentry 服务]({{% ref "mtls.md" %}})
- 克隆 [hello world](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world/README.md) 教程

#### 配置 Node.js 和 Python 应用

您可以创建并应用上述 [`nodeappconfig.yaml`](#nodeappconfigyaml) 和 [`pythonappconfig.yaml`](#pythonappconfigyaml) 配置文件，如[配置]({{% ref "configuration-concept.md" %}})中所述。

例如，下面的 Kubernetes Deployment 展示了如何将 Python 应用部署到 Kubernetes 集群的 default 命名空间中，并使用此 `pythonappconfig` 配置文件。

对 Node.js 部署执行相同的操作，并查看 Python 应用的日志，以查看由于 `nodeappconfig` 文件中设置的 **deny** 操作操作而导致的调用失败。

将此操作更改为 **allow** 并重新部署应用程序以查看此调用成功。

##### Deployment YAML 示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pythonapp
  namespace: default
  labels:
    app: python
spec:
  replicas: 1
  selector:
    matchLabels:
      app: python
  template:
    metadata:
      labels:
        app: python
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "pythonapp"
        dapr.io/config: "pythonappconfig"
    spec:
      containers:
      - name: python
        image: dapriosamples/hello-k8s-python:edge
```

## 演示

观看此[视频](https://youtu.be/j99RN_nxExA?t=1108)，了解如何为服务调用应用访问控制列表。

{{< youtube id=j99RN_nxExA start=1108 >}}

## 后续步骤

{{< button text="Dapr API 允许列表" page="api-allowlist.md" >}}
