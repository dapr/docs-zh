---
type: docs
title: "JSON Web Key Sets (JWKS)"
linkTitle: "JSON Web Key Sets (JWKS)"
description: JWKS 加密组件的详细信息
---

## 组件格式

此组件的用途是从 JSON Web Key Set（[RFC 7517](https://www.rfc-editor.org/rfc/rfc7517)）加载密钥。这些是包含 1 个或多个 JWK（JSON Web Key）密钥的 JSON 文档；它们可以是公钥、私钥或共享密钥。

此组件支持以下方式加载 JWKS：

- 从本地文件加载；在此情况下，Dapr 会监视磁盘上的文件变化并自动重新加载。
- 从 HTTP(S) URL 加载，该 URL 会定期刷新。
- 通过在 `jwks` 元数据属性中传入实际的 JWKS，作为字符串（可选择是否进行 base64 编码）。

{{% alert title="注意" color="primary" %}}
此组件使用 Dapr 中的加密引擎来执行操作。虽然密钥永远不会暴露给你的应用程序，但 Dapr 可以访问原始密钥材料。

{{% /alert %}}

Dapr `crypto.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: jwks
spec:
  type: crypto.dapr.jwks
  version: v1
  metadata:
    # 示例 1：从文件加载 JWKS
    - name: "jwks"
      value: "fixtures/crypto/jwks/jwks.json"
    # 示例 2：从 HTTP(S) URL 加载 JWKS
    # 仅需要 "jwks"
    - name: "jwks"
      value: "https://example.com/.well-known/jwks.json"
    - name: "requestTimeout"
      value: "30s"
    - name: "minRefreshInterval"
      value: "10m"
    # 选项 3：包含实际的 JWKS
    - name: "jwks"
      value: |
        {
          "keys": [
            {
              "kty": "RSA",
              "use": "sig",
              "kid": "…",
              "n": "…",
              "e": "…",
              "issuer": "https://example.com"
            }
          ]
        }
    # 选项 3b：包含 base64 编码的 JWKS
    - name: "jwks"
      value: |
        eyJrZXlzIjpbeyJ…
```

{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `jwks`               | Y        | JWKS 文档的路径 | 本地文件：`"fixtures/crypto/jwks/jwks.json"`<br>HTTP(S) URL：`"https://example.com/.well-known/jwks.json"`<br>嵌入的 JWKS：`{"keys": […]}`（可以是 base64 编码）
| `requestTimeout`     | N        | 从 HTTP(S) URL 获取 JWKS 文档时网络请求的超时时间，采用 Go duration 格式。默认值："30s" | `"5s"`
| `minRefreshInterval` | N        | 从 HTTP(S) 源后续刷新 JWKS 文档前等待的最小间隔，采用 Go duration 格式。默认值："10m" | `"1h"`

## 相关链接
[加密构建块]({{% ref cryptography %}})
