---
type: docs
title: "AWS 认证"
linkTitle: "AWS 认证"
weight: 10
description: "关于 AWS 认证和配置选项的信息"
aliases:
  - /developing-applications/integrations/authenticating/authenticating-aws/
---

利用 AWS 服务的 Dapr 组件（例如 DynamoDB、SQS、S3）通过 AWS SDK 使用标准化的配置属性。[了解更多关于 AWS SDK 如何处理凭据的信息](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)。

您可以使用 AWS SDK 的默认提供程序链或下面列出的预定义 AWS 认证配置文件之一来配置认证。通过测试和检查 Dapr 运行时日志来确认正确初始化，从而验证您的组件配置。

### 术语
- **ARN (Amazon Resource Name，Amazon 资源名称):** 用于指定 AWS 资源的唯一标识符。格式：`arn:partition:service:region:account-id:resource`。示例：`arn:aws:iam::123456789012:role/example-role`。
- **IAM (Identity and Access Management，身份和访问管理):** 用于安全管理 AWS 资源访问的 AWS 服务。

### 认证配置文件

#### 访问密钥 ID 和秘密访问密钥
使用静态访问密钥和秘密密钥凭据，可以通过组件元数据字段或通过[默认 AWS 配置](https://docs.aws.amazon.com/sdkref/latest/guide/creds-config-files.html)实现。

{{% alert title="重要" color="warning" %}}
在以下场景中，建议通过默认 AWS 配置加载凭据：
- 在 EKS (AWS Kubernetes) 上与您的应用程序一起运行 Dapr 边车 (`daprd`)。
- 使用附加到 IAM 策略的节点或 Pod，这些策略定义了 AWS 资源访问权限。
{{% /alert %}}

| 属性 | 必填 | 描述 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `region` | Y | 要连接的 AWS 区域。 | "us-east-1" |
| `accessKey` | N | AWS 访问密钥 ID。在 Dapr v1.17 中将是必填项。 | "AKIAIOSFODNN7EXAMPLE" |
| `secretKey` | N | AWS 秘密访问密钥，与 `accessKey` 一起使用。在 Dapr v1.17 中将是必填项。 | "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" |
| `sessionToken` | N | AWS 会话令牌，与 `accessKey` 和 `secretKey` 一起使用。对于 IAM 用户密钥通常不需要。 | |

#### 承担 IAM 角色
此配置文件允许 Dapr 承担特定的 IAM 角色。通常在 Dapr 边车运行在 EKS 上或附加到 IAM 策略的节点/ Pod 上时使用。目前由 Kafka 和 PostgreSQL 组件支持。

| 属性 | 必填 | 描述 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `region` | Y | 要连接的 AWS 区域。 | "us-east-1" |
| `assumeRoleArn` | N | 具有 AWS 资源访问权限的 IAM 角色的 ARN。在 Dapr v1.17 中将是必填项。 | "arn:aws:iam::123456789:role/mskRole" |
| `sessionName` | N | 角色承担的会话名称。默认为 `"DaprDefaultSession"`。 | "MyAppSession" |

#### 来自环境变量的凭据
使用[环境变量](https://docs.aws.amazon.com/sdkref/latest/guide/environment-variables.html)进行认证。这对于边车注入器不配置环境变量的自托管模式下的 Dapr 特别有用。

此认证配置文件不需要元数据字段。

#### IAM Roles Anywhere
[IAM Roles Anywhere](https://aws.amazon.com/iam/roles-anywhere/) 将基于 IAM 角色的认证扩展到外部工作负载。它通过使用加密签名证书消除了对长期凭据的需求，该证书使用 Dapr PKI 建立在信任关系中。Dapr SPIFFE 身份 X.509 证书用于向 AWS 服务进行认证，Dapr 在会话生命周期的一半时处理凭据轮换。

要配置此认证配置文件：
1. 在信任 AWS 账户中使用 Dapr 证书包作为 `External certificate bundle` 创建信任锚点。
2. 创建一个具有必要资源权限策略以及 Roles Anywhere AWS 服务的信任实体的 IAM 角色。在此处，您可以指定允许的 SPIFFE 身份。
3. 在 Roles Anywhere 服务下创建一个 IAM 配置文件，链接 IAM 角色。

| 属性 | 必填 | 描述 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `trustAnchorArn` | Y | AWS 账户中授予 Dapr 证书颁发机构信任的信任锚点的 ARN。 | arn:aws:rolesanywhere:us-west-1:012345678910:trust-anchor/01234568-0123-0123-0123-012345678901 |
| `trustProfileArn` | Y | 信任 AWS 账户中 AWS IAM 配置文件的 ARN。 | arn:aws:rolesanywhere:us-west-1:012345678910:profile/01234568-0123-0123-0123-012345678901 |
| `assumeRoleArn` | Y | 信任 AWS 账户中要承担的 AWS IAM 角色的 ARN。 | arn:aws:iam:012345678910:role/exampleIAMRoleName |

### 附加字段

某些 AWS 组件包含其他可选字段：

| 属性 | 必填 | 描述 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `endpoint` | N | 端点通常由 AWS SDK 内部处理。但是，在某些情况下，在本地设置它可能是有意义的 - 例如，针对 [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) 进行开发时。 | |

此外，支持 AWS 认证配置文件的非原生 AWS 组件（如 Kafka 和 PostgreSQL）具有用于触发 AWS 认证逻辑的元数据字段。请务必查看特定组件文档。

## 在组件清单文件中显式指定凭据的替代方案

在生产场景中，建议使用以下解决方案：
- [Kiam](https://github.com/uswitch/kiam) 
- [Kube2iam](https://github.com/jtblin/kube2iam) 

如果在 AWS EKS 上运行，您可以将 [IAM 角色链接到 Kubernetes 服务账户](https://docs.aws.amazon.com/eks/latest/userguide/create-service-account-iam-policy-and-role.html)，您的 Pod 可以使用该角色。

所有这些解决方案都解决了相同的问题：它们允许 Dapr 运行时进程（或边车）动态检索凭据，因此不需要显式凭据。这提供了几个好处，例如自动密钥轮换，以及避免管理机密。

Kiam 和 Kube2IAM 都通过拦截对[实例元数据服务](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)的调用来工作。

### 使用 AWS EKS Pod Identity 设置 Dapr

EKS Pod 身份提供了为您的应用程序管理凭据的能力，类似于 Amazon EC2 实例配置文件为 Amazon EC2 实例提供凭据的方式。您可以将 IAM 角色与 Kubernetes 服务账户关联，并配置您的 Pod 使用该服务账户，而不是创建和分发 AWS 凭据到容器或使用 Amazon EC2 实例的角色。

要查看有关如何使用 AWS EKS Pod Identity 从 EKS 授权 Pod 访问 AWS Secrets Manager 的综合示例，[请遵循此存储库中的示例](https://github.com/dapr/samples/tree/master/dapr-eks-podidentity)。

### 在 AWS EC2 上以独立模式运行时使用实例配置文件

如果以独立模式直接在 AWS EC2 实例上运行 Dapr，您可以使用实例配置文件。

1. 配置 IAM 角色。
1. [将其附加到 ec2 实例的实例配置文件](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)。

然后，Dapr 在不需要在 Dapr 组件清单中指定凭据的情况下向 AWS 进行认证。

### 在独立模式下本地运行 dapr 时向 AWS 进行认证

{{< tabpane text=true >}}
 <!-- linux -->
{{% tab "Linux/MacOS" %}}

当以独立模式运行 Dapr（或直接运行 Dapr 运行时）时，您可以将环境变量注入到进程中，如下例所示：

```bash
FOO=bar daprd --app-id myapp
```

如果您已在本地[配置了命名的 AWS 配置文件](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)，可以通过指定 "AWS_PROFILE" 环境变量来告诉 Dapr（或 Dapr 运行时）使用哪个配置文件：

```bash
AWS_PROFILE=myprofile dapr run...
```

或

```bash
AWS_PROFILE=myprofile daprd...
```

您可以使用任何[支持的环境变量](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-list)以这种方式配置 Dapr。

{{% /tab %}}

 <!-- windows -->
{{% tab "Windows" %}}

在 Windows 上，需要在启动 `dapr` 或 `daprd` 命令之前设置环境变量，不支持像 Linux/MacOS 那样内联设置。

{{% /tab %}}

{{< /tabpane >}}

### 如果使用基于 AWS SSO 的配置文件，则向 AWS 进行认证

如果您使用 [AWS SSO](https://aws.amazon.com/single-sign-on/) 向 AWS 进行认证，适用于 Go 的 AWS SDK（v1 和 v2）为 AWS SSO 凭据提供程序提供原生支持。这意味着您可以直接使用 AWS SSO 配置文件，而无需其他实用程序。

有关适用于 Go 的 AWS SDK 中 AWS SSO 支持的更多信息，请参阅 [AWS 博客文章](https://aws.amazon.com/blogs/developer/aws-sso-support-in-the-aws-sdk-for-go/)。

## 后续步骤

{{< button text="参考 AWS 组件规范 >>" page="components-reference.md" >}}

## 相关链接

- 有关更多信息，请参阅 [AWS SDK（Dapr 使用的）如何处理凭据](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)。
- [EKS Pod Identity 文档](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html)
- [AWS SDK 凭据配置](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)
- [设置 Elastic Kubernetes Service (EKS) 集群](https://docs.dapr.io/operations/hosting/kubernetes/cluster/setup-eks/)
