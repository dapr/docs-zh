---
type: docs
title: "安全"
linkTitle: "安全"
weight: 600
description: Dapr 如何在设计上考虑安全性
---

安全是 Dapr 的基础。本文介绍在分布式应用中使用 Dapr 时的安全特性和能力。这些可以划分为：

- 通过 service invocation 和 pub/sub API 进行安全通信。
- 通过组件应用并通过配置强制执行的安全策略。
- 运维安全实践。
- 状态安全，重点关注静态数据。

本文使用一个示例应用来说明 Dapr 中提供的许多安全特性。

# 安全通信

Dapr 通过 service invocation API 提供端到端安全，能够对应用进行 Dapr 身份验证，并设置端点访问策略。如下图所示。

{{< diagram security-end-to-end >}}

## 应用身份

在 Dapr 中，应用身份围绕 App ID 这一概念构建。
App ID 是 Dapr 中身份的唯一原子单元：

- 每个启用了 Dapr 的应用都有一个 App ID。应用的多个副本共享同一个 App ID。
- Dapr 中的所有 Routing、服务发现、安全策略和访问控制都源自这个 App ID。
- Dapr 中的服务间通信使用 App ID，而不依赖 IP 地址或主机名，从而实现跨环境的稳定、可移植寻址。

例如，当一个服务使用 Dapr 的 service invocation API 调用另一个服务时，它通过目标的 App ID 而不是网络位置来调用它。
这种抽象确保安全策略、双向 TLS（mTLS）证书和访问控制在应用身份层面保持一致地生效。

## Namespaces 与作用域

虽然 App ID 唯一标识应用，但 namespaces 提供了额外的作用域和隔离层，尤其是在多租户或大型环境中。

- Namespaces 允许操作员将 Dapr 应用部署到逻辑上隔离的分组中。
- 两个应用可以在不同的 namespaces 中拥有相同的 App ID 而不会冲突，因为安全、Routing 和发现都能感知 namespace。

## Service invocation 作用域访问策略

Dapr 应用可以按 namespace 限定作用域，用于部署和安全。你可以在部署到不同 namespaces 的服务之间进行调用。阅读[跨 namespaces 的 service invocation]({{% ref "service-invocation-namespaces" %}})文章了解更多详情。

Dapr 应用可以限制哪些操作可以被调用，包括允许（或拒绝）哪些应用调用它。阅读[如何：为 service invocation 应用访问控制列表配置]({{% ref invoke-allowlist %}})了解更多详情。

## Pub/sub topic 作用域访问策略

对于 pub/sub 组件，你可以限制哪些 topic 类型和应用被允许发布和订阅特定 topic。阅读[限定 Pub/Sub topic 访问]({{% ref "pubsub-scopes" %}})了解更多详情。

## 使用 mTLS 加密数据

