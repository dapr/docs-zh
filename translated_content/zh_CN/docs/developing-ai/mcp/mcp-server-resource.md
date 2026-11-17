---
type: docs
title: "MCPServer 资源"
linkTitle: "MCPServer 资源"
weight: 25
description: "将 MCP 服务器连接声明为一等 Dapr 资源，以实现持久工具执行"
---

## 概述

`MCPServer` 资源允许你将 MCP（模型上下文协议）服务器连接声明为一等 Dapr 资源。当 daprd 加载 MCPServer 时，它会发现服务器的工具，并为每个工具注册内置的持久工作流编排。调用工具随后就变成了“启动工作流”——Dapr 会为你处理连接、重试、凭据、可观测性和崩溃恢复。你的应用无需导入 MCP SDK，也无需持有长期运行的 MCP 连接。

{{% alert title="何时使用此方式" color="primary" %}}
`MCPServer` 资源**不是 Dapr 中默认的 MCP 集成方式**——大多数团队应从[服务调用方式]({{% ref path="mcp-service-invocation.md" lang="en" %}})开始，这种方式不会改变现有的 MCP 客户端和代理框架。

当你明确需要参数级 RBAC、审计、脱敏、可在调用过程中边车重启后继续执行的持久重试，或按工具细分的可观测性时，`MCPServer` 是合适的选择。作为交换，你需要采用 [Dapr Workflow]({{% ref workflow-overview %}}) 客户端来调用工具——现成的 MCP 客户端无法驱动由 `MCPServer` 支持的工具调用。
{{% /alert %}}

## 在 `MCPServer` 和服务调用方式之间进行选择

Dapr 为 MCP 提供两种集成方式。[服务调用方式]({{% ref path="mcp-service-invocation.md" lang="en" %}})是默认方式；`MCPServer` 则以工作流为中心。使用此表判断哪种方式适合你的需求。

| 如果你…… | 使用 |
|---|---|
| 使用现成的 MCP 客户端或框架（LangGraph、官方 MCP SDK 等），并希望客户端代码保持不变 | **[服务调用方式]({{% ref path="mcp-service-invocation.md" lang="en" %}})** |
| 想要适用于任何框架的最简单设置 | **[服务调用方式]({{% ref path="mcp-service-invocation.md" lang="en" %}})** |
| 需要按工具实施参数级 RBAC、审计或脱敏钩子 | **`MCPServer` 资源**（本页） |
| 需要能在调用过程中边车重启后继续执行的持久重试 | **`MCPServer` 资源**（本页） |
| 希望按工具细分可观测性（每个工具一个工作流） | **`MCPServer` 资源**（本页） |

这两种方式并不互斥——大多数 MCP 流量可以通过服务调用传递；对于有参数感知策略需求，或希望实现持久 MCP 交互的特定服务器，则可以切换为 `MCPServer` 资源。

## 为什么选择 MCPServer？

MCPServer 将 MCP 集成从应用代码层面的关注事项转变为部署时的关注事项。其优势会在整个系统中叠加：

