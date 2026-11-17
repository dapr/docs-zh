---
type: docs
title: "MCP 安全与信任态势"
linkTitle: "安全态势"
weight: 20
description: "Dapr 如何为跨代理与 MCP 服务器的交互实施 Agent Identity、授权和可审计性，以及哪些内容仍由你负责"
---

在生产环境中运行代理会引出三个问题，Dapr 正是为回答这些问题而设计的：

- **这个代理是谁？** 下游服务能否证明某个请求确实来自特定代理，而不是来自被冒用或被劫持的凭据？
- **这个代理可以做什么？** 是否存在可强制执行的限制，规定代理可以调用哪些 MCP 服务器，以及可以读取或修改哪些数据——这些限制是大型语言模型 (LLM) 无法通过推理绕过的？
- **这个代理做过什么？** 出现问题时，平台能否生成一份记录，说明发生了什么、由哪个身份发起、按什么顺序发生？

Dapr 在基础设施层回答这三个问题，因此无论你使用哪种代理框架、编程语言或 LLM，答案都保持一致，而且无需修改 MCP 客户端或服务器代码。

## Dapr 如何回答这三个问题

| 问题 | Dapr 控制措施 |
|---|---|
| **这个代理是谁？** | 每个 Dapr 工作负载（包括代理的 App ID，以及你作为 Dapr 应用运行的任何 MCP 服务器）都会获得由 Dapr 的 Sentry component 签发、验证并自动轮换的基于 SPIFFE 的加密身份。所有服务间流量都使用这些身份，通过 [mTLS]({{% ref mtls.md %}}) 进行保护。Dapr 应用之间无需静态 API 密钥或共享的服务令牌。 |
| **这个代理可以做什么？** | 为每个 App ID 附加的、包含 `accessControl` 规则的 [`Configuration` 资源]({{% ref invoke-allowlist.md %}}) 决定哪些调用方可以访问它。可以将默认值设为 `deny`，这样在某个调用方 App ID 被明确加入允许列表之前，MCP 服务器都无法被访问。挂载在 MCP 服务器 `appHttpPipeline` 上的 [bearer middleware]({{% ref middleware-bearer.md %}}) 会在此基础上增加 JWT 验证。LLM 无法通过推理绕过这两种控制。 |
| **这个代理做过什么？** | 每一次 service invocation（包括 MCP 调用）都会经过 Dapr 的数据平面，并被记录在[日志、指标和分布式追踪]({{% ref observability-concept %}})中。标准的 OpenTelemetry 导出器会将这些数据发送到你的 SIEM、日志仓库或追踪后端。 |

## 默认姿态

Dapr 的默认设置倾向于拒绝而非放行。以下各项都无需你“开启某种安全模式”，它们正是平台开箱即用的行为方式。

- **没有隐式身份。** 通过 Dapr service invocation 访问的 MCP 服务器，会使用调用方的 SPIFFE 身份进行 mTLS 认证。不存在匿名的 service invocation 路径。
- **访问策略是声明式且显式的。** 附加到 MCP 服务器 App ID 上、且 `defaultAction: deny` 的 `accessControl` 配置块，会使该服务器在调用方被明确加入允许列表之前无法访问。参见 [MCP 访问控制]({{% ref mcp-access-control.md %}})。
- **secrets 绝不会暴露给代理代码。** middleware component 引用的凭据（颁发者 URL、受众、签名密钥、OAuth client secret）存储在项目的 [secret store]({{% ref secrets-overview %}}) 中，并在请求时解析。代理接收到的是工具结果，而不是凭据。
- **mTLS 处处启用。** Sentry 为每个工作负载签发短期有效的 SVID，并自动轮换。你无需按资源单独配置。

## 威胁模型

以下故障模式占据了代理在生产环境中运行时的大部分安全风险。Dapr 的控制措施与每种故障模式一一对应。

