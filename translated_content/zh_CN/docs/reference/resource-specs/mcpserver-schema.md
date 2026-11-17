---
type: docs
title: "MCPServer 规范"
linkTitle: "MCPServer"
description: "Dapr MCPServer 资源的基础规范"
weight: 3500
---

`MCPServer` 是一种 Dapr 资源，用于声明到 MCP（模型上下文协议）服务器的连接。Dapr 在启动时加载这些资源，发现服务器提供的工具，并为每个工具注册内置的持久化工作流编排：用于工具发现的 `dapr.internal.mcp.<server>.ListTools`，以及为每个已发现的工具注册的 `dapr.internal.mcp.<server>.CallTool.<tool>`，用于持久化的工具执行。调用方通过标准的 [Dapr Workflow API]({{% ref workflow_api %}}) 调用它们。

{{% alert title="注意" color="primary" %}}
任何 MCPServer 资源都可以限制在特定的[命名空间]({{% ref isolation-concept.md %}})内，并通过作用域限制为任意特定的应用集合访问。
{{% /alert %}}

## 格式

`endpoint` 下必须且只能设置 `streamableHTTP`、`sse` 或 `stdio` 其中之一。

### Streamable HTTP 传输

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: <NAME>
spec:
  ignoreErrors: <REPLACE-WITH-BOOL> # 可选。为 true 时，即使此 MCPServer 加载失败，daprd 仍会继续运行。
  endpoint:
    streamableHTTP:
      url: <REPLACE-WITH-URL> # 必填。MCP 服务器的端点 URL。
      protocolVersion: <REPLACE-WITH-VERSION> # 可选。MCP 规范版本（例如 "2025-06-18"）。
      timeout: <REPLACE-WITH-TIMEOUT> # 可选。每次调用的截止时间（例如 "30s"）。
      headers: # 可选
        - name: <REPLACE-WITH-HEADER-NAME>
          value: <REPLACE-WITH-HEADER-VALUE>
        - name: <REPLACE-WITH-HEADER-NAME>
          secretKeyRef:
            name: <REPLACE-WITH-SECRET-NAME>
            key: <REPLACE-WITH-SECRET-KEY>
      auth: # 可选
        secretStore: <REPLACE-WITH-SECRETSTORE>
        oauth2:
          issuer: <REPLACE-WITH-TOKEN-ENDPOINT>
          clientID: <REPLACE-WITH-CLIENT-ID> # 可选。OAuth2 客户端标识符。
          audience: <REPLACE-WITH-AUDIENCE>
          scopes:
            - <REPLACE-WITH-SCOPE>
          secretKeyRef:
            name: <REPLACE-WITH-SECRET-NAME>
            key: <REPLACE-WITH-SECRET-KEY>
        spiffe:
          jwt:
            header: <REPLACE-WITH-HEADER-NAME>
            headerValuePrefix: <REPLACE-WITH-PREFIX>
            audience: <REPLACE-WITH-AUDIENCE>
  middleware: # 可选
    beforeCallTool:
      - workflow:
          workflowName: <REPLACE-WITH-WORKFLOW-NAME>
          appID: <REPLACE-WITH-APP-ID> # 可选。远程应用。
        mutate: <REPLACE-WITH-BOOL> # 可选。为 true 时，钩子的返回值替换参数。
    afterCallTool:
      - workflow:
          workflowName: <REPLACE-WITH-WORKFLOW-NAME>
        mutate: <REPLACE-WITH-BOOL> # 可选。为 true 时，钩子的返回值替换结果。
    beforeListTools:
      - workflow:
          workflowName: <REPLACE-WITH-WORKFLOW-NAME>
    afterListTools:
      - workflow:
          workflowName: <REPLACE-WITH-WORKFLOW-NAME>
        mutate: <REPLACE-WITH-BOOL> # 可选。为 true 时，钩子的返回值替换结果。
  catalog: # 可选。仅供参考。
    displayName: <REPLACE-WITH-DISPLAY-NAME>
    description: <REPLACE-WITH-DESCRIPTION>
    owner:
      team: <REPLACE-WITH-TEAM>
      contact: <REPLACE-WITH-CONTACT>
    tags:
      - <REPLACE-WITH-TAG>
    links:
      docs: <REPLACE-WITH-URL>
