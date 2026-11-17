---
type: docs
title: "Configure endpoint authorization with OAuth"
linkTitle: "使用 OAuth 配置端点授权"
weight: 2000
description: "为你的 Web API 在应用程序端点上启用 OAuth 授权"
---

Dapr OAuth 2.0 [middleware]({{% ref "middleware.md" %}}) 允许你为你的 Web API 在 Dapr 端点上启用 [OAuth](https://oauth.net/2/) 授权，使用 [授权码授权流程](https://tools.ietf.org/html/rfc6749#section-4.1)。
你也可以将授权令牌注入到你的端点 API 中，使用 [客户端凭据授权流程](https://tools.ietf.org/html/rfc6749#section-4.4) 对你的 API 所调用的外部 API 进行授权。
当 middleware 启用后，通过 Dapr 进行的任何方法调用在传递给用户代码之前都需要经过授权。

这两种流程的主要区别在于，`Authorization Code Grant flow` 需要用户交互并对用户进行授权，而 `Client Credentials Grant flow` 不需要用户交互，对服务/应用程序进行授权。

## 在授权服务器上注册你的应用程序

不同的授权服务器提供不同的应用程序注册体验。以下是一些示例：
<!-- IGNORE_LINKS -->
* [Microsoft Entra ID](https://docs.microsoft.com/azure/active-directory/develop/v1-protocols-oauth-code)
* [Facebook](https://developers.facebook.com/apps)
* [Fitbit](https://dev.fitbit.com/build/reference/web-api/oauth2/)
* [GitHub](https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/)
* [Google APIs](https://console.developers.google.com/apis/credentials/consen)
* [Slack](https://api.slack.com/docs/oauth)
* [Twitter](http://apps.twitter.com/)
<!-- END_IGNORE -->
要配置 Dapr OAuth middleware，你需要收集以下信息：

* 客户端 ID（参见[此处](https://www.oauth.com/oauth2-servers/client-registration/client-id-secret/)）
* Client secret（参见[此处](https://www.oauth.com/oauth2-servers/client-registration/client-id-secret/)）
* 作用域（参见[此处](https://oauth.net/2/scope/)）
* Authorization URL
* Token URL

一些流行的授权服务器的授权/令牌 URL：

<!-- IGNORE_LINKS -->
| Server  | Authorization URL | Token URL |
|---------|-------------------|-----------|
|Microsoft Entra ID|<https://login.microsoftonline.com/{tenant}/oauth2/authorize>|<https://login.microsoftonline.com/{tenant}/oauth2/token>|
|GitHub|<https://github.com/login/oauth/authorize>|<https://github.com/login/oauth/access_token>|
|Google|<https://accounts.google.com/o/oauth2/v2/auth>|<https://accounts.google.com/o/oauth2/token> <https://www.googleapis.com/oauth2/v4/token>|
|Twitter|<https://api.twitter.com/oauth/authorize>|<https://api.twitter.com/oauth2/token>|
<!-- END_IGNORE -->

## 定义 middleware component 定义

### 定义授权码授权 component

OAuth middleware（授权码）由 component 定义：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2
  namespace: default
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "<comma-separated scope names>"
  - name: authURL
    value: "<authorization URL>"
  - name: tokenURL
    value: "<token exchange URL>"
  - name: redirectURL
    value: "<redirect URL>"
  - name: authHeaderName
    value: "<header name under which the secret token is saved>"
    # forceHTTPS:
    # 此键用于在 Dapr 从身份提供者成功接收访问令牌后，
    # 在重定向到你的 API 方法时设置 HTTPS 协议。
    # 默认情况下，Dapr 在此重定向中使用 HTTP。
  - name: forceHTTPS
    value: "<set to true if you invoke an API method through Dapr from https origin>"
```

### 为授权码授权定义自定义流水线

要使用 OAuth middleware（授权码），你应该使用 [Dapr 配置]({{% ref "configuration-overview" %}}) 创建一个[自定义流水线]({{% ref "middleware.md" %}})，如以下示例所示：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: oauth2
      type: middleware.http.oauth2
```

### 定义客户端凭据授权 component

OAuth（客户端凭据）middleware 由 component 定义：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: myComponent
spec:
  type: middleware.http.oauth2clientcredentials
  version: v1
  metadata:
  - name: clientId
    value: "<your client ID>"
  - name: clientSecret
    value: "<your client secret>"
  - name: scopes
    value: "<comma-separated scope names>"
  - name: tokenURL
    value: "<token issuing URL>"
  - name: headerName
    value: "<header name under which the secret token is saved>"
  - name: endpointParamsQuery
    value: "<list of additional key=value settings separated by ampersands or semicolons forwarded to the token issuing service>"
    # authStyle:
    # "0" 表示通过同时尝试两种方式并缓存
    # 成功的方式，来自动检测提供商需要的认证方式。

    # "1" 在 POST 正文中以 application/x-www-form-urlencoded 参数的形式
    # 发送 "client_id" 和 "client_secret"。

    # "2" 使用 HTTP Basic Authorization 发送 client_id 和 client_password。
    # 这是 OAuth2 RFC 6749 第 2.3.1 节中描述的可选方式。
  - name: authStyle
    value: "<see comment>"
```

### 为客户端凭据授权定义自定义流水线

要使用 OAuth middleware（客户端凭据），你应该使用 [Dapr 配置]({{% ref "configuration-overview.md" %}}) 创建一个[自定义流水线]({{% ref "middleware.md" %}})，如以下示例所示：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: myComponent
      type: middleware.http.oauth2clientcredentials
```

## 应用配置

要将上述配置（无论授权类型如何）
应用到你的 Dapr sidecar，请在你的 pod spec 中添加 ```dapr.io/config``` 注解：

```yaml
apiVersion: apps/v1
kind: Deployment
...
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        dapr.io/enabled: "true"
        ...
        dapr.io/config: "pipeline"
...
```

## 访问访问令牌

### 授权码授权

一旦一切就绪，每当客户端尝试通过 Dapr sidecar 调用 API 方法
（例如调用 *v1.0/invoke/* 端点），
如果未找到访问令牌，它将被重定向到授权的同意页面。
否则，访问令牌将写入 **authHeaderName** header 并可供应用程序代码使用。

### 客户端凭据授权

一旦一切就绪，每当客户端尝试通过 Dapr sidecar 调用 API 方法
（例如调用 *v1.0/invoke/* 端点），
如果未找到有效的现有令牌，它将检索一个新的访问令牌。
访问令牌将写入 **headerName** header 并可供应用程序代码使用。
通过这种方式，应用程序可以在调用请求该令牌的外部 API 时，在授权 header 中转发该令牌。
