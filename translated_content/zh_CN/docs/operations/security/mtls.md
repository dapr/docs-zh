---
type: docs
title: "设置和配置 mTLS 证书"
linkTitle: "设置和配置 mTLS 证书"
weight: 1000
description: "使用自签名或用户提供的 x.509 证书加密应用程序之间的通信"
---

Dapr 支持通过 Dapr 控制平面 Sentry 服务对 Dapr 实例之间的通信进行传输中加密，该服务是一个中央证书颁发机构（CA）。

Dapr 允许操作员和开发者引入自己的证书，或者让 Dapr 自动创建并持久化自签名的根证书和颁发者证书。

有关 mTLS 的详细信息，请阅读[安全概念部分]({{% ref "security-concept.md" %}})。

如果未提供自定义证书，Dapr 会自动创建并持久化有效期为一年自签名证书。
在 Kubernetes 中，证书会被持久化到一个 secret 中，该 secret 位于 Dapr 系统 pod 的命名空间内，仅对它们可访问。
在自托管模式下，证书会被持久化到磁盘。

## 控制平面 Sentry 服务配置
mTLS 设置位于 Dapr 控制平面配置文件中。例如，当将 Dapr 控制平面部署到 Kubernetes 时，该配置文件会自动创建，然后您可以对其进行编辑。以下文件显示了配置资源中 mTLS 的可用设置，部署在 `daprsystem` 命名空间中：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

此文件显示了默认的 `daprsystem` 配置设置。下面的示例展示了如何在 Kubernetes 和自托管模式下更改并将此配置应用于控制平面 Sentry 服务。

## Kubernetes

### 使用配置资源设置 mTLS

在 Kubernetes 中，Dapr 会创建一个默认的控制平面配置资源，并启用 mTLS。
Sentry 服务（证书颁发机构系统 pod）在使用 Helm 和使用 `dapr init --kubernetes` 的 Dapr CLI 时都会安装。

您可以使用以下命令查看控制平面配置资源：

`kubectl get configurations/daprsystem --namespace <DAPR_NAMESPACE> -o yaml`。

要更改控制平面配置资源，请运行以下命令进行编辑：

```
kubectl edit configurations/daprsystem --namespace <DAPR_NAMESPACE>
```

保存更改后，执行控制平面的滚动更新：

```
kubectl rollout restart deploy/dapr-sentry -n <DAPR_NAMESPACE>
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
```

*注意：控制平面 Sidecar Injector 服务不需要重新部署*

### 使用 Helm 禁用 mTLS
*控制平面将继续使用 mTLS*

```bash
kubectl create ns dapr-system

helm install \
  --set global.mtls.enabled=false \
  --namespace dapr-system \
  dapr \
  dapr/dapr
```

### 使用 CLI 禁用 mTLS
*控制平面将继续使用 mTLS*

```
dapr init --kubernetes --enable-mtls=false
```

### 查看日志

要查看 Sentry 服务日志，请运行以下命令：

```
kubectl logs --selector=app=dapr-sentry --namespace <DAPR_NAMESPACE>
```
### 自带证书

使用 Helm，您可以提供 PEM 编码的根证书、颁发者证书和私钥，这些将被填充到 Sentry 服务使用的 Kubernetes secret 中。

{{% alert title="避免停机" color="warning" %}}
为了避免在轮换过期证书时出现停机，请始终使用相同的私用根密钥对证书进行签名。
{{% /alert %}}

