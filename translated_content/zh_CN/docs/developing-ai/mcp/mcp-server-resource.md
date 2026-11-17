---
type: docs
title: "MCPServer 资源"
linkTitle: "MCPServer 资源"
weight: 25
description: "将 MCP 服务器连接声明为一等 Dapr 资源，以实现持久工具执行"
---

## 概述

`MCPServer` 资源允许你将 MCP（模型上下文协议）服务器连接声明为一等 Dapr 资源。当 daprd 加载 MCPServer 时，它会发现服务器的工具，并为每个工具注册一个内置的持久 workflow 编排。调用工具随即变成“启动 workflow”——Dapr 会为你处理连接、重试、凭据、可观测性和崩溃恢复。你的应用无需导入 MCP SDK，也无需持有长期存在的 MCP 连接。

{{% alert title="何时使用此方式" color="primary" %}}
`MCPServer` 资源**不是 Dapr 中默认的 MCP 集成方式**——大多数团队应从 [service invocation 方式]({{% ref mcp-service-invocation.md %}}) 开始，这种方式不会改变现有的 MCP 客户端和代理框架。

当你明确需要参数级 RBAC、审计、脱敏、在调用中途 sidecar 重启后仍能继续的持久重试，或按工具细分的可观测性时，`MCPServer` 是合适的选择。作为代价，你需要采用 [Dapr Workflow]({{% ref workflow-overview %}}) 客户端来调用工具——现成的 MCP 客户端无法驱动由 `MCPServer` 支撑的工具调用。
{{% /alert %}}

## 在 `MCPServer` 与 service invocation 方式之间选择

Dapr 为 MCP 提供两种集成方式。[service invocation 方式]({{% ref mcp-service-invocation.md %}}) 是默认方式；`MCPServer` 则以 workflow 为中心。请使用此表判断哪种方式适合你的需求。

| 如果你…… | 使用 |
|---|---|
| 使用现成的 MCP 客户端或框架（LangGraph、官方 MCP SDK 等），并希望客户端代码保持不变 | **[service invocation 方式]({{% ref mcp-service-invocation.md %}})** |
| 想要适用于任何框架的最简单设置 | **[service invocation 方式]({{% ref mcp-service-invocation.md %}})** |
| 需要按工具实施参数级 RBAC、审计或脱敏钩子 | **`MCPServer` 资源**（本页） |
| 需要在调用中途 sidecar 重启后仍能继续的持久重试 | **`MCPServer` 资源**（本页） |
| 希望按工具细分可观测性（每个工具一个 workflow） | **`MCPServer` 资源**（本页） |

这两种方式并不互斥——大多数 MCP 流量可以经由 service invocation 传输，而当某些服务器的策略需要感知参数，或你希望 MCP 交互具备持久性时，可以将这些特定服务器切换到 `MCPServer` 资源。

## 为什么选择 MCPServer？

MCPServer 将 MCP 集成从应用代码层面的关注点，转变为部署时的关注点。这些收益会在整个系统中叠加：

- **应用中无需 MCP SDK。** 你的应用按名称启动一个 Dapr workflow，Dapr 负责通过 MCP 与服务器通信。替换 MCP 服务器、更换传输方式或轮换凭据，都无需修改应用代码。
- **在 YAML 中配置按工具的 RBAC、审计和脱敏。** 保序的 `beforeCallTool` / `afterCallTool` / `beforeListTools` / `afterListTools` 钩子会以 Dapr workflow 的形式运行参数级授权、速率限制、PII 脱敏、审计日志和响应过滤。在钩子上设置 `appID`，即可将其路由到集中式策略应用，由一个共享的 RBAC 服务统一管理所有代理，而无需每个应用各自嵌入策略。
- **持久执行。** 工具调用作为 workflow activity 运行，并由 Dapr Scheduler reminder 支撑。如果 daprd 在调用中途重启，Scheduler 会将该 activity 重新投递给新实例，调用随即完成——代理无需自行实现重试或恢复逻辑。在单个 activity 内部，短暂的连接中断会被自动吸收：Dapr 为每个 MCPServer 保持一个带 keep-alive ping 的预热会话，并在遇到 `ErrConnectionClosed` 时重连一次，因此 workflow 永远不会感知到这次波动。
- **为调用方提供快速反馈。** 必填字段校验会在联系 MCP 服务器之前，针对缓存的 JSON Schema 执行。缺失的参数会立即以结构化的 `mcp.CallToolResult{isError: true}` 返回——代理和大型语言模型 (LLM) 无需消耗一次网络往返，即可获得可操作的错误信息。
- **按工具的可观测性。** 每个工具都有自己的 workflow 名称（`dapr.internal.mcp.<server>.CallTool.<tool>`），因此追踪、指标和审计日志开箱即按工具细分。你可以准确看到哪个工具被调用、由谁调用、使用了什么参数，以及返回了什么。
- **声明式身份验证。** OAuth2 客户端凭据、SPIFFE 工作负载身份和静态标头认证，全部在 YAML 中配置。Dapr 负责获取和刷新令牌、为每个 MCPServer 缓存 HTTP 客户端，且从不向你的应用暴露原始凭据。
- **作用域与多租户。** MCPServer 与其他 Dapr 资源一样具有命名空间，并受 `scopes` 限制。一个 MCP 服务器可以在不同访问策略下被多个应用共享。
- **热重载。** 可在运行时添加、删除或修改 MCPServer 资源，Dapr 会重新加载它们，无需重启 sidecar。

