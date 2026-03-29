---
type: docs
title: "操作指南：构建有状态服务"
linkTitle: "操作指南：构建有状态服务"
weight: 300
description: "使用状态管理与扩展的复制服务"
---

在本文中，你将学习如何使用可选的并发和一致性模型创建可水平扩展的有状态服务。使用状态管理 API 可以让开发者无需处理复杂的状态协调、冲突解决和故障处理。

## 设置状态存储

状态存储组件代表 Dapr 用于与数据库通信的资源。在本指南中，我们将使用默认的 Redis 状态存储。

### 使用 Dapr CLI

在自托管模式下运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本地机器上运行一个 Redis 状态存储，位于：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/MacOS 上，位于 `~/.dapr/components/statestore.yaml`

使用 `statestore.yaml` 组件，你可以轻松地交换底层组件，而无需更改应用程序代码。

请参阅[支持的状态存储列表]({{% ref supported-state-stores %}})。

### Kubernetes

请参阅[如何在 Kubernetes 上设置不同的状态存储]({{%ref setup-state-store%}})。

## 强一致性和最终一致性

使用强一致性时，Dapr 确保底层状态存储：

- 在数据写入所有副本后返回响应。
- 在写入或删除状态之前从法定数量获取 ACK。

对于 get 请求，Dapr 确保存储返回副本之间一致的最新数据。默认值为最终一致性，除非在状态 API 的请求中另有指定。

以下示例说明了如何使用强一致性保存、获取和删除状态。该示例使用 Python 编写，但适用于任何编程语言。

### 保存状态

```python
import requests
import json

store_name = "redis-store" # name of the state store as specified in state store component yaml file
dapr_state_url = "http://localhost:3500/v1.0/state/{}".format(store_name)
stateReq = '[{ "key": "k1", "value": "Some Data", "options": { "consistency": "strong" }}]'
response = requests.post(dapr_state_url, json=stateReq)
```

### 获取状态

```python
import requests
import json

store_name = "redis-store" # name of the state store as specified in state store component yaml file
dapr_state_url = "http://localhost:3500/v1.0/state/{}".format(store_name)
response = requests.get(dapr_state_url + "/key1", headers={"consistency":"strong"})
print(response.headers['ETag'])
```

### 删除状态

```python
import requests
import json

store_name = "redis-store" # name of the state store as specified in state store component yaml file
dapr_state_url = "http://localhost:3500/v1.0/state/{}".format(store_name)
response = requests.delete(dapr_state_url + "/key1", headers={"consistency":"strong"})
```

如果未指定 `concurrency` 选项，则默认为最后写入并发模式。

## 先写优先和后写优先

Dapr 允许开发者在处理数据存储时选择两种常见的并发模式：

- **先写优先（First-write-wins）**：适用于有多个应用程序实例同时写入同一键的情况。
- **后写优先（Last-write-wins）**：Dapr 的默认模式。

Dapr 使用版本号来确定特定键是否已更新。你可以：

1. 读取键的数据时保留版本号。
2. 在更新（如写入和删除）期间使用版本号。

如果自获取版本号以来版本信息已更改，则会抛出错误，要求你执行另一次读取以获取最新版本信息和状态。

Dapr 利用 ETag 来确定状态的版本号。ETag 从状态请求中的 `ETag` 头返回。使用 ETag，你的应用程序可以通过在 ETag 不匹配时出错来知道资源自上次检查以来已更新。

以下示例说明如何：

- 获取 ETag。
- 使用 ETag 保存状态。
- 删除状态。

以下示例使用 Python 编写，但适用于任何编程语言。

```python
import requests
import json

store_name = "redis-store" # name of the state store as specified in state store component yaml file
dapr_state_url = "http://localhost:3500/v1.0/state/{}".format(store_name)
response = requests.get(dapr_state_url + "/key1", headers={"concurrency":"first-write"})
etag = response.headers['ETag']
newState = '[{ "key": "k1", "value": "New Data", "etag": {}, "options": { "concurrency": "first-write" }}]'.format(etag)

requests.post(dapr_state_url, json=newState)
response = requests.delete(dapr_state_url + "/key1", headers={"If-Match": "{}".format(etag)})
```

### 处理版本不匹配失败

在以下示例中，你将看到当版本已更改时如何重试保存状态操作：

```python
import requests
import json

# This method saves the state and returns false if failed to save state
def save_state(data):
    try:
        store_name = "redis-store" # name of the state store as specified in state store component yaml file
        dapr_state_url = "http://localhost:3500/v1.0/state/{}".format(store_name)
        response = requests.post(dapr_state_url, json=data)
        if response.status_code == 200:
            return True
    except:
        return False
    return False

# This method gets the state and returns the response, with the ETag in the header -->
def get_state(key):
    response = requests.get("http://localhost:3500/v1.0/state/<state_store_name>/{}".format(key), headers={"concurrency":"first-write"})
    return response

# Exit when save state is successful. success will be False if there's an ETag mismatch -->
success = False
while success != True:
    response = get_state("key1")
    etag = response.headers['ETag']
    newState = '[{ "key": "key1", "value": "New Data", "etag": {}, "options": { "concurrency": "first-write" }}]'.format(etag)

    success = save_state(newState)
```
