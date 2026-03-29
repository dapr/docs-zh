---
type: docs
title: "AWS Cloudmap"
linkTitle: "AWS Cloudmap"
description: AWS Cloudmap 名称解析组件的详细信息
---


该组件使用 [AWS Cloud Map](https://aws.amazon.com/cloud-map/) 在 Dapr 中进行服务发现。它支持 HTTP 和 DNS 命名空间，允许服务使用 AWS Cloud Map 的服务发现能力来发现并连接到其他服务。

## 配置格式

名称解析通过 [Dapr Configuration]({{< ref configuration-overview.md >}}) 进行配置。

在配置 YAML 中，将 `spec.nameResolution.component` 属性设置为 `"aws.cloudmap"`，然后在 `spec.nameResolution.configuration` 字典中传递配置选项。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "aws.cloudmap"
    version: "v1"
    configuration:
      # Required: AWS CloudMap namespace configuration (one of these is required)
      namespaceName: "my-namespace"  # The name of your CloudMap namespace
      # namespaceId: "ns-xxxxxx"    # Alternative: Use namespace ID instead of name

      # Optional: AWS authentication (choose one authentication method)
      # Option 1: Environment variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
      # Option 2: IAM roles for Amazon EKS
      # Option 3: Explicit credentials (not recommended for production)
      accessKey: "****"
      secretKey: "****"
      sessionToken: "****"  # Optional

      # Optional: AWS region and endpoint configuration
      region: "us-west-2"
      endpoint: "http://localhost:4566"  # Optional: Custom endpoint for testing

      # Optional: Dapr configuration
      defaultDaprPort: 50002  # Default port for Dapr sidecar if not specified in instance attributes
```

## 规范说明

### AWS 身份验证

该组件支持多种身份验证方法：

1. 环境变量：
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_SESSION_TOKEN（可选）

2. IAM 角色：
   - 在 AWS（EKS、EC2 等）上运行时，组件可以使用 IAM 角色

3. 显式凭证：
   - 在组件元数据中提供（不推荐在生产环境中使用）

### 所需权限

AWS 凭证必须具有以下权限：
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "servicediscovery:DiscoverInstances",
                "servicediscovery:GetNamespace",
                "servicediscovery:ListNamespaces"
            ],
            "Resource": "*"
        }
    ]
}
```

### 规范配置字段

| 字段            | 是否必需                            | 类型   | 默认值 | 描述 |
|----------------|-------------------------------------|--------|---------|-------------|
| namespaceName  | namespaceName 或 namespaceId 其中之一 | string | ""      | AWS CloudMap 命名空间的名称 |
| namespaceId    | namespaceName 或 namespaceId 其中之一 | string | ""      | AWS CloudMap 命名空间的 ID |
| region         | N                                   | string | ""      | AWS 区域。如果未提供，将从环境或实例元数据中确定 |
| endpoint       | N                                   | string | ""      | AWS Cloud Map API 的自定义端点。适用于使用 LocalStack 进行测试 |
| defaultDaprPort | N                                  | number | 3500    | 如果在实例属性中未指定，则为 Dapr 边车的默认端口 |

### 服务注册

要使用此名称解析器，您的服务必须在 AWS Cloud Map 中注册。注册实例时，确保它们具有以下属性：

1. 必需：以下地址属性之一：
   - `AWS_INSTANCE_IPV4`：实例的 IPv4 地址
   - `AWS_INSTANCE_IPV6`：实例的 IPv6 地址
   - `AWS_INSTANCE_CNAME`：实例的主机名

2. 可选：Dapr 边车端口属性：
   - `DAPR_PORT`：Dapr 边车正在监听的端口
   - 如果未指定，组件将使用配置中的 `defaultDaprPort`（默认为 3500）

解析器仅返回健康的实例（具有 `HEALTHY` 状态的实例）以确保可靠的服务通信。

示例实例属性：
```json
{
    "AWS_INSTANCE_IPV4": "10.0.0.1",
    "DAPR_PORT": "50002"
}
```


## 使用示例

名称解析通过 [Dapr Configuration]({{< ref configuration-overview.md >}}) 进行配置。以下是一些使用示例。

### 最小配置

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "aws.cloudmap"
    configuration:
      namespaceName: "mynamespace.dev"
      defaultDaprPort: 50002
```

### 使用 LocalStack 进行本地开发

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "aws.cloudmap"
    configuration:
      namespaceName: "my-namespace"
      region: "us-east-1"
      endpoint: "http://localhost:4566"
      accessKey: "test"
      secretKey: "test"
``` 

### 相关链接
- [服务调用构建块]({{< ref service-invocation >}})
- [AWS Cloudmap 文档](https://aws.amazon.com/cloud-map/)