- **应用中无需 MCP SDK。** 你的应用按名称启动 Dapr 工作流。Dapr 通过 MCP 与服务器通信。你可以替换 MCP 服务器、更改传输方式或轮换凭据，而无需修改应用代码。
- **在 YAML 中按工具实施 RBAC、审计和脱敏。** 保持顺序的 `beforeCallTool` / `afterCallTool` / `beforeListTools` / `afterListTools` 钩子会作为 Dapr 工作流运行，执行参数级授权、速率限制、PII 脱敏、审计日志记录和响应筛选。在钩子上设置 `appID`，即可将其路由到集中式策略应用，让一个共享 RBAC 服务管理所有代理，而无需每个应用都嵌入策略。
- **持久执行。** 工具调用作为由 Dapr Scheduler 提醒项支持的工作流活动运行。如果 daprd 在调用过程中重启，Scheduler 会将活动重新传递给新实例并完成调用——代理无需自行实现重试/恢复逻辑。在单个活动内部，会自动吸收暂时性的连接中断：Dapr 为每个 MCPServer 保持一个热会话（并发送 keep-alive ping），并在工作流察觉到中断前，遇到 `ErrConnectionClosed` 时重连一次。
- **快速向调用方反馈。** 必填字段验证会在联系 MCP 服务器之前，针对缓存的 JSON Schema 执行。缺失参数会立即以结构化的 `mcp.CallToolResult{isError: true}` 返回——代理和 LLM 无需消耗一次网络往返即可获得可操作的错误信息。
- **按工具提供可观测性。** 每个工具都有自己的工作流名称（`dapr.internal.mcp.<server>.CallTool.<tool>`），因此跟踪、指标和审计日志开箱即按工具细分。你可以准确看到调用了哪个工具、由谁调用、使用了哪些参数以及返回了什么。
- **声明式身份验证。** OAuth2 客户端凭据、SPIFFE 工作负载身份和静态标头身份验证都在 YAML 中配置。Dapr 获取并刷新令牌、按 MCPServer 缓存 HTTP 客户端，且绝不向你的应用暴露原始凭据。
- **作用域与多租户。** MCPServer 具有命名空间，并受 `scopes` 限制，就像其他 Dapr 资源一样。一个 MCP 服务器可以根据不同的访问策略供多个应用共享。
- **热重载。** 在运行时添加、移除或修改 MCPServer 资源——Dapr 会重新加载它们，无需重启边车。

| 没有 MCPServer | 使用 MCPServer |
|---|---|
| 应用管理 MCP 连接、重试和凭据 | 声明 YAML，其余交由 Dapr 处理 |
| 调用过程中边车崩溃 = 调用丢失 | Scheduler 提醒项重新传递活动，工作流恢复执行 |
| 按工具跟踪/指标需要自定义插桩 | 每个工具一个工作流——内置可观测性细分 |
| 每个应用都将自己的 MCP 连接逻辑硬编码 | 单个资源通过 `scopes` 在应用间共享 |
| 工具调用的 RBAC 和审计逻辑嵌入代理代码 | 在 YAML 中按 MCPServer 声明，作为持久工作流强制执行，并可通过 `appID` 集中管理 |

## 工作原理

对于每个已加载的、名为 `<server>` 的 MCPServer，daprd 会：

1. **连接**到 MCP 服务器，使用已配置的传输方式（流式 HTTP、SSE 或 stdio）。
2. **发现**服务器公开的工具（一次 MCP `tools/list` 往返）。
3. **注册**持久工作流编排：
   - `dapr.internal.mcp.<server>.ListTools`——返回缓存的工具列表。
   - `dapr.internal.mcp.<server>.CallTool.<tool>`——为每个已发现的工具注册一个工作流。每个工作流都以活动的形式持久调用工具，并可选择在调用前后运行中间件钩子。

调用方通过标准的 [Dapr 工作流 API]({{% ref workflow_api %}}) 启动这些工作流。Dapr 工作流负责调度、暂时性故障重试以及边车重启后的恢复。

你无需单独启用工作流——加载 MCPServer 即可。只要存在任何 MCPServer 资源，Dapr 的工作流引擎就会激活，即使从未有 SDK 工作流客户端连接也一样。

### 调用工具

启动一个 `CallTool.<tool>` 工作流，只需传入参数——工具名称已编码在工作流名称本身中：

```
POST /v1.0-beta1/workflows/dapr/dapr.internal.mcp.<server>.CallTool.<tool>/start
Content-Type: application/json

{
  "arguments": {"city": "Seattle"}
}
```

使用 `GET /v1.0-beta1/workflows/dapr/<instanceID>` 轮询结果。工作流输出是 [MCP `CallToolResult`](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult)——其形状与 MCP 线协议规范逐字节相同。`content` 中的每个条目都是扁平的带标签联合体（`type` 判别字段 + 各变体字段）：

```json
{
  "isError": false,
  "content": [
    {"type": "text", "text": "Weather in Seattle: sunny, 72°F"}
  ]
}
```

其他内容形状同样是扁平的：`{"type": "image", "data": "<base64>", "mimeType": "image/png"}`（`audio` 也一样）；资源引用使用 `{"type": "resource_link", "uri": "...", "name": "...", "mimeType": "...", "description": "..."}` 或 `{"type": "resource", "resource": {"uri": "...", "mimeType": "...", "text": "..." | "blob": "<base64>"}}`。