scopes: # 可选
  - <REPLACE-WITH-SCOPED-APPIDS>
```

### SSE 传输

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: <NAME>
spec:
  endpoint:
    sse:
      url: <REPLACE-WITH-URL>
      protocolVersion: <REPLACE-WITH-VERSION> # 可选
      timeout: <REPLACE-WITH-TIMEOUT> # 可选
      headers: # 可选。格式与 streamableHTTP 相同。
        - name: <REPLACE-WITH-HEADER-NAME>
          value: <REPLACE-WITH-HEADER-VALUE>
      auth: # 可选。格式与 streamableHTTP 相同。
        secretStore: <REPLACE-WITH-SECRETSTORE>
```

### Stdio 传输

在 Kubernetes 托管的模式中不受支持。

```yaml
apiVersion: dapr.io/v1alpha1
kind: MCPServer
metadata:
  name: <NAME>
spec:
  endpoint:
    stdio:
      command: <REPLACE-WITH-COMMAND> # 必填。
      args: # 可选
        - <REPLACE-WITH-ARG>
      env: # 可选
        - name: <REPLACE-WITH-ENV-NAME>
          value: <REPLACE-WITH-ENV-VALUE>
        - name: <REPLACE-WITH-ENV-NAME>
          secretKeyRef:
            name: <REPLACE-WITH-SECRET-NAME>
            key: <REPLACE-WITH-SECRET-KEY>
```

## 规范字段

