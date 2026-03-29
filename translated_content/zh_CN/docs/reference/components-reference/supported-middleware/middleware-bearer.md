---
type: docs
title: "Bearer"
linkTitle: "Bearer"
description: "使用 bearer 中间件通过验证 bearer 令牌来保护 HTTP 端点"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-bearer/
---

bearer [HTTP 中间件]({{% ref middleware.md %}}) 在 Web API 上使用 [OpenID Connect](https://openid.net/connect/) 验证 [Bearer 令牌](https://tools.ietf.org/html/rfc6750)，而无需修改应用程序。此设计将身份验证/授权关注点与应用程序分离，使应用程序操作员能够采用和配置身份验证/授权提供程序，而不会影响应用程序代码。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: bearer-token
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
    - name: audience
      value: "<your token audience; i.e. the application's client ID>"
    - name: issuer
      value: "<your token issuer, e.g. 'https://accounts.google.com'>"

    # Optional values
    - name: jwksURL
      value: "<JWKS URL, e.g. 'https://accounts.google.com/.well-known/openid-configuration'>"
```

## 规格元数据字段

| 字段 | 必填 | 详情 | 示例 |
|-------|:--------:|---------|---------|
| `audience` | Y | 令牌中期望的受众。通常，这对应于在 OpenID Connect 平台托管的凭据下创建的应用程序的客户端 ID。 | 
| `issuer` | Y | 颁发者机构，即令牌中颁发者声明的期望值。 | `"https://accounts.google.com"`
| `jwksURL` | N | JWKS（包含用于验证令牌的公钥的 JWK 集）的地址。如果为空，将尝试从 OpenID 配置文档 `<issuer>/.well-known/openid-configuration` 中获取 URL。  | `"https://accounts.google.com/.well-known/openid-configuration"`

`issuer` 的常见值包括：

- Auth0：`https://{domain}`，其中 `{domain}` 是您的 Auth0 应用程序的域
- Microsoft Entra ID：`https://login.microsoftonline.com/{tenant}/v2.0`，其中 `{tenant}` 应替换为您应用程序的租户 ID，格式为 UUID
- Google：`https://accounts.google.com`
- Salesforce (Force.com)：`https://login.salesforce.com`

## Dapr 配置

要应用中间件，必须在 [配置]({{% ref configuration-concept.md %}}) 中引用该中间件。请参阅[中间件管道]({{% ref "middleware.md"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: bearer-token
      type: middleware.http.bearer
```

## 相关链接

- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
