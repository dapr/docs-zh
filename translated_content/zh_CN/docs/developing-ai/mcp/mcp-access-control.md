---
type: docs
title: "MCP 访问控制"
linkTitle: "访问控制"
weight: 15
description: "使用 Configuration 的 accessControl 规则，为 MCP 服务器定义按代理区分的访问控制策略"
---

本文介绍如何在 Dapr 中为 MCP 服务器定义按代理区分的访问控制策略。

有关完整的 `accessControl` 结构以及 HTTP 动词级别的控制，请参阅 [service invocation 访问控制]({{% ref invoke-allowlist.md %}})。本页专门将该机制应用于 MCP 流量，并介绍对代理而言重要的模式与权衡。

## 概述

在多代理系统中，不同的代理应当对 MCP 服务器拥有不同级别的访问权限。分析代理可能被允许从某个服务器读取数据，但不能访问执行写入操作的服务器。运维代理可以调用写入类服务器，但不应调用具有破坏性的服务器。如果没有明确的策略，你的 namespace 中的任何代理都可以调用任意 MCP 服务器——这是一个严重的攻击面。

Dapr 允许你使用**访问控制列表（ACL）**来实施这一点，ACL 作为 Dapr `Configuration` 资源的一部分进行定义。ACL 通过调用方的 Dapr App ID 来识别调用方（该 App ID 经由 [SPIFFE mTLS]({{% ref mtls.md %}}) 进行加密认证），并允许或拒绝调用。策略支持将 `deny` 作为默认值，因此每一次访问都必须被明确授权。

### 两层防护：App ID 门控与逐工具授权

Dapr 访问控制会在**service invocation 边界**处评估 **调用方 App ID → 目标 App ID**。这与 Dapr 用于任何其他服务间流量的机制相同，它为你提供粗粒度的门控：哪些代理可以访问哪些 MCP 服务器。

