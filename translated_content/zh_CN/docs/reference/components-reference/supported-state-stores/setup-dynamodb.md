---
type: docs
title: "AWS DynamoDB"
linkTitle: "AWS DynamoDB"
description: AWS DynamoDB 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-dynamodb/"
---

## 组件格式

要设置 DynamoDB 状态存储，请创建类型为 `state.aws.dynamodb` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "Contracts"
  - name: accessKey
    value: "AKIAIOSFODNN7EXAMPLE" # 可选
  - name: secretKey
    value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" # 可选
  - name: endpoint
    value: "http://localhost:8080" # 可选
  - name: region
    value: "eu-west-1" # 可选
  - name: sessionToken
    value: "myTOKEN" # 可选
  - name: ttlAttributeName
    value: "expiresAt" # 可选
  - name: ttlInSeconds
    value: <int> # 可选
  - name: partitionKey
    value: "ContractID" # 可选
  # 如希望将 AWS DynamoDB 用作 actor 的状态存储，请取消此注释（可选）
  #- name: actorStateStore
  #  value: "true"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 主键

为了将 DynamoDB 用作 Dapr 状态存储，表必须具有名为 `key` 的主键。有关更改此行为的选项，请参阅[分区键]({{% ref "setup-dynamodb.md#partition-keys" %}})部分。

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| table              | Y  | 要使用的 DynamoDB 表名  | `"Contracts"`
| accessKey          | N  | 具有访问 SNS 和 SQS 适当权限的 AWS 账户 ID。可以是 `secretKeyRef` 以使用密钥引用  | `"AKIAIOSFODNN7EXAMPLE"`
| secretKey          | N  | AWS 用户的密钥。可以是 `secretKeyRef` 以使用密钥引用   |`"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"`
| region             | N  | 实例的 AWS 区域。有关有效区域，请参阅此页面：https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html。确保该区域支持 DynamoDB。| `"us-east-1"`
| endpoint          | N  | 组件要使用的 AWS 端点。仅用于本地开发。针对生产 AWS 运行时不需要 `endpoint`   | `"http://localhost:4566"`
| sessionToken      | N  | 要使用的 AWS 会话令牌。仅在使用临时安全凭证时才需要会话令牌。 | `"TOKEN"`
| ttlAttributeName  | N  | 应用于 TTL 的表属性名称。 | `"expiresAt"`
| ttlInSeconds       | N         | 允许指定以秒为单位的生存时间（TTL），该 TTL 将应用于每个状态存储请求，除非通过[请求元数据]({{% ref "state-store-ttl.md" %}})明确定义了 TTL。如果设置为零或更小，则不会应用默认 TTL，并且只有在设置了 ttlAttributeName 且在请求元数据中明确提供了 TTL 时，项目才会过期。 | `600`
| partitionKey      | N  | 表主键或分区键属性名称。此字段用于替换默认主键属性名称 `"key"`。请参阅[分区键]({{% ref "setup-dynamodb.md#partition-keys" %}})部分。  | `"ContractID"`
| actorStateStore      | N  | 将此状态存储用于 actor。默认为 "false" | `"true"`, `"false"`

{{% alert title="Important" color="warning" %}}
在 EKS（AWS Kubernetes）上使用您的应用程序运行 Dapr 边车（daprd）时，如果您使用的节点/pod 已附加到定义了 AWS 资源访问权限的 IAM 策略，则**不得**在您使用的组件规格定义中提供 AWS 访问密钥、密钥和令牌。
{{% /alert %}}

## 设置 AWS DynamoDB

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})

## 生存时间（TTL）

要使用 DynamoDB TTL 功能，您必须在表上启用 TTL 并定义属性名称。
属性名称必须在 `ttlAttributeName` 字段中定义。
请参阅官方 [AWS 文档](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)。

## 分区键

默认情况下，DynamoDB 状态存储组件使用表属性名称 `key` 作为 DynamoDB 表中的主键/分区键。
可以通过在组件配置中指定元数据字段来覆盖，其键为 `partitionKey`，值为所需的属性名称。

要了解有关 DynamoDB 主键/分区键的更多信息，请阅读 [AWS DynamoDB 开发者指南。](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html#HowItWorks.CoreComponents.PrimaryKey)

以下 `statestore.yaml` 文件显示了如何配置 DynamoDB 状态存储组件以使用分区键属性名称 `ContractID`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "Contracts"
  - name: partitionKey
    value: "ContractID"
```

上述组件规格假定以下 DynamoDB 表布局：

```console
{
    "Table": {
        "AttributeDefinitions": [
            {
                "AttributeName": "ContractID",
                "AttributeType": "S"
            }
        ],
        "TableName": "Contracts",
        "KeySchema": [
            {
                "AttributeName": "ContractID",
                "KeyType": "HASH"
            }
        ],
}
```

以下操作将 `"A12345"` 作为 `key` 的值传递，根据上面提供的组件规格，Dapr 运行时将把 `key` 属性名称
替换为 `ContractID`，作为发送到 DynamoDB 的分区/主键：

```shell
$ dapr run --app-id contractsprocessing --app-port ...

$ curl -X POST http://localhost:3500/v1.0/state/<store_name> \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "A12345",
          "value": "Dapr Contract"
        }
      ]'
```

以下 AWS CLI 命令显示 DynamoDB `Contracts` 表的内容：
```shell
$ aws dynamodb get-item \
    --table-name Contracts \
    --key '{"ContractID":{"S":"contractsprocessing||A12345"}}' 
{
    "Item": {
        "value": {
            "S": "Dapr Contract"
        },
        "etag": {
            "S": "....."
        },
        "ContractID": {
            "S": "contractsprocessing||A12345"
        }
    }
}
```

## 工作流限制

{{% alert title="Note" color="primary" %}}

如下所述，DynamoDB 的限制可能使其不适合生产环境。
目前无法将工作流数据从 DynamoDB 迁移到另一个状态存储，这意味着在生产环境中超过这些限制将导致工作流失败，且没有解决方法。

{{% /alert %}}

工作流越复杂（活动数量、子工作流等），它在每个状态存储事务中执行的状态操作就越多。
DynamoDB 在[单个事务中可以执行的最大操作数为 100](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)。
这意味着 DynamoDB 只能处理复杂度有限的工作流，因此并不适合所有工作流场景。
有关在工作流执行期间保存的记录数量的一般指南，可在[此处]({{% ref "workflow-architecture.md#state-store-record-count" %}})找到。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读有关配置状态存储组件的说明，请参阅[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})
- [状态管理构建块]({{% ref state-management %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
