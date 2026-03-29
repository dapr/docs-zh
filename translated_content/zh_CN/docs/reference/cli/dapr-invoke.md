---
type: docs
title: "invoke CLI 命令参考"
linkTitle: "invoke"
description: "关于 invoke CLI 命令的详细信息"
---

### 说明

对给定的 Dapr 应用程序调用一个方法。

### 支持的平台

- [自托管]({{% ref self-hosted %}})

### 用法

```bash
dapr invoke [flags]
```

### 标志

| 名称                | 环境变量           | 默认值  | 描述                                           |
| ------------------- | ------------------ | ------- | ---------------------------------------------- |
| `--app-id`, `-a`    | `APP_ID`           |         | 要调用的应用程序 id                             |
| `--help`, `-h`      |                    |         | 打印此帮助信息                                  |
| `--method`, `-m`    |                    |         | 要调用的方法                                    |
| `--data`, `-d`      |                    |         | JSON 序列化的数据字符串（可选）                 |
| `--data-file`, `-f` |                    |         | 包含 JSON 序列化数据的文件（可选）              |
| `--verb`, `-v`      |                    | `POST`  | 要使用的 HTTP 动词                              |

### 示例

```bash
# 使用 POST 动词在目标应用上调用示例方法
dapr invoke --app-id target --method sample --data '{"key":"value"}'

# 使用 GET 动词在目标应用上调用示例方法
dapr invoke --app-id target --method sample --verb GET
```
