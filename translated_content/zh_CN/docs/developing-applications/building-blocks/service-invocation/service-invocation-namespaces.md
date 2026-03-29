---
type: docs
title: "操作指南：跨命名空间的服务调用"
linkTitle: "操作指南：服务调用命名空间"
weight: 50
description: "调用部署在不同命名空间中的服务"
---

在本文中，你将学习如何调用部署在不同命名空间中的服务。默认情况下，服务调用支持通过简单引用应用 ID（`nodeapp`）来调用*同一*命名空间内的服务：

```sh
localhost:3500/v1.0/invoke/nodeapp/method/neworder
```

服务调用也支持跨命名空间调用。在所有支持的托管平台上，Dapr 应用 ID 符合包含目标命名空间的有效 FQDN 格式。你可以同时指定：

- 应用 ID（`nodeapp`），以及
- 应用运行的命名空间（`production`）。

**示例 1**

调用 `production` 命名空间中 `nodeapp` 上的 `neworder` 方法：

```sh
localhost:3500/v1.0/invoke/nodeapp.production/method/neworder
```

使用服务调用调用命名空间中的应用程序时，需要用命名空间进行限定。这在 Kubernetes 集群中的跨命名空间调用中非常有用。

**示例 2**

调用 `production` 命名空间中 `myapp` 上的 `ping` 方法：

```bash
https://localhost:3500/v1.0/invoke/myapp.production/method/ping
```

**示例 3**

使用 curl 命令从外部 DNS 地址（此处为 `api.demo.dapr.team`）调用与示例 2 相同的 `ping` 方法，并提供 Dapr API 令牌进行身份验证：

MacOS/Linux：

```
curl -i -d '{ "message": "hello" }' \
     -H "Content-type: application/json" \
     -H "dapr-api-token: ${API_TOKEN}" \
     https://api.demo.dapr.team/v1.0/invoke/myapp.production/method/ping
```