_注意：此示例使用 OpenSSL 命令行工具，这是一个广泛分发的软件包，可以通过软件包管理器在 Linux 上轻松安装。在 Windows 上，可以使用 [chocolatey](https://community.chocolatey.org/packages/openssl) 安装 OpenSSL。在 MacOS 上可以使用 brew `brew install openssl` 安装_

创建用于生成证书的配置文件，这对于生成带有 SAN（主题备用名称）扩展字段的 v3 证书是必需的。首先将以下内容保存到名为 `root.conf` 的文件中：

```ini
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
C = US
ST = VA
L = Daprville
O = dapr.io/sentry
OU = dapr.io/sentry
CN = cluster.local
[v3_req]
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = cluster.local
```

为 `issuer.conf` 重复此操作，将相同的内容粘贴到文件中，但在 basicConstraints 行的末尾添加 `pathlen:0`，如下所示：

```ini
basicConstraints = critical, CA:true, pathlen:0
```

运行以下命令生成根证书和密钥

```bash
# 跳过以下行以重用现有的根密钥，这是轮换过期证书所必需的
openssl ecparam -genkey -name prime256v1 | openssl ec -out root.key
openssl req -new -nodes -sha256 -key root.key -out root.csr -config root.conf -extensions v3_req
openssl x509 -req -sha256 -days 365 -in root.csr -signkey root.key -outform PEM -out root.pem -extfile root.conf -extensions v3_req
```

接下来运行以下命令生成颁发者证书和密钥：

```bash
# 跳过以下行以重用现有的颁发者密钥，这是轮换过期证书所必需的
openssl ecparam -genkey -name prime256v1 | openssl ec -out issuer.key
openssl req -new -sha256 -key issuer.key -out issuer.csr -config issuer.conf -extensions v3_req
openssl x509 -req -in issuer.csr -CA root.pem -CAkey root.key -CAcreateserial -outform PEM -out issuer.pem -days 365 -sha256 -extfile issuer.conf -extensions v3_req
```

安装 Helm 并通过配置将根证书、颁发者证书和颁发者密钥传递给 Sentry：

```bash
kubectl create ns dapr-system

helm install \
  --set-file dapr_sentry.tls.issuer.certPEM=issuer.pem \
  --set-file dapr_sentry.tls.issuer.keyPEM=issuer.key \
  --set-file dapr_sentry.tls.root.certPEM=root.pem \
  --namespace dapr-system \
  dapr \
  dapr/dapr
```
### 使用 CLI 升级根和颁发者证书（推荐）
下面的 CLI 命令可用于在 Kubernetes 集群中续订根和颁发者证书。

#### 生成全新的证书

1. 下面的命令生成全新的根和颁发者证书，由新生成的私用根密钥签名。

> **注意：`Dapr Sentry 服务`和其余控制平面服务必须重启才能读取新证书。可以通过向命令提供 `--restart` 标志来完成。**

```bash
dapr mtls renew-certificate -k --valid-until <days> --restart
```
2. 下面的命令生成全新的根和颁发者证书，由提供的私用根密钥签名。

> **注意：如果您现有的部署证书由此相同的私用根密钥签名，则 `Dapr Sentry 服务`无需重启即可读取这些新证书。**

```bash
dapr mtls renew-certificate -k --private-key <private_key_file_path> --valid-until <days>
```
#### 使用提供的自定义证书续订证书
要更新 Kubernetes 集群中提供的证书，可以使用下面的 CLI 命令。

> **注意 - 它不支持 `valid-until` 标志来指定新证书的有效期。**

```bash
dapr mtls renew-certificate -k --ca-root-certificate <ca.crt> --issuer-private-key <issuer.key> --issuer-public-certificate <issuer.crt> --restart
```

{{% alert title="重启启用 Dapr 的 pod" color="warning" %}}
无论使用哪个命令来续订证书，都必须重启所有启用 Dapr 的 pod。
由于证书不匹配，在所有部署成功重启之前，您可能会遇到一些停机时间。
{{% /alert %}}
推荐的做法是对部署执行滚动重启：
```
kubectl rollout restart deploy/myapp
```

### 使用 Kubectl 更新根或颁发者证书

如果根证书或颁发者证书即将过期，您可以更新它们并重启所需的系统服务。

{{% alert title="轮换证书时避免停机" color="warning" %}}
为了避免在轮换过期证书时出现停机，您的新证书必须与之前的证书使用相同的私用根密钥签名。使用 Dapr 生成的自签名证书目前无法实现这一点。
{{% /alert %}}

#### Dapr 生成的自签名证书

1. 通过将以下 YAML 保存到文件（例如 `clear-trust-bundle.yaml`）并应用此 secret 来清除现有的 Dapr Trust Bundle secret。
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dapr-trust-bundle
  labels:
    app: dapr-sentry
data:
```

```bash
kubectl apply -f `clear-trust-bundle.yaml` -n <DAPR_NAMESPACE>
```

2. 重启 Dapr Sentry 服务。这将生成新的证书包并更新 `dapr-trust-bundle` Kubernetes secret。

```bash
kubectl rollout restart -n <DAPR_NAMESPACE> deployment/dapr-sentry
```

3. Sentry 服务重启后，重启 Dapr 控制平面的其余部分以获取新的 Dapr Trust Bundle。

```bash
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
kubectl rollout restart deploy/dapr-sidecar-injector -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-scheduler-server -n <DAPR_NAMESPACE>
```

4. 重启您的 Dapr 应用程序以获取最新的信任包。

{{% alert title="启用 mTLS 时可能出现的应用程序停机" color="warning" %}}
使用 mTLS 的服务间调用的部署重启将失败，直到被调用服务也已重启（从而加载新的 Dapr Trust Bundle）。此外，在应用程序重启以加载新的 Dapr Trust Bundle 之前，placement 服务将无法分配新的 actor（而现有 actor 不受影响）。
{{% /alert %}}

```bash
kubectl rollout restart deployment/mydaprservice1 kubectl deployment/myotherdaprservice2
```

#### 自定义证书（自带）

首先，使用[自带证书](#bringing-your-own-certificates)中的步骤颁发新证书。

现在您已拥有新证书，请使用 Helm 升级证书：

```bash
helm upgrade \
  --set-file dapr_sentry.tls.issuer.certPEM=issuer.pem \
  --set-file dapr_sentry.tls.issuer.keyPEM=issuer.key \
  --set-file dapr_sentry.tls.root.certPEM=root.pem \
  --namespace dapr-system \
  dapr \
  dapr/dapr
```

或者，您可以更新保存它们的 Kubernetes secret：

```bash
kubectl edit secret dapr-trust-bundle -n <DAPR_NAMESPACE>
```

用新证书中的相应值替换 Kubernetes secret 中的 `ca.crt`、`issuer.crt` 和 `issuer.key` 键。
*__注意：值必须是 base64 编码的__*

如果您使用**相同的私钥**签名了新的证书根，Dapr Sentry 服务将自动获取新证书。您可以使用 `kubectl rollout restart` 零停机地重启应用程序部署。只要在原始证书过期之前重启部署，就不必一次性重启所有部署。

如果您使用**不同的私钥**签名了新的证书根，则必须重启 Dapr Sentry 服务，然后是 Dapr 控制平面服务的其余部分。

```bash
kubectl rollout restart deploy/dapr-sentry -n <DAPR_NAMESPACE>
```

Sentry 完全重启后，运行：

```bash
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
```

接下来，您必须重启所有启用 Dapr 的 pod。
推荐的做法是对部署执行滚动重启：

```
kubectl rollout restart deploy/myapp
```

由于证书不匹配，在所有部署成功重启（从而加载新的 Dapr 证书）之前，您可能会遇到潜在的停机时间。

### Kubernetes 视频演示
观看此视频以了解如何在 Kubernetes 上更新 mTLS 证书

{{< youtube id=_U9wJqq-H1g start=872 >}}

### 为 Dapr 控制平面 mTLS 证书过期设置监控

从 mTLS 根证书过期前 30 天开始，Dapr sentry 服务将每小时发出警告级别日志，表明根证书即将过期。

作为在 生产环境中运行 Dapr 的操作最佳实践，我们建议配置对这些特定 sentry 服务日志的监控，以便您了解即将到来的证书过期。

```bash
"Dapr root certificate expiration warning: certificate expires in 2 days and 15 hours"
```

证书过期后，您将看到以下消息：

```bash
"Dapr root certificate expiration warning: certificate has expired."
```

在 Kubernetes 中，您可以这样查看 sentry 服务日志：

```bash
kubectl logs deployment/dapr-sentry -n dapr-system
```

日志输出将如下所示："

```bash
{"instance":"dapr-sentry-68cbf79bb9-gdqdv","level":"warning","msg":"Dapr root certificate expiration warning: certificate expires in 2 days and 15 hours","scope":"dapr.sentry","time":"2022-04-01T23:43:35.931825236Z","type":"log","ver":"1.6.0"}
```

作为提醒您即将到来的证书过期的附加工具，从 1.7.0 版本开始，CLI 现在会在您与基于 Kubernetes 的部署交互时打印证书过期状态。

示例：
```bash
dapr status -k

  NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION   AGE  CREATED
  dapr-operator          dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
  dapr-placement-server  dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.27
  dapr-dashboard         dapr-system  True     Running  1         0.15.0    4m   2025-02-19 17:36.27
  dapr-sentry            dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
  dapr-scheduler-server  dapr-system  True     Running  3         1.15.1    4m   2025-02-19 17:36.27
  dapr-sidecar-injector  dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
⚠  Dapr root certificate of your Kubernetes cluster expires in 2 days. Expiry date: Mon, 04 Apr 2025 15:01:03 UTC.
 Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```

## 自托管
### 运行控制平面 Sentry 服务

要运行 Sentry 服务，您可以从源代码构建，或从[这里](https://github.com/dapr/dapr/releases)下载发布二进制文件。

从源代码构建时，请参阅[此](https://github.com/dapr/dapr/blob/master/docs/development/developing-dapr.md#build-the-dapr-binaries)指南以了解如何构建 Dapr。

其次，为 Sentry 服务创建一个目录以创建自签名根证书：

```
mkdir -p $HOME/.dapr/certs
```

使用以下命令在本地运行 Sentry 服务：

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local
```

如果成功，Sentry 服务将运行并在给定目录中创建根证书。
此命令使用默认配置值，因为未给出自定义配置文件。请参阅下面有关如何使用自定义配置启动 Sentry 服务的信息。

### 使用配置资源设置 mTLS

#### Dapr 实例配置

在自托管模式下运行 Dapr 时，默认情况下禁用 mTLS。您可以通过创建以下配置文件来启用它：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: default
spec:
  mtls:
    enabled: true
```

除了 Dapr 配置外，您还需要为每个 Dapr sidecar 实例提供 TLS 证书。您可以通过在运行 Dapr 实例之前设置以下环境变量来做到这一点：

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}
```bash
export DAPR_TRUST_ANCHORS=`cat $HOME/.dapr/certs/ca.crt`
export DAPR_CERT_CHAIN=`cat $HOME/.dapr/certs/issuer.crt`
export DAPR_CERT_KEY=`cat $HOME/.dapr/certs/issuer.key`
export NAMESPACE=default
```

{{% /tab %}}

{{% tab "Windows" %}}
```powershell
$env:DAPR_TRUST_ANCHORS=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\ca.crt)
$env:DAPR_CERT_CHAIN=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.crt)
$env:DAPR_CERT_KEY=$(Get-Content -raw $env:USERPROFILE\.dapr\certs\issuer.key)
$env:NAMESPACE="default"
```

{{% /tab %}}

{{< /tabpane >}}

如果使用 Dapr CLI，请将 Dapr 指向上面的配置文件以运行启用 mTLS 的 Dapr 实例：

```
dapr run --app-id myapp --config ./config.yaml node myapp.js
```

如果直接使用 `daprd`，请使用以下标志启用 mTLS：

```bash
daprd --app-id myapp --enable-mtls --sentry-address localhost:50001 --config=./config.yaml
```

#### Sentry 服务配置

以下是 Sentry 的配置示例，将工作负载证书 TTL 更改为 25 秒：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "25s"
```

