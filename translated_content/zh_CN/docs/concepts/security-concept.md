---
type: docs
title: "安全"
linkTitle: "安全"
weight: 600
description: Dapr 如何在设计中将安全性作为核心考量
---

安全是 Dapr 的基础。本文描述了在使用 Dapr 构建分布式应用程序时的安全特性和能力。这些可分为：

- 通过服务调用和发布订阅 API 实现安全通信。
- 作用于组件并通过配置应用的安全策略。
- 运维安全实践。
- 状态安全，聚焦于静态数据。

文中使用一个示例应用程序来说明 Dapr 中可用的许多安全特性。

# 安全通信

Dapr 通过服务调用 API 提供端到端安全通信，具备对应用程序进行身份验证以及设置端点访问策略的能力如下图所示。

<img src="/images/security-end-to-end-communication.png" width=1000>

## 应用程序身份

在 Dapr 中，应用程序身份围绕 App ID 的概念构建。App ID 是 Dapr 中的单一原子身份单元：

- 每个启用 Dapr 的应用程序都有一个 App ID。应用程序的多个副本共享同一个 App ID。
- Dapr 中的所有路由、服务发现、安全策略和访问控制都派生自此 App ID。
- Dapr 中的服务间通信使用 App ID 而不是依赖 IP 地址或主机名，从而实现了跨环境的稳定且可移植的寻址方式。

例如，当一个服务使用 Dapr 的服务调用 API 调用另一个服务时，它通过 App ID 而不是网络位置来调用目标服务。这种抽象确保了安全策略、mTLS 证书和访问控制在应用程序身份级别上保持一致。

## 命名空间和作用域

虽然 App ID 可以唯一标识应用程序，但命名空间提供了额外的作用域和隔离层，特别是在多租户或大型环境中。

- 命名空间允许运维人员在逻辑上分离的组中部署 Dapr 应用程序。
- 两个应用程序可以在不同的命名空间中拥有相同的 App ID 而不会冲突，因为安全、路由和发现都是命名空间感知的。

## 服务调用作用域访问策略

Dapr 应用程序可以按命名空间进行部署和安全作用域划分。你可以调用部署在不同命名空间中的服务之间进行调用。阅读[跨命名空间的服务调用]({{% ref "service-invocation-namespaces" %}})文章了解更多详情。

Dapr 应用程序可以限制哪些操作可以被调用，包括允许或拒绝哪些应用程序调用它。阅读[操作指南：为服务调用应用访问控制列表配置]({{% ref invoke-allowlist %}})了解更多详情。

## 发布订阅主题作用域访问策略

对于发布订阅组件，你可以限制哪些主题类型和应用程序可以向特定主题发布和订阅。阅读[限制发布订阅主题访问]({{% ref "pubsub-scopes" %}})了解更多详情。

## 使用 mTLS 加密数据

