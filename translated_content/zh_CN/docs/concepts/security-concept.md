---
type: docs
title: "安全"
linkTitle: "安全"
weight: 600
description: Dapr 如何在设计上考虑安全性
---

安全是 Dapr 的基础。本文介绍了在分布式应用中使用 Dapr 时的安全功能和能力。这些可以划分为：

- 通过服务调用和发布订阅 API 进行安全通信。
- 通过组件应用并通过配置强制执行的安全策略。
- 运维安全实践。
- 状态安全，重点关注静态数据。

本文使用一个示例应用来说明 Dapr 中提供的许多安全功能。

# 安全通信

Dapr 通过服务调用 API 提供端到端安全，能够对应用进行 Dapr 身份验证并设置端点访问策略。如下图所示。

<img src="/images/security-end-to-end-communication.png width=1000>

## 应用身份

在 Dapr 中，应用身份围绕应用 ID（App ID）的概念构建。
应用 ID 是 Dapr 中身份的单一原子单元：

- 每个 Dapr 应用都有一个应用 ID。应用的多个副本共享同一个应用 ID。
- Dapr 中的所有路由、服务发现、安全策略和访问控制都源自这个应用 ID。
- Dapr 中的服务间通信使用应用 ID 而不依赖 IP 地址或主机名，从而实现跨环境的稳定和可移植寻址。

例如，当一个服务使用 Dapr 的服务调用 API 调用另一个服务时，它通过应用 ID 而不是网络位置来调用目标。
这种抽象确保安全策略、双向 TLS（mTLS）证书和访问控制在应用身份级别一致应用。

## 命名空间和作用域

虽然应用 ID 唯一标识应用，但命名空间提供了一层额外的作用域和隔离，特别是在多租户或大型环境中。

- 命名空间允许操作员在逻辑分离的组中部署 Dapr 应用。
- 两个应用可以在不同的命名空间中拥有相同的应用 ID 而不会冲突，因为安全、路由和发现是命名空间感知的。

## 服务调用作用域访问策略

Dapr 应用可以限定到命名空间进行部署和安全。您可以部署在不同命名空间的服务之间进行调用。阅读[跨命名空间的服务调用]({{% ref "service-invocation-namespaces" %}})文章了解更多详情。

Dapr 应用可以限制哪些操作可以被调用，包括允许（或拒绝）哪些应用调用它。阅读[如何：为服务调用应用访问控制列表配置]({{% ref invoke-allowlist %}})了解更多详情。

## 发布订阅主题作用域访问策略

对于发布订阅组件，您可以限制哪些主题类型和应用被允许发布和订阅特定主题。阅读[限定发布/订阅主题访问]({{% ref "pubsub-scopes" %}})了解更多详情。

## 使用 mTLS 加密数据