| 没有 MCPServer | 使用 MCPServer |
|---|---|
| 应用自行管理 MCP 连接、重试和凭据 | 声明 YAML，其余交给 Dapr 处理 |
| sidecar 在调用中途崩溃 = 调用丢失 | Scheduler reminder 重新投递 activity，workflow 恢复执行 |
| 按工具的追踪/指标需要自定义插桩 | 每个工具一个 workflow——内置的可观测性细分 |
| 每个应用都硬编码自己的 MCP 连接逻辑 | 单个资源，通过 `scopes` 在应用间共享 |
| 工具调用的 RBAC 与审计逻辑嵌入在代理代码中 | 在 YAML 中为每个 MCPServer 声明，以持久 workflow 强制执行，并可通过 `appID` 集中管理 |

## 工作原理

对于每个已加载的、名为 `<server>` 的 MCPServer，daprd 会：

1. **连接**到 MCP 服务器，使用已配置的传输方式（Streamable HTTP、SSE 或 stdio）。
2. **发现**服务器公开的工具（一次 MCP `tools/list` 往返）。
3. **注册**持久的 workflow 编排：
   - `dapr.internal.mcp.<server>.ListTools` ——返回缓存的工具列表。
   - `dapr.internal.mcp.<server>.CallTool.<tool>` ——每个已发现的工具对应一个 workflow。每个 workflow 都以 activity 的形式持久地调用该工具，并可选择在调用前后运行 middleware 钩子。

调用方通过标准的 [Dapr Workflow API]({{% ref workflow_api %}}) 启动这些 workflow。Dapr Workflow 负责调度、对瞬时故障的重试，以及在 sidecar 重启后恢复执行。

你无需单独启用 workflow——加载 MCPServer 即可。只要存在任何 MCPServer 资源，Dapr 的 workflow 引擎就会激活，即使从未有 SDK 的 workflow 客户端连接也是如此。

### 调用工具

启动 `CallTool.<tool>` workflow 时只需传入参数——工具名称已编码在 workflow 名称本身中：

```
POST /v1.0-beta1/workflows/dapr/dapr.internal.mcp.<server>.CallTool.<tool>/start
Content-Type: application/json

{
  "arguments": {"city": "Seattle"}
}
```

使用 `GET /v1.0-beta1/workflows/dapr/<instanceID>` 轮询结果。workflow 的输出是 [MCP `CallToolResult`](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult)，其形状与 MCP 线协议规范逐字节一致。`content` 中的每个条目都是扁平的带标签联合类型（`type` 判别字段加上各变体的字段）：

```json
{
  "isError": false,
  "content": [
    {"type": "text", "text": "Weather in Seattle: sunny, 72°F"}
  ]
}
```

其他内容形式同样是扁平的：`{"type": "image", "data": "<base64>", "mimeType": "image/png"}`（`audio` 同理）；资源引用使用 `{"type": "resource_link", "uri": "...", "name": "...", "mimeType": "...", "description": "..."}`，或 `{"type": "resource", "resource": {"uri": "...", "mimeType": "...", "text": "..." | "blob": "<base64>"}}`。

如果工具调用在 MCP 层面失败（未知工具、验证失败、服务器端身份验证错误），`isError` 为 `true`，失败原因会在 `content` 中描述。workflow 本身仍会成功完成，因此调用方代理或 LLM 会收到结构化错误，可据此采取行动（重试、选择其他工具，或将错误展示给用户）。