### 顶层

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| ignoreErrors | 否 | 为 `true` 时，如果此 MCPServer 未通过校验或密钥解析，daprd 仍保持运行。为 `false`（默认值）时，此类失败会导致 daprd 正常退出。 | `true` |
| endpoint | 是 | MCP 服务器的传输方式与目标。参见下方的[端点](#端点)。 | |
| middleware | 否 | 围绕工具和列表操作调用的可选工作流钩子。参见下方的[中间件字段](#中间件字段)。 | |
| catalog | 否 | 信息性的治理元数据。参见下方的[Catalog 字段](#catalog-字段)。 | |

### 端点

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| endpoint.streamableHTTP | 否* | Streamable HTTP 传输的配置。 | 参见上方格式 |
| endpoint.sse | 否* | 旧版 SSE 传输的配置。 | 参见上方格式 |
| endpoint.stdio | 否* | stdio 子进程传输的配置。 | 参见上方格式 |

\* 必须且只能设置 `streamableHTTP`、`sse` 或 `stdio` 其中之一。

### Streamable HTTP / SSE 字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| url | 是 | MCP 服务器的端点 URL。 | `"https://mcp.example.com/"` |
| protocolVersion | 否 | 日期格式的 MCP 规范版本。未设置时，SDK 会自动协商。 | `"2025-06-18"` |
| timeout | 否 | 每个 MCP 请求的截止时间。 | `"30s"` |
| headers | 否 | 注入到所有出站请求上的 HTTP 标头。支持 `value`、`secretKeyRef` 和 `envRef`。 | `name: "Authorization"` `secretKeyRef.name: "my-secret"` `secretKeyRef.key: "token"` |
| auth | 否 | 认证配置。参见下方的认证字段。 | |

### 认证字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| auth.secretStore | 否 | 用于解析 headers 中 `secretKeyRef` 条目的 Dapr secret store。默认为 `"kubernetes"`。 | `"my-secret-store"` |
| auth.oauth2.issuer | 是（若使用 oauth2） | 授权服务器的令牌端点。 | `"https://auth.example.com/token"` |
| auth.oauth2.clientID | 否 | 发送到令牌端点的 OAuth2 客户端标识符。标准的 `client_credentials` 流程依据 RFC 6749 要求此项；非标准流程中可以留空。 | `"my-client-id"` |
| auth.oauth2.audience | 否 | 令牌请求中的 audience 声明。 | `"mcp://payments"` |
| auth.oauth2.scopes | 否 | 令牌中请求的作用域。 | `["read", "write"]` |
| auth.oauth2.secretKeyRef | 否 | 对 secret store 中 client secret 的引用。 | `name: "oauth-secret"` `key: "clientSecret"` |
| auth.spiffe.jwt.header | 是（若使用 spiffe） | 注入 JWT 时使用的 HTTP 标头名称。 | `"Authorization"` |
| auth.spiffe.jwt.headerValuePrefix | 否 | 拼接在 JWT 值前面的字符串。 | `"Bearer "` |
| auth.spiffe.jwt.audience | 是（若使用 spiffe） | JWT 的目标受众。 | `"mcp://payments"` |

### Stdio 字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| stdio.command | 是 | 要运行的可执行文件。 | `"npx"` |
| stdio.args | 否 | 命令行参数。 | `["-y", "@modelcontextprotocol/server-filesystem"]` |
| stdio.env | 否 | 子进程的环境变量。支持 `value`、`secretKeyRef` 和 `envRef`。 | `name: "API_KEY"` `value: "secret"` |

### 中间件字段

中间件钩子按数组顺序执行。不同类型的钩子，错误行为有所不同：

- `beforeCallTool` 的错误会中止整个链；工作流以 `CallToolResult{isError: true}` 结束，以便调用方自行纠正。
- `beforeListTools` 的错误会中止整个链，并返回该错误。
- `afterCallTool` 的错误会**导致工作流失败**。这些钩子可以充当阻止响应的授权闸门。
- `afterListTools` 的错误只会记录日志，不影响结果。

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| middleware.beforeCallTool | 否 | 在每次 CallTool 之前调用的钩子。 | 参见上方格式 |
| middleware.afterCallTool | 否 | 在每次 CallTool 之后调用的钩子。 | 参见上方格式 |
| middleware.beforeListTools | 否 | 在每次 ListTools 之前调用的钩子。 | 参见上方格式 |
| middleware.afterListTools | 否 | 在每次 ListTools 之后调用的钩子。 | 参见上方格式 |

每个钩子条目包含以下字段：

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| workflow.workflowName | 是 | 要调用的工作流名称。 | `"rbac-check"` |
| workflow.appID | 否 | 指向远程 Dapr 应用。未设置时在本地运行。 | `"auth-service"` |
| mutate | 否 | 为 `true` 时，钩子的返回值替换流经流水线的数据（`beforeCallTool` 为参数；`afterCallTool` 和 `afterListTools` 为结果）。为 `false`（默认值）时，钩子仅用于观察。不支持用于 `beforeListTools`。 | `true` |

### Catalog 字段

Catalog 字段仅供参考，对运行时行为没有任何影响。

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| catalog.displayName | 否 | 易读的显示名称。 | `"Payments MCP"` |
| catalog.description | 否 | MCP 服务器的描述。 | `"Payment processing tools"` |
| catalog.owner.team | 否 | 负责该 MCP 服务器的团队。 | `"platform-team"` |
| catalog.owner.contact | 否 | 联系方式。 | `"platform@example.com"` |
| catalog.tags | 否 | 用于分类的标签。 | `["payments", "production"]` |
| catalog.links | 否 | 命名的 URL（文档、运行手册、仪表板）。 | `docs: "https://..."` |

## 相关链接

- [MCPServer 资源概述]({{% ref mcp-server-resource.md %}})
- [操作指南：使用 MCPServer 资源]({{% ref howto-use-mcpserver.md %}})
- [操作指南：启用预览功能]({{% ref preview-features %}})
