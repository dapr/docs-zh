---
type: docs
title: "OAuth2"
linkTitle: "OAuth2"
description: "使用 OAuth2 中间件来保护 HTTP 端点"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-oauth2/
---

OAuth2 [HTTP 中间件]({{% ref middleware.md %}}) 可在无需修改应用程序的情况下，为 Web API 启用 [OAuth2 授权码流程](https://tools.ietf.org/html/rfc6749#section-4.1)。这种设计将身份验证/授权的关注点与应用程序分离，使应用程序运维人员可以采用和配置身份验证/授权提供程序，而不会影响应用程序代码。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "https://www.googleapis.com/auth/userinfo.email"
  - name: authURL
    value: "https://accounts.google.com/o/oauth2/v2/auth"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: redirectURL
    value: "http://dummy.com"
  - name: authHeaderName
    value: "authorization"
  - name: forceHTTPS
    value: "false"
  - name: pathFilter
    value: ".*/users/.*"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，如[这里]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段 | 详细信息 | 示例 |
|-------|---------|---------|
| clientId | 您的应用程序的客户端 ID，它是作为由支持 OAuth 的平台托管的凭据的一部分创建的
| clientSecret | 您的应用程序的客户端密钥，它是作为由支持 OAuth 的平台托管的凭据的一部分创建的
| scopes | 以空格分隔、区分大小写的 [scope](https://tools.ietf.org/html/rfc6749#section-3.3) 字符串列表，通常用于应用程序中的授权 | `"https://www.googleapis.com/auth/userinfo.email"`
| authURL | OAuth2 授权服务器的端点 | `"https://accounts.google.com/o/oauth2/v2/auth"`
| tokenURL | 客户端用于通过出示其授权授权或刷新令牌来获取访问令牌的端点 | `"https://accounts.google.com/o/oauth2/token"`
| redirectURL | 授权服务器应在用户完成身份验证后重定向到的 Web 应用程序 URL | `"https://myapp.com"`
| authHeaderName | 要转发到您的应用程序的授权标头名称 | `"authorization"`
| forceHTTPS | 如果为 true，则强制使用 TLS/SSL | `"true"`,`"false"`                                           |
| pathFilter | 仅将中间件应用于与给定路径模式匹配的请求 | `".*/users/.*"`

## Dapr 配置

要应用中间件，必须在[配置]({{% ref configuration-concept.md %}})中引用它。请参阅[中间件管道]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: oauth2
      type: middleware.http.oauth2
```

## 请求路径过滤

`pathFilter` 字段允许您使用正则表达式模式根据 HTTP 请求路径有选择地应用 OAuth2 身份验证。这支持以下场景：例如为不同的 API 端点配置具有不同 scope 的多个 OAuth2 中间件，通过确保用户仅获得其预期操作所需的最小权限，来实现最小权限原则。

### 示例：分离只读和管理员用户访问
在以下配置中：
- 对 `/api/users/*` 端点的请求获得具有只读用户 scope 的令牌
- 对 `/api/admin/*` 端点的请求获得具有完整管理员 scope 的令牌

这通过防止不必要的权限访问并限制受损令牌的影响范围来降低安全风险。
```yaml
# 具有只读访问权限的用户
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-users
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "user:read profile:read"
  - name: authURL
    value: "https://accounts.google.com/o/oauth2/v2/auth"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: redirectURL
    value: "http://myapp.com/callback"
  - name: pathFilter
    value: "^/api/users/.*"
---
# 具有完整管理员访问权限的用户
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-admin
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "admin:read admin:write user:read user:write"
  - name: authURL
    value: "https://accounts.google.com/o/oauth2/v2/auth"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: redirectURL
    value: "http://myapp.com/callback"
  - name: pathFilter
    value: "^/api/admin/.*"
```


## 相关链接

- [使用 OAuth 配置 API 授权]({{% ref oauth %}})
- [中间件 OAuth 示例（交互式）](https://github.com/dapr/samples/tree/master/middleware-oauth-google)
- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