如果 daprd 在工具调用进行中重启，Dapr Scheduler 会将待处理的 activity 重新投递给新的 daprd 实例，workflow 随即恢复执行，无需应用端的重试逻辑。

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

工具定义在 MCPServer 加载时缓存，并在热重载时刷新。后续的 `ListTools` workflow 调用会立即从缓存返回，不再往返上游的 `tools/list`，因此在首次加载之后，反复调用 `ListTools` 的代理不会再产生任何 MCP 服务器延迟。

## 传输方式

MCPServer 支持三种线协议传输方式。必须在 `spec.endpoint` 下配置且仅配置其中一种。

### Streamable HTTP

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

Dapr 对 MCP 服务器交互施加了若干硬性限制，以防行为异常或怀有恶意的 MCP 服务器耗尽 sidecar 资源：

- **工具列表分页**：每次 `tools/list` 往返最多 500 页。返回超过此数量的服务器会在加载时被拒绝，而不会被静默截断。
- **Schema 缓存**：每个 MCPServer 最多缓存 500 个工具 schema，每个不超过 1 MB。
- **HTTP 响应标头超时**：每个出站请求的首字节时间上限为 5 秒。SSE 流不受影响，因为该超时只限制初始标头的接收。

这些限制有意不可由用户调整。它们是按典型生产 MCP 服务器的规模设定的，可确保 sidecar 在面对恶意输入时仍保持有界的资源消耗。

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

Dapr 从授权服务器获取访问令牌并自动注入。HTTP 客户端按 MCPServer 缓存，以提高效率。`auth.secretStore` 控制用于解析此 `auth` 块下任何位置的 `secretKeyRef`（以及同一传输方式上静态标头的 `secretKeyRef`）所使用的 secret store，默认为 `kubernetes`。

```yaml
spec:
  endpoint:
    streamableHTTP:
      url: https://payments.internal/mcp
      auth:
        secretStore: my-vault   # 可选；默认为 "kubernetes"
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

Dapr 为每个请求注入一个 SPIFFE JWT SVID。无需任何 secrets，Sentry 会自动签发 SVID。SVID 在每个出站请求时重新获取，而不是缓存在进程内，因此不存在内存中的令牌缓存、刷新竞争，也不存在凭据过期前仍被使用的时间窗口。

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

## Middleware 流水线

Middleware 钩子通过 Dapr Workflows 强制执行，将工具调用治理转变为声明式 YAML。可选钩子会按数组顺序在工具调用和工具列表操作的前后运行。规范模式请参见下文的[示例](#示例常见模式)。

- **前置钩子**：如果任何钩子返回错误，调用链即停止，操作随之中止。
- **`afterCallTool` 钩子**：错误会**使 workflow 失败**——这些钩子可以充当授权门，阻止响应到达调用方。
- **`afterListTools` 钩子**：错误会被记录，但不影响返回给调用方的结果。
- **修改型钩子**：设置 `mutate: true`，使钩子的返回值替换流经流水线的数据（工具调用前的参数，或调用后的结果）。默认值为 `false`，即仅观察：钩子只做校验或审计，其输出会被丢弃。`beforeListTools` 不支持 `mutate`。

### 钩子输入形状

每个钩子都是一个 Dapr workflow，接收运行时提供的类型化输入：

```text
beforeCallTool input:  { name, toolName, arguments }
afterCallTool  input:  { name, toolName, arguments, result }   # result: bytes — JSON-encoded MCP CallToolResult
beforeListTools input: { name }
afterListTools  input: { name, result }                         # result: bytes — JSON-encoded MCP ListToolsResult
```

`name` 是 MCPServer 资源名称。`arguments` 是调用方传入的 JSON 对象。`result` 是 JSON 编码的 MCP 规范结果（驼峰命名的线协议形状，与 [MCP 规范](https://modelcontextprotocol.io/specification/)字节兼容）。钩子 workflow 可以使用对应语言的 MCP SDK，或使用普通的 JSON 解码来反序列化：

```python
# Python 钩子示例
import json
def after_call_tool(ctx, input):
    result = json.loads(input["result"])
    is_error = result["isError"]
    text = result["content"][0]["text"] if result["content"] else ""
    ...
```

修改型钩子返回与接收时相同的形状，即修改后再返回。

### 示例：参数级 RBAC

一种常见需求是“根据 `arguments` 中的内容拒绝该工具调用”，例如拒绝超过阈值的退款，阻止触及请求所属租户之外的工具，或拒绝负载与拒绝列表相匹配的调用。以 `mutate: false` 连接一个 `beforeCallTool` 钩子：

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: rbac-check
          appID: policy-service   # 可选，见下文“集中式策略应用”
```

