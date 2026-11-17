1. 忠实、通顺地翻译技术文档，不增删信息，不添加译者注，语气保持书面、克制。
2. 中文使用全角标点；中英文与数字之间加一个半角空格；称读者为“你”。
3. 代码块、行内代码、URL、链接目标、命令、配置键、标识符和产品名称保持原样。
4. front matter 只翻译 profile.rules.frontmatterTranslatable 列出的字段值，其余字段保持不变。
5. Dapr 核心概念 secret(含 secrets、secret store)、store(state/config/lock/search/vector store)、pub/sub、binding(input/output binding)保留英文,不翻译;不要译成“机密”“密钥”“存储”“发布订阅”“绑定”。
6. 所有 Dapr 与 Kubernetes 自有术语(如 component、building block、actor、workflow、sidecar、scheduler、placement、reminder、timer、subscription、resiliency、middleware、metadata、namespace、manifest 等,以术语表为准)保留英文,不翻译;术语表里 note 带“人工裁决”的条目一律如此。
