---
type: docs
title: "mDNS"
linkTitle: "mDNS"
description: 关于 mDNS 名称解析组件的详细信息
---

## 配置格式

组播 DNS（mDNS）在[自托管模式]({{% ref self-hosted %}})中由 Dapr 自动配置。无需配置即可使用 mDNS 作为您的名称解析提供程序。

## 行为

该组件通过使用主机系统的 mDNS 服务来解析目标应用程序。您可以在[此处](https://en.wikipedia.org/wiki/Multicast_DNS)了解更多关于 mDNS 的信息。

### 故障排除

在某些云提供商的虚拟网络中，例如 Microsoft Azure，mDNS 不可用。请改用其他提供程序，例如 [HashiCorp Consul]({{% ref setup-nr-consul.md %}})。

在某些企业管理的系统上，如果配置了网络过滤器/代理，macOS 上的 mDNS 可能会被禁用。如果 mDNS 被禁用且您无法在本地使用服务调用，请联系您的 IT 部门。

## 规范配置字段

不适用，因为在自托管模式下运行时，mDNS 由 Dapr 配置。

## 相关链接

- [服务调用构建块]({{% ref service-invocation %}})
- [mDNS 参考](https://en.wikipedia.org/wiki/Multicast_DNS)