如果工具调用在 MCP 层面失败（未知工具、验证失败、服务器端身份验证错误），`isError` 会是 `true`，并在 `content` 中描述失败情况——工作流本身仍会成功完成，因此调用代理或 LLM 会收到结构化错误，并可据此采取行动（重试、选择其他工具，或向用户展示错误）。

如果 daprd 在工具调用执行期间重启，Dapr Scheduler 会将待处理的活动重新传递给新的 daprd 实例，工作流随之恢复——无需应用端重试逻辑。

### 列出工具

```
POST /v1.0-beta1/workflows/dapr/dapr.internal.mcp.<server>.ListTools/start
Content-Type: application/json

{}
```

输出：

```json
{
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a city",
      "inputSchema": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
      }
    }
  ]
}
```

工具定义会在 MCPServer 加载时缓存，并在热重载时刷新。后续的 `ListTools` 工作流调用会立即从缓存返回——不会往返调用上游 `tools/list`——因此，在初始加载后，反复调用 `ListTools` 的代理不会再产生 MCP 服务器延迟。

## 传输方式

MCPServer 支持三种线传输方式。必须且只能在 `spec.endpoint` 下配置一种。

### 流式 HTTP

生产环境推荐使用的传输方式。

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: payments-mcp
spec:
  endpoint:
    streamableHTTP:
      url: https://payments.internal/mcp
      timeout: 30s
```

### SSE（旧版）

适用于仅支持旧版 SSE 传输方式的 MCP 服务器。

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: legacy-mcp
spec:
  endpoint:
    sse:
      url: https://legacy.internal/sse
```

### Stdio

适用于开发环境中的本地 MCP 服务器子进程。

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: local-tools
spec:
  endpoint:
    stdio:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
```

### 内置限制

Dapr 对 MCP 服务器交互应用了一些硬性限制，防止行为异常或恶意的 MCP 服务器耗尽边车资源：

- **工具列表分页**：每次 `tools/list` 往返最多 500 页。超过此限制的服务器会在加载时被拒绝，而不会被静默截断。
- **Schema 缓存**：每个 MCPServer 最多缓存 500 个工具 Schema，每个不超过 1 MB。
- **HTTP 响应标头超时**：每个出站请求的首字节时间为 5 秒。SSE 流不受影响，因为此超时仅限制初始标头的接收时间。

这些限制有意不允许用户调节——其数值适合典型的生产 MCP 服务器，并确保边车在面对对抗性输入时仍能维持有界资源消耗。

## 身份验证

HTTP 传输方式（`streamableHTTP`、`sse`）支持三种身份验证机制。它们配置在传输方式的 `auth` 字段下。

### 静态标头

在每个出站请求中注入标头。支持 `value`、`secretKeyRef` 和 `envRef`。

```yaml
spec:
  endpoint:
    streamableHTTP:
      url: https://api.example.com/mcp
      headers:
        - name: Authorization
          secretKeyRef:
            name: mcp-token
            key: token
      auth:
        secretStore: kubernetes
```

### OAuth2 客户端凭据

Dapr 从授权服务器获取访问令牌，并自动注入。HTTP 客户端按 MCPServer 缓存，以提升效率。`auth.secretStore` 控制用于解析此 `auth` 块下所有位置的 `secretKeyRef`（以及同一传输方式上静态标头的 `secretKeyRef`）的机密存储。默认值为 `kubernetes`。

```yaml
spec:
  endpoint:
    streamableHTTP:
      url: https://payments.internal/mcp
      auth:
        secretStore: my-vault   # optional; defaults to "kubernetes"
        oauth2:
          issuer: https://auth.company.com/token
          clientID: my-client-id
          audience: mcp://payments
          scopes: [payments.read]
          secretKeyRef:
            name: payments-oauth
            key: clientSecret
