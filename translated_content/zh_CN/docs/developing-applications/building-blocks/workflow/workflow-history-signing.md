---
type: docs
title: "workflow history signing"
linkTitle: "history signing"
weight: 9000
description: "对 workflow 执行历史记录进行加密篡改检测"
is_preview: true
---

Dapr workflow history signing 为 workflow 执行历史记录提供加密篡改检测。workflow 生命周期内产生的每个 history event，都会使用 sidecar 的 mTLS 身份（X.509 SPIFFE 可验证身份文档（SVID））进行签名，从而形成可审计的签名链；每次加载 workflow 状态时都会验证该签名链。

{{% alert title="启用签名之前：规划根 CA 生命周期" color="warning" %}}
Workflow history signing 信任你的 Dapr **根 CA**。默认情况下，Dapr 生成的自签名根证书有效期为 **一年**。如果该根证书过期，或者你轮换到使用不同私钥的新根证书，**在旧根证书下签发的所有已签名 workflow 都将无法通过验证**，并因错误类型 `SignatureVerificationFailed` 而无法加载。没有重新签名的途径。

在启用此功能之前，请决定你将采取以下哪一种措施：

1. **使用相同的根密钥续订叶证书/颁发者证书**（推荐）。现在备份 Dapr 生成的根私钥，并在每次续订时重复使用，或者
2. **使用你自己的 CA**，并安全存储由你控制的根密钥（HSM 或 secret store），在所有颁发者证书续订时重复使用该根密钥，或者
3. **在轮换到新根证书之前排空 workflow**。只运行可以在一个根 CA 有效期内完成（或清除）的 workflow，并在轮换根证书之前完成或清除所有已签名 workflow。