要使用自定义配置启动 Sentry 服务，请使用以下标志：

```
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local --config=./config.yaml
```

### 自带证书

要提供您自己的凭证，请创建 ECDSA PEM 编码的根和颁发者证书并将它们放置在文件系统上。
使用 `--issuer-credentials` 标志告诉 Sentry 服务从哪里加载证书。

下一个示例创建根和颁发者证书并使用 Sentry 服务加载它们。

*注意：此示例使用 step 工具创建证书。您可以从[这里](https://smallstep.com/docs/step-cli/installation)安装 step 工具。Windows 二进制文件可在[这里](https://github.com/smallstep/cli/releases)获取*

创建根证书：

```bash
step certificate create cluster.local ca.crt ca.key --profile root-ca --no-password --insecure
```

创建颁发者证书：

```bash
step certificate create cluster.local issuer.crt issuer.key --ca ca.crt --ca-key ca.key --profile intermediate-ca --not-after 8760h --no-password --insecure
```

这将创建根和颁发者证书和密钥。
将 `ca.crt`、`issuer.crt` 和 `issuer.key` 放在所需路径中（下面的示例中为 `$HOME/.dapr/certs`），并启动 Sentry：

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local
```

### 更新根或颁发者证书

如果根证书或颁发者证书即将过期，您可以更新它们并重启所需的系统服务。

要让 Dapr 生成新证书，请删除 `$HOME/.dapr/certs` 处的现有证书并重启 sentry 服务以生成新证书。

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local --config=./config.yaml
```

要替换为您自己的证书，首先使用[自带证书](#bringing-your-own-certificates)中的步骤生成新证书。

将 `ca.crt`、`issuer.crt` 和 `issuer.key` 复制到每个配置的系统服务的文件系统路径，并重启进程或容器。
默认情况下，系统服务将在 `/var/run/dapr/credentials` 中查找凭证。上面的示例使用 `$HOME/.dapr/certs` 作为自定义位置。

*注意：如果您使用不同的私钥签名了证书根，请重启 Dapr 实例。*

## 关于证书轮换的社区电话视频
观看此[视频](https://www.youtube.com/watch?v=Hkcx9kBDrAc&feature=youtu.be&t=1400)了解如果您的证书即将过期如何执行证书轮换。

{{< youtube id=Hkcx9kBDrAc start=1400 >}}

## Sentry 令牌验证器

令牌通常用于身份验证和授权目的。
令牌验证器是负责验证这些令牌的有效性和真实性的组件。
例如，在 Kubernetes 环境中，令牌验证的常见方法是通过 Kubernetes 绑定服务账户机制。
此验证器针对 Kubernetes 检查绑定的服务账户令牌，以确保其合法性。

Sentry 服务可以配置为：
- 除了 Kubernetes 绑定服务账户验证器之外，启用额外的令牌验证器
- 替换自托管模式下默认启用的 `insecure` 验证器

Sentry 令牌验证器用于将额外的非 Kubernetes 客户端加入以 Kubernetes 模式运行的 Dapr 集群，或替换自托管模式下不安全的"允许所有"验证器以启用适当的身份验证。
除非您使用的是特殊的部署场景，否则预计您不需要配置令牌验证器。

> 目前唯一支持的令牌验证器是 `jwks` 验证器。

### JWKS

`jwks` 验证器使 Sentry 服务能够使用 JWKS 端点验证 JWT 令牌。
令牌的内容_必须_包含与 Dapr 客户端的 SPIFFE 身份匹配的 `sub` 声明，采用相同的 Dapr 格式 `spiffe://<trust-domain>/ns/<namespace>/<app-id>`。
令牌的受众必须是 Sentry 身份的 SPIFFE ID，例如 `spiffe://cluster.local/ns/dapr-system/dapr-sentry`。
有关签名、过期等的基本 JWT 规则也适用。

`jwks` 验证器可以接受远程源来获取公钥列表或静态公钥数组。

下面的配置使用远程源启用 `jwks` 令牌验证器。
此远程源使用 HTTPS，因此 `caCertificate` 字段包含远程源的信任根。

```yaml
kind: Configuration
apiVersion: dapr.io/v1alpha1
metadata:
  name: sentryconfig
spec:
  mtls:
    enabled: true
    tokenValidators:
      - name: jwks
        options:
          minRefreshInterval: 2m
          requestTimeout: 1m
          source: "https://localhost:1234/"
          caCertificate: "<optional ca certificate bundle string>"
```

下面的配置使用静态公钥数组启用 `jwks` 令牌验证器。

```yaml
kind: Configuration
apiVersion: dapr.io/v1alpha1
metadata:
  name: sentryconfig
spec:
  mtls:
    enabled: true
    tokenValidators:
      - name: jwks
        options:
          minRefreshInterval: 2m
          requestTimeout: 1m
          source: |
            {"keys":[ "12345.." ]}
```