MCP 传输方式——`streamable-http` 与 `sse`——会将所有工具调用路由到**单个 HTTP 端点**。工具名称位于 [JSON-RPC](https://www.jsonrpc.org/specification) 请求体（`params.name`）中，而不在 URL 路径里，因此仅基于 HTTP 路径的 ACL 规则本身无法提供逐工具的粒度。若需要更细粒度的授权，可以在 MCP 服务器的入站流水线上叠加一个 [OPA middleware](#使用-opa-进行逐工具授权)，它会读取 JSON-RPC 请求体、提取工具名称，并应用以 `(caller App ID, tool name)` 为键的 Rego 策略。

若要在单个服务器内部实现以 workflow 为中心、参数级别的 RBAC，请参阅 [`MCPServer` 资源]({{% ref "mcp-server-resource.md#middleware-pipelines" %}}) 中的 middleware 钩子。

## 工作原理

当 MCP 客户端调用工具时，请求会经过 Dapr 的 service invocation 层到达 MCP 服务器。ACL 策略会在请求到达应用**之前**求值。如果调用方的 App ID 未获授权，Dapr 会返回 `403 Forbidden`，调用永远不会执行。

访问控制策略通过一个 `Configuration` 资源附加到 MCP 服务器的 App ID 上，该资源通过 `--config` 应用于 sidecar。

## 定义策略

最简单的模式是在 `Configuration` 的 `accessControl` 中设置默认动作，并为每个调用方单独覆盖：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: mcp-server-policy
spec:
  accessControl:
    defaultAction: deny        # 未在下方列出的调用方将被拒绝
    trustDomain: "public"
    policies:
    - appId: analyst-agent
      defaultAction: allow     # 明确允许该调用方
      namespace: "default"
```

应用该 `Configuration`，并在启动 Dapr 时把它附加到 MCP 服务器的 App ID 上：

```bash
dapr run \
  --app-id mcp-server \
  --app-port 8000 \
  --resources-path ./components \
  --config ./config/mcp-server-policy.yaml \
  -- python server.py
```

在 Kubernetes 上，通过为 Pod 添加注解 `dapr.io/config: mcp-server-policy` 来设置该配置。

| 字段 | 说明 |
|---|---|
| `defaultAction`（顶层） | 适用于未在 `policies` 中列出的 App ID 的默认动作。若要采用零信任策略，请设为 `deny`。 |
| `trustDomain` | 策略生效的信任域。`"public"` 覆盖单个 Dapr namespace 内的流量。 |
| `policies[].appId` | 调用代理的 Dapr App ID。 |
| `policies[].defaultAction` | 针对该调用方的 `allow` 或 `deny`。 |
| `policies[].namespace` | 调用方运行所在的 Dapr namespace（通常为 `"default"`）。 |

ACL 的更改要等目标 Dapr sidecar 重新加载配置后才会生效，重启 sidecar 即可应用更改。

## 全部拒绝的基线

从全部拒绝的姿态开始，然后逐步授予访问权限：

```yaml
# config/deny-all.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: mcp-policy
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
```

将其附加到 MCP 服务器的 sidecar 上，并验证没有任何调用方能够访问它。然后通过扩展同一个 `Configuration` 并重新应用，逐层加入允许规则。

## 允许特定调用方

若要允许某个特定代理的 App ID，同时保持其他一切被拒绝：

```yaml
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "public"
    policies:
    - appId: analyst-agent
      defaultAction: allow
      namespace: "default"
```

`analyst-agent` 可以调用此 MCP 服务器；所有其他调用方都会在 service invocation 边界处被拒绝。

## 使用 OPA 进行逐工具授权

App ID 门控较为粗粒度：它只控制代理能否访问某个 MCP 服务器，但该服务器上的每个工具都同样可以被访问。若要实现更细粒度的 `(caller App ID, tool name)` 授权，请在 MCP 服务器的入站 HTTP 流水线上叠加一个 [Open Policy Agent（OPA）middleware]({{% ref middleware-opa.md %}})。OPA middleware 会读取 JSON-RPC 请求体，你编写的 Rego 策略提取 `method` 与 `params.name`，而决策则以调用方的 App ID 为键（由 Dapr 通过 `dapr-caller-app-id` 请求头传递）。

### OPA 如何为逐工具的 MCP 流量把关

{{< diagram mcp-access-control >}}

这两层相互配合：

1. `accessControl` 会在任何 middleware 运行**之前**拒绝未经身份验证或未获授权的 App ID。
2. OPA 检查已获允许的请求的 JSON-RPC 请求体，并应用工具级别的规则。

### 启用 OPA middleware

OPA 的 HTTP middleware 随 Dapr 一同提供。若要检查 JSON-RPC 请求体，请设置 `readBody: "true"`，并通过 `includedHeaders` 传递调用方的 App ID：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mcp-tool-authz
spec:
  type: middleware.http.opa
  version: v1
  metadata:
    - name: includedHeaders
      value: "dapr-caller-app-id"
    - name: readBody
      value: "true"
    - name: defaultStatus
      value: "403"
    - name: rego
      value: |
        package http

        default allow = false

        # 针对 MCP JSON-RPC 流量的逐工具授权。
        #
        # `input.request.body` 是原始的 JSON-RPC 负载，例如
        #   {"jsonrpc":"2.0","id":1,"method":"tools/call",
        #    "params":{"name":"get_inventory","arguments":{...}}}
        #
        # `input.request.headers["dapr-caller-app-id"]` 是经过验证的调用方 App ID。
        body := json.unmarshal(input.request.body)
        caller := input.request.headers["dapr-caller-app-id"]

        # 允许任何已获授权的调用方进行 MCP 握手与发现。
        allow {
          body.method == "initialize"
        }
        allow {
          body.method == "tools/list"
        }

        # 对 tools/call 进行逐工具的 RBAC 校验。
        allow {
          body.method == "tools/call"
          allowed_tools[caller][_] == body.params.name
        }

        # （调用方 App ID → 允许的工具名称）策略。
        allowed_tools := {
          "analyst-agent": ["get_inventory", "get_schema"],
          "ops-agent":     ["get_inventory", "get_schema", "update_stock"],
          "admin-agent":   ["get_inventory", "get_schema", "update_stock", "drop_table"],
        }
```

将该 middleware 附加到 MCP 服务器的应用 HTTP 流水线上：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: mcp-server-policy
spec:
  appHttpPipeline:
    handlers:
      - name: mcp-tool-authz
        type: middleware.http.opa
```

使用更新后的 `Configuration` 重启 MCP 服务器的 sidecar。对于不在调用方允许列表中的工具，请求现在会在 JSON-RPC 请求体到达 MCP 服务器之前返回 `403`。

### 注意事项与权衡

- **请求体结构很重要。** Rego 策略假定通过 `streamable-http` 传输的是标准 JSON-RPC。请验证你的 MCP 服务器所期望的结构（尤其是以 JSON 数组形式到达的批量请求），并据此调整策略。
- **`readBody: "true"` 会把每个请求完整缓冲到内存中。** 对于非常大的工具参数负载，请在容量规划时将此因素考虑在内。
- **纵深防御，而非替代方案。** 请保留 App ID 的 `accessControl` 策略。OPA 的职责是*工具级别*的细化，而不是*服务器级别*的边界。
- **以 workflow 为中心的替代方案。** 如果你希望在单个 MCP 服务器内部实现参数级别的 RBAC、审计、脱敏或响应过滤，并且愿意通过 [Dapr Workflow]({{% ref workflow-overview %}}) 客户端调用工具，请改用 [`MCPServer` 资源]({{% ref "mcp-server-resource.md#middleware-pipelines" %}}) 中的 middleware 钩子。

## 结合 ACL 与 OAuth 2.0 Bearer middleware

ACL 策略与 OAuth 2.0 Bearer middleware 是相互独立的执行层。为实现纵深防御，请同时将二者应用于 MCP 服务器：

1. **ACL**——控制哪些代理 App ID 被允许调用哪些 MCP 服务器（由 Dapr 的 service invocation 层借助 SPIFFE 身份执行）。
2. **Bearer middleware**——验证调用方是否出示了来自受信任身份提供方、仍然有效且已签名的 JWT（在 HTTP 流水线层执行，与 App ID 无关）。

攻击者需要同时突破两层防护：伪造或窃取有效的 App ID，**并且**获得有效的已签名令牌。有关 Bearer middleware 的设置，请参阅 [对 MCP 服务器进行身份验证]({{% ref mcp-authentication.md %}})。

## 故障排查

**我为代理的 App ID 添加了策略，但代理仍然收到 `403`。**
请核对策略中的 App ID 与代理启动时的 `--app-id` 完全一致（区分大小写）。确保 MCP 服务器的 sidecar 已重启以加载新配置。确认 `namespace` 字段与调用方 Dapr 应用所在的 namespace 一致。

**我想允许某个特定代理执行所有操作。**
为该 App ID 在 `policies[].defaultAction` 层级设置 `defaultAction: allow`：

```yaml
policies:
- appId: admin-agent
  defaultAction: allow
  namespace: "default"
```

**我想先在没有访问控制的情况下进行测试。**
不要为 MCP 服务器附加带有 `accessControl` 的 `Configuration` 资源。没有该资源时，Dapr 会允许来自信任域内任何 App ID 的调用。

## 另请参阅

- [对 MCP 服务器进行身份验证]({{% ref mcp-authentication.md %}})——MCP 的 OAuth 2.0 与 Bearer middleware 设置。
- [MCP 安全态势]({{% ref mcp-security.md %}})——威胁模型与纵深防御说明。
- [service invocation 访问控制]({{% ref invoke-allowlist.md %}})——完整的 `accessControl` 策略结构参考。
- [OPA middleware]({{% ref middleware-opa.md %}})——上文所用 `middleware.http.opa` component 的参考文档。
- [`MCPServer` 资源]({{% ref mcp-server-resource.md %}})——在单个 MCP 服务器内实现参数级别 RBAC 的 workflow 钩子层。
