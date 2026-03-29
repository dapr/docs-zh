---
type: docs
title: "HashiCorp Consul"
linkTitle: "HashiCorp Consul"
description: HashiCorp Consul 名称解析组件的详细信息
---

## 配置格式

HashiCorp Consul 在 [Dapr 配置]({{% ref configuration-overview.md %}}) 中进行设置。

在配置中，添加 `nameResolution` 规范并将 `component` 字段设置为 `"consul"`。

如果您使用 Dapr 边车将服务注册到 Consul，则需要以下配置：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      selfRegister: true
```

如果 Consul 服务注册由 Dapr 外部管理，您需要确保 Dapr 到 Dapr 的内部 gRPC 端口已添加到服务元数据中的 `DAPR_PORT` 下（此键可配置），并且 Consul 服务 ID 与 Dapr 应用 ID 匹配。然后您可以省略上述配置中的 `selfRegister`。

## 行为

在 `init` 时，Consul 组件会验证与已配置（或默认）代理的连接，或者如果配置为注册服务则注册服务。名称解析接口不支持"关闭时"模式，因此在使用 Dapr 将服务注册到 Consul 时请考虑这一点，因为它不会注销服务。

该组件通过过滤健康服务来解析目标应用，并在元数据中查找 `DAPR_PORT`（键可配置）以获取 Dapr 边车端口。使用 Consul `service.meta` 而不是 `service.port`，以免干扰现有的 Consul 环境。

## 规范配置字段

配置规范固定为 Consul API 的 v1.3.0 版本

| 字段 | 必填 | 类型 | 详情 | 示例 |
|--------------|:--------:|-----:|:---------|----------|
| Client | N | [*api.Config](https://pkg.go.dev/github.com/hashicorp/consul/api@v1.3.0#Config) | 配置与 Consul 代理的客户端连接。如果为空，它将使用 sdk 默认值，在这种情况下只是地址 `127.0.0.1:8500` | `10.0.4.4:8500`
| QueryOptions | N | [*api.QueryOptions](https://pkg.go.dev/github.com/hashicorp/consul/api@v1.3.0#QueryOptions) | 配置用于解析健康服务的查询，如果为空，它将默认为 `UseCache:true` | `UseCache: false`, `Datacenter: "myDC"`
| Checks | N | [[]*api.AgentServiceCheck](https://pkg.go.dev/github.com/hashicorp/consul/api@v1.3.0#AgentServiceCheck) | 配置注册时的健康检查。如果为空，它将默认为对 Dapr 边车健康端点的单个健康检查 | 参见[示例配置](#sample-configurations)
| Tags | N | `[]string` | 配置注册服务时要包含的任何标签 | `- "dapr"`
| Meta | N | `map[string]string` | 配置注册服务时要包含的任何其他元数据 | `DAPR_METRICS_PORT: "${DAPR_METRICS_PORT}"`
| DaprPortMetaKey | N | `string` | 用于在服务解析期间从 Consul 服务元数据获取 Dapr 边车端口的键，它也将在注册期间用于在元数据中设置 Dapr 边车端口。如果为空，它将默认为 `DAPR_PORT` | `"DAPR_TO_DAPR_PORT"`
| SelfRegister | N | `bool` | 控制 Dapr 是否将服务注册到 Consul。名称解析接口不支持"关闭时"模式，因此如果使用 Dapr 将服务注册到 Consul，请考虑这一点，因为它不会注销服务。如果为空，它将默认为 `false` | `true`
| AdvancedRegistration | N | [*api.AgentServiceRegistration](https://pkg.go.dev/github.com/hashicorp/consul/api@v1.3.0#AgentServiceRegistration) | 通过配置完全控制服务注册。如果配置了该组件，它将忽略任何 Checks、Tags、Meta 和 SelfRegister 的配置。 | 参见[示例配置](#sample-configurations)

## 示例配置

### 基本配置

所需的最小配置如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
```

### 带有其他自定义的注册

启用 `SelfRegister` 后，可以自定义检查、标签和元数据

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
        address: "127.0.0.1:8500"
      selfRegister: true
      checks:
        - name: "Dapr Health Status"
          checkID: "daprHealth:${APP_ID}"
          interval: "15s"
          http: "http://${HOST_ADDRESS}:${DAPR_HTTP_PORT}/v1.0/healthz"
        - name: "Service Health Status"
          checkID: "serviceHealth:${APP_ID}"
          interval: "15s"
          http: "http://${HOST_ADDRESS}:${APP_PORT}/health"
      tags:
        - "dapr"
        - "v1"
        - "${OTHER_ENV_VARIABLE}"
      meta:
        DAPR_METRICS_PORT: "${DAPR_METRICS_PORT}"
        DAPR_PROFILE_PORT: "${DAPR_PROFILE_PORT}"
      daprPortMetaKey: "DAPR_PORT"
      queryOptions:
        useCache: true
        filter: "Checks.ServiceTags contains dapr"
```

### 高级注册

配置高级注册使您能够完全控制在注册时设置所有可能的 Consul 属性。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    configuration:
      client:
          address: "127.0.0.1:8500"
      selfRegister: false
      queryOptions:
        useCache: true
      daprPortMetaKey: "DAPR_PORT"
      advancedRegistration:
        name: "${APP_ID}"
        port: ${APP_PORT}
        address: "${HOST_ADDRESS}"
        check:
          name: "Dapr Health Status"
          checkID: "daprHealth:${APP_ID}"
          interval: "15s"
          http: "http://${HOST_ADDRESS}:${DAPR_HTTP_PORT}/v1.0/healthz"
        meta:
          DAPR_METRICS_PORT: "${DAPR_METRICS_PORT}"
          DAPR_PROFILE_PORT: "${DAPR_PROFILE_PORT}"
        tags:
          - "dapr"
```

## 设置 HashiCorp Consul
{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
HashiCorp 提供了有关如何为不同托管模型设置 Consul 的深入指南。查看[自托管指南](https://learn.hashicorp.com/collections/consul/getting-started)
{{% /tab %}}

{{% tab "Kubernetes" %}}
HashiCorp 提供了有关如何为不同托管模型设置 Consul 的深入指南。查看 [Kubernetes 指南](https://learn.hashicorp.com/collections/consul/kubernetes)
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [服务调用构建块]({{% ref service-invocation %}})