Dapr 的传输数据加密安全机制之一是[双向认证 TLS](https://en.wikipedia.org/wiki/Mutual_authentication)，即 mTLS。mTLS 为应用程序内部的网络流量提供了几个关键特性：

- **双向认证**，客户端向服务器证明其身份，反之亦然。
- **加密通道**，在建立双向认证后用于所有飞行中的通信。

mTLS 几乎在所有场景中都很有用，但对于受 [HIPAA](https://en.wikipedia.org/wiki/Health_Insurance_Portability_and_Accountability_Act) 和 [PCI](https://en.wikipedia.org/wiki/Payment_Card_Industry_Data_Security_Standard) 等法规约束的系统尤其重要。

## Dapr 到 Dapr 的安全通信

Dapr 无需额外代码或复杂配置即可在生产系统中启用 mTLS。同样，Dapr 边车默认阻止除 `localhost` 以外的所有 IP 地址调用它，除非明确列出。

Dapr 包含一个"默认开启"的自动 mTLS，为边车之间的流量提供传输加密。为实现这一目标，Dapr 利用了一个名为 `Sentry` 的系统服务，它充当证书颁发机构（CA）/身份提供商，并签署来自 Dapr 边车的工作负载（应用程序）证书请求。

默认情况下，工作负载证书有效期为 24 小时，时钟偏差设置为 15 分钟。

除非你提供了现有根证书，否则 Sentry 服务会自动创建并持久化有效期为一年的自签名根证书。Dapr 管理工作负载证书的轮换；如果你使用自己的证书，Dapr 将以零停机时间的方式完成轮换。

当根证书被替换时（在 Kubernetes 模式下为 secret，在自托管模式下为文件系统），Sentry 会拾取它们并重建信任链，无需重启且 Sentry 零停机时间。

当新的 Dapr 边车初始化时，它会检查 mTLS 是否已启用。如果已启用，则生成 ECDSA 私钥和证书签名请求，并通过 gRPC 接口发送到 Sentry。Dapr 边车与 Sentry 之间的通信使用信任链证书进行身份验证，该证书由 Dapr Sidecar Injector 系统服务注入到每个 Dapr 实例中。

### 配置 mTLS

可以通过编辑 Dapr 部署的默认配置中的 `spec.mtls.enabled` 字段来开启/关闭 mTLS。

[你可以在 Kubernetes 和自托管模式下进行此操作]({{% ref mtls %}})。

#### 自托管模式下的 mTLS

下图展示了 Sentry 系统服务如何基于运维人员提供的根证书/颁发者证书或 Sentry 服务生成的证书（存储在文件中）为应用程序颁发证书。

<img src="/images/security-mTLS-sentry-selfhosted.png" width=1000>

#### Kubernetes 模式下的 mTLS

在 Kubernetes 集群中，保存根证书的 secret 是：

- 作用域为部署 Dapr 组件的命名空间。
- 仅 Dapr 控制平面系统 Pod 可以访问。

Dapr 在 Kubernetes 上部署时也支持强身份认证，依赖 Pod 的 Service Account 令牌作为证书签名请求（CSR）的一部分发送到 Sentry。

下图展示了 Sentry 系统服务如何基于运维人员提供的根证书/颁发者证书或 Sentry 服务生成并存储为 Kubernetes secret 的证书为应用程序颁发证书。

<img src="/images/security-mTLS-sentry-kubernetes.png" width=1000>

### 防止 IP 地址调用 Dapr

为防止 Dapr 边车在任何 IP 地址上被调用（特别是在 Kubernetes 等生产环境中），Dapr 将其监听 IP 地址限制为 `localhost`。如果需要允许来自外部地址的访问，请使用 [dapr-listen-addresses]({{%ref arguments-annotations-overview%}}) 设置。

## Dapr 到应用程序的安全通信

Dapr 边车通过 `localhost` 与应用程序紧密运行，建议在与应用程序相同的网络边界内运行。虽然当今许多云原生系统将 Pod 级别（例如在 Kubernetes 上）视为可信的安全边界，但 Dapr 使用令牌为应用程序提供 API 级身份验证。此功能确保即使在 `localhost` 上：

- 只有经过身份验证的应用程序才能调用 Dapr
- 应用程序可以验证 Dapr 对它的回调

有关配置 API 令牌安全的更多详情，请阅读：

- [使用 API 令牌对应用程序到 Dapr 的请求进行身份验证]({{% ref api-token %})。
- [使用 API 令牌对 Dapr 到应用程序的请求进行身份验证]({{% ref app-api-token %})

## Dapr 到控制平面的安全通信

除了 Dapr 边车之间的自动 mTLS 外，Dapr 还提供以下组件之间的强制 mTLS：

- Dapr 边车
- Dapr 控制平面系统服务，包括：
  - Sentry 服务（证书颁发机构）
  - Placement 服务（Actor 放置）
  - Kubernetes Operator 服务

当 mTLS 启用时，Sentry 将根证书和颁发者证书写入安装控制平面的命名空间对应的 Kubernetes secret。在自托管模式下，Sentry 将证书写入可配置的文件系统路径。

在 Kubernetes 中，当 Dapr 系统服务启动时，它们会自动挂载并使用包含根证书和颁发者证书的 secret 来保护 Dapr 边车使用的 gRPC 服务器。在自托管模式下，每个系统服务可以挂载到文件系统路径以获取凭据。

当 Dapr 边车初始化时，它使用挂载的叶证书和颁发者私钥向系统 Pod 进行身份验证。这些作为环境变量挂载在边车容器上。

### Kubernetes 中到系统服务的 mTLS

下图展示了 Dapr 边车与 Dapr Sentry（证书颁发机构）、Placement（Actor 放置）和 Kubernetes Operator 系统服务之间的安全通信。

<img src="/images/security-mTLS-dapr-system-services.png" width=1000>
</br>

# 运维安全

Dapr 专为运维人员管理 mTLS 证书和强制执行 OAuth 策略而设计。

## mTLS 证书部署和轮换

虽然运维人员和开发人员可以将其自己的证书带入 Dapr，但 Dapr 会自动创建并持久化自签名根证书和颁发者证书。阅读[设置和配置 mTLS 证书]({{% ref mtls %}})了解更多详情。

## 使用 OAuth 的中间件端点授权

通过 Dapr OAuth 2.0 中间件，你可以为 API 启用 Dapr 端点上的 OAuth 授权。阅读[使用 OAuth 配置端点授权]({{% ref oauth %}})了解更多详情。Dapr 还有其他可用于 OpenID Connect 和 OPA 策略的中间件组件。更多详情请[阅读支持的中间件]({{% ref supported-middleware %}})。

## 网络安全

你可以采用常见的网络安全技术，如网络安全组（NSG）、非军事区（DMZ）和防火墙，为网络资源提供分层保护。例如，除非配置为与外部绑定目标通信，否则 Dapr 边车不会打开到互联网的连接，大多数绑定实现仅使用出站连接。你可以设计防火墙规则以仅允许通过指定端口的出站连接。

## 在 Kubernetes 中以非 root 用户运行
在 Kubernetes 中运行时，Dapr 服务确保每个进程以非 root 用户身份运行。这是通过检查进程的 UID 和 GID 是否为 `65532` 来实现的，如果不是预期值则会导致致命错误。如果必须在 Kubernetes 中运行非默认 UID 和 GID，请设置以下环境变量以跳过此检查。
```bash
DAPR_UNSAFE_SKIP_CONTAINER_UID_GID_CHECK="true"
```

# 安全策略

Dapr 有一套广泛的安全策略可应用于应用程序。你可以通过边车配置中的策略设置或组件规范来限制它们的操作范围。

## API 访问策略

在某些场景中，例如零信任网络或通过前端向外部流量暴露 Dapr 边车时，建议仅启用应用程序当前使用的 Dapr 边车 API。这减少了攻击面并将 Dapr API 限制在应用程序的实际需求范围内。你可以通过在配置中设置 API 允许列表来控制哪些 API 可被应用程序访问，如下图所示。

<img src="/images/security-dapr-API-scoping.png" width=1000>

阅读[操作指南：在 Dapr 边车上选择性地启用 Dapr API]({{% ref api-allowlist %}})了解更多详情。

## 密钥作用域访问策略

要限制 Dapr 应用程序对密钥的访问，你可以定义密钥作用域。在应用程序配置中添加具有限制性权限的密钥作用域策略。阅读[操作指南：使用密钥作用域]({{% ref secret-scope %}})了解更多详情。

## 组件应用程序作用域访问策略和密钥使用

Dapr 组件可以命名空间化。这意味着 Dapr 边车实例只能访问部署到同一命名空间的组件。阅读[操作指南：使用命名空间将组件作用域限定到一个或多个应用程序]({{% ref component-scopes %}})了解更多详情。

Dapr 通过允许你指定哪些应用程序可以消费特定组件并拒绝其他应用程序来提供组件的应用程序级作用域。阅读[使用作用域限制应用程序对组件的访问]({{% ref "component-scopes#application-access-to-components-with-scopes" %}})了解更多详情。

Dapr 组件可以使用 Dapr 的内置密钥管理功能来管理密钥。阅读[密钥存储概述]({{% ref secrets-overview %}})和[操作指南：在组件中引用密钥]({{% ref component-secrets %}})了解更多详情。

## 绑定安全

与绑定目标的身份验证通过绑定的配置文件进行配置。通常，你应该配置最小必需的访问权限。例如，如果你仅从绑定目标读取数据，则应将绑定配置为使用具有只读访问权限的账户。

# 状态安全

## 状态存储静态加密

默认情况下，Dapr 不会转换应用程序的状态数据。这意味着：

- Dapr 不会尝试加密/解密状态数据
- 你的应用程序可以采用你选择的加密/解密方法，状态数据对 Dapr 保持不透明。

Dapr 组件可以使用配置的身份验证方法向底层状态存储进行身份验证。许多状态存储实现使用官方客户端库，这些库通常使用与服务器的安全通信通道。

然而，应用程序状态通常需要在静态时加密，以在企业工作负载或受监管环境中提供更强的安全性。Dapr 提供基于 AES256 的自动客户端状态加密。阅读[操作指南：加密应用程序状态]({{% ref howto-encrypt-state %}})了解更多详情。

## Dapr 运行时状态

Dapr 运行时不在静态时存储任何数据，这意味着 Dapr 运行时不依赖任何状态存储来运行其操作，可以被认为是无状态的。

# 在示例应用程序中使用安全功能

下图展示了许多安全功能在托管于 Kubernetes 上的示例应用程序中的部署方式。在该示例中，Dapr 控制平面、Redis 状态存储和每个服务都部署到各自的命名空间。在 Kubernetes 上部署时，你可以使用常规的 Kubernetes RBAC 来控制对管理活动的访问。

在应用程序中，请求由入口反向代理接收，该代理旁边运行着 Dapr 边车。从反向代理，Dapr 使用服务调用调用 Service A，然后 Service A 向 Service B 发布消息。Service B 检索一个密钥以读取和保存状态到 Redis 状态存储。

<img src="/images/security-overview-capabilities-example.png" width=1000>

让我们逐一介绍每个安全功能及其如何保护此应用程序。

1. API 令牌身份验证确保反向代理知道它正在与正确的 Dapr 边车实例通信。这防止将消息转发到除此 Dapr 边车以外的任何地方。
2. 服务调用 mTLS 用于反向代理和 Service A 之间的身份验证。在 Service A 上配置的服务访问策略限制它仅接收来自反向代理的特定端点上的调用，而不接受其他服务。
3. Service B 使用发布订阅主题安全策略来指示它只能接收来自 Service A 发布的消息。
4. Redis 组件定义使用组件作用域安全策略来指定仅允许 Service B 调用它。
5. Service B 将 Dapr 边车限制为仅使用发布订阅、状态管理和密钥 API。所有其他 API 调用（例如服务调用）都将失败。
6. 在配置中设置的密钥安全策略限制 Service B 可以访问哪些密钥。在这种情况下，Service B 只能读取连接 Redis 状态存储组件所需的密钥，而不能访问其他密钥。
7. Service B 部署到命名空间"B"，这进一步将其与其他服务隔离。即使在其上启用了服务调用 API，由于不在 Service A 所在的同一命名空间中，它也不会被意外调用。Service B 必须在其组件 YAML 文件中明确设置 Redis Host 命名空间才能调用"Redis"命名空间，否则此调用也会失败。
8. Redis 状态存储中的数据在静态时已加密，只能使用正确配置的 Dapr Redis 状态存储组件进行读取。

# 威胁模型

威胁建模是一个以下过程：

- 可以识别和列举潜在威胁，例如结构漏洞或缺少适当的安全防护措施。
- 可以确定缓解措施的优先级。

Dapr 威胁模型如下所示。

<img src="/images/security-threat-model.png" alt="Dapr 威胁模型" width=1000>

## 安全审计

### 2023 年 9 月

2023 年 9 月，Dapr 完成了由 Ada Logics 进行的安全审计。

此次审计是一次全面的安全审计，目标是：

- 形式化 Dapr 的威胁模型
- 进行手动代码审查
- 根据形式化的威胁模型评估 Dapr 的模糊测试套件
- 对 Dapr 进行 SLSA 审查。

你可以找到完整报告[此处](/docs/Dapr-september-2023-security-audit-report.pdf)。

审计发现了 7 个问题，均不属于高危或严重级别。从 Dapr Components Contrib 的第三方依赖问题中分配了一个 CVE。

### 2023 年 6 月

2023 年 6 月，Dapr 完成了由 Ada Logics 进行的模糊测试审计。

此次审计取得了以下成果：

- OSS-Fuzz 集成
- 为 Dapr 新增 39 个模糊测试器
- Dapr Runtime、Kit 和 Components-contrib 的模糊测试覆盖率
- 所有模糊测试器在审计完成后持续运行

你可以找到完整报告[此处](/docs/Dapr-june-2023-fuzzing-audit-report.pdf)。

在审计过程中发现了 3 个问题。

### 2021 年 2 月

2021 年 2 月，Dapr 针对其 1.0 版本进行了第二次安全审计，由 Cure53 执行。

测试重点包括：

- 自上次审计以来的 Dapr 运行时代码库评估
- 访问控制列表
- 密钥管理
- 渗透测试
- 验证之前高危/中危问题的修复情况

你可以找到完整报告[此处](/docs/Dapr-february-2021-security-audit-report.pdf)。

在测试期间发现并修复了一个高危问题。

截至 2021 年 2 月 16 日，Dapr 有 0 个严重、0 个高危、0 个中危、2 个低危、2 个信息级别问题。

### 2020 年 6 月

2020 年 6 月，Dapr 接受了由 CNCF 批准的网络安全公司 Cure53 进行的安全审计。

测试重点包括：

- Dapr 运行时代码库评估
- Dapr 组件代码库评估
- Dapr CLI 代码库评估
- 权限提升
- 流量欺骗
- 密钥管理
- RBAC
- 验证基本假设：mTLS、作用域、API 身份验证
- 编排强化（Kubernetes）
- DoS 攻击
- 渗透测试

完整报告可在[此处](/docs/Dapr-july-2020-security-audit-report.pdf)找到。

## 报告安全问题

访问[此页面]({{% ref support-security-issues %}})向 Dapr 维护者报告安全问题。

## 相关链接

[运维安全]({{% ref "security" %}})
