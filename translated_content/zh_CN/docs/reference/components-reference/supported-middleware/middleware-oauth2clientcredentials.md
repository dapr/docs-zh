---
type: docs
title: "OAuth2 客户端凭据"
linkTitle: "OAuth2 客户端凭据"
description: "使用 OAuth2 客户端凭据中间件保护 HTTP 端点"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-oauth2clientcredentials/
---

OAuth2 客户端凭据 [HTTP 中间件]({{% ref middleware.md %}}) 可在无需修改应用程序的情况下，为 Web API 启用 [OAuth2 客户端凭据流](https://tools.ietf.org/html/rfc6749#section-4.4)。这种设计将身份验证/授权的关注点与应用程序分离，使得应用程序运维人员可以采用和配置身份验证/授权提供方，而不会影响应用程序代码。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2clientcredentials
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "https://www.googleapis.com/auth/userinfo.email"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: headerName
    value: "authorization"
  - name: pathFilter
    value: ".*/users/.*"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段      | 详情 | 示例 |
|------------|---------|---------|
| clientId | 在支持 OAuth 的平台上托管作为凭据的一部分而创建的应用程序客户端 ID
| clientSecret | 在支持 OAuth 的平台上托管作为凭据的一部分而创建的应用程序客户端密钥
| scopes | 以空格分隔的、区分大小写的[范围](https://tools.ietf.org/html/rfc6749#section-3.3)字符串列表，通常用于应用程序中的授权 | `"https://www.googleapis.com/auth/userinfo.email"`
| tokenURL | 客户端通过呈现其授权授予或刷新令牌来获取访问令牌的端点 | `"https://accounts.google.com/o/oauth2/token"`
| headerName | 转发到应用程序的授权标头名称 | `"authorization"`
| endpointParamsQuery | 指定对令牌端点的请求的附加参数 | `true`
| authStyle | 可选地指定端点希望如何发送客户端 ID 和客户端密钥。请参阅下表中的可能值 | `0`
| pathFilter | 仅将中间件应用于匹配给定路径模式的请求 | `".*/users/.*"`

### `authStyle` 的可能值

| 值 | 含义 |
|-------|---------|
| `1`   | 在 POST 正文 中发送 "client_id" 和 "client_secret" 作为 application/x-www-form-urlencoded 参数。 |
| `2`   | 使用 HTTP 基本认证 发送 "client_id" 和 "client_secret"。这是 [OAuth2 RFC 6749 第 2.3.1 节](https://tools.ietf.org/html/rfc6749#section-2.3.1)中描述的一种可选样式。 |
| `0`   | 表示通过尝试两种方式并缓存成功的方式来自动检测提供方想要的认证样式。 |

## Dapr 配置

要应用中间件，必须在[配置]({{% ref configuration-concept.md %}})中引用该中间件。请参阅[中间件管道]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: oauth2clientcredentials
      type: middleware.http.oauth2clientcredentials
```

## 请求路径过滤

`pathFilter` 字段允许您使用正则表达式模式，基于 HTTP 请求路径有选择地应用 OAuth2 身份验证。这支持诸如配置多个具有不同范围的 OAuth2 中间件用于不同 API 端点、通过确保用户仅获得其预期操作所需的最小权限来实现最小权限原则等场景。

### 示例：区分只读用户和管理员用户访问

在以下配置中：
- 对 `/api/users/*` 端点的请求接收带有只读用户范围的令牌
- 对 `/api/admin/*` 端点的请求接收带有完整管理员范围的令牌
这通过防止不必要的特权访问和限制受损令牌的影响范围来降低安全风险。
```yaml
# 具有只读访问范围的用户
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2clientcredentials-users
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "user:read profile:read"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: headerName
    value: "authorization"
  - name: pathFilter
    value: "^/api/users/.*"
---
# 具有完整管理员访问范围的用户
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2clientcredentials-admin
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "admin:read admin:write user:read user:write"
  - name: tokenURL
    value: "https://accounts.google.com/o/oauth2/token"
  - name: headerName
    value: "authorization"
  - name: pathFilter
    value: "^/api/admin/.*"
```


## 相关链接
- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
