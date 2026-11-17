---
type: docs
title: "操作指南：使用 MCPServer 资源"
linkTitle: "操作指南：使用 MCPServer"
weight: 30
description: "使用 MCPServer 资源发现 MCP 服务器上的工具并调用它们"
---

本指南将带你完成以下步骤：声明一个 MCPServer 资源、列出其工具，并通过 Dapr Workflow API 调用某个工具。Dapr 负责处理 MCP 协议、传输、身份验证和持久重试，你的应用只需按名称启动 workflow 即可。

## 步骤 1：定义 MCPServer 资源

在你的资源目录中创建文件 `mcpserver.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: my-mcp-server
spec:
  endpoint:
    streamableHTTP:
      url: http://localhost:8080
```

这会让 Dapr 使用 streamable HTTP 传输方式连接到 `http://localhost:8080` 上的 MCP 服务器。

## 步骤 2：列出可用工具

使用 Dapr Workflow API 启动一个 `ListTools` workflow：

```bash
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/dapr.internal.mcp.my-mcp-server.ListTools/start" \
  -H "Content-Type: application/json" \
  -d '{}'
```

响应：
```json
{"instanceID": "abc123"}
```

轮询获取结果：

```bash
curl "http://localhost:3500/v1.0-beta1/workflows/dapr/abc123"
```

当 `runtimeStatus` 为 `"COMPLETED"` 时，`properties["dapr.workflow.output"]` 字段包含工具列表。每个工具的 `inputSchema` 是其参数的原始 JSON Schema：

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

## 步骤 3：调用工具

每个 MCP 工具都有自己的 workflow，名称为 `dapr.internal.mcp.<server>.CallTool.<tool>`。工具名称已包含在 workflow 名称中，因此输入只需携带参数：

```bash
curl -X POST "http://localhost:3500/v1.0-beta1/workflows/dapr/dapr.internal.mcp.my-mcp-server.CallTool.get_weather/start" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {"city": "Seattle"}
  }'
```

像步骤 2 一样轮询获取结果。输出是一个 [MCP `CallToolResult`](https://modelcontextprotocol.io/specification/2025-11-25/schema#calltoolresult)，其结构与 MCP 线上协议规范逐字节一致。`content` 中的每一项都是带有 `type` 判别字段的扁平标记联合类型：

```json
{
  "isError": false,
  "content": [
    {"type": "text", "text": "Weather in Seattle: sunny, 72°F"}
  ]
}
```

如果工具调用在 MCP 层面失败（例如未知工具、身份验证错误），`isError` 为 `true`，错误信息位于 `content` 中。workflow 本身会成功完成，`isError` 不代表 workflow 失败。

如果调用缺少必需参数，你会立即得到相同结构的 `isError: true` 响应。Dapr 会在联系 MCP 服务器之前，依据缓存的工具 JSON Schema 进行校验，因此代理或大型语言模型 (LLM) 无需额外的网络往返即可看到可操作的错误信息。

## 步骤 4（可选）：添加身份验证

添加 OAuth2 客户端凭据，以便与 MCP 服务器进行身份验证：

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: my-mcp-server
spec:
  endpoint:
    streamableHTTP:
      url: https://mcp.example.com
      auth:
        secretStore: kubernetes
        oauth2:
          issuer: https://auth.example.com/token
          clientID: my-client-id
          audience: mcp://my-server
          secretKeyRef:
            name: mcp-oauth-secret
            key: clientSecret
```

Dapr 从颁发者处获取令牌，并将其作为 Bearer 令牌注入每个 MCP 请求。为提高效率，HTTP 客户端会按 MCPServer 进行缓存。

## 步骤 5（可选）：添加 middleware

middleware 钩子让你可以在每次工具调用时，以 Dapr workflow 的形式运行鉴权、脱敏和审计，而无需修改代理代码。钩子在 MCPServer 规范中进行配置，并以普通 workflow 的形式注册到你的应用中（或通过 `appID` 注册到专用的策略应用中）。

### 步骤 5.1：添加 RBAC 钩子（违反策略时拒绝）

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: rbac-check
```

在应用中注册一个名为 `rbac-check` 的 workflow。它会接收一个 `MCPBeforeCallToolHookInput`：

```text
{ name, toolName, arguments }
```

`name` 是 MCPServer 资源的名称；`arguments` 是调用方传入的 JSON 对象。返回错误即拒绝；返回 nil 即允许。

```text
workflow rbac-check(input):
  # 参数级 RBAC：检查负载并做出决定。
  if input.toolName == "issue_refund":
    if input.arguments["amount"] > 10_000:
      return error("rbac: refunds over $10K require manual approval")

  if input.toolName in DESTRUCTIVE_TOOLS:
    if not input.arguments.get("dry_run", false):
      return error("rbac: %s requires dry_run=true",
                   input.toolName)

  return ok   # 返回 nil 错误，使工具调用继续进行
```

该钩子以持久 workflow 的形式运行。如果 daprd 在策略检查过程中重启，Scheduler 会重新投递，决策随之完成。

> **按调用方划分的 RBAC（“哪些应用可以调用哪些工具”）应放在 [`WorkflowAccessPolicy`]({{% ref workflow_api %}}) 层，而不是钩子中。** 钩子输入不携带调用方的 appID，策略才携带。应将策略用作外围边界，将钩子用于参数级决策。

### 步骤 5.2：添加会修改参数的 PII 脱敏钩子

若要在 `arguments` 到达工具之前对其进行转换（脱敏 PII、规范化取值、注入默认值），请设置 `mutate: true`：

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: redact-pii
        mutate: true
```

```text
workflow redact-pii(input):
  # 输入：{ name, toolName, arguments }
  args = copy(input.arguments)
  if "email" in args:
    args["email"] = mask_email(args["email"])
  return { name: input.name, toolName: input.toolName, arguments: args }
```

钩子返回的结构与其接收的结构相同。MCP 服务器（以及链中之后的任何钩子）只会看到转换后的 `arguments`。

若要对事后的响应进行过滤或审计日志记录，可以同样的方式配置在 `afterCallTool` 下。完整的模式集合请参阅[概述示例]({{% ref "mcp-server-resource.md#examples-common-patterns" %}})。

### 步骤 5.3：在共享应用中集中管理策略

若要让钩子在专用策略应用而非本地运行，请添加 `appID`：

```yaml
spec:
  middleware:
    beforeCallTool:
      - workflow:
          workflowName: rbac-check
          appID: policy-service   # 在名为 "policy-service" 的 Dapr 应用上运行
```

同一 workflow 会通过 service invocation 在指定的应用上运行。一个共享策略应用（RBAC、审计、PII 脱敏）即可统一管理多个代理应用，而无需每个应用都嵌入策略。只需更新一次中心 workflow，所有引用它的 MCPServer 都会自动获取变更，无需重新部署其调用方。

> 有关标准钩子模式（RBAC、限流、审计、响应过滤、工具列表过滤），请参阅[概述示例]({{% ref "mcp-server-resource.md#examples-common-patterns" %}})。

## 相关链接

- [MCPServer 资源概述]({{% ref mcp-server-resource.md %}})
- [MCPServer 规范参考]({{% ref mcpserver-schema %}})
- [Workflow API 参考]({{% ref workflow_api %}})
- [Dapr MCP 服务器 quickstarts](https://github.com/dapr/quickstarts/tree/master/dapr-mcp-server) — 通过 `MCPServer` 资源调用 [Dapr MCP 服务器]({{% ref dapr-mcp-server %}}) 的 LangGraph、Dapr Agents 和 OpenAI Agents SDK 代理
