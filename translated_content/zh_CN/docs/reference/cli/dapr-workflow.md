---
type: docs
title: "workflow CLI 命令"
linkTitle: "workflow"
description: "workflow CLI 命令的详细信息"
---

管理 Dapr workflow 实例。

## 命令

| 命令 | 描述 |
|---------|-------------|
| dapr workflow run | 启动新的 workflow 实例 |
| dapr workflow list | 列出 workflow 实例 |
| dapr workflow history | 获取 workflow 执行历史 |
| dapr workflow purge | purge workflow 实例 |
| dapr workflow suspend | 暂停 workflow |
| dapr workflow resume | 恢复 workflow |
| dapr workflow terminate | 终止 workflow |
| dapr workflow raise-event | 触发 external event |
| dapr workflow rerun | 重新运行 workflow |

## 标志

```
  -a, --app-id string      workflow 实例所属的应用 ID
  -h, --help               workflow 的帮助信息
  -k, --kubernetes         以 Kubernetes Dapr 安装为目标
  -n, --namespace string   执行 workflow 操作的 Kubernetes namespace（默认为 "default"）
```

## 示例

### 列出 workflow
```bash
dapr workflow list --app-id myapp
```

### 启动 workflow
```bash
dapr workflow run MyWorkflow --app-id myapp --input '{"key": "value"}'
```

### Kubernetes 模式
```bash
dapr workflow list -k -n production --app-id myapp
```

## 列出指定应用程序的 workflow 实例。

## 用法

```bash
dapr workflow list [flags]
```

## 标志

| 名称 | 类型 | 描述 |
|------|------|-------------|
| `--app-id`, `-a` | string | （必需）workflow 实例所属的应用 ID |
| `--filter-name`, `-w` | string | 按名称过滤 workflow |
| `--filter-status`, `-s` | string | 按状态过滤：RUNNING、COMPLETED、FAILED、CANCELED、TERMINATED、PENDING、SUSPENDED |
| `--filter-max-age`, `-m` | string | 过滤在指定时间段或时间戳内启动的 workflow（例如："300ms"、"1.5h"、"2023-01-02T15:04:05"） |
| `--output`, `-o` | string | 输出格式：short、wide、yaml、json（默认为 "short"） |
| `--kubernetes`, `-k` | bool | 以 Kubernetes Dapr 安装为目标 |
| `--namespace`, `-n` | string | Kubernetes namespace（默认为 "default"） |

## 示例

### 基本用法
```bash
dapr workflow list --app-id myapp
```

### 按状态过滤
```bash
dapr workflow list --app-id myapp --filter-status RUNNING
```

### 按 workflow 名称过滤
```bash
dapr workflow list --app-id myapp --filter-name OrderProcessing
```

### 按时间过滤
```bash
# 最近 24 小时的 workflow
dapr workflow list --app-id myapp --filter-max-age 24h

# 指定日期之后的 workflow
dapr workflow list --app-id myapp --filter-max-age 2024-01-01T00:00:00Z
```

### JSON 输出
```bash
dapr workflow list --app-id myapp --output json
```

## Purge 处于终态（COMPLETED、FAILED、TERMINATED）的 workflow 实例。

## 用法

```bash
dapr workflow purge [instance-id] [flags]
```

## 标志

| 名称 | 类型 | 描述 |
|------|------|-------------|
| `--app-id`, `-a` | string | （必需）workflow 实例所属的应用 ID |
| `--all` | bool | Purge 所有处于终态的 workflow 实例（请谨慎使用） |
| `--all-older-than` | string | Purge 早于指定时间段或时间戳的实例（例如："24h"、"2023-01-02T15:04:05Z"） |
| `--all-filter-status` | string | 仅 purge 具有指定运行时状态的实例。必须与 `--all-older-than` 一起使用。可选值为 RUNNING、COMPLETED、CONTINUED_AS_NEW、FAILED、CANCELED、TERMINATED、PENDING、SUSPENDED。非终态（例如 RUNNING、PENDING、SUSPENDED）需要 `--force` 标志 |
| `--kubernetes`, `-k` | bool | 以 Kubernetes Dapr 安装为目标 |
| `--namespace`, `-n` | string | Kubernetes namespace（默认为 "default"） |

## 示例

### Purge 特定实例
```bash
dapr workflow purge wf-12345 --app-id myapp
```

### Purge 早于 30 天的实例
```bash
dapr workflow purge --app-id myapp --all-older-than 720h
```

### Purge 早于指定日期的实例
```bash
dapr workflow purge --app-id myapp --all-older-than 2023-12-01T00:00:00Z
```

### 仅 purge 早于 7 天的 FAILED 实例
```bash
dapr workflow purge --app-id myapp --all-older-than 168h --all-filter-status FAILED
```

### Purge 所有终态实例（危险！）
```bash
dapr workflow purge --app-id myapp --all
```

### 强制 purge（无 workflow runtime，危险！）
```bash
dapr workflow purge wf-12345 --app-id myapp --force
```