workflow 主体（伪代码，与语言无关）：

```text
workflow rbac-check(input):
  # 输入：{ name, toolName, arguments }
  if input.toolName == "issue_refund":
    amount = input.arguments["amount"]
    if amount > 10_000:
      return error("rbac: refunds over $10K require manual approval")

  if input.toolName in DESTRUCTIVE_TOOLS:
    if not input.arguments.get("dry_run", false):
      return error("rbac: %s requires dry_run=true in this environment",
                   input.toolName)

  return ok   # mutate=false → 丢弃返回值；nil 错误表示允许
```

有几点值得说明：

- **使用 `mutate: false`**，因为该钩子只决定允许或拒绝，它从不重塑参数。（若要做 PII 脱敏，应改为 `mutate: true` 并返回清理后的 `arguments`。）
- **使用 `beforeCallTool`**，因为拒绝操作应在 MCP 服务器看到请求之前完成。等效的 `afterCallTool` 钩子同样可以拦截（后置钩子出错会使 workflow 失败），但此时你已为上游调用付出了代价。
- **基于调用方的 RBAC（“谁可以调用哪个工具”）应在[策略层](#可观测性和访问控制)实现，而不是放在钩子中**，因为钩子的输入不包含调用方的 appID。

### 示例：审计日志

后置钩子负责观察结果。以 `mutate: false` 连接一个 `afterCallTool` 钩子，即可在不改变响应的前提下写入审计记录：

```yaml
spec:
  middleware:
    afterCallTool:
      - workflow:
          workflowName: audit-logger
```

```text
workflow audit-logger(input):
  # 输入：{ name, toolName, arguments, result }
  # `result` 是携带 JSON 编码 MCP CallToolResult 的字节，需先解码。
  result = json_decode(input.result)
  emit_audit({
    server:    input.name,
    tool:      input.toolName,
    args:      redact(input.arguments),
    succeeded: not result.isError,
    at:        now(),
  })
  return ok   # mutate=false → result 原样到达调用方
```

由于审计钩子本身是一个 Dapr Workflow，写入是持久的：即使发出器在 `emit_audit` activity 启动与确认之间重启，记录也不会丢失。

### 集中式策略应用

当钩子设置 `appID: <other-app>` 时，钩子 workflow 会通过 service invocation 在指定的远程 Dapr 应用上运行，而不是在本地运行。一个共享的策略应用（RBAC 服务、审计记录器、PII 脱敏器）可以统一管理多个代理应用，而无需每个应用都嵌入策略。只需更新一次中央 workflow，每个引用它的 MCPServer 都会采用这一变更，无需重新部署调用方。

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
| 速率限制 | `beforeCallTool` | `false` | 按 `toolName` 查找预算；预算耗尽时返回错误。 |
| PII 脱敏（请求） | `beforeCallTool` | `true` | 转换 `arguments`，返回清理后的形状。 |
| 审计日志 | `afterCallTool` | `false` | 将 `{toolName, arguments, result.isError}`（先解码 `result` 字节）发送到 state store 或日志接收端。 |
| 响应过滤 | `afterCallTool` | `true` | 去除或遮蔽已解码的 `CallToolResult` `content` 中的字段，然后进行 JSON 编码并返回。 |
| 工具列表过滤 | `afterListTools` | `true` | 去除调用方无权发现的工具，并将更新后的 `ListToolsResult` 以 JSON 字节返回。 |

每种模式都是一个 workflow，其输入/输出形状遵循上文[钩子输入形状](#钩子输入形状)中的规定。完整的 middleware 字段参考，请参阅 [MCPServer 规范]({{% ref mcpserver-schema %}})。

## 可观测性和访问控制

由于每个 MCP 工具都有自己的 workflow 名称（`dapr.internal.mcp.<server>.CallTool.<tool>`），所有标准的 Dapr Workflow 遥测面（实例状态、追踪、指标）都会自动按工具细分，无需自定义插桩。运维人员可以以 workflow 名称作为细分维度，构建按工具划分的仪表板或告警。

在访问控制方面，MCP workflow 与用户 workflow 一样参与 `WorkflowAccessPolicy`。该策略是一个以 workflow 名称加调用方 appID 为键的允许列表，因此运维人员可以拒绝或限制哪些调用方（来自拥有该资源的 daprd 之外）可以调用 `dapr.internal.mcp.<server>.CallTool.<tool>`（或 `ListTools`）。自调用豁免（调用方 appID 与目标 appID 相同）默认保持进程内调用开放。这使中央代理平台能够限制哪些代理可以调用哪些工具，即使多个代理共享同一个 MCP 网关也是如此。

`WorkflowAccessPolicy` 与[middleware 钩子](#middleware-流水线)相互组合，而非重叠。`WorkflowAccessPolicy` 决定*调用方能否启动 `CallTool.<tool>`*，它是粗粒度的、以 appID 为键的控制，在 workflow 边界强制执行。middleware 钩子决定*调用进行中会发生什么*，它是细粒度的，可以完整看到 `arguments` 和 `result`。两者应同时使用：策略作为外围防线，钩子则用于工具调用级别的参数 RBAC、脱敏和审计。

对于通过[service invocation 方式]({{% ref mcp-service-invocation.md %}})而非 Workflow 客户端访问 MCP 服务器的代理，对应的外围防线是在 MCP 服务器的 App ID 上附加 `Configuration` 的 `accessControl`，参见 [MCP 访问控制]({{% ref mcp-access-control.md %}})。

## 部署拓扑

Dapr Workflow 的跨应用路由意味着 MCPServer 的 workflow 不必与调用代理位于同一个 daprd 上，其宿主位置由 workflow actor 的 appID 决定。这使以下三种模式成为可能：

- **MCP 网关**：由一个专用的 daprd 应用加载多个 MCPServer 资源（payments、github、内部工具等）。所有代理应用都在该网关上调用 MCP workflow。凭据、出口流量和策略集中管理，只需在一处轮换 secrets。可与 `WorkflowAccessPolicy` 结合使用，以控制哪些代理可以访问哪些工具。
- **一对一**：每个代理应用只加载它所需的 MCPServer。租户隔离最严格，也不存在跨应用依赖。最适合各团队端到端负责自身 MCP 集成的场景。
- **混合**：部分 MCPServer 位于共享网关（公共基础设施）上，部分位于各个应用中（特定租户）。使用 `WorkflowAccessPolicy` 按应用控制对网关工具的访问。

`MCPServer` 本身不为此增加任何功能，这依赖的是现有的 Dapr Workflow 跨应用路由。结论是：选择符合你的治理与隔离模型的拓扑即可，使用 `MCPServer` 并不要求把所有内容都集中到同一个 daprd 上。

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

默认情况下，加载失败的 MCPServer（验证错误、端点不可达、凭据错误）会导致 daprd 退出。设置 `spec.ignoreErrors: true` 可让 sidecar 保持运行并记录失败。当某个 MCP 服务器是可选的，或同一 daprd 上的其他资源必须保持可用时，这很有用：

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

当 `ignoreErrors` 为 `true` 且加载失败时，该 MCPServer 的 workflow 不会注册，因此对 `dapr.internal.mcp.<server>.*` 的调用会返回 `ERR_WORKFLOW_NAME_RESERVED`，直到服务器成功加载（例如通过热重载）为止。

## 相关链接

- [MCPServer 规范参考]({{% ref mcpserver-schema %}})
- [操作指南：使用 MCPServer 资源]({{% ref howto-use-mcpserver.md %}})
- [Workflow API 参考]({{% ref workflow_api %}})
- [通过 Dapr service invocation 使用 MCP]({{% ref mcp-service-invocation.md %}})：适用于需要继续使用现成 MCP 客户端的代理
- [MCP 访问控制]({{% ref mcp-access-control.md %}})：适用于 service invocation 方式的、以 App ID 为键的 `Configuration` `accessControl`
- [Python SDK MCP 示例](https://github.com/dapr/python-sdk/tree/main/examples/mcp)：`DaprMCPClient`，一个与框架无关的客户端，可用于从任何代理框架调用 MCPServer 工具
- [dapr-agents MCPServer 示例](https://github.com/dapr/dapr-agents/tree/main/examples/10-mcpserver)：零配置的 MCPServer 工具发现；`DurableAgent` 会自动从 sidecar metadata 中获取 MCPServer 工具
- [Dapr MCP 服务器 Quickstarts](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server)：通过 `MCPServer` 资源调用 [Dapr MCP 服务器]({{% ref dapr-mcp-server %}}) 的 LangGraph、Dapr Agents 和 OpenAI Agents SDK 代理
