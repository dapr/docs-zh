---
type: docs
title: "workflow CLI 命令"
linkTitle: "workflow"
description: "workflow CLI 命令的详细信息"
---

管理 Dapr 工作流实例。

## 命令

| 命令 | 描述 |
|---------|-------------|
| dapr workflow run | 启动新的工作流实例 |
| dapr workflow list | 列出工作流实例 |
| dapr workflow history | 获取工作流执行历史 |
| dapr workflow purge | 清除工作流实例 |
| dapr workflow suspend | 暂停工作流 |
| dapr workflow resume | 恢复工作流 |
| dapr workflow terminate | 终止工作流 |
| dapr workflow raise-event | 触发外部事件 |
| dapr workflow rerun | 重新运行工作流 |

## 标志

```
  -a, --app-id string      工作流实例所属的应用 ID
  -h, --help               workflow 的帮助信息
  -k, --kubernetes         以 Kubernetes Dapr 安装为目标
  -n, --namespace string   执行工作流操作的命名空间（默认为 "default"）
```

## 示例

### 列出工作流
```bash
dapr workflow list --app-id myapp
```

### 启动工作流
```bash
dapr workflow run MyWorkflow --app-id myapp --input '{"key": "value"}'
```

### Kubernetes 模式
```bash
dapr workflow list -k -n production --app-id myapp
```

## 列出指定应用程序的工作流实例。

## 用法

```bash
dapr workflow list [flags]
```

## 标志

| 名称 | 类型 | 描述 |
|------|------|-------------|
| `--app-id`, `-a` | string | （必需）工作流实例所属的应用 ID |
| `--filter-name`, `-w` | string | 按名称过滤工作流 |
| `--filter-status`, `-s` | string | 按状态过滤：RUNNING、COMPLETED、FAILED、CANCELED、TERMINATED、PENDING、SUSPENDED |
| `--filter-max-age`, `-m` | string | 过滤在指定时间段或时间戳内启动的工作流（例如："300ms"、"1.5h"、"2023-01-02T15:04:05"） |
| `--output`, `-o` | string | 输出格式：short、wide、yaml、json（默认为 "short"） |
| `--kubernetes`, `-k` | bool | 以 Kubernetes Dapr 安装为目标 |
| `--namespace`, `-n` | string | Kubernetes 命名空间（默认为 "default"） |

## 示例

### 基本用法
```bash
dapr workflow list --app-id myapp
```

### 按状态过滤
```bash
dapr workflow list --app-id myapp --filter-status RUNNING
```

### 按工作流名称过滤
```bash
dapr workflow list --app-id myapp --filter-name OrderProcessing
```

### 按时间过滤
```bash
# 最近 24 小时的工作流
dapr workflow list --app-id myapp --filter-max-age 24h

# 指定日期之后的工作流
dapr workflow list --app-id myapp --filter-max-age 2024-01-01T00:00:00Z
```

### JSON 输出
```bash
dapr workflow list --app-id myapp --output json
```

## 清除处于终止状态（COMPLETED、FAILED、TERMINATED）的工作流实例。

## 用法

```bash
dapr workflow purge [instance-id] [flags]
```

## 标志

| 名称 | 类型 | 描述 |
|------|------|-------------|
| `--app-id`, `-a` | string | （必需）工作流实例所属的应用 ID |
| `--all` | bool | 清除所有处于终止状态的工作流实例（请谨慎使用） |
| `--all-older-than` | string | 清除早于指定时间段或时间戳的实例（例如："24h"、"2023-01-02T15:04:05Z"） |
| `--kubernetes`, `-k` | bool | 以 Kubernetes Dapr 安装为目标 |
| `--namespace`, `-n` | string | Kubernetes 命名空间（默认为 "default"） |

## 示例

### 清除特定实例
```bash
dapr workflow purge wf-12345 --app-id myapp
```

### 清除早于 30 天的实例
```bash
dapr workflow purge --app-id myapp --all-older-than 720h
```

### 清除早于指定日期的实例
```bash
dapr workflow purge --app-id myapp --all-older-than 2023-12-01T00:00:00Z
```

### 清除所有终止状态的实例（危险！）
```bash
dapr workflow purge --app-id myapp --all
```

### 强制清除（无工作流运行时，危险！）
```bash
dapr workflow purge wf-12345 --app-id myapp --force
```
