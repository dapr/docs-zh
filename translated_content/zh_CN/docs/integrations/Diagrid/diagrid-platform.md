---
type: docs
title: "Diagrid 平台"
linkTitle: "Diagrid 平台"
description: "基于 Dapr 构建的持久执行平台，适用于智能体、工作流、MCP 服务器和应用"
weight: 3000
aliases:
  - /zh-hans/integrations/diagrid/catalyst/
  - /zh-hans/integrations/diagrid/diagrid-catalyst/
---

[Diagrid](https://www.diagrid.io/catalyst) 是基于开源 Dapr 构建的持久执行平台。它为智能体、工作流、MCP 服务器和应用提供持久执行、可验证执行，以及带有基于策略的访问控制的加密身份，并且可与任何智能体框架协同工作。

{{< diagram name="diagrid-platform" width="85" >}}

**持久执行**

智能体和工作流可以从故障中自动恢复，无论是简单的重启还是整个系统的完全中断，并从中断处继续执行。

**可验证执行**

已签名的工作流历史记录具有防篡改性，因此你可以证明运行过什么。

**零信任安全**

为智能体、MCP 服务器和工具签发加密身份，并在整个组织内应用基于策略的访问控制。

**框架兼容性**

与现有的智能体框架协同工作，例如 CrewAI、LangGraph、OpenAI Agents 和 Pydantic AI，支持任何语言和任何云。

**灵活的部署方式**

可选择 Diagrid Cloud（完全托管的多租户平台）、Dedicated Cloud（由 Diagrid 运营的单租户环境）、BYOC（在你自己的云中托管或自行管理），或 Enterprise Server（部署在你自己基础设施上的自托管版本，可在气隙环境中运行）。

{{< button text="了解 Diagrid 详情" link="https://www.diagrid.io/catalyst" >}}
{{< button text="对比 Dapr 与 Diagrid" link="https://docs.diagrid.io/dapr-open-source/dapr-vs-diagrid/" color="secondary" >}}