| 故障模式 | 表现形式 | Dapr 控制措施 |
|---|---|---|
| **权限提升** | 子代理继承了未受限的凭据，并超出其主体的权限范围行事。 | 每个代理的 App ID 都有自己的 SPIFFE 身份和独立的 `accessControl` 配置。权限不会通过继承传递，每次跳转都要独立授权。 |
| **未授权的工具使用** | 某个代理或未知调用方试图访问其无权使用的 MCP 服务器。 | 挂载在 MCP 服务器 App ID 上的 `Configuration` `accessControl` 规则，在 service invocation 边界强制执行按调用方的允许或拒绝。被拒绝的调用会在到达 MCP 服务器进程之前被 Dapr 拦截。 |
| **越狱** | 提示词诱使 LLM 尝试未授权的操作。 | LLM 的决策发生在平台之前，Dapr 的授权检查则在之后执行。即使被越狱的 LLM 尝试访问被禁止的 MCP 服务器，也会在 MCP 服务器上的任何代码运行之前，被 `accessControl` 拒绝（或被 bearer middleware 以 `401` 拒绝）。 |
| **“代理是谁？”** | 下游服务无法确认某个调用来自哪个代理。 | 每一次跳转都会验证 SPIFFE 工作负载身份。MCP 服务器（如果它作为 Dapr 应用运行）或 MCP 服务器调用的任何下游服务，都可以从 mTLS 连接或已验证 JWT 的声明中读取调用方身份。 |
| **secret sprawl** | API 密钥出现在日志、提示词或下游代理调用中。 | bearer 或 OAuth2 middleware 使用的凭据会在请求时从 secret store 中解析，代理代码永远看不到。SPIFFE SVID 有效期很短，并由 Sentry 自动轮换。 |
| **缺乏溯源** | 没有可验证的记录能证明谁做了什么。 | 每一次 service invocation 都会被 Dapr 的[observability 管道]({{% ref observability-concept %}})记录，包括日志、指标和追踪，并通过 OpenTelemetry 发送到你的接收端。 |

## 仍由你负责的部分

Dapr 将信任边界划定在平台的表面。某些风险则位于这一边界之外。

- **提示词注入与 LLM 层攻击。** 无论 LLM 做了什么，Dapr 都会在 service invocation 边界强制执行授权，但它不检查提示词内容。针对提示词注入的防御（内容过滤、允许列表、输出校验）应当置于代理在 LLM 调用之前和之后的层中。
- **MCP 服务器本身的安全性。** 当你连接第三方 MCP 服务器（如 GitHub、Stripe 或内部工具）时，Dapr 保护的是*连接*，而不是*服务器*。应像对待其他依赖项一样审查第三方 MCP 服务器。
- **审计接收端的持久性与完整性。** Dapr 将 observability 数据输出到你的接收端；这些记录的长期持久性和防篡改能力，取决于你所写入的接收端（如 SIEM、日志仓库、不可变存储桶）。应选择其保留与完整性保障能够满足你合规义务的接收端。
- **service invocation 层的工具级粒度。** 目前 `accessControl` 以调用方 App ID 和目标 App ID 为键。如果一个 MCP 服务器同时提供低风险和高风险工具，而你只想授权其中一部分，那么要么把这些工具拆分到不同的 MCP 服务器中（每个服务器一个 App ID），使策略边界与信任边界一致；要么使用 [`MCPServer` 资源]({{% ref mcp-server-resource.md %}}) 的 middleware 钩子实现参数级 RBAC。

## 一段话说明身份模型

每个 Dapr 工作负载（包括代理 App ID，以及作为 Dapr 应用运行时的 MCP 服务器本身）都会获得由 Sentry 签发并自动轮换的基于 SPIFFE 的加密身份。工作负载之间的 mTLS 使用这些身份。当代理通过 Dapr 调用 MCP 服务器时，调用方的 SPIFFE 身份会绑定到该请求上；MCP 服务器的 `Configuration` `accessControl` 规则决定是否允许该请求。

## 纵深防御

最稳健的生产部署会叠加多层控制，使突破其中任何一层都不会授予访问权限：

1. **mTLS 与 SPIFFE 身份**：Dapr 工作负载之间的每次调用默认都经过双向认证。
2. **`Configuration` `accessControl`**：基于 App ID 的允许或拒绝规则，作用于 service invocation 边界。默认拒绝意味着新的调用方在被列出之前无法访问 MCP 服务器。
3. **`appHttpPipeline` 上的 bearer middleware**：根据颁发者的 JWKS、`iss` 和 `aud` 声明进行独立的 JWT 验证。攻击者需要同时伪造或窃取一个有效的 App ID，并获得一个有效的已签名令牌。
4. **（可选）`MCPServer` 资源 middleware 钩子**：以持久 workflow 的形式运行基于参数的 RBAC、脱敏和审计。当策略取决于工具调用的内容而不仅仅是调用方时，这一层很有用。

关于如何叠加 ACL + bearer，参见 [MCP 访问控制]({{% ref mcp-access-control.md %}})；关于 workflow 钩子层，参见 [MCPServer 资源]({{% ref mcp-server-resource.md %}})。

## 后续步骤

- [MCP 访问控制]({{% ref mcp-access-control.md %}})：使用 `Configuration` `accessControl` 按 App ID 进行声明式授权。
- [对 MCP 服务器进行身份验证]({{% ref mcp-authentication.md %}})：OAuth2 与 bearer middleware 的设置，包括客户端和服务器端。
- [Dapr mTLS]({{% ref mtls.md %}})：基于 SPIFFE 的 mTLS 与由 Sentry 管理的身份轮换。
- [service invocation 访问控制]({{% ref invoke-allowlist.md %}})：完整的 `accessControl` 架构以及 HTTP 动词级别的控制。
