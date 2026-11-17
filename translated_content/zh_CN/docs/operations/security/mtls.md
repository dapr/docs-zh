---
type: docs
title: "设置和配置 mTLS 证书"
linkTitle: "设置和配置 mTLS 证书"
weight: 1000
description: "使用自签名或用户提供的 x.509 证书加密应用程序之间的通信"
---

Dapr 通过 Dapr control plane 中的 Sentry 服务，支持在 Dapr 实例之间的通信中进行传输中加密。Sentry 是一个中央证书颁发机构（CA）。

Dapr 允许操作员和开发者引入自己的证书，或者让 Dapr 自动创建并持久化自签名的根证书和颁发者证书。

有关 mTLS 的详细信息，请阅读[安全概念部分]({{% ref "security-concept.md" %}})。

## 工作负载身份密钥算法（Ed25519，Dapr 1.18+）{#workload-identity-key-algorithm}

从 Dapr **1.18** 开始，Sentry 使用 **Ed25519** 而不是 ECDSA P-256 来生成工作负载身份密钥。在常规安装或升级时，这一变化是透明的，无需修改配置。

关于变更内容、变更原因以及兼容性矩阵（包括 FIPS 要求和 1.17.7 降级下限，该下限同样适用于 1.19）的完整说明，请参阅安全概念页面中的[工作负载身份密钥算法]({{% ref "security-concept.md#workload-identity-key-algorithm" %}})。

{{% alert title="自带 CA" color="primary" %}}
当你提供自己的根证书和颁发者证书时，Sentry 会使用你提供的**颁发者密钥**所对应的算法来签署工作负载 CSR，而不是 Ed25519。如果你的 CA 密钥是 RSA 或 ECDSA，工作负载证书就会使用该算法签名。这是 FIPS 合规环境的推荐路径。
{{% /alert %}}

## 工作负载证书中的容器镜像引用（Kubernetes，Dapr 1.19+）{#container-image-references}

在 Kubernetes 上，Sentry 会把请求方 Pod 的容器镜像引用（daprd sidecar 镜像以及所有应用容器镜像，并尽力解析其 digest）作为非关键的 X.509 扩展嵌入每个工作负载证书中，OID 为 `1.3.6.1.4.1.57683.100.1`。这些数据来自 Sentry 从其 Pod 缓存或 Kubernetes API 服务器读取的 Pod 对象，而不是来自工作负载本身，因此证书请求方无法伪造。

无需任何配置：通过 Kubernetes 验证器签发的证书中始终包含该扩展。以自托管模式（不安全验证器）或通过 JWKS 验证器签发的证书则不包含该扩展。由于该扩展是非关键的，现有的使用方不受影响。

有关信任模型、确切的线格式以及如何解码该扩展，请参阅安全概念页面中的[工作负载证书中的容器镜像引用]({{% ref "security-concept.md#container-image-references-in-workload-certificates" %}})。

要查看已签发证书中的原始扩展，请使用 OpenSSL 检查工作负载证书，该扩展会以其 OID 显示在输出中：

```bash
openssl x509 -in workload-cert.pem -noout -text
```

```
X509v3 extensions:
    ...
    1.3.6.1.4.1.57683.100.1:
        .z[{"role":"daprd","containerName":"daprd","image":"ghcr.io/dapr/daprd:1.19.0","digest":"sha256:..."},...
```

JSON 之前的前导字节是内层 DER OCTET STRING 头。如需以编程方式解码，请按照概念页面中的说明操作。

如果未提供自定义证书，Dapr 会自动创建并持久化有效期为一年的自签名证书。
在 Kubernetes 中，证书会被持久化到一个 secret 中，该 secret 位于 Dapr 系统 Pod 的 namespace 内，仅对它们可访问。
在自托管模式下，证书会被持久化到磁盘。

## control plane Sentry 服务配置
mTLS 设置位于 Dapr control plane 的配置文件中。例如，将 Dapr control plane 部署到 Kubernetes 时会自动创建该配置文件，之后你可以对其进行编辑。下面的文件显示了部署在 `daprsystem` namespace 中的配置资源中 mTLS 的可用设置：

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

此文件显示了默认的 `daprsystem` 配置设置。下面的示例展示了如何在 Kubernetes 和自托管模式下更改此配置，并将其应用到 control plane 的 Sentry 服务。

## Kubernetes

### 使用配置资源设置 mTLS