```

### SPIFFE 工作负载身份

Dapr 会为每个请求注入 SPIFFE JWT SVID。无需机密——Sentry 会自动签发 SVID。每个出站请求都会重新获取 SVID，而不是在进程中缓存，因此没有内存中的令牌缓存、没有刷新竞争，也没有凭据过期前仍使用旧凭据的时间窗口。

```yaml
spec:
  endpoint:
    streamableHTTP:
      url: https://payments.internal/mcp
      auth:
        spiffe:
          jwt:
            header: Authorization
            headerValuePrefix: "Bearer "
            audience: mcp://payments
```

## 中间件管道

中间件钩子将工具调用治理转变为由 Dapr Workflows 强制执行的声明式 YAML。可选钩子会按数组顺序在工具调用和工具列表操作前后运行。有关规范模式，请参阅下文的[示例](#示例常见模式)。

- **前置钩子**：如果任何钩子返回错误，调用链就会停止，操作也会中止。
- **`afterCallTool` 钩子**：错误会**导致工作流失败**——这些钩子可以充当授权门，阻止响应到达调用方。
- **`afterListTools` 钩子**：错误会被记录，但不会影响返回给调用方的结果。
- **修改型钩子**：设置 `mutate: true`，让钩子的返回值替换在管道中流动的数据（工具调用前的参数，调用后的结果）。默认值为 `false`（仅观察——钩子会验证或审计，但其输出会被丢弃）。`beforeListTools` 不支持 `mutate`。

### 钩子输入形状

每个钩子都是一个 Dapr 工作流，接收运行时提供的类型化输入：

```text
beforeCallTool input:  { name, toolName, arguments }
afterCallTool  input:  { name, toolName, arguments, result }   # result: bytes — JSON-encoded MCP CallToolResult
beforeListTools input: { name }
afterListTools  input: { name, result }                         # result: bytes — JSON-encoded MCP ListToolsResult
```

`name` 是 MCPServer 资源名称。`arguments` 是调用方传入的 JSON 对象。`result` 是 JSON 编码的 MCP 规范结果（驼峰命名的线协议形状，与 [MCP 规范](https://modelcontextprotocol.io/specification/)兼容的字节）。钩子工作流可使用相应语言的 MCP SDK 或纯 JSON 解码来反序列化：

```python
# Python hook example
import json
def after_call_tool(ctx, input):
    result = json.loads(input["result"])
    is_error = result["isError"]
    text = result["content"][0]["text"] if result["content"] else ""
    ...
```

修改型钩子返回与其接收内容相同的形状——修改后再返回。

### 示例：参数级 RBAC

一种常见需求是“根据 `arguments` 中的内容拒绝此次工具调用”——例如，拒绝超过阈值的退款、阻止访问请求所属租户之外的工具，或拒绝负载与拒绝列表匹配的调用。使用 `mutate: false` 连接一个 `beforeCallTool` 钩子：

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: rbac-check
          appID: policy-service   # optional — see "Centralized policy app" below
```

工作流主体（伪代码，与语言无关）：

```text
workflow rbac-check(input):
  # input: { name, toolName, arguments }
  if input.toolName == "issue_refund":
    amount = input.arguments["amount"]
    if amount > 10_000:
      return error("rbac: refunds over $10K require manual approval")

  if input.toolName in DESTRUCTIVE_TOOLS:
    if not input.arguments.get("dry_run", false):
      return error("rbac: %s requires dry_run=true in this environment",
                   input.toolName)

  return ok   # mutate=false → return value is discarded; nil error means allow
```

有几点值得说明：

