---
type: docs
title: "version CLI 命令参考"
linkTitle: "version"
description: "打印 Dapr 运行时和 CLI 版本。"
---

### 描述

以普通或 JSON 格式打印 `dapr` CLI 和 `daprd` 可执行文件的版本。

### 支持的平台

- [Self-Hosted]({{% ref self-hosted %}})

### 用法

```bash
dapr version [flags]
```

### 标志

| 名称 | 环境变量 | 默认值 | 描述 |
| --- | --- | --- | --- |
| `--help`, `-h` | | | 打印此帮助信息 |
| `--output`, `-o` | | | 输出格式（选项：json） |

### 示例 

```bash
# Dapr CLI 和运行时的版本
dapr version --output json
```

### 相关信息

你可以直接通过运行 `daprd --version` 命令获取 `daprd` 版本。

你也可以通过运行 `dapr --version` 标志获取常规版本输出。
