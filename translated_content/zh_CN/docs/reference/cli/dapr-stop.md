---
type: docs
title: "stop CLI 命令参考"
linkTitle: "stop"
description: "有关 stop CLI 命令的详细信息"
---

### 描述

停止 Dapr 实例及其关联的应用程序。

### 受支持的平台

- [自托管]({{% ref self-hosted %}})

### 用法

```bash
dapr stop [flags]
```

### 标志

| 名称                 | 环境变量           | 默认值 | 描述                                              |
| -------------------- | ------------------ | ------ | ------------------------------------------------- |
| `--app-id`, `-a`     | `APP_ID`           |        | 要停止的应用程序 id                                |
| `--help`, `-h`       |                    |        | 打印此帮助信息                                     |
| `--run-file`, `-f`   |                    |        | 使用 Multi-App Run 模板文件一次停止多个运行中的应用程序。目前处于 [alpha]({{% ref "support-preview-features.md" %}}) 阶段，仅可用于 Linux/MacOS |

### 示例

```bash
# 停止 Dapr 应用程序
dapr stop --app-id <ID>
```
