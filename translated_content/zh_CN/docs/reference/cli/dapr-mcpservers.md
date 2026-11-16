---
type: docs
title: "mcpservers CLI 命令参考"
linkTitle: "mcpservers"
description: "mcpservers CLI 命令的详细信息"
---

### 描述

列出所有 Dapr MCPServer 资源。

### 支持的平台

- [Kubernetes]({{% ref kubernetes %}})
- [自托管]({{% ref self-hosted %}})

### 用法

```bash
dapr mcpservers [flags]
```

### 标志

| 名称 | 环境变量 | 默认值 | 描述
| --- | --- | --- | --- |
| `--all-namespaces`, `-A` | | `false` | 如果为 true，列出所有命名空间中的所有 Dapr MCPServer 资源（仅 Kubernetes 模式）|
| `--help`, `-h` | | | 打印此帮助信息 |
| `--kubernetes`, `-k` | | `false` | 从 Kubernetes 集群中列出 Dapr MCPServer 资源 |
| `--name`, `-n` | | | 要打印的 MCPServer 名称（可选） |
| `--namespace` | | | 列出特定 Kubernetes 命名空间中的 MCPServer 资源 |
| `--output`, `-o` | | `list` | 输出格式（选项：json、yaml 或 list） |
| `--resources-path` | | `$HOME/.dapr/components` | 仅自托管：要扫描 MCPServer YAML 资源的目录 |

### 示例

```bash
# 在自托管模式下列出所有 Dapr MCPServer 资源（默认从 ~/.dapr/components/ 读取）
dapr mcpservers

# 在自托管模式下，从自定义资源目录列出 MCPServer 资源
dapr mcpservers --resources-path ./resources

# 在自托管模式下打印特定的 MCPServer 资源
dapr mcpservers -n my-mcp-server

# 在 Kubernetes 模式下列出所有 Dapr MCPServer 资源
dapr mcpservers -k

# 在特定命名空间中列出 MCPServer 资源
dapr mcpservers -k --namespace default

# 在所有命名空间中列出 MCPServer 资源
dapr mcpservers -k --all-namespaces

# 以 JSON 格式输出
dapr mcpservers -o json
```

### 相关链接

- [MCPServer 资源规范]({{% ref mcpserver-schema.md %}})
- [操作指南：使用 Dapr 暴露 MCP 服务器]({{% ref howto-use-mcpserver.md %}})
