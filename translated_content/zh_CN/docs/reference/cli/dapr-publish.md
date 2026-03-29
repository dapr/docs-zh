---
type: docs
title: "publish CLI 命令参考"
linkTitle: "publish"
description: "publish CLI 命令的详细信息"
---

### 描述

发布一个发布订阅事件。

### 支持的平台

- [自托管]({{% ref self-hosted %}})

### 用法

```bash
dapr publish [flags]
```

### 标志

| 名称                         | 环境变量            | 默认值                                                       | 描述                                                  |
| ---------------------------- | ------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| `--publish-app-id`, `-i`     |                     | 表示发布源应用的 ID                                          |
| `--pubsub`, `-p`             |                     | 发布订阅组件的名称                                           |
| `--topic`, `-t`              |                     |                                                              | 要发布到的主题                                        |
| `--data`, `-d`               |                     |                                                              | JSON 序列化字符串（可选）                             |
| `--data-file`, `-f`          |                     |                                                              | 包含 JSON 序列化数据的文件（可选）                    |
| `--help`, `-h`               |                     |                                                              | 打印此帮助消息                                        |
| `--metadata`, `-m`           |                     |                                                              | JSON 序列化的发布元数据（可选）                       |
| `--unix-domain-socket`, `-u` |                     |                                                              | Unix 域套接字路径（可选）                             |


### 示例

```bash
# 通过发布应用发布到目标发布订阅的示例主题
dapr publish --publish-app-id appId --topic sample --pubsub target --data '{"key":"value"}'

# 使用 Unix 域套接字通过发布应用发布到目标发布订阅的示例主题
dapr publish --enable-domain-socket --publish-app-id myapp --pubsub target --topic sample --data '{"key":"value"}'

# 通过发布应用发布到目标发布订阅的示例主题，不使用云事件
dapr publish --publish-app-id myapp --pubsub target --topic sample --data '{"key":"value"}' --metadata '{"rawPayload":"true"}'
```