- **使用 `mutate: false`**，因为钩子只决定允许或拒绝——它不会重塑参数。（对于 PII 脱敏，你应改为 `mutate: true` 并返回清理后的 `arguments`。）
- **使用 `beforeCallTool`**，因为拒绝操作应在 MCP 服务器收到请求之前执行。等效的 `afterCallTool` 钩子也可以进行拦截（后置钩子错误会导致工作流失败），但此时你已经为上游调用付出了代价。
- **基于调用方的 RBAC（“谁可以调用哪个工具”）应在[策略层](#可观测性和访问控制)实施，而不是放在钩子中**——钩子输入不携带调用方的 appID。

### 示例：审计日志记录

后置钩子观察结果。使用 `mutate: false` 连接一个 `afterCallTool` 钩子，以写入审计记录，而不改变响应：

```yaml
spec:
  middleware:
    afterCallTool:
      - workflow:
          workflowName: audit-logger
```

```text
workflow audit-logger(input):
  # input: { name, toolName, arguments, result }
  # `result` is bytes carrying a JSON-encoded MCP CallToolResult; decode first.
  result = json_decode(input.result)
  emit_audit({
    server:    input.name,
    tool:      input.toolName,
    args:      redact(input.arguments),
    succeeded: not result.isError,
    at:        now(),
  })
  return ok   # mutate=false → result reaches the caller unchanged
```

由于审计钩子本身就是一个 Dapr Workflow，因此写入是持久的：即使在 `emit_audit` 活动开始到收到确认之间发出器重启，记录也不会丢失。

### 集中式策略应用

当钩子设置 `appID: <other-app>` 时，钩子工作流会通过服务调用在指定的远程 Dapr 应用上运行，而不是在本地运行。一个共享策略应用——RBAC 服务、审计记录器、PII 脱敏器——可以管理多个代理应用，而无需每个应用都嵌入策略。只需更新一次中央工作流；引用该工作流的每个 MCPServer 都会采用更改，无需重新部署调用方。

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: rbac-check
          appID: policy-service
      - workflow:
          workflowName: redact-pii
          appID: policy-service
        mutate: true
    afterCallTool:
      - workflow:
          workflowName: audit-logger
          appID: policy-service
```

### 示例：常见模式

| 模式 | 阶段 | `mutate` | 概要 |
|---|---|---|---|
| 参数 RBAC | `beforeCallTool` | `false` | 检查 `arguments`，返回错误以拒绝调用。 |
| 速率限制 | `beforeCallTool` | `false` | 查找按 `toolName` 设定的预算；预算耗尽时返回错误。 |
| PII 脱敏（请求） | `beforeCallTool` | `true` | 转换 `arguments`，并返回清理后的形状。 |
| 审计日志记录 | `afterCallTool` | `false` | 将 `{toolName, arguments, result.isError}`（先解码 `result` 字节）发送到 state store/日志接收端。 |
| 响应筛选 | `afterCallTool` | `true` | 移除/屏蔽已解码的 `CallToolResult` `content` 中的字段，然后进行 JSON 编码并返回。 |
| 工具列表筛选 | `afterListTools` | `true` | 移除调用方无权发现的工具，并将更新后的 `ListToolsResult` 作为 JSON 字节返回。 |

每种模式都是一个工作流，使用上述[钩子输入形状](#钩子输入形状)中规定的输入/输出形状。完整的中间件字段参考，请参阅 [MCPServer 规范]({{% ref path="mcpserver-schema" lang="en" %}})。

## 可观测性和访问控制

由于每个 MCP 工具都有自己的工作流名称（`dapr.internal.mcp.<server>.CallTool.<tool>`），所有标准的 Dapr 工作流遥测界面——实例状态、跟踪、指标——都会自动按工具细分。无需自定义插桩。运维人员可以使用工作流名称作为细分维度，构建按工具划分的仪表板或警报。

在访问控制方面，MCP 工作流与用户工作流一样参与 `WorkflowAccessPolicy`。该策略基于工作流名称和调用方 appID 构建允许列表，因此运维人员可以拒绝或限制从拥有该资源的 daprd 以外，哪些调用方可以调用 `dapr.internal.mcp.<server>.CallTool.<tool>`（或 `ListTools`）。自调用豁免（调用方 appID 与目标 appID 相同）默认允许进程内调用。这种方式使中央代理平台可以限制哪些代理能调用哪些工具，即使许多代理共用一个 MCP 网关也一样。

`WorkflowAccessPolicy` 和[中间件钩子](#中间件管道)可以组合使用，它们并不重叠。`WorkflowAccessPolicy` 决定*调用方是否可以启动 `CallTool.<tool>`*——这是在工作流边界强制执行、以 appID 为键的粗粒度控制。中间件钩子决定*调用开始执行后会发生什么*——这是对 `arguments` 和 `result` 完全可见的细粒度控制。两者都应使用：将策略作为外围防线，将钩子用于工具调用级别的参数 RBAC、脱敏和审计。

对于通过[服务调用方式]({{% ref path="mcp-service-invocation.md" lang="en" %}})而非工作流客户端访问 MCP 服务器的代理，对应的外围防线是在 MCP 服务器的 App ID 上附加 `Configuration` `accessControl`——请参阅 [MCP 访问控制]({{% ref path="mcp-access-control.md" lang="en" %}})。

## 部署拓扑

Dapr 工作流的跨应用路由意味着 MCPServer 的工作流不必与调用代理位于同一个 daprd 上——承载位置由工作流参与者的 appID 决定。这使以下三种模式成为可能：

- **MCP 网关**——由一个专用 daprd 应用加载多个 MCPServer 资源（payments、github、内部工具等）。所有代理应用都在此网关上调用 MCP 工作流。凭据、出站流量和策略集中管理，并且只需在一个地方轮换机密。可与 `WorkflowAccessPolicy` 结合使用，以控制哪些代理可以访问哪些工具。
- **一对一**——每个代理应用只加载自身需要的 MCPServer。租户隔离最严格，也没有跨应用依赖。最适合由各团队端到端管理自身 MCP 集成的场景。
- **混合模式**——部分 MCPServer 位于共享网关（公共基础设施）上，部分位于单个应用（特定租户）中。使用 `WorkflowAccessPolicy` 按应用限制对网关工具的访问。

`MCPServer` 本身对此无需添加任何功能——这依赖的是现有的 Dapr 工作流跨应用路由。要点是：选择符合你的治理和隔离模型的拓扑；使用 `MCPServer` 并不要求你把所有东西都集中到一个 daprd 上。

## 应用作用域

使用 `scopes` 限制哪些 Dapr 应用可以使用 MCPServer：

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: payments-mcp
spec:
  endpoint:
    streamableHTTP:
      url: https://payments.internal/mcp
scopes:
  - agent-app-1
  - agent-app-2
```

## 容忍加载失败

默认情况下，无法加载 MCPServer（验证错误、端点无法访问、凭据错误）会导致 daprd 退出。设置 `spec.ignoreErrors: true`，可让边车继续运行并记录失败情况——当某个 MCP 服务器为可选项，或同一 daprd 上的其他资源必须保持可用时，这很有用：

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: optional-mcp
spec:
  ignoreErrors: true
  endpoint:
    streamableHTTP:
      url: https://maybe-flaky.internal/mcp
```

当 `ignoreErrors` 为 `true` 且加载失败时，MCPServer 的工作流不会注册，因此对 `dapr.internal.mcp.<server>.*` 的调用会返回 `ERR_WORKFLOW_NAME_RESERVED`，直到服务器成功加载（例如通过热重载）。

## 相关链接

- [MCPServer 规范参考]({{% ref path="mcpserver-schema" lang="en" %}})
- [操作指南：使用 MCPServer 资源]({{% ref path="howto-use-mcpserver.md" lang="en" %}})
- [工作流 API 参考]({{% ref workflow_api %}})
- [通过 Dapr 服务调用使用 MCP]({{% ref path="mcp-service-invocation.md" lang="en" %}})——适用于需要继续使用现成 MCP 客户端的代理
- [MCP 访问控制]({{% ref path="mcp-access-control.md" lang="en" %}})——适用于服务调用方式、以 App ID 为键的 `Configuration` `accessControl`
- [Python SDK MCP 示例](https://github.com/dapr/python-sdk/tree/main/examples/mcp)——`DaprMCPClient`，一种与框架无关的客户端，可用于从任何代理框架调用 MCPServer 工具
- [dapr-agents MCPServer 示例](https://github.com/dapr/dapr-agents/tree/main/examples/10-mcpserver)——无需配置的 MCPServer 工具发现；`DurableAgent` 会自动从边车元数据中获取 MCPServer 工具
- [Dapr MCP 服务器快速入门](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server)——可通过 `MCPServer` 资源调用 [Dapr MCP 服务器]({{% ref path="dapr-mcp-server" lang="en" %}})的 LangGraph、Dapr Agents 和 OpenAI Agents SDK 代理
