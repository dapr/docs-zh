---
type: docs
title: "AWS Bedrock"
linkTitle: "AWS Bedrock"
description: "关于 AWS Bedrock conversation component 的详细信息"
---

## component 格式

Dapr `conversation.yaml` component 文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: awsbedrock
spec:
  type: conversation.aws.bedrock
  metadata:
  - name: endpoint
    value: "http://localhost:4566"
  - name: model
    value: amazon.titan-text-express-v1
  - name: responseCacheTTL
    value: 10m
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用 secret store 来管理密钥，如[这里]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规格 metadata 字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `region` | N | Bedrock 服务的 AWS 区域。 | `us-east-1` |
| `endpoint` | N | component 用于连接模拟器的 AWS 端点。不推荐用于生产 AWS 环境。 | `http://localhost:4566` |
| `accessKey` | N | 用于身份验证的 AWS 访问密钥。建议使用 secret store 来存储此值。 | `"AKIAIOSFODNN7EXAMPLE"` |
| `secretKey` | N | 用于身份验证的 AWS 密钥。建议使用 secret store 来存储此值。 | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `sessionToken` | N | 用于临时凭证的 AWS 会话令牌。建议使用 secret store 来存储此值。 | `"session-token-example"` |
| `model` | N | 要使用的大型语言模型 (LLM)。默认为 Amazon 提供的 Bedrock 默认提供商模型。 | `amazon.titan-text-express-v1` |
| `maxTokens` | N | 模型每次请求可生成的默认最大令牌数。请求级别的 `maxTokens` 值会覆盖此默认值。未设置时，不发送上限，而由提供商自身的默认值决定。 | `2048` |
| `responseCacheTTL` | N | 内存响应缓存的有效期。设置后，相同的请求将从缓存中提供服务，直到它们过期。 | `10m` |
| `assumeRoleArn` | N | 用于身份验证的要承担角色的 ARN。 | `arn:aws:iam::123456789012:role/MyRole` |
| `trustAnchorArn` | N | 用于身份验证的信任锚点的 ARN。 | `arn:aws:rolesanywhere:us-east-1:123456789012:trust-anchor/12345678-1234-1234-1234-123456789012` |
| `trustProfileArn` | N | 用于身份验证的信任配置文件的 ARN。 | `arn:aws:rolesanywhere:us-east-1:123456789012:profile/12345678-1234-1234-1234-123456789012` |

## 身份验证 AWS

AWS Bedrock 不使用 `key` 参数，而是使用 Dapr 的标准 IAM 或静态凭证方法进行身份验证。[了解更多关于 AWS 身份验证的信息。]({{% ref authenticating-aws.md %}})

## 相关链接

- [conversation API 概述]({{% ref conversation-overview.md %}})