在 Kubernetes 中，Dapr 会创建一个默认的 control plane 配置资源，并启用 mTLS。
Sentry 服务（证书颁发机构系统 Pod）在使用 Helm 以及使用 `dapr init --kubernetes` 的 Dapr CLI 时都会安装。

你可以使用以下命令查看 control plane 配置资源：

`kubectl get configurations/daprsystem --namespace <DAPR_NAMESPACE> -o yaml`。

要更改 control plane 配置资源，请运行以下命令进行编辑：

```
kubectl edit configurations/daprsystem --namespace <DAPR_NAMESPACE>
```

保存更改后，对 control plane 执行滚动更新：

```
kubectl rollout restart deploy/dapr-sentry -n <DAPR_NAMESPACE>
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
```

> **注意：** 当 Actor placement 由 Scheduler 服务提供时（`global.scheduler.placement.enabled=true`），不会部署 `dapr-placement-server` StatefulSet：请跳过上面的重启命令，改为运行 `kubectl rollout restart statefulsets/dapr-scheduler-server -n <DAPR_NAMESPACE>`。

*注意：无需重新部署 control plane 的注入器服务（Sidecar Injector）*

### 使用 Helm 禁用 mTLS
*control plane 将继续使用 mTLS*

```bash
kubectl create ns dapr-system

helm install \
  --set global.mtls.enabled=false \
  --namespace dapr-system \
  dapr \
  dapr/dapr
```

### 使用 CLI 禁用 mTLS
*control plane 将继续使用 mTLS*

```
dapr init --kubernetes --enable-mtls=false
```

### 查看日志

要查看 Sentry 服务日志，请运行以下命令：

```
kubectl logs --selector=app=dapr-sentry --namespace <DAPR_NAMESPACE>
```
### 自带证书

使用 Helm，你可以提供 PEM 编码的根证书、颁发者证书和私钥，这些内容将被填充到 Sentry 服务使用的 Kubernetes secret 中。

{{% alert title="避免停机" color="warning" %}}
为避免轮换过期证书时出现停机，请始终使用同一个私有根密钥对证书进行签名。
{{% /alert %}}