Dapr 用于加密传输中数据的安全机制之一是[双向认证 TLS](https://en.wikipedia.org/wiki/Mutual_authentication)或 mTLS。mTLS 为应用内的网络流量提供了几个关键功能：

- **双向认证**，客户端向服务器证明其身份，反之亦然。
- 建立双向认证后，为所有传输中通信提供**加密通道**。

mTLS 在几乎所有场景中都很有用，特别是对于受 [HIPAA](https://en.wikipedia.org/wiki/Health_Insurance_Portability_and_Accountability_Act) 和 [PCI](https://en.wikipedia.org/wiki/Payment_Card_Industry_Data_Security_Standard) 等法规约束的系统。

## 安全的 Dapr 到 Dapr 通信

Dapr 在您的生产系统中无需额外代码或复杂配置即可启用 mTLS。同样，除非明确列出，Dapr 边车默认阻止除 `localhost` 外的所有 IP 地址调用它。

Dapr 包含"默认启用"的自动 mTLS，为 Dapr 边车之间的流量提供传输中加密。为实现这一点，Dapr 利用名为 `Sentry` 的系统服务，它充当证书颁发机构（CA）/身份提供者并签署源自 Dapr 边车的工作负载（应用）证书请求。

默认情况下，工作负载证书有效期为 24 小时，时钟偏差设置为 15 分钟。

除非您提供了现有的根证书，否则 Sentry 服务会自动创建并持久化有效期为一年自签名根证书。Dapr 管理工作负载证书轮换；如果您自带证书，Dapr 会这样做而不会对应用造成停机。

当根证书被替换时（Kubernetes 模式下的 secret 和自托管模式的文件系统），Sentry 会获取它们并重建信任链，无需重启且对 Sentry 零停机。

当新的 Dapr 边车初始化时，它会检查是否启用了 mTLS。如果启用，则会生成 ECDSA 私钥和证书签名请求，并通过 gRPC 接口发送到 Sentry。Dapr 边车与 Sentry 之间的通信使用信任链证书进行身份验证，该证书由 Dapr 边车注入器系统服务注入到每个 Dapr 实例中。

### 配置 mTLS

可以通过编辑通过 `spec.mtls.enabled` 字段部署的 Dapr 默认配置来开启/关闭 mTLS。

[您可以在 Kubernetes 和自托管模式下执行此操作]({{% ref mtls %}})。

#### 自托管模式下的 mTLS

下图显示了 Sentry 系统服务如何根据操作员提供或由 Sentry 服务生成并存储在文件中的根/颁发者证书为应用颁发证书。

<img src="/images/security-mTLS-sentry-selfhosted.png width=1000>

#### Kubernetes 模式下的 mTLS

在 Kubernetes 集群中，保存根证书的 secret 是：

- 限定到部署 Dapr 组件的命名空间。
- 只能由 Dapr 控制平面系统 pod 访问。

当部署在 Kubernetes 上时，Dapr 还支持强身份，依赖于 pod 的服务帐户令牌，该令牌作为证书签名请求（CSR）的一部分发送给 Sentry。

下图显示了 Sentry 系统服务如何根据操作员提供或由 Sentry 服务生成并存储为 Kubernetes secret 的根/颁发者证书为应用颁发证书

<img src="/images/security-mTLS-sentry-kubernetes.png width=1000>

### 防止 Dapr 上的 IP 地址

为了防止 Dapr 边车在任何 IP 地址上被调用（特别是在 Kubernetes 等生产环境中），Dapr 将其侦听 IP 地址限制为 `localhost`。如果需要启用来自外部地址的访问，请使用 [dapr-listen-addresses]({{%ref arguments-annotations-overview%}}) 设置。

## 安全的 Dapr 到应用通信

Dapr 边车通过 `localhost` 在应用附近运行，建议运行在与应用相同的网络边界下。虽然当今许多云原生系统认为 pod 级别（例如在 Kubernetes 上）是可信的安全边界，但 Dapr 使用令牌为应用提供 API 级身份验证。此功能保证，即使在 `localhost` 上：

- 只有经过身份验证的应用才能调用 Dapr
- 应用可以检查 Dapr 是否正在回调它

有关配置 API 令牌安全的更多详细信息，请阅读：

- [使用 API 令牌对从应用到 Dapr 的请求进行身份验证]({{% ref api-token %}})。
- [使用 API 令牌对从 Dapr 到应用的请求进行身份验证]({{% ref app-api-token %}})

## 安全的 Dapr 到控制平面通信

除了 Dapr 边车之间的自动 mTLS 外，Dapr 还在以下之间提供强制 mTLS：

- Dapr 边车
- Dapr 控制平面系统服务，即：
  - Sentry 服务（证书颁发机构）
  - Placement 服务（actor 放置）
  - Kubernetes Operator 服务

当启用 mTLS 时，Sentry 将根证书和颁发者证书写入限定到安装控制平面的命名空间的 Kubernetes secret。在自托管模式下，Sentry 将证书写入可配置的文件系统路径。

在 Kubernetes 中，当 Dapr 系统服务启动时，它们会自动挂载并使用包含根证书和颁发者证书的 secret 来保护 Dapr 边车使用的 gRPC 服务器。在自托管模式下，每个系统服务可以挂载到文件系统路径以获取凭据。

当 Dapr 边车初始化时，它使用挂载的叶证书和颁发者私钥与系统 pod 进行身份验证。这些作为环境变量挂载在边车容器上。

### Kubernetes 中到系统服务的 mTLS

下图显示了 Dapr 边车与 Dapr Sentry（证书颁发机构）、Placement（actor 放置）和 Kubernetes Operator 系统服务之间的安全通信。

<img src="/images/security-mTLS-dapr-system-services.png width=1000>
</br>

# 运维安全

Dapr 旨在让操作员管理 mTLS 证书并强制执行 OAuth 策略。

## mTLS 证书部署和轮换

虽然操作员和开发人员可以将自己的证书带入 Dapr，但 Dapr 会自动创建并持久化自签名根证书和颁发者证书。阅读[设置和配置 mTLS 证书]({{% ref mtls %}})了解更多详情。

## 使用 OAuth 的中间件端点授权

使用 Dapr OAuth 2.0 中间件，您可以为您的 API 在 Dapr 端点上启用 OAuth 授权。阅读[使用 OAuth 配置端点授权]({{% ref oauth %}})了解详情。Dapr 还有其他中间件组件，您可以将它们用于 OpenID Connect 和 OPA 策略。有关更多详细信息，[阅读有关支持的中间件]({{% ref supported-middleware %}})。

## 网络安全

您可以采用常见的网络安全技术，例如网络安全组（NSG）、非军事区（DMZ）和防火墙，为您的网络资源提供多层保护。例如，除非配置为与外部绑定目标通信，否则 Dapr 边车不会打开与互联网的连接，大多数绑定实现仅使用出站连接。您可以设计防火墙规则以仅允许通过指定端口进行出站连接。

## 在 Kubernetes 中以非 root 身份运行
在 Kubernetes 中运行时，Dapr 服务确保每个进程都以非 root 身份运行。这是通过检查进程的 UID 和 GID 是否为 `65532` 来完成的，如果不符合预期则报致命错误。如果您必须在 Kubernetes 中运行非默认的 UID 和 GID，请设置以下环境变量以跳过此检查。
```bash
DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK="true"
```

# 安全策略

Dapr 有广泛的安全策略集，您可以将其应用于您的应用。您可以通过边车配置中的策略设置或组件规范来限定它们能够执行的操作。

## API 访问策略

在某些场景中，例如零信任网络或通过前端将 Dapr 边车暴露给外部流量时，建议仅启用应用当前使用的 Dapr 边车 API。这减少了攻击面，并将 Dapr API 限定为应用的实际需求。您可以通过在配置中设置 API 允许列表来控制应用可访问的 API，如下图所示。

<img src="/images/security-dapr-API-scoping.png width=1000>

阅读[如何：在 Dapr 边上有选择地启用 Dapr API]({{% ref api-allowlist %}})了解更多详情。

## 密钥作用域访问策略

要限制 Dapr 应用对密钥的访问，您可以定义密钥作用域。将具有限制性权限的密钥作用域策略添加到应用配置中。阅读[如何：使用密钥作用域]({{% ref secret-scope %}})了解更多详情。

## 组件应用作用域访问策略和密钥使用

Dapr 组件可以被命名空间化。这意味着 Dapr 边车实例只能访问部署到同一命名空间的组件。阅读[如何：使用命名空间将组件限定到一个或多个应用]({{% ref component-scopes %}})了解更多详情。

Dapr 通过允许您指定哪些应用可以使用特定组件并拒绝其他应用来提供应用级别的组件作用域。阅读[使用作用域限制应用对组件的访问]({{% ref "component-scopes#application-access-to-components-with-scopes" %}})了解更多详情。

Dapr 组件可以使用 Dapr 的内置密钥管理功能来管理密钥。阅读[密钥存储概述]({{% ref secrets-overview %}})和[如何：在组件中引用密钥]({{% ref component-secrets %}})了解更多详情。

## 绑定安全

与绑定目标的身份验证通过绑定的配置文件进行配置。通常，您应该配置最低所需的访问权限。例如，如果您仅从绑定目标读取，则应该将绑定配置为使用具有只读访问权限的帐户。

# 状态安全

## 静态状态存储加密

默认情况下，Dapr 不会转换来自应用的状态数据。这意味着：

- Dapr 不会尝试加密/解密状态数据
- 您的应用可以采用您选择的加密/解密方法，其中状态数据对 Dapr 保持不透明。

Dapr 组件可以使用配置的身份验证方法与底层状态存储进行身份验证。许多状态存储实现使用官方客户端库，这些库通常使用与服务器的安全通信通道。

然而，应用状态通常需要在静态时加密，以便在企业工作负载或受监管环境中提供更强的安全性。Dapr 基于 AES256 提供自动的客户端状态加密。阅读[如何：加密应用状态]({{% ref howto-encrypt-state %}})了解更多详情。

## Dapr 运行时状态

Dapr 运行时不存储任何静态数据，这意味着 Dapr 运行时对其操作不依赖任何状态存储，可以被视为无状态。

# 在示例应用中使用安全功能

下图显示了部署在 Kubernetes 上的示例应用中的许多安全功能。在该示例中，Dapr 控制平面、Redis 状态存储和每个服务都部署到自己的命名空间中。在 Kubernetes 上部署时，您可以使用常规 Kubernetes RBAC 来控制对管理活动的访问。

在应用中，请求由入站反向代理接收，该代理旁边运行着 Dapr 边车。从反向代理开始，Dapr 使用服务调用调用服务 A，然后服务 A 向服务 B 发布消息。服务 B 检索密钥以读取状态并将状态保存到 Redis 状态存储。

<img src="/images/security-overview-capabilities-example.png width=1000>

让我们逐一介绍每个安全功能，并描述它们如何保护此应用。

1. API 令牌身份验证确保反向代理知道它正在与正确的 Dapr 边车实例通信。这防止将消息转发到除此 Dapr 边车之外的任何东西。
2. 服务调用 mTLS 用于反向代理和服务 A 之间的身份验证。在服务 A 上配置的服务访问策略限制它仅从反向代理接收特定端点上的调用，而不接收其他服务的调用。
3. 服务 B 使用发布订阅主题安全策略来指示它只能接收从服务 A 发布的消息。
4. Redis 组件定义使用组件作用域安全策略来表示只允许服务 B 调用它。
5. 服务 B 限制 Dapr 边车仅使用发布订阅、状态管理和密钥 API。所有其他 API 调用（例如，服务调用）都将失败。
6. 在配置中设置的密钥安全策略限制服务 B 可以访问的密钥。在这种情况下，服务 B 只能读取连接到 Redis 状态存储组件所需的密钥，而不能读取其他密钥。
7. 服务 B 部署到命名空间 "B"，这进一步将其与其他服务隔离。即使在其上启用了服务调用 API，它也不会因为与服务 A 在同一命名空间而被意外调用。服务 B 必须在其组件 YAML 文件中显式设置 Redis 主机命名空间才能调用 "Redis" 命名空间，否则此调用也会失败。
8. Redis 状态存储中的数据在静态时加密，并且只能使用正确配置的 Dapr Redis 状态存储组件读取。

# 威胁模型

威胁建模是一个过程，通过该过程：

- 可以识别和枚举潜在威胁，例如结构漏洞或缺乏适当的保障措施。
- 可以确定缓解措施的优先级。

Dapr 威胁模型如下。

<img src="/images/security-threat-model.png" alt="Dapr 威胁模型" width=1000>

## 安全审计

### 2023 年 9 月

2023 年 9 月，Dapr 完成了由 Ada Logics 进行的安全审计。

这次审计是一次全面的安全审计，具有以下目标：

- 正式化 Dapr 的威胁模型
- 进行手动代码审查
- 根据正式化的威胁模型评估 Dapr 的模糊测试套件
- 对 Dapr 进行 SLSA 审查

您可以在此处找到完整报告[链接](/docs/Dapr-september-2023-security-audit-report.pdf)。

审计发现了 7 个问题，其中没有一个属于高严重性或关键严重性问题。从一个第三方依赖项中的问题向 Dapr Components Contrib 分配了一个 CVE。

### 2023 年 6 月

2023 年 6 月，Dapr 完成了由 Ada Logics 进行的模糊测试审计。

这次审计实现了以下目标：

- OSS-Fuzz 集成
- 为 Dapr 新增 39 个模糊测试器
- Dapr Runtime、Kit 和 Components-contrib 的模糊测试覆盖
- 审计完成后所有模糊测试器持续运行

您可以在此处找到完整报告[链接](/docs/Dapr-june-2023-fuzzing-audit-report.pdf)。

审计期间发现了 3 个问题。

### 2021 年 2 月

2021 年 2 月，Dapr 通过了由 Cure53 进行的第二次安全审计，针对其 1.0 版本。

测试重点如下：

- 自上次审计以来的 Dapr 运行时代码库评估
- 访问控制列表
- 密钥管理
- 渗透测试
- 验证以前高/中 issues 的修复

您可以在此处找到完整报告[链接](/docs/Dapr-february-2021-security-audit-report.pdf)。

测试期间检测并修复了一个高严重性问题。

截至 2021 年 2 月 16 日，Dapr 有 0 个关键问题，0 个高严重性问题，0 个中等问题，2 个低问题，2 个信息问题。

### 2020 年 6 月

2020 年 6 月，Dapr 接受了来自 Cure53（一家获得 CNCF 批准的网络安全公司）的安全审计。

测试重点如下：

- Dapr 运行时代码库评估
- Dapr 组件代码库评估
- Dapr CLI 代码库评估
- 权限提升
- 流量欺骗
- 密钥管理
- RBAC
- 验证基本假设：mTLS、作用域、API 身份验证
- 编排硬化（Kubernetes）
- DoS 攻击
- 渗透测试

完整报告可以在此处找到[链接](/docs/Dapr-july-2020-security-audit-report.pdf)。

## 报告安全问题

访问[此页面]({{% ref support-security-issues %}})向 Dapr 维护者报告安全问题。

## 相关链接

[运维安全]({{% ref "security" %}})
