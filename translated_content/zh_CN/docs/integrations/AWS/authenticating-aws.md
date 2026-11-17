---
type: docs
title: "向 AWS 进行身份验证"
linkTitle: "向 AWS 进行身份验证"
weight: 10
description: "关于 AWS 身份验证和配置选项的信息"
aliases:
  - /zh-hans/developing-applications/integrations/authenticating/authenticating-aws/
  - /zh-hans/developing-applications/integrations/aws/authenticating-aws/
---

使用 AWS 服务（例如 DynamoDB、SQS、S3）的 Dapr 组件通过 AWS SDK 使用标准化的配置属性。[了解 AWS SDK 如何处理凭证](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)。

你可以使用 AWS SDK 的默认提供程序链，或下文列出的某个预定义 AWS 身份验证配置文件来配置身份验证。通过测试并检查 Dapr 运行时日志来验证组件配置，确认组件已正确初始化。

### 术语
- **ARN（Amazon 资源名称）：** 用于指定 AWS 资源的唯一标识符。格式：`arn:partition:service:region:account-id:resource`。示例：`arn:aws:iam::123456789012:role/example-role`。
- **IAM（身份与访问管理）：** AWS 提供的服务，用于安全地管理对 AWS 资源的访问。

### 身份验证配置文件

#### 访问密钥 ID 和 Secret Access Key
使用静态的访问密钥 ID 和 Secret Access Key 凭证，可以通过组件元数据字段指定，也可以通过[默认 AWS 配置](https://docs.aws.amazon.com/sdkref/latest/guide/creds-config-files.html)指定。

{{% alert title="重要" color="warning" %}}
在以下场景中，建议优先通过默认 AWS 配置加载凭证：
- 在 EKS（AWS Kubernetes）上与你的应用一起运行 Dapr 边车（`daprd`）。
- 使用附加了定义 AWS 资源访问权限的 IAM 策略的节点或 Pod。
{{% /alert %}}

| 属性 | 必填 | 说明 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `region` | 是 | 要连接的 AWS 区域。 | "us-east-1" |
| `accessKey` | 否 | AWS 访问密钥 ID。将在 Dapr v1.17 中变为必填。 | "AKIAIOSFODNN7EXAMPLE" |
| `secretKey` | 否 | AWS Secret Access Key，与 `accessKey` 一起使用。将在 Dapr v1.17 中变为必填。 | "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" |
| `sessionToken` | 否 | AWS 会话令牌，与 `accessKey` 和 `secretKey` 一起使用。对于 IAM 用户密钥通常不需要。 | |

#### 承担 IAM 角色
此配置文件允许 Dapr 承担特定的 IAM 角色。通常在 Dapr 边车运行于 EKS 上，或在关联了 IAM 策略的节点或 Pod 上运行时使用。目前受 Kafka 和 PostgreSQL 组件支持。

| 属性 | 必填 | 说明 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `region` | 是 | 要连接的 AWS 区域。 | "us-east-1" |
| `assumeRoleArn` | 否 | 具有 AWS 资源访问权限的 IAM 角色的 ARN。将在 Dapr v1.17 中变为必填。 | "arn:aws:iam::123456789:role/mskRole" |
| `sessionName` | 否 | 角色承担的会话名称。默认为 `"DaprDefaultSession"`。 | "MyAppSession" |

#### 来自环境变量的凭证
使用[环境变量](https://docs.aws.amazon.com/sdkref/latest/guide/environment-variables.html)进行身份验证。这对自托管模式下的 Dapr 尤其有用，因为此时边车注入器不会配置环境变量。

此身份验证配置文件不需要任何元数据字段。

#### IAM Roles Anywhere
[IAM Roles Anywhere](https://aws.amazon.com/iam/roles-anywhere/) 将基于 IAM 角色的身份验证扩展到外部工作负载。它通过加密签名的证书消除了对长期凭证的需要，这些证书锚定在使用 Dapr PKI 建立的信任关系中。Dapr SPIFFE 身份 X.509 证书用于向 AWS 服务进行身份验证，Dapr 会在会话寿命的一半时轮换凭证。

要配置此身份验证配置文件：
1. 在信任方 AWS 账户中，将 Dapr 证书包作为 `External certificate bundle`，创建一个信任锚点（Trust Anchor）。
2. 创建一个 IAM 角色，并为其配置所需的资源权限策略，同时为 Roles Anywhere AWS 服务添加信任实体。在此指定允许的 SPIFFE 身份。
3. 在 Roles Anywhere 服务下创建 IAM 配置文件（Profile），并关联该 IAM 角色。

| 属性 | 必填 | 说明 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `trustAnchorArn` | 是 | 在向 Dapr 证书颁发机构授予信任的 AWS 账户中，信任锚点的 ARN。 | arn:aws:rolesanywhere:us-west-1:012345678910:trust-anchor/01234568-0123-0123-0123-012345678901 |
| `trustProfileArn` | 是 | 信任方 AWS 账户中 AWS IAM 配置文件的 ARN。 | arn:aws:rolesanywhere:us-west-1:012345678910:profile/01234568-0123-0123-0123-012345678901 |
| `assumeRoleArn` | 是 | 信任方 AWS 账户中要承担的 AWS IAM 角色的 ARN。 | arn:aws:iam:012345678910:role/exampleIAMRoleName |

### 其他字段

部分 AWS 组件包含额外的可选字段：

| 属性 | 必填 | 说明 | 示例 |
| --------- | ----------- | ----------- | ----------- |
| `endpoint` | 否 | 端点通常由 AWS SDK 在内部处理。但在某些情况下（例如针对 [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) 进行开发时），在本地设置它可能更合适。 | |

此外，Kafka 和 PostgreSQL 等非原生 AWS 组件如果支持 AWS 身份验证配置文件，会提供用于触发 AWS 身份验证逻辑的元数据字段。请务必查阅具体组件的文档。

## 替代在组件清单文件中显式指定凭证的方案

在生产环境中，建议使用以下方案之一：
- [Kiam](https://github.com/uswitch/kiam)
- [Kube2iam](https://github.com/jtblin/kube2iam)

如果在 AWS EKS 上运行，你可以[将 IAM 角色关联到 Kubernetes 服务账号](https://docs.aws.amazon.com/eks/latest/userguide/create-service-account-iam-policy-and-role.html)，供你的 Pod 使用。

以上方案解决的是同一个问题：它们让 Dapr 运行时进程（或边车）能够动态获取凭证，从而无需显式提供凭证。这带来了多项好处，例如自动化的密钥轮换，以及无需自行管理 secrets。

Kiam 和 Kube2IAM 都通过拦截对[实例元数据服务](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)的调用来工作。

### 使用 AWS EKS Pod Identity 设置 Dapr

EKS Pod Identity 提供了为应用管理凭证的能力，其方式类似于 Amazon EC2 实例配置文件为 Amazon EC2 实例提供凭证。你无需创建 AWS 凭证并将其分发到容器中，也无需使用 Amazon EC2 实例的角色，而是将 IAM 角色与 Kubernetes 服务账号关联，并配置 Pod 使用该服务账号。

要查看一个完整示例，了解如何使用 AWS EKS Pod Identity 从 EKS 授权 Pod 访问 AWS Secrets Manager，请[参阅该仓库中的示例](https://github.com/dapr/samples/tree/master/dapr-eks-podidentity)。

### 在 AWS EC2 上以独立模式运行时使用实例配置文件

如果以独立模式直接在 AWS EC2 实例上运行 Dapr，可以使用实例配置文件。

1. 配置一个 IAM 角色。
1. [将其附加到该 EC2 实例的实例配置文件](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html)。

随后，Dapr 无需在 Dapr 组件清单中指定凭证即可向 AWS 进行身份验证。

### 在本地以独立模式运行 dapr 时向 AWS 进行身份验证

{{< tabpane text=true >}}
 <!-- linux -->
{{% tab "Linux/MacOS" %}}

在以独立模式运行 Dapr（或直接运行 Dapr 运行时）时，你可以像下面的示例一样，将环境变量注入进程：

```bash
FOO=bar daprd --app-id myapp
```

如果你在本地[配置了命名的 AWS 配置文件](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)，可以通过指定 "AWS_PROFILE" 环境变量来告诉 Dapr（或 Dapr 运行时）使用哪个配置文件：

```bash
AWS_PROFILE=myprofile dapr run...
```

或者

```bash
AWS_PROFILE=myprofile daprd...
```

你可以使用任何[受支持的环境变量](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-list)，以这种方式配置 Dapr。

{{% /tab %}}

 <!-- windows -->
{{% tab "Windows" %}}

在 Windows 上，必须在启动 `dapr` 或 `daprd` 命令之前设置环境变量，不支持像在 Linux/MacOS 上那样内联设置。

{{% /tab %}}

{{< /tabpane >}}

### 使用基于 AWS SSO 的配置文件向 AWS 进行身份验证

如果你使用 [AWS SSO](https://aws.amazon.com/single-sign-on/) 向 AWS 进行身份验证，则 AWS SDK for Go（v1 和 v2）原生支持 AWS SSO 凭证提供程序。这意味着你无需额外的工具，即可直接使用 AWS SSO 配置文件。

有关 AWS SDK for Go 中 AWS SSO 支持的更多信息，请参阅 [AWS 博客文章](https://aws.amazon.com/blogs/developer/aws-sso-support-in-the-aws-sdk-for-go/)。

## 后续步骤

{{< button text="查阅 AWS 组件规范 >>" page="components-reference.md" >}}

## 相关链接

- 更多信息，请参阅 [Dapr 所使用的 AWS SDK 如何处理凭证](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)。
- [EKS Pod Identity 文档](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html)
- [AWS SDK 凭证配置](https://docs.aws.amazon.com/sdk-for-go/v1/developer-guide/configuring-sdk.html#specifying-credentials)
- [设置 Elastic Kubernetes Service（EKS）集群](https://docs.dapr.io/operations/hosting/kubernetes/cluster/setup-eks/)