_注意：此示例使用 OpenSSL 命令行工具，这是一个广泛分发的软件包，可以通过 Linux 上的软件包管理器轻松安装。在 Windows 上，可以[使用 chocolatey](https://community.chocolatey.org/packages/openssl) 安装 OpenSSL。在 MacOS 上，可以使用 brew 安装：`brew install openssl`_

创建用于生成证书的配置文件，这对于生成带有 SAN（Subject Alt Name，主题备用名称）扩展字段的 v3 证书是必需的。首先将以下内容保存到名为 `root.conf` 的文件中：

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

为 `issuer.conf` 重复此操作，将相同的内容粘贴到文件中，但在 basicConstraints 行末尾添加 `pathlen:0`，如下所示：

```ini
basicConstraints = critical, CA:true, pathlen:0
```

运行以下命令生成根证书和密钥：

{{% alert title="Dapr 1.18+" color="primary" %}}
下面的示例会生成 ECDSA P-256 密钥。也接受 RSA 密钥（`openssl genrsa`）。当你提供自己的 CA 时，Sentry 会使用你提供的颁发者密钥所对应的算法来签署工作负载 CSR。ECDSA P-256 和 RSA 是 FIPS 合规环境的推荐选择。
{{% /alert %}}

```bash
# 若要复用现有的根密钥，请跳过以下行，这是轮换过期证书所必需的
openssl ecparam -genkey -name prime256v1 | openssl ec -out root.key
openssl req -new -nodes -sha256 -key root.key -out root.csr -config root.conf -extensions v3_req
openssl x509 -req -sha256 -days 365 -in root.csr -signkey root.key -outform PEM -out root.pem -extfile root.conf -extensions v3_req
```

接下来运行以下命令生成颁发者证书和密钥：

```bash
# 若要复用现有的颁发者密钥，请跳过以下行，这是轮换过期证书所必需的
openssl ecparam -genkey -name prime256v1 | openssl ec -out issuer.key
openssl req -new -sha256 -key issuer.key -out issuer.csr -config issuer.conf -extensions v3_req
openssl x509 -req -in issuer.csr -CA root.pem -CAkey root.key -CAcreateserial -outform PEM -out issuer.pem -days 365 -sha256 -extfile issuer.conf -extensions v3_req
```

安装 Helm，并通过配置将根证书、颁发者证书和颁发者密钥传递给 Sentry：

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
### 使用 CLI 升级根证书和颁发者证书（推荐）
下面的 CLI 命令可用于在 Kubernetes 集群中续订根证书和颁发者证书。

#### 生成全新的证书

1. 下面的命令会生成全新的根证书和颁发者证书，并由新生成的私有根密钥签名。

> **注意：`Dapr sentry service` 以及 control plane 的其余服务必须重启，才能读取新证书。可以为命令添加 `--restart` 标志来完成重启。**

```bash
dapr mtls renew-certificate -k --valid-until <days> --restart
```
2. 下面的命令会生成全新的根证书和颁发者证书，并由提供的私有根密钥签名。

> **注意：如果你现有部署的证书是由同一个私有根密钥签名的，则 `Dapr Sentry service` 无需重启即可读取这些新证书。**

```bash
dapr mtls renew-certificate -k --private-key <private_key_file_path> --valid-until <days>
```
#### 使用提供的自定义证书续订证书
要更新 Kubernetes 集群中提供的证书，可以使用下面的 CLI 命令。

> **注意：它不支持使用 `valid-until` 标志为新证书指定有效期。**

```bash
dapr mtls renew-certificate -k --ca-root-certificate <ca.crt> --issuer-private-key <issuer.key> --issuer-public-certificate <issuer.crt> --restart
```

{{% alert title="重启启用 Dapr 的 Pod" color="warning" %}}
无论使用哪个命令续订证书，都必须重启所有启用 Dapr 的 Pod。
由于证书不匹配，在所有部署成功重启之前，可能会出现一段停机时间。
{{% /alert %}}
推荐的做法是对部署执行滚动重启：
```
kubectl rollout restart deploy/myapp
```

### 使用 Kubectl 更新根证书或颁发者证书

如果根证书或颁发者证书即将过期，你可以更新它们并重启所需的系统服务。

> **注意：** 当 Actor placement 由 Scheduler 服务提供时（`global.scheduler.placement.enabled=true`），不会部署 `dapr-placement-server` StatefulSet：请跳过下面所有的 placement 服务重启命令。

{{% alert title="轮换证书时避免停机" color="warning" %}}
为避免轮换过期证书时出现停机，新证书必须与之前的证书由同一个私有根密钥签名。目前无法使用 Dapr 生成的自签名证书做到这一点。
{{% /alert %}}

#### Dapr 生成的自签名证书

1. 将以下 YAML 保存到文件（例如 `clear-trust-bundle.yaml`）并应用该 secret，以清除现有的 Dapr 信任包 secret。
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

2. 重启 Dapr Sentry 服务。这将生成新的证书包，并更新 `dapr-trust-bundle` Kubernetes secret。

```bash
kubectl rollout restart -n <DAPR_NAMESPACE> deployment/dapr-sentry
```

3. Sentry 服务重启后，重启 Dapr control plane 的其余部分，以加载新的 Dapr 信任包。

```bash
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
kubectl rollout restart deploy/dapr-sidecar-injector -n <DAPR_NAMESPACE>
if kubectl get statefulset.apps/dapr-scheduler-server -n <DAPR_NAMESPACE> >/dev/null 2>&1; then
  kubectl rollout restart statefulsets/dapr-scheduler-server -n <DAPR_NAMESPACE>
fi
```

4. 重启你的 Dapr 应用，以加载最新的信任包。

{{% alert title="启用 mTLS 时可能出现应用停机" color="warning" %}}
在被调用方服务也重启（从而加载新的 Dapr 信任包）之前，使用 mTLS 的 service to service invocation 部署的重启都会失败。此外，在应用重启以加载新的 Dapr 信任包之前，placement 服务将无法为新的 Actor 分配位置（已有的 Actor 不受影响）。
{{% /alert %}}

```bash
kubectl rollout restart deployment/mydaprservice1 kubectl deployment/myotherdaprservice2
```

#### 自定义证书（自带证书）

首先，使用上文[自带证书](#自带证书)中的步骤签发新证书。

现在你已经有了新证书，请使用 Helm 升级证书：

```bash
helm upgrade \
  --set-file dapr_sentry.tls.issuer.certPEM=issuer.pem \
  --set-file dapr_sentry.tls.issuer.keyPEM=issuer.key \
  --set-file dapr_sentry.tls.root.certPEM=root.pem \
  --namespace dapr-system \
  dapr \
  dapr/dapr
```

或者，你也可以直接更新保存这些证书的 Kubernetes 对象。信任包存储在 Dapr 系统 namespace 的两个对象中：`dapr-trust-bundle` **Secret** 保存根证书、颁发者证书和颁发者密钥，而 `dapr-trust-bundle` **ConfigMap** 则将公共根证书分发给系统的其余部分。Sentry 会将两者作为一对进行校验：如果 ConfigMap 中的根证书与 Secret 中的不一致，Sentry 会丢弃该信任包，并生成一个新的、有效期为 1 年的自签名 CA 取而代之，覆盖你刚刚应用的证书。Helm 和 Dapr CLI 会自动保持两个对象同步；使用 `kubectl` 更新时，你必须自行同时更新两者。

1. 更新 Secret：

    ```bash
    kubectl edit secret dapr-trust-bundle -n <DAPR_NAMESPACE>
    ```

    将 Kubernetes secret 中的 `ca.crt`、`issuer.crt` 和 `issuer.key` 键替换为新证书中对应的值。
    *__注意：这些值必须是 base64 编码的__*

2. 如果你替换了根证书（`ca.crt`），请使用完全相同的根证书更新 ConfigMap。注意 ConfigMap 中的值是纯 PEM，而不是 base64：

    ```bash
    kubectl create configmap dapr-trust-bundle --from-file=ca.crt=root.pem \
      --dry-run=client -o yaml | kubectl apply -n <DAPR_NAMESPACE> -f -
    ```

    ConfigMap 只包含根证书，因此如果 `ca.crt` 没有变化（例如，你只续订了颁发者证书和密钥），则跳过此步骤。

如果你使用**相同的私有密钥**签署了新的根证书，Dapr Sentry 服务会自动加载新证书。你可以使用 `kubectl rollout restart` 零停机地重启应用部署。只要在原证书过期之前完成重启，就无需一次性重启所有部署。

如果你使用**不同的私有密钥**签署了新的根证书，则必须先重启 Dapr Sentry 服务，然后再重启 Dapr control plane 的其余服务。

{{% alert title="Workflow history signing：轮换 CA 时保护长时间运行的 workflow" color="warning" %}}
如果你轮换到一个全新的根 CA（不同的私有密钥），任何带有[已签名历史]({{% ref "workflow-history-signing.md" %}})的正在运行的 workflow 都将无法通过签名验证，因为它们的签名证书由旧 CA 签发。这些 workflow 将被报告为 FAILED，错误类型为 `SignatureVerificationFailed`。

对于长时间运行的 workflow（任何可能超过 CA 有效期的 workflow，对于 Dapr 生成的自签名根证书，通常为一年），请提前规划：

- **首选：** 使用你之前使用的**同一根私有密钥**签署续订后的颁发者证书。已签名的 workflow 将继续针对同一根证书进行验证，因此你可以零停机地轮换叶子证书和颁发者证书。CLI 命令 `dapr mtls renew-certificate -k --private-key <existing-root-key> --valid-until <days>` 可以完成此操作。
- **自带 CA：** 生成你自己的根密钥，将其安全地存储（HSM 或 secret store），并在所有颁发者证书续订中复用。Dapr 生成的自签名根证书无法以这种方式复用。
- **最后手段：** 如果你必须轮换到新的根密钥，请先完成或[purge]({{% ref "howto-manage-workflow.md" %}})所有已签名的进行中 workflow。签名是单向承诺，因此在新的根密钥下无法重新签名。

有关完整指南，请参阅[长时间运行的 workflow 与根 CA 过期]({{% ref "workflow-history-signing.md#long-running-workflows-and-root-ca-expiry" %}})。
{{% /alert %}}

```bash
kubectl rollout restart deploy/dapr-sentry -n <DAPR_NAMESPACE>
```

Sentry 重新加载或重启后，请检查其日志，确认你的证书已被接受。如果你看到 `Root and issuer certs not found: generating self signed CA`，说明 ConfigMap 中的根证书与 Secret 不匹配，Sentry 已用新的自签名 CA 替换了你的证书。

Sentry 完全重启后，请运行：

```bash
kubectl rollout restart deploy/dapr-operator -n <DAPR_NAMESPACE>
kubectl rollout restart statefulsets/dapr-placement-server -n <DAPR_NAMESPACE>
if kubectl get statefulset.apps/dapr-scheduler-server -n <DAPR_NAMESPACE> >/dev/null 2>&1; then
  kubectl rollout restart statefulsets/dapr-scheduler-server -n <DAPR_NAMESPACE>
fi
```

接下来，你必须重启所有启用 Dapr 的 Pod。
推荐的做法是对部署执行滚动重启：

```
kubectl rollout restart deploy/myapp
```

在所有部署成功重启（从而加载新的 Dapr 证书）之前，由于证书不匹配，你可能会遇到停机。

### Kubernetes 视频演示
观看此视频，了解如何在 Kubernetes 上更新 mTLS 证书

{{< youtube id=_U9wJqq-H1g start=872 >}}

### 为 Dapr control plane 的 mTLS 证书过期设置监控

从 mTLS 根证书过期前 30 天开始，Dapr sentry 服务会每小时输出一次警告级别的日志，提示根证书即将过期。

作为在生产环境中运行 Dapr 的运维最佳实践，我们建议为这些 sentry 服务日志配置监控，以便你及时了解即将到来的证书过期。

```bash
"Dapr root certificate expiration warning: certificate expires in 2 days and 15 hours"
```

证书过期后，你将看到以下消息：

```bash
"Dapr root certificate expiration warning: certificate has expired."
```

在 Kubernetes 中，你可以这样查看 sentry 服务日志：

```bash
kubectl logs deployment/dapr-sentry -n dapr-system
```

日志输出类似如下：

```bash
{"instance":"dapr-sentry-68cbf79bb9-gdqdv","level":"warning","msg":"Dapr root certificate expiration warning: certificate expires in 2 days and 15 hours","scope":"dapr.sentry","time":"2022-04-01T23:43:35.931825236Z","type":"log","ver":"1.6.0"}
```

作为提醒即将过期的另一种工具，从 1.7.0 版本开始，每当你与基于 Kubernetes 的部署交互时，CLI 都会打印证书过期状态。

示例：
```bash
dapr status -k

  NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION   AGE  CREATED
  dapr-operator          dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
  dapr-placement-server  dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.27
  dapr-sentry            dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
  dapr-scheduler-server  dapr-system  True     Running  3         1.15.1    4m   2025-02-19 17:36.27
  dapr-sidecar-injector  dapr-system  True     Running  1         1.15.1    4m   2025-02-19 17:36.26
⚠  Dapr root certificate of your Kubernetes cluster expires in 2 days. Expiry date: Mon, 04 Apr 2025 15:01:03 UTC.
 Please see docs.dapr.io for certificate renewal instructions to avoid service interruptions.
```

## 自托管
### 运行 control plane Sentry 服务

要运行 Sentry 服务，你可以从源代码构建，也可以从[此处](https://github.com/dapr/dapr/releases)下载发行版二进制文件。

从源代码构建时，请参阅[此指南](https://github.com/dapr/dapr/blob/master/docs/development/developing-dapr.md#build-the-dapr-binaries)了解如何构建 Dapr。

其次，创建一个供 Sentry 服务生成自签名根证书的目录：

```
mkdir -p $HOME/.dapr/certs
```

使用以下命令在本地运行 Sentry 服务：

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local
```

如果运行成功，Sentry 服务会启动，并在指定目录中创建根证书。
由于没有提供自定义配置文件，此命令使用默认配置值。有关如何使用自定义配置启动 Sentry 服务，请参见下文。

### 使用配置资源设置 mTLS

#### Dapr 实例配置

在自托管模式下运行 Dapr 时，mTLS 默认是禁用的。你可以通过创建以下配置文件来启用它：

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

除了 Dapr 配置之外，你还需要为每个 Dapr sidecar 实例提供 TLS 证书。为此，请在运行 Dapr 实例之前设置以下环境变量：

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

如果使用 Dapr CLI，请指定上面的配置文件，以启用 mTLS 运行 Dapr 实例：

```
dapr run --app-id myapp --config ./config.yaml node myapp.js
```

如果直接使用 `daprd`，请使用以下标志启用 mTLS：

```bash
daprd --app-id myapp --enable-mtls --sentry-address localhost:50001 --config=./config.yaml
```

#### Sentry 服务配置

下面是一个 Sentry 配置示例，它将工作负载证书的 TTL 更改为 25 秒：

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

要提供你自己的凭据，请创建 PEM 编码的根证书和颁发者证书（RSA、ECDSA 或 Ed25519），并将它们放置在文件系统上。使用 `--issuer-credentials` 标志告诉 Sentry 服务从何处加载证书。

下面的示例会创建根证书和颁发者证书，并将它们加载到 Sentry 服务中。

*注意：此示例使用 step 工具创建证书。你可以从[此处](https://smallstep.com/docs/step-cli/installation)安装 step 工具。Windows 二进制文件可在[此处](https://github.com/smallstep/cli/releases)获取*

创建根证书：

```bash
step certificate create cluster.local ca.crt ca.key --profile root-ca --no-password --insecure
```

创建颁发者证书：

```bash
step certificate create cluster.local issuer.crt issuer.key --ca ca.crt --ca-key ca.key --profile intermediate-ca --not-after 8760h --no-password --insecure
```

这将创建根证书和颁发者证书及其密钥。将 `ca.crt`、`issuer.crt` 和 `issuer.key` 放置在所需路径（下面的示例中为 `$HOME/.dapr/certs`），然后启动 Sentry：

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local
```

### 更新根证书或颁发者证书

如果根证书或颁发者证书即将过期，你可以更新它们并重启所需的系统服务。

要让 Dapr 生成新证书，请删除 `$HOME/.dapr/certs` 中现有的证书，然后重启 sentry 服务以生成新证书。

```bash
./sentry --issuer-credentials $HOME/.dapr/certs --trust-domain cluster.local --config=./config.yaml
```

要替换为你自己的证书，请先使用上文[自带证书](#自带证书)中的步骤生成新证书。

将 `ca.crt`、`issuer.crt` 和 `issuer.key` 复制到每个已配置系统服务的文件系统路径，然后重启进程或容器。默认情况下，系统服务会在 `/var/run/dapr/credentials` 中查找凭据。上面的示例使用 `$HOME/.dapr/certs` 作为自定义位置。

*注意：如果你使用不同的私有密钥签署了根证书，请重启 Dapr 实例。*

{{% alert title="Workflow history signing：轮换 CA 时保护长时间运行的 workflow" color="warning" %}}
如果你轮换到一个全新的根 CA（不同的私有密钥），任何带有[已签名历史]({{% ref "workflow-history-signing.md" %}})的正在运行的 workflow 都将无法通过签名验证。要在自托管模式下避免这种情况，请使用**同一根私有密钥**（复用 `ca.key`）续订颁发者证书，或者在轮换到新的根密钥之前，完成并 purge 所有已签名的进行中 workflow。有关完整指南，请参阅[长时间运行的 workflow 与根 CA 过期]({{% ref "workflow-history-signing.md#long-running-workflows-and-root-ca-expiry" %}})。
{{% /alert %}}

## 关于证书轮换的社区会议视频
如果你的证书即将过期，请观看此[视频](https://www.youtube.com/watch?v=Hkcx9kBDrAc&feature=youtu.be&t=1400)，了解如何执行证书轮换。

{{< youtube id=Hkcx9kBDrAc start=1400 >}}

## Sentry 令牌验证器

令牌通常用于身份验证和授权。
令牌验证器是负责验证这些令牌有效性和真实性的 component。
例如，在 Kubernetes 环境中，常见的令牌验证方式是通过 Kubernetes bound service account 机制。该验证器会将绑定的 service account 令牌与 Kubernetes 进行核对，以确保其合法性。

Sentry 服务可以配置为：
- 启用 Kubernetes bound service account 验证器之外的额外令牌验证器
- 替换自托管模式下默认启用的 `insecure` 验证器

Sentry 令牌验证器用于将额外的非 Kubernetes 客户端加入以 Kubernetes 模式运行的 Dapr 集群，或者在自托管模式下替换不安全的“允许全部”验证器，以启用正确的身份验证。除非你使用特殊的部署场景，否则通常无需配置令牌验证器。

> 目前唯一支持的令牌验证器是 `jwks` 验证器。

### JWKS

`jwks` 验证器允许 Sentry 服务使用 JWKS 端点验证 JWT 令牌。令牌内容_必须_包含 `sub` 声明，且其值与 Dapr 客户端的 SPIFFE 身份相匹配，格式为 Dapr 的标准格式 `spiffe://<trust-domain>/ns/<namespace>/<app-id>`。令牌的受众（audience）必须是 Sentry 身份的 SPIFFE ID，例如 `spiffe://cluster.local/ns/dapr-system/dapr-sentry`。其他基本的 JWT 规则（如签名、过期时间等）同样适用。

`jwks` 验证器既可以接受用于获取公钥列表的远程源，也可以接受静态的公钥数组。

下面的配置使用远程源启用 `jwks` 令牌验证器。该远程源使用 HTTPS，因此 `caCertificate` 字段包含远程源的信任根。

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

## 相关链接

- [安全概念]({{% ref security-concept.md %}})
- [How-To：应用 workflow 访问策略]({{% ref workflow-access-policy.md %}})：mTLS 是跨应用 workflow 访问策略强制执行所必需的，因为调用方的身份取自 mTLS 证书中的 SPIFFE ID。
