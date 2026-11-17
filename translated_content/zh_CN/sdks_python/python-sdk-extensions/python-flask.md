---
type: docs
title: "Dapr Python SDK 与 Flask 集成"
linkTitle: "Flask"
weight: 300000
description: 如何使用 Flask 扩展创建 Dapr Python virtual Actor
---

Dapr Python SDK 通过 `dapr.ext.flask` 扩展提供与 Flask 的集成。

## 安装

你可以使用以下命令下载并安装 Dapr Flask 扩展：

{{< tabpane text=true >}}

{{% tab header="Stable（稳定）" %}}
```bash
pip install "dapr[flask]"
```
{{% /tab %}}

{{% tab header="Development" %}}
{{% alert title="注意" color="warning" %}}
开发版本将包含与 Dapr runtime 预发布版本兼容的功能和行为。只有打过标签的发布版本会发布到 PyPI，因此请从 GitHub 仓库安装开发版本。在安装之前，请先卸载所有 Stable（稳定）版本的 Python SDK。
{{% /alert %}}

```bash
pip install "dapr[flask] @ git+https://github.com/dapr/python-sdk.git@main"
```
{{% /tab %}}

{{< /tabpane >}}

从 Dapr 1.19 开始，该扩展是 `dapr` 包的可选依赖（extra）。`flask-dapr` 包不再发布。如果你之前安装过它，请按照[升级步骤]({{% ref "python#install-extensions" %}})迁移到该可选依赖。

{{% alert title="注意" color="primary" %}}
`flask_dapr` 导入路径仍然可用，它只是一个轻量的兼容层（shim），但会发出 `FutureWarning`。请改为从 `dapr.ext.flask` 导入。
{{% /alert %}}

## 示例

```python
from flask import Flask
from dapr.ext.flask import DaprActor

from dapr.conf import settings
from demo_actor import DemoActor

app = Flask(f'{DemoActor.__name__}Service')

# 启用 DaprActor Flask 扩展
actor = DaprActor(app)

# 注册 DemoActor
actor.register_actor(DemoActor)

# 设置方法路由
@app.route('/GetMyData', methods=['GET'])
def get_my_data():
    return {'message': 'myData'}, 200

# 运行应用
if __name__ == '__main__':
    app.run(port=settings.HTTP_APP_PORT)
```