如果你无法在最长 workflow 的整个生命周期内保证做到其中一项，**请暂时不要启用签名**。完整指南请参阅[长时间运行的 workflow 与根 CA 过期](#长时间运行的-workflow-与根-ca-过期)。
{{% /alert %}}

## 关于 SPIFFE 可验证身份文档（SVID）

SVID 是工作负载的数字护照。每个 Dapr sidecar 都会从 Sentry 获取一个 SVID，并将其同时用于 mTLS 和 workflow history signing。

- **SPIFFE ID**：嵌入在 X.509 证书中（位于 URI Subject Alternative Name 内），格式为 `spiffe://<trust-domain>/ns/<namespace>/<app-id>`。它用于标识生成签名的工作负载。
- **加密证明**：sidecar 持有与之匹配的私钥，并使用该密钥对每批历史记录进行签名。
- **信任根**：每个 SVID 都链接到一个 Sentry CA。验证方只有在证书链链接到信任包中的某个 CA 时才会接受签名。
- **软件来源信息**（Kubernetes，Dapr 1.19+）：Sentry 会将[工作负载 Pod 的容器映像引用]({{% ref "security-concept.md#container-image-references-in-workload-certificates" %}})作为自定义 X.509 扩展写入每个 SVID。由于签名证书会与 workflow 历史记录一同持久化，因此这也扩展到[执行 workflow 的软件来源信息](#执行-workflow-的软件来源信息哪些映像执行了-workflow)。

有关 Sentry、mTLS 和信任域的背景信息，请参阅 [mTLS 设置与配置]({{% ref "mtls.md" %}})和[安全概念]({{% ref "security-concept.md" %}})。

## 概述

Dapr 中的 workflow 按一系列确定性重放步骤执行。每个步骤都会将 history event 追加到[actor state store]({{% ref "workflow-architecture.md" %}})。history signing 可确保这些 history event 在写入后未被修改、重排或删除。

启用签名后，Dapr 会：

1. 以确定性方式编组每个新 history event。
2. 计算该批事件的 SHA-256 摘要。
3. 将新摘要链接到前一个签名的摘要。
4. 使用 sidecar 的 [SPIFFE](https://spiffe.io/) X.509 私钥（SVID）对组合输入签名。
5. 将签名和签名证书与历史记录一同持久化。

每次后续加载该 workflow 状态时，Dapr 都会遍历完整的签名链，并在允许继续执行之前验证其中的每个链接。

{{< diagram workflow-signing-chain >}}

每个签名都覆盖一段连续的事件范围，并引用前一个签名的摘要，从而形成哈希链。证书表按位置索引，存储用于签名的 DER 编码 X.509 证书链。当 sidecar 的 SVID 轮换时（例如，在重启之后），系统会追加新的证书条目，后续签名则引用新的索引。

## 先决条件

history signing 要求启用 [mTLS]({{% ref "mtls.md" %}})。mTLS 提供用作签名密钥的 SPIFFE X.509 身份。没有 mTLS 时，没有可用的身份材料，签名会被静默禁用。

在使用 [Sentry 服务]({{% ref "security-concept.md" %}})的标准 Dapr 部署中，默认启用 mTLS。

## 配置

history signing 由 `WorkflowHistorySigning` 功能标志控制。默认情况下，**该功能处于禁用状态**，必须显式启用。

### 启用签名

要启用签名，请在 Dapr 配置中将功能标志设为 `true`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: my-config
spec:
  features:
    - name: WorkflowHistorySigning
      enabled: true
```

### 签名生效的条件

必须同时满足以下两个条件，签名才会执行：

| 条件 | 检查方式 |
|-----------|-------------|
| 已启用 mTLS | Sentry 服务正在运行，并且 sidecar 拥有有效的 SVID |
| 已启用 `WorkflowHistorySigning` | 已将功能标志显式设为 `true` |

如果禁用了 mTLS（没有 Sentry），无论功能标志为何值，签名器都会是 `nil`，也不会执行签名。

{{% alert title="重要" color="warning" %}}
**签名是一项单向承诺。**workflow 启用签名创建后，就必须始终在启用了签名的主机上运行。在加载先前已签名 workflow 的主机上禁用签名会导致 workflow 失败。同样，在加载先前未签名 workflow 的主机上启用签名也会导致 workflow 失败。详情请参阅[单向承诺](#单向承诺)。
{{% /alert %}}

### 作用域

签名在 sidecar 级别应用。在 Dapr 配置中启用功能标志后，**使用该配置的 sidecar 上运行的每个 workflow 都会进行签名**——不支持按 workflow 类型或实例单独选择启用。如果你只想为部分 workflow 引入签名，请在单独的 appID 下运行这些 workflow，并使用启用了该功能的配置。

### 在现有部署中启用签名

由于签名是[单向承诺](#单向承诺)，在已有未签名 workflow 正在运行的集群上启用该功能，会导致这些执行中的 workflow 无法加载。你**不**需要全新部署，但在切换功能标志之前，必须排空未签名工作。典型的发布步骤如下：

1. 停止在将启用签名的 appID 上调度新的 workflow instance。
2. 允许执行中的 workflow 自然完成，或[清除]({{% ref "howto-manage-workflow.md" %}})不需要保留的 workflow。
3. 确认这些 appID 不再有未签名的 workflow 状态。
4. 更新 Dapr 配置，将 `WorkflowHistorySigning` 设为 `true`。
5. 等待配置更改传播到 sidecar（Dapr 默认会[热重载]({{% ref "component-updates.md" %}})配置，因此无需重启；只需留出时间，让更改传播到所有 sidecar）。
6. 恢复调度。新的 workflow instance 从第一个事件开始签名。

如果无法排空执行中的 workflow，请并行运行一个启用了签名的 appID 来处理新工作，同时让原 appID 在不启用签名的情况下完成其 workflow。原 appID 中没有剩余实例后，再将其停用。

## 单向承诺

签名是每个 workflow 的永久承诺。workflow 启用签名创建后，该 workflow 的所有后续操作都必须在启用了签名的主机上执行。需遵守以下两个不变量：

1. **已签名 workflow 在未启用签名的主机上运行**：如果 workflow 的历史记录已签名，但当前主机未配置签名器（mTLS 已关闭或功能标志已禁用），加载 workflow 会失败。workflow 无法执行，实际上会被终止。

2. **未签名 workflow 在启用了签名的主机上运行**：如果 workflow 是在未启用签名的情况下创建的（功能标志已关闭），之后由启用了签名的主机加载，则加载会失败。未签名历史记录没有完整性证明，无法追溯签名。

{{% alert title="迁移指南" color="warning" %}}
在整个集群启用签名之前，请确保所有现有未签名 workflow 都已完成或清除。启用签名后，新 workflow 会进行签名，而现有未签名 workflow 将无法加载。
{{% /alert %}}

## 证书轮换

Dapr 会透明地处理证书轮换。当 sidecar 的 SVID 轮换时（例如，在重启后 Sentry 签发新的短期证书，或 SVID 自然过期时），签名系统会：

1. 检测当前证书是否与证书表中的最后一个条目不同。
2. 向表中追加新的证书条目。
3. 新签名引用新的证书索引。

以前的签名仍然有效，因为它们引用的是原始证书；该证书仍在表中，并且可根据 CA 信任锚点验证。

{{< mermaid >}}
gantt
    title Signature Certificate Usage Over Time
    dateFormat X
    axisFormat %s

    section Boot 1
    Sig 0 - Cert A : 0, 2
    Sig 1 - Cert A : 2, 4

    section Restart
    SVID rotates : milestone, 4, 0

    section Boot 2
    Sig 2 - Cert B : 4, 6
    Sig 3 - Cert B : 6, 8
{{< /mermaid >}}

Cert A 和 Cert B 都链接到同一个 Sentry CA，因此所有签名都仍然有效。

在多副本部署中，每个副本都有自己的私钥和 SVID 证书。当 workflow runtime 在副本之间迁移时（例如，由于扩缩容或重新平衡），新副本的证书会追加到表中。通过 SPIFFE 身份绑定，所有证书都会被验证为属于同一个 app ID。

{{% alert title="重要" color="warning" %}}
**证书轮换**（新的叶 SVID，相同的 CA 根证书）可以无缝完成。

完整的 **CA 轮换**（完全不同的根 CA）会导致使用旧 CA 签名的 workflow 验证失败，因为旧签名证书链无法链接到新的信任锚点。这是设计如此：如果信任根发生更改，就无法验证先前签名的数据。
{{% /alert %}}

### 长时间运行的 workflow 与根 CA 过期

这是对已签名 workflow 实际影响最大的运维考量，值得单独说明。

默认情况下，Dapr 会生成一个有效期为 **一年**的自签名根 CA。如果该根证书过期（或被使用不同私钥构建的 CA 替换），任何签名链信任旧根证书的 workflow**都将无法通过验证**。生命周期跨越 CA 轮换的长时间运行已签名 workflow 将无法加载，并以 `FAILED` 状态显示 `SignatureVerificationFailed`。

要使长时间运行的已签名 workflow 在 CA 续订期间保持正常，请采取以下任一措施：

1. **轮换叶证书/颁发者证书，但保留相同的根密钥。**这是推荐方式。Dapr CLI 支持使用 `dapr mtls renew-certificate -k --private-key <existing-root-key>` 完成此操作（参阅[续订证书]({{% ref "mtls.md#root-and-issuer-certificate-upgrade-using-cli-recommended" %}})）。现有已签名 workflow 仍可根据相同的根证书通过验证。
2. **使用你自己的 CA。**提供一个根证书，并控制其私钥且安全存储（例如，存放在你自己的 HSM 或 secret store 中）。无限期地使用相同根密钥续订叶证书/颁发者证书。参阅[使用你自己的证书]({{% ref "mtls.md#bringing-your-own-certificates" %}})。
3. **在轮换到新根证书之前排空 workflow。**如果必须轮换到全新的根密钥，请先完成或清除执行中的已签名 workflow。签名是一项单向承诺，因此无法执行“使用新根证书重新签名”操作。

{{% alert title="启用签名之前规划 CA 生命周期" color="warning" %}}
如果你的 workflow 可能持续数周或数月，**请备份根私钥**，并将根 CA 轮换视为一项有计划的“排空并轮换”操作。丢失根密钥或轮换到新生成的根证书，会永久破坏所有在旧根证书下签发的已签名 workflow 的验证能力。
{{% /alert %}}

## 签名的工作原理

### 为新事件签名

每次 workflow 执行步骤后，Dapr 都会为新追加的 history event 签名。

{{< diagram name="workflow-signing-steps" width="80" >}}

签名过程如下：

1. **确定性编组**：使用 protobuf 的确定性模式对每个新 `HistoryEvent` 进行编组，从而为相同消息生成稳定的字节序列。这些确切的字节既用于签名，也会持久化到 state store。

2. **事件摘要**：对编组后的事件批次计算 SHA-256 哈希，并为每个事件添加长度前缀（大端序 uint64），以避免拼接歧义。

3. **链式链接**：计算前一个 `HistorySignature` protobuf 消息的 SHA-256 摘要。根签名（链中的第一个签名）没有前序摘要。

4. **签名输入**：最终的签名输入为 `SHA-256(previousSignatureDigest || eventsDigest)`。

5. **加密签名**：使用 sidecar 的 SPIFFE X.509 私钥对输入进行签名。签名密钥类型由 Sentry 签发给 sidecar 的密钥决定；Dapr 支持 Ed25519、ECDSA P-256 和 RSA。你不能按 workflow 选择密钥类型：它取决于 [mTLS]({{% ref "mtls.md" %}}) 设置（从 1.18 起，Dapr 生成的密钥默认使用 Ed25519；自定义 CA 使用颁发者密钥所用的算法进行签名）。

6. **证书解析**：如果当前 SVID 证书与证书表中的最后一个条目相同，则重复使用现有索引。否则，会追加一个新条目。这会透明地处理[证书轮换](#证书轮换)。

7. **持久化**：签名、新证书条目（如果有）和 history event 都会通过一次事务性写入持久化到 state store，确保原子性。

### 加载时验证

每次加载 workflow 状态时（无论用于执行还是 metadata 查询），都会验证完整的签名链。

{{< diagram workflow-signing-verify >}}

签名链中每个签名的验证步骤如下：

| 步骤 | 检查项 | 可检测的问题 |
|------|-------|---------|
| 链式链接 | `previousSignatureDigest` 与 `SHA-256(previous signature)` 匹配 | 重排或插入签名 |
| 连续性 | 事件范围首尾相接且没有间隙 | 缺失签名 |
| 事件摘要 | 根据存储的原始字节重新计算 SHA-256 | 被篡改、插入或删除的事件 |
| 加密签名 | 使用签名证书中的公钥进行验证 | 伪造的签名 |
| 证书有效性 | 证书在最后一个已签名事件发生时有效 | 过期或回填日期的证书 |
| 信任链 | 证书链链接到受信任的 Sentry CA 根证书 | 未受信任身份进行的签名 |
| 应用身份 | 证书中的 SPIFFE ID 与 workflow 所属应用匹配 | 跨应用伪造签名 |
| 完整覆盖 | 签名覆盖从索引 0 到末尾的所有事件 | 部分未签名的历史记录 |

验证使用 state store 中的**原始字节**，而不是重新编组后的事件。这确保可以检测持久化事件中任何字节级别的修改。

### 收件箱事件验证

启用签名后，Dapr workflow runtime 会在处理收件箱事件之前对其进行验证。结果事件（`TaskCompleted`、`TaskFailed`、`ChildWorkflowInstanceCompleted`、`ChildWorkflowInstanceFailed`）必须引用已签名历史记录中实际调度的操作。引用不存在操作的事件（例如，为从未调度过的任务 ID 发送的 `TaskCompleted`）会被视为注入事件，并从收件箱中清除。这样可以防止拥有 state store 访问权限的攻击者注入伪造的 activity 或 child workflow 结果，否则这些结果会被签入历史记录链。

### child workflow 和 activity 证明

同一 workflow 的签名链只保护由 workflow 自身生成的历史记录。跨身份完成事件（在不同 SPIFFE 身份下运行的 child workflow 或 activity 向父 workflow 报告）需要有自己的加密证明。Dapr 会为每个跨身份完成事件生成证明，并在该事件进入父 workflow 的收件箱之前进行验证。

child workflow 或 activity 完成时，执行器会附加以下其中一种证明：

- `ChildCompletionAttestation`（位于 `ChildWorkflowInstanceCompleted` / `ChildWorkflowInstanceFailed` 上）。
- `ActivityCompletionAttestation`（位于 `TaskCompleted` / `TaskFailed` 上）。

每个证明都绑定到一个确定性、与语言无关的载荷：

| 字段 | 说明 |
| --- | --- |
| `parentInstanceId` + `parentTaskScheduledId` | 将证明绑定到特定调用，防止跨实例和跨任务重放。 |
| `ioDigest` | 对规范化且经过 NFC 归一化的输入和输出字节计算 SHA-256。由于编码与线路格式无关且具有规范版本，因此各 SDK 计算结果相同。 |
| `signerCertDigest` | 签名者 DER 编码 X.509 证书链的 SHA-256。证书链本身作为仅在线路上传输的伴随字段，与证明一起传输。 |
| `terminalStatus` | workflow 或 activity 的结果。对于 activity，还会绑定 activity 名称。 |

收到事件后，父 workflow 的 Dapr workflow runtime 会在将事件追加到收件箱之前运行 `verifyInboxAttestation`：

1. 证明必须存在（启用签名意味着发送方必须提供证明）。
2. 伴随证书的摘要必须与已绑定的 `signerCertDigest` 匹配。
3. 证书链必须通过 Sentry 信任锚点验证。
4. 必须对确切的证明载荷字节验证签名（接收端不会重新编组）。
5. `parentInstanceId` 必须等于接收 workflow 的 actor ID。
6. `parentTaskScheduledId` 必须能解析到已存在于已签名历史记录中的 `TaskScheduled` 或 `ChildWorkflowInstanceCreated` 事件。
7. `ioDigest` 必须等于父 workflow 调度输入与所报告输出的规范摘要。
8. `terminalStatus` 必须与外围事件类型匹配。

如果任何检查失败，接收到的完成事件都会被拒绝，workflow 会被标记为失败。验证通过后，接收方会将外部证书吸收到内容寻址的 `ext-sigcert-NNNNNN` 表中，因此后续每次完成事件都不必重新验证同一个签名者。每个 workflow instance 的信任链验证结果也会在该实例的整个生命周期内缓存，因此 workflow 反复调用同一个外部签名者时，只需支付一次信任链验证开销。

### 传播血缘的验证

当 workflow 的历史记录作为 `IncomingHistory`，通过 `PropagateLineage` 转发到另一个 workflow 时（通常是跨应用的多跳子调用），接收 workflow 需要验证转发的内容。由于传播的字节不会成为接收方自身已签名 `History` 的一部分，因此会在派发时附加独立的逐块签名。

每个 `PropagatedHistoryChunk` 都包含：

- 由生成该块的应用产生的原始事件，逐字节保持不变。
- 由该块所属应用使用其当前 SPIFFE X.509 密钥生成的、新鲜的块级签名，用于签署这些事件。
- 该签名密钥的 DER 编码证书链。

摄取时会独立验证每个块：

| 检查项 | 可检测的问题 |
| --- | --- |
| 到 Sentry 信任锚点的信任链（重复使用每实例缓存） | 伪造或自签名的血缘信息 |
| 叶证书 SPIFFE ID 的应用部分与该块声明的 `appId` 匹配 | 由错误应用生成的血缘信息 |
| 逐块签名确切覆盖该块中的连续事件 | 拼接、间隙或部分遗漏 |
| 含签名但内容为空、缺少签名、缺少证书等情况 | 本会导致验证提前结束的格式错误块 |

验证通过的外部证书会被吸收到与完成证明共用的 `ext-sigcert-NNNNNN` 表中，因此下游证明查询可以通过内容寻址来查找这些证书。

## 执行 workflow 的软件来源信息：哪些映像执行了 workflow

在 Kubernetes 上，从 Dapr **1.19** 起，Sentry 签发的每个 SVID 都会将[请求 Pod 的容器映像引用]({{% ref "security-concept.md#container-image-references-in-workload-certificates" %}})作为自定义 X.509 扩展（OID `1.3.6.1.4.1.57683.100.1`）携带：daprd sidecar 映像、所有应用容器映像，以及尽力解析出的摘要。Sentry 在签发证书期间从 Kubernetes API 服务器的 Pod 对象读取这些数据；工作负载无法影响这些数据。

由于 workflow history signing 会将每个签名者的完整证书链与历史记录一同持久化，因此每个已签名 workflow 都会自动累积一份经过加密绑定的记录，准确表明**执行该 workflow 的软件**：

- `sigcert-NNNNNN` 表保存 workflow 自身执行器用来签名的证书。每个签名都引用其证书，每个证书都标明持有该私钥的 Pod 中的 daprd 和应用映像。对于任何一段历史记录事件范围，都可以确定生成这些事件的 Pod 所用的映像。
- `ext-sigcert-NNNNNN` 表保存已验证的外部身份的证书：每个经过证明的 child workflow 和 activity 完成事件，以及每个已验证的血缘块，都会引用此表中的证书。对于每个跨身份完成事件，都可以确定执行该 child workflow 或 activity 的应用所用的映像。
- 证书轮换保留了时间线。每次轮换（重启、SVID 过期、副本迁移，或发布使用新映像的版本）都会追加新的证书条目，因此长时间运行的 workflow 会保留一份有日期记录，记录在其整个生命周期内接触过该 workflow 的每个软件版本。

无需更改任何应用，即可实现以下功能：

- **CVE 响应**：扫描已存储 workflow 的证书表，查找与漏洞公告匹配的映像摘要，并准确识别受影响软件执行过的 workflow instance 及其中的事件范围。
- **审计**：在 workflow 状态的整个保留期内，仅根据 state store 回答“哪些软件处理了此 workflow、activity 或 child workflow”。
- **异常检测**：标记证书所列映像从未出现在批准的部署中的执行器。

要检查证书，请解码 `sigcert-NNNNNN` 或 `ext-sigcert-NNNNNN` 条目中的任意证书（protobuf `SigningCertificate`，DER 编码 X.509 链），并按照[安全概念页面]({{% ref "security-concept.md#container-image-references-in-workload-certificates" %}})中的说明读取叶证书中的扩展。

{{% alert title="保证范围" color="primary" %}}
该扩展记录了 Kubernetes 为 Pod 调度的映像，由 Sentry 在签发证书时观测到。这是用于查询和标记的软件供应链来源信息，不是运行时完整性证明或映像签名验证。
在自托管模式下，证书不携带扩展，签名和验证行为与之前完全相同：该扩展仅供参考，不属于验证检查的一部分。
{{% /alert %}}

## 验证失败时会发生什么

当签名验证失败时，Dapr 的响应取决于 workflow 是否仍由执行器托管，以及失败属于真实篡改还是主机配置不匹配。在所有情况下，原始历史记录、签名和收件箱都**不会被修改**；不可信数据会被保留，以供取证分析。

### 执行中的 workflow 遭到篡改

当 Dapr workflow runtime 加载正在运行的 workflow 并检测到篡改时，Dapr 会通过追加一个标记了已知错误类型 `DAPR_WORKFLOW_HISTORY_TAMPERED` 的**未签名终端 `ExecutionCompleted` 事件**，阻止执行器依据伪造输入采取操作。这样可以：

1. 停止后续执行：workflow 现在处于终止状态，Dapr workflow runtime 不会重放 workflow 或为其调度新任务。
2. 为客户端提供稳定、可供机器匹配的信号（`DAPR_WORKFLOW_HISTORY_TAMPERED`）。
3. 保留原始（不可信的）历史记录和签名，以便操作员检查篡改内容。

从应用的角度看，workflow 会显示为 `FAILED`；任何针对该实例调用 `GetWorkflow`（或等效 SDK 方法）的客户端，都会在失败详情中收到 `DAPR_WORKFLOW_HISTORY_TAMPERED` 错误类型。SDK 会将此错误作为与普通 workflow 失败相同的异常类型抛出，因此现有错误处理路径可以根据错误类型进行匹配，以专门检测篡改。Dapr sidecar 还会发出错误级别日志条目，指出 workflow instance 的实例 ID 和失败的具体验证检查。

`LoadWorkflowState` 会识别篡改标记，并在后续加载时跳过签名验证，因此可以读取该 workflow 并将其显示为 `FAILED`，而不是完全无法加载。workflow 及其 activity 的 reminder 会被删除，以阻止引擎无休止地重试已受损的 workflow。

篡改恢复路径仅适用于仍由执行器托管的 workflow。**在篡改发生之前已经完成的 workflow**不会受到影响：执行器无事可做；读取方（metadata 查询）会收到验证错误，并负责在读取时检测篡改。

### 配置错误

已签名历史记录与主机签名配置不匹配（已签名 workflow 由未配置签名器的主机加载，或未签名 workflow 由启用了签名的主机加载）时，系统会报告独立的 `ConfigurationError`，而不是篡改。上述篡改恢复路径不会应用于这些完整但无法加载的 workflow：其历史记录与写入时逐字节相同，因此追加篡改终止事件本身会构成破坏性修改。请修复主机配置，或清除该 workflow 以进行恢复。

该错误会在两个位置显示：加载失败时，Dapr sidecar 会记录错误级别条目，指出 workflow instance 的实例 ID 以及主机是否应配置签名器；发起 workflow metadata 查询的调用方（`GET /v1.0/workflows/<id>` 或等效 SDK）会直接在响应中收到 `ConfigurationError`，因此可以通过程序检测该错误。

### metadata 查询（API 路径）

当 workflow metadata 查询（例如 `GET /v1.0/workflows/<id>` 或 `FetchWorkflowMetadata`）遇到验证错误时，会直接向调用方返回错误。错误消息包含失败的具体原因（例如摘要不匹配、证明验证失败或证书信任失败）。

{{< diagram workflow-signing-failure >}}

### 常见失败原因

| 原因 | 发生情况 | 检测方式 |
|-------|--------------|-----------|
| 历史记录遭到篡改 | 直接在 state store 中修改了历史记录事件 | 事件摘要不匹配 |
| 事件被删除 | 从 state store 中移除了历史记录事件 | 事件数或覆盖范围不匹配 |
| 事件被插入 | 在正常 workflow 执行之外添加了事件 | 事件摘要不匹配 |
| 事件被重排 | 在 state store 中重新排列了事件 | 事件摘要不匹配 |
| 收件箱事件被注入 | 在 state store 的收件箱中写入了伪造结果 | 收件箱验证：没有匹配的已调度操作 |
| CA 更改 | Sentry CA 轮换到了全新的根证书 | 证书信任链验证失败 |
| 跨应用伪造 | 使用来自其他应用的证书进行签名 | SPIFFE 应用身份不匹配 |
| 签名损坏 | 在 state store 中修改了签名条目 | 加密签名验证失败或链式链接不匹配 |
| child workflow 或 activity 完成事件被伪造 | 注入了没有有效证明的跨身份完成事件 | 收件箱证明验证失败（缺少证明、签名错误、父 ID 或任务调度 ID 错误、ioDigest 不匹配） |
| 传播的血缘信息被篡改 | `PropagatedHistoryChunk` 被修改、替换或由错误应用签名 | 逐块签名、信任链或 SPIFFE 应用 ID 检查失败 |
| 签名已禁用（ConfigurationError） | 已签名 workflow 由未启用签名的主机加载 | “signed history but no signer is configured” |
| 对未签名 workflow 启用了签名（ConfigurationError） | 未签名 workflow 由启用了签名的主机加载 | “unsigned history events but signing is enabled” |

## state store 布局

workflow 签名数据与 workflow 状态一同存储，使用以下键前缀。所有键的作用域均限定为 workflow instance 的实例 ID。

| 键模式 | 内容 | 格式 |
|------------|---------|--------|
| `history-NNNNNN` | history event | Protobuf `HistoryEvent` |
| `signature-NNNNNN` | 签名条目 | Protobuf `HistorySignature` |
| `sigcert-NNNNNN` | 签名证书（自身 SPIFFE 身份） | Protobuf `SigningCertificate`（DER 编码 X.509 链） |
| `ext-sigcert-NNNNNN` | 从已验证的完成证明和血缘块中吸收的外部签名证书（按摘要去重） | Protobuf `SigningCertificate`（DER 编码 X.509 链） |
| `metadata` | 计数和代次 | Protobuf `WorkflowStateMetadata` |

`NNNNNN` 后缀是补零的 6 位索引（例如，`signature-000000`、`signature-000001`）。

`metadata` 条目会跟踪每种条目的数量，使加载器能够准确知道需要获取多少个键。所有写入（history event、签名、证书、metadata）都通过一次事务性状态操作持久化，以确保原子性。

## 安全属性

| 属性 | 保证 |
|----------|-----------|
| **篡改检测** | 对持久化的 history event 的任何修改都会改变事件摘要，从而导致验证失败 |
| **链完整性** | `previousSignatureDigest` 链接可防止签名被重排、插入或删除 |
| **不可否认性** | 每个签名都绑定到特定的 X.509 身份（SPIFFE SVID） |
| **应用身份绑定** | 会针对 workflow 所属的应用 ID 验证每个签名证书中的 SPIFFE ID，从而防止跨应用伪造 |
| **时间绑定** | 根据事件时间戳检查证书有效性，防止使用已过期的凭据 |
| **信任锚定** | 根据 Sentry CA 信任包验证所有签名证书 |
| **收件箱验证** | 根据已签名历史记录中的已调度操作验证 activity 和 child workflow 结果，防止注入伪造结果 |
| **跨身份证明** | child workflow 和 activity 完成事件由执行身份进行加密证明，并由父 workflow 在这些事件进入收件箱之前进行验证 |
| **血缘完整性** | 转发的 `PropagatedHistoryChunk` 会单独签名，并根据生成该块的应用的 SPIFFE 身份进行验证 |
| **不可变历史记录** | Dapr 不会修改现有 workflow 历史记录、签名或收件箱；检测到篡改时唯一的写入是一个未签名的终端 `ExecutionCompleted` 事件，其错误类型为 `DAPR_WORKFLOW_HISTORY_TAMPERED` |
| **单向承诺** | 无法为已签名 workflow 禁用签名，也无法为未签名 workflow 启用签名 |
| **软件来源信息**（Kubernetes，1.19+） | 每个持久化的签名证书都会标明执行已签名事件的 Pod 的容器映像；信息由 Sentry 从 Kubernetes Pod 对象写入，工作负载无法伪造 |

## 常见问题

### 签名会增加 workflow 执行延迟吗？

签名操作本身（SHA-256 哈希和 ECDSA/Ed25519/RSA 签名）速度很快，增加的 CPU 延迟可以忽略不计。可测量的开销来自 state store：每个 workflow 步骤现在都会在 history event 之外持久化其他条目（一个签名条目；证书轮换时还会有一个新证书条目）。这些额外条目与 history event 在同一事务批次中写入，因此它们会增加一次事务的大小，而不会增加额外的往返次数，但确实会增加每个 workflow 的载荷大小和存储占用。具体影响取决于你的 state store 定价和写入特性。

### 如果我对先前已签名的 workflow 禁用签名，会发生什么？

该 workflow 将**无法加载**。签名是[单向承诺](#单向承诺)：workflow 的历史记录一旦签名，就必须始终在启用了签名的主机上运行。这样可以防止攻击者禁用签名来绕过验证。

### 我可以为创建时未启用签名的 workflow 启用签名吗？

**不可以。**在加载未签名 workflow 历史记录的主机上启用签名会导致验证错误。未签名历史记录没有完整性证明，无法追溯签名，因为未签名写入的事件可能已遭篡改。请确保所有未签名 workflow 都已完成或清除，然后再在整个集群启用签名。

### Sentry CA 轮换期间会发生什么？

**证书轮换**（新的叶 SVID，相同的 CA 根证书）：可以无缝完成。多个证书会存储在证书表中，每个签名都引用其对应的证书。所有证书链都链接到同一个 CA。

**CA 轮换**（全新的根 CA）：签名证书由旧 CA 签发的 workflow 将无法通过验证。workflow 会以 FAILED 状态显示 `SignatureVerificationFailed`。这是有意设计的：信任根已发生更改，无法根据新的信任锚点验证先前签名的数据。有关避免此问题的运维指南，请参阅[长时间运行的 workflow 与根 CA 过期](#长时间运行的-workflow-与根-ca-过期)。

### 多副本部署呢？

同一 app ID 的每个副本都有自己的私钥和 SVID 证书。workflow runtime 在副本之间迁移时，每个副本的证书都会存储在证书表中，签名链仍然有效。通过 SPIFFE 身份绑定验证所有证书都属于同一个 app ID。

### 我能知道哪些软件执行了 workflow 吗？

**可以，在运行 Dapr 1.19+ 的 Kubernetes 上可以。**与 workflow 一同持久化的每个签名证书（包括 workflow 自身位于 `sigcert-NNNNNN` 中的证书，以及位于 `ext-sigcert-NNNNNN` 中的外部执行器证书）都会携带持有签名密钥的 Pod 的容器映像引用；该信息由 Sentry 从 Kubernetes Pod 对象写入。解码存储证书中的扩展，即可查看执行 workflow 各部分所用的 daprd 和应用映像。请参阅[软件来源信息](#执行-workflow-的软件来源信息哪些映像执行了-workflow)。

### 支持哪些 state store 后端？

history signing 适用于任何支持 actor 状态事务性 API 的 state store。签名数据作为额外的键值条目，与现有 workflow 状态一同存储。

## 相关链接

- [workflow 概述]({{% ref workflow-overview.md %}})
- [workflow 体系结构]({{% ref workflow-architecture.md %}})
- [mTLS 设置与配置]({{% ref mtls.md %}})
- [工作负载证书中的容器映像引用]({{% ref "security-concept.md#container-image-references-in-workload-certificates" %}})
- [multi-app workflow]({{% ref workflow-multi-app.md %}})
- [历史记录保留策略]({{% ref workflow-history-retention-policy.md %}})