Dapr 用于加密传输中数据的安全机制之一是[双向认证 TLS](https://en.wikipedia.org/wiki/Mutual_authentication)，即 mTLS。mTLS 为应用内的网络流量提供了几项关键特性：

- **双向认证**，客户端向服务器证明其身份，反之亦然。
- 在双向认证建立之后，为所有传输中的通信提供**加密通道**。

mTLS 几乎适用于所有场景，对于受 [HIPAA](https://en.wikipedia.org/wiki/Health_Insurance_Portability_and_Accountability_Act) 和 [PCI](https://en.wikipedia.org/wiki/Payment_Card_Industry_Data_Security_Standard) 等法规约束的系统尤其有用。

## Dapr 到 Dapr 的安全通信

在生产系统中，Dapr 无需额外代码或复杂配置即可启用 mTLS。同样，除非显式列出，Dapr sidecar 默认阻止 `localhost` 以外的所有 IP 地址调用它。

Dapr 内置了“默认开启”的自动 mTLS，为 Dapr sidecar 之间的流量提供传输中加密。为实现这一点，Dapr 利用名为 `Sentry` 的系统服务，它充当证书颁发机构（CA）/身份提供方，并对源自 Dapr sidecar 的工作负载（应用）证书请求进行签名。

默认情况下，工作负载证书的有效期为 24 小时，时钟偏差设置为 15 分钟。

除非你提供了已有的根证书，否则 Sentry 服务会自动创建并持久化有效期为一年的自签名根证书。Dapr 负责轮换工作负载证书；如果你自带证书，Dapr 同样会在对应用零停机的情况下完成轮换。

当根证书被替换时（Kubernetes 模式下为 secret，自托管模式下为文件系统），Sentry 会读取新证书并重建信任链，无需重启，且对 Sentry 本身零停机。

新的 Dapr sidecar 初始化时，会检查是否启用了 mTLS。如果已启用，则生成私钥和证书签名请求，并通过 gRPC 接口发送给 Sentry。Dapr sidecar 与 Sentry 之间的通信使用信任链证书进行身份验证，该证书由 sidecar injector 系统服务注入到每个 Dapr 实例中。

### 工作负载身份密钥算法

从 Dapr **1.18** 开始，Sentry 使用 **Ed25519** 生成工作负载身份密钥，而不再使用 ECDSA P-256。

| 范围 | 算法（1.18 之前） | 算法（1.18+） |
|---|---|---|
| 根 CA 和颁发者（issuer）CA 密钥 | ECDSA P-256（`ECDSAWithSHA256`） | Ed25519（`PureEd25519`） |
| 工作负载（sidecar）X.509 证书 | ECDSA P-256 | Ed25519 |
| Injector / Operator webhook 服务证书 | ECDSA P-256 | **RSA**（有意为之，见下文） |
| JWT / OIDC 签名 | RSA-2048 | RSA-2048（保持不变） |

**为什么选择 Ed25519？** Ed25519 密钥比 P-256 更小（私钥 32 字节；公钥 32 字节，而 P-256 未压缩公钥为 65 字节），签名为 64 字节（P-256 DER 格式约为 72 字节），签名与验证速度更快，并且其曲线设计消除了若干已知的侧信道攻击面。

**哪些仍使用 RSA？** Dapr injector 和 operator 的 webhook 服务证书使用 RSA 密钥。部分托管 Kubernetes 发行版（包括 GKE、EKS 和 AKS 的某些版本）会拒绝准入 webhook 端点上的 Ed25519 TLS 证书。因此这些位置保留 RSA，以确保 sidecar injector 和 CRD 转换 webhook 在所有目标环境中都可访问。详情参见 [dapr/dapr#9873](https://github.com/dapr/dapr/pull/9873)。

**JWT 签名**仍使用 RSA-2048，以兼容云服务商的 OIDC 实现。这些实现对 RSA 支持广泛，但对 Ed25519 的支持并不一致。

**混合版本滚动升级**完全受支持。Sentry 会为任何算法的客户端签署工作负载 CSR：签发证书所用的签名算法由 Sentry 的颁发者密钥决定，而不是由 CSR 决定。在滚动升级期间，提交 ECDSA CSR 的 1.17.x sidecar 会从 1.18 的 Sentry 获得由 Ed25519 签名的工作负载证书。

{{% alert title="FIPS / 受监管环境" color="warning" %}}
Ed25519（Curve25519）可能不满足 FIPS 140 的要求，请咨询你的合规负责人。FIPS 140-2 不包含 Ed25519。FIPS 140-3 对 EdDSA 提供了临时支持，但审批状态因模块和司法辖区而异。如果你的环境需要满足 FIPS 140 合规要求，请通过[自带证书]({{% ref "mtls#bringing-your-own-certificates" %}})的方式，提供使用已获批准算法（RSA 或 ECDSA P-256/P-384）生成的根证书和颁发者证书。当你自带 CA 时，Sentry 会使用你提供的颁发者密钥的算法对工作负载 CSR 签名，而不是 Ed25519。
{{% /alert %}}

{{% alert title="降级下限：1.17.7" color="warning" %}}
Sentry 会将使用 Ed25519 密钥的 CA bundle 写入 `dapr-trust-bundle` Kubernetes secret。**1.17.7 之前**的 Sentry 版本无法解析该 bundle，启动时会崩溃。在未先轮换 CA 的情况下，请勿从 1.18 或 1.19 回滚到 1.17.7 之前的版本。安全的回滚路径请参阅[降级]({{% ref "kubernetes-upgrade.md#downgrade" %}})。
{{% /alert %}}

### 工作负载证书中的容器镜像引用

从 Dapr **1.19** 开始，在 Kubernetes 上运行时，Sentry 会将请求方 pod 的容器镜像引用作为自定义 X.509 扩展写入其签发的每一份工作负载证书。这样，每份证书都携带一份可验证的记录，准确说明持有该证书的 pod 中调度了哪些软件（应用容器镜像和 daprd sidecar 镜像）。

这使安全和平台运维人员能够在身份层获得供应链溯源能力：

- 任何接收到 Dapr 工作负载证书的系统（mTLS 对端、存储证书链的审计日志、证明记录）都可以确定该工作负载运行的是哪些容器镜像，而无需工作负载本身配合。
- 证书及由其派生的记录可以与 CVE 公告交叉比对，从而标记运行过已知存在漏洞镜像的工作负载。
- [Workflow history signing]({{% ref "workflow-history-signing.md#software-provenance-which-images-executed-the-workflow" %}}) 会将签名证书与每个 workflow 的历史记录一并持久化，因此经过签名的 workflow 会自动携带一份与密码学绑定的记录，说明哪些软件执行了每个 workflow、activity 和 child workflow。

#### 信任模型

镜像数据来自 Sentry 在验证证书签名请求时读取的 Kubernetes pod 对象：优先从其 pod 缓存中获取（带有 `dapr.io/sidecar-injected` 标签的 pod）；对于不在缓存中的 pod，则从 Kubernetes API server 获取。工作负载从不自行上报其镜像：证书请求中不包含任何镜像字段，并且 Sentry 已有的检查会将 pod 与请求方绑定（对 pod 投射的 service account token 进行 Kubernetes TokenReview、service account 匹配，以及与 pod 注解中的 app-id 匹配）。工作负载无法伪造自己证书中的镜像列表，证书记录的是 Kubernetes 实际调度的内容。

#### 包含的内容

| 容器 | 是否包含 |
|---|---|
| 常规容器（`spec.containers`） | 始终包含，包括 `daprd` sidecar |
| 原生 sidecar 初始化容器（`spec.initContainers` 且 `restartPolicy: Always`） | 始终包含；启用[原生 sidecar 模式]({{% ref "arguments-annotations-overview" %}})时，由此捕获 daprd |
| 一次性初始化容器 | 从不包含 |

每个条目记录容器的角色（Dapr sidecar 容器为 `daprd`，其他所有容器为 `app`）、容器名称、按部署原样记录的镜像引用（即 pod 规范中的标签引用），并尽力记录从 pod 容器状态中解析出的镜像 digest。如果容器在签发时尚未启动，digest 可能为空（daprd 在 pod 生命周期早期就会请求证书）；由于工作负载证书寿命短且持续轮换，后续证书会以已填充的 digest 重新写入。

#### 线格式

该扩展由 OID `1.3.6.1.4.1.57683.100.1` 标识，它是 [Cloud Native Computing Foundation Private Enterprise Number](https://www.iana.org/assignments/enterprise-numbers/?q=57683)（57683）下的 Dapr 子分支。该扩展为**非关键（non-critical）**扩展，因此所有不理解它的现有 X.509 和 SPIFFE 使用方都会忽略它。

扩展值是一个 DER OCTET STRING，其内容为由以下字段组成的 JSON 对象数组：

| 字段 | 类型 | 说明 |
|---|---|---|
| `role` | string | `daprd` 表示 Dapr sidecar 容器，`app` 表示所有其他容器 |
| `containerName` | string | pod 规范中的容器名称 |
| `image` | string | 按部署原样记录的镜像引用，例如 `ghcr.io/dapr/daprd:1.19.0` |
| `digest` | string，可选 | 解析出的镜像 digest，例如 `sha256:1f8d...`；签发时未知则省略 |

解码方法：按 OID 找到该扩展，解包内层的 DER OCTET STRING，然后将得到的字节解析为 JSON。Go 示例如下：

```go
oid := asn1.ObjectIdentifier{1, 3, 6, 1, 4, 1, 57683, 100, 1}
for _, ext := range cert.Extensions {
    if !ext.Id.Equal(oid) {
        continue
    }
    var jsonBytes []byte
    if _, err := asn1.Unmarshal(ext.Value, &jsonBytes); err != nil {
        return err
    }
    var images []struct {
        Role          string `json:"role"`
        ContainerName string `json:"containerName"`
        Image         string `json:"image"`
        Digest        string `json:"digest,omitempty"`
    }
    if err := json.Unmarshal(jsonBytes, &images); err != nil {
        return err
    }
}
```

#### 可用范围

该扩展仅由 Kubernetes token validator 添加。通过 insecure validator（自托管模式）或 JWKS validator 签发的证书会省略该扩展，因为没有可供查询镜像数据的 pod。

### 配置 mTLS

可以通过编辑随 Dapr 部署的默认配置中的 `spec.mtls.enabled` 字段，来开启或关闭 mTLS。

[你可以在 Kubernetes 和自托管模式下执行此操作]({{% ref mtls %}})。

#### 自托管模式下的 mTLS

下图展示了 Sentry 系统服务如何根据操作员提供、或由 Sentry 服务生成并存储在文件中的根/颁发者证书为应用签发证书。

{{< diagram name="sentry-selfhosted" width="70" >}}

#### Kubernetes 模式下的 mTLS

在 Kubernetes 集群中，保存根证书的 secret 具有以下特点：

- 限定在部署 Dapr 组件的 namespace 内。
- 只能被 Dapr control plane 系统 pod 访问。

在 Kubernetes 上部署时，Dapr 还支持强身份，它依赖于随证书签名请求（CSR）一并发送给 Sentry 的 pod Service Account token。

下图展示了 Sentry 系统服务如何根据操作员提供、或由 Sentry 服务生成并存储为 Kubernetes secret 的根/颁发者证书为应用签发证书。

{{< diagram sentry-kubernetes >}}

### 防止通过 IP 地址访问 Dapr

为防止 Dapr sidecar 被任意 IP 地址调用（在 Kubernetes 等生产环境中尤其重要），Dapr 将其监听的 IP 地址限制为 `localhost`。如果需要允许来自外部地址的访问，请使用 [dapr-listen-addresses]({{%ref arguments-annotations-overview%}}) 设置。

## Dapr 到应用的安全通信

Dapr sidecar 通过 `localhost` 与应用紧邻运行，建议与应用处于同一网络边界之内。虽然当今许多云原生系统都将 pod 级别（例如在 Kubernetes 上）视为可信的安全边界，但 Dapr 通过令牌为应用提供 API 级别的身份验证。该特性可保证，即使在 `localhost` 上：

- 只有经过身份验证的应用才能调用 Dapr
- 应用可以检查回调它的是否为 Dapr

有关配置 API 令牌安全的更多详情，请阅读：

- [使用 API 令牌对应用发往 Dapr 的请求进行身份验证]({{% ref api-token %}})。
- [使用 API 令牌对 Dapr 发往应用的请求进行身份验证]({{% ref app-api-token %}})

## Dapr 到 control plane 的安全通信

除了 Dapr sidecar 之间的自动 mTLS，Dapr 还在以下组件之间提供强制 mTLS：

- Dapr sidecar
- Dapr control plane 系统服务，即：
  - Sentry 服务（证书颁发机构）
  - Placement 服务（actor placement）
  - Kubernetes Operator 服务

启用 mTLS 后，Sentry 会将根证书和颁发者证书写入限定在 control plane 所安装 namespace 内的 Kubernetes secret。在自托管模式下，Sentry 会将证书写入可配置的文件系统路径。

在 Kubernetes 中，Dapr 系统服务启动时会自动挂载并使用包含根证书和颁发者证书的 secret，以保护 Dapr sidecar 所使用的 gRPC 服务器。在自托管模式下，每个系统服务都可以挂载到一个文件系统路径以获取凭据。

Dapr sidecar 初始化时，会使用挂载的叶证书和颁发者私钥与系统 pod 进行身份验证。这些内容以环境变量的形式挂载到 sidecar 容器上。

### Kubernetes 中到系统服务的 mTLS

下图展示了 Dapr sidecar 与 Dapr Sentry（证书颁发机构）、Placement（actor placement）以及 Kubernetes Operator 系统服务之间的安全通信。

{{< diagram mtls-system-services >}}

# 运维安全

Dapr 的设计目标是让操作员管理 mTLS 证书并强制执行 OAuth 策略。

## mTLS 证书部署与轮换

虽然操作员和开发人员可以将自己的证书引入 Dapr，但 Dapr 会自动创建并持久化自签名的根证书和颁发者证书。阅读[设置并配置 mTLS 证书]({{% ref mtls %}})了解更多详情。

## 使用 OAuth 的 middleware 端点授权

借助 Dapr OAuth 2.0 middleware，你可以为 API 在 Dapr 端点上启用 OAuth 授权。阅读[使用 OAuth 配置端点授权]({{% ref oauth %}})了解详情。Dapr 还提供其他 middleware 组件，可用于 OpenID Connect 和 OPA 策略。更多详情请[阅读受支持的 middleware]({{% ref supported-middleware %}})。

## 网络安全

你可以采用常见的网络安全技术，例如网络安全组（NSG）、非军事区（DMZ）和防火墙，为网络资源提供多层防护。例如，除非配置为与外部 binding 目标通信，否则 Dapr sidecar 不会打开到互联网的连接，并且大多数 binding 实现只使用出站连接。你可以设计防火墙规则，仅允许通过指定端口的出站连接。

## 在 Kubernetes 中以非 root 用户运行
在 Kubernetes 中运行时，Dapr 服务会确保每个进程都以非 root 身份运行。做法是检查进程的 UID 和 GID 是否为 `65532`，如果不是预期值则直接致命报错。如果你必须在 Kubernetes 中使用非默认的 UID 和 GID，请设置以下环境变量以跳过此检查。
```bash
DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK="true"
```

# 安全策略

Dapr 提供了一套丰富的安全策略，可应用于你的应用。你可以通过 sidecar 配置中的策略设置，或通过组件规范，来限定它们能够执行的操作。

## API 访问策略

在某些场景下，例如零信任网络，或通过前端将 Dapr sidecar 暴露给外部流量时，建议只启用应用当前使用的 Dapr sidecar API。这样可以减少攻击面，并使 Dapr API 的范围与应用的实际需求保持一致。你可以在配置中设置 API 允许列表，来控制应用可以访问哪些 API，如下图所示。

{{< diagram name="api-scoping" width="80" >}}

阅读[如何：在 Dapr sidecar 上有选择地启用 Dapr API]({{% ref api-allowlist %}})了解更多详情。

## Secret scoping 访问策略

要限制 Dapr 应用对 secrets 的访问，你可以定义 secret scopes。在应用配置中添加一条权限受限的 secret scope 策略。阅读[如何：使用 secret scoping]({{% ref secret-scope %}})了解更多详情。

## 组件应用作用域访问策略与 secret 使用

Dapr 组件可以进行 namespace 划分。这意味着一个 Dapr sidecar 实例只能访问部署到同一 namespace 中的组件。阅读[如何：使用 namespaces 将组件限定到一个或多个应用]({{% ref component-scopes %}})了解更多详情。

Dapr 还支持应用级别的组件作用域：你可以指定哪些应用可以使用特定组件，并拒绝其他应用。阅读[使用作用域限制应用对组件的访问]({{% ref "component-scopes#application-access-to-components-with-scopes" %}})了解更多详情。

Dapr 组件可以使用 Dapr 内置的 secret 管理能力来管理 secrets。阅读 [secret store 概述]({{% ref secrets-overview %}})和[如何：在组件中引用 secrets]({{% ref component-secrets %}})了解更多详情。

## Workflow 访问控制

Dapr 通过 `WorkflowAccessPolicy` 资源，支持对跨应用的 workflow 和 activity 调度进行细粒度的访问控制。一个 workflow access policy 用于限制哪些调用方应用可以在目标应用上调度特定的 workflow 和 activity。

workflow access policy 在被调用方一侧作为纯允许列表强制执行。对于跨应用请求，调用方身份取自 mTLS 证书中嵌入的 [SPIFFE](https://spiffe.io/) 身份，因此要强制执行跨应用访问控制，必须启用 mTLS。自调用（调用方与目标为同一应用）始终被允许。策略支持对 workflow 和 activity 名称进行 glob 模式匹配。

阅读[如何：应用 workflow access policy]({{% ref workflow-access-policy %}})了解配置细节和示例。

## Bindings 安全

与 binding 目标的身份验证通过 binding 的配置文件进行配置。通常，你应当只配置所需的最小访问权限。例如，如果你只从 binding 目标读取数据，则应将 binding 配置为使用具有只读访问权限的账户。

# 状态安全

## state store 静态加密

默认情况下，Dapr 不会转换来自应用的状态数据。这意味着：

- Dapr 不会尝试对状态数据进行加密/解密
- 你的应用可以采用自己选择的加密/解密方法，此时状态数据对 Dapr 而言是不透明的。

Dapr 组件可以使用已配置的身份验证方式与底层 state store 进行身份验证。许多 state store 实现使用官方客户端库，这些库通常会与服务器建立安全的通信通道。

然而，在企业工作负载或受监管环境中，应用状态通常需要进行静态加密，以提供更强的安全性。Dapr 提供基于 AES256 的自动客户端状态加密。阅读[如何：加密应用状态]({{% ref howto-encrypt-state %}})了解更多详情。

## Dapr runtime 状态

Dapr runtime 不会在静态存储中保存任何数据，这意味着 Dapr runtime 的运行不依赖任何 state store，可被视为无状态的。

# 在示例应用中使用安全能力

下图展示了部署在 Kubernetes 上的示例应用中放置的若干安全能力。在该示例中，Dapr control plane、Redis state store 以及每个服务都部署在各自的 namespace 中。在 Kubernetes 上部署时，你可以使用常规的 Kubernetes RBAC 来控制对管理操作的访问。

在该应用中，请求由入口反向代理接收，该代理旁边运行着一个 Dapr sidecar。从反向代理出发，Dapr 使用 service invocation 调用 App A，App A 随后向 App B 发布一条消息。App B 获取一个 secret，以便读写 Redis state store 中的状态。

{{< diagram security-capabilities >}}

下面逐一介绍每项安全能力，以及它们如何保护该应用。

1. API 令牌身份验证确保反向代理知道它正在与正确的 Dapr sidecar 实例通信。这可防止消息被转发到除该 Dapr sidecar 之外的任何对象。
2. service invocation 的 mTLS 用于反向代理与 App A 之间的身份验证。在 App A 上配置的服务访问策略将其限制为只接收来自反向代理、且发往特定端点的调用，不接受其他服务的调用。
3. App B 使用 pub/sub topic 安全策略，表明它只能接收由 App A 发布的消息。
4. Redis 组件定义使用组件作用域安全策略，表明只允许 App B 调用它。
5. App B 将 Dapr sidecar 限制为只能使用 pub/sub、state management 和 secrets API。所有其他 API 调用（例如 service invocation）都将失败。
6. 在配置中设置的 secrets 安全策略限制了 App B 可以访问的 secrets。在本例中，App B 只能读取连接 Redis state store 组件所需的 secret，而不能读取其他 secret。
7. App B 部署在 namespace “B” 中，这进一步将其与其他服务隔离。即使为其启用了 service invocation API，也不会因为与 App A 处于同一 namespace 而被意外调用。App B 必须在其组件 YAML 文件中显式设置 Redis Host namespace，才能调用位于 “Redis” namespace 中的服务，否则该调用同样会失败。
8. Redis state store 中的数据在静态时加密，且只能使用配置正确的 Dapr Redis state store 组件读取。

# 威胁模型

威胁建模是一个通过以下方式进行的过程：

- 可以识别并枚举潜在威胁，例如结构性漏洞或缺乏适当的保障措施。
- 可以确定缓解措施的优先级。

Dapr 威胁模型如下。

{{< diagram security-threat-model >}}

## 安全审计

### 2023 年 9 月

2023 年 9 月，Dapr 完成了由 Ada Logics 进行的一次安全审计。

本次审计是一次全面的安全审计，目标如下：

- 形式化 Dapr 的威胁模型
- 进行人工代码审查
- 依据形式化的威胁模型评估 Dapr 的模糊测试套件
- 对 Dapr 进行 SLSA 审查

你可以在[此处](/docs/Dapr-september-2023-security-audit-report.pdf)找到完整报告。

审计发现了 7 个问题，其中没有高危或严重级别的问题。另有一个 CVE 被分配给 Dapr Components Contrib，其来源是一个第三方依赖中的问题。

### 2023 年 6 月

2023 年 6 月，Dapr 完成了由 Ada Logics 进行的模糊测试审计。

本次审计达成了以下成果：

- OSS-Fuzz 集成
- 为 Dapr 新增 39 个模糊测试器
- 覆盖 Dapr runtime、Kit 和 Components-contrib 的模糊测试
- 审计完成后，所有模糊测试器持续运行

你可以在[此处](/docs/Dapr-june-2023-fuzzing-audit-report.pdf)找到完整报告。

审计期间发现了 3 个问题。

### 2021 年 2 月

2021 年 2 月，Dapr 接受了由 Cure53 进行的第二次安全审计，审计目标为其 1.0 版本。

测试重点如下：

- 自上次审计以来的 Dapr runtime 代码库评估
- 访问控制列表
- secrets 管理
- 渗透测试
- 验证先前高危/中危问题的修复

你可以在[此处](/docs/Dapr-february-2021-security-audit-report.pdf)找到完整报告。

测试期间发现并修复了一个高危问题。

截至 2021 年 2 月 16 日，Dapr 有 0 个严重、0 个高危、0 个中危、2 个低危和 2 个信息级问题。

### 2020 年 6 月

2020 年 6 月，Dapr 接受了 Cure53 的安全审计。Cure53 是一家经 CNCF 认可的网络安全公司。

测试重点如下：

- Dapr runtime 代码库评估
- Dapr components 代码库评估
- Dapr CLI 代码库评估
- 权限提升
- 流量欺骗
- secrets 管理
- RBAC
- 验证基本假设：mTLS、作用域、API 身份验证
- 编排加固（Kubernetes）
- DoS 攻击
- 渗透测试

完整报告可在[此处](/docs/Dapr-july-2020-security-audit-report.pdf)找到。

## 报告安全问题

访问[此页面]({{% ref support-security-issues %}})，向 Dapr 维护者报告安全问题。

## 相关链接

[运维安全]({{% ref "security" %}})
