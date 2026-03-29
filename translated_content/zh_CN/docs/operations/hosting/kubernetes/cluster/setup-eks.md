---
type: docs
title: "设置 Elastic Kubernetes Service (EKS) 集群"
linkTitle: "Elastic Kubernetes Service (EKS)"
weight: 4000
description: >
  了解如何设置 EKS 集群
---

本指南将引导您完成安装 Elastic Kubernetes Service (EKS) 集群的过程。如需更多信息，请参阅[创建 Amazon EKS 集群](https://docs.aws.amazon.com/eks/latest/userguide/create-cluster.html)

## 前置条件

- 安装以下组件：
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [AWS CLI](https://aws.amazon.com/cli/)
   - [eksctl](https://eksctl.io/)
   - [现有的 VPC 和子网](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html)
   - [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)

## 部署 EKS 集群

1. 在终端中登录 AWS。

   ```bash
   aws configure
   ```

1. 创建一个名为 `cluster-config.yaml` 的新文件并添加以下内容，将 `[your_cluster_name]`、`[your_cluster_region]` 和 `[your_k8s_version]` 替换为适当的值：

    ```yaml
    apiVersion: eksctl.io/v1alpha5
    kind: ClusterConfig
    
    metadata:
      name: [your_cluster_name]
      region: [your_cluster_region]
      version: [your_k8s_version]
      tags:
        karpenter.sh/discovery: [your_cluster_name]
    
    iam:
      withOIDC: true
    
    managedNodeGroups:
      - name: mng-od-4vcpu-8gb
        desiredCapacity: 2
        minSize: 1
        maxSize: 5
        instanceType: c5.xlarge
        privateNetworking: true
    
    addons:
      - name: vpc-cni 
        attachPolicyARNs:
          - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
      - name: coredns
        version: latest 
      - name: kube-proxy
        version: latest
      - name: aws-ebs-csi-driver
        wellKnownPolicies: 
          ebsCSIController: true
    ```

1. 通过运行以下命令创建集群：

   ```bash
   eksctl create cluster -f cluster-config.yaml
   ```
   
1. 验证 kubectl 上下文：

   ```bash
   kubectl config current-context
   ```

## 添加 Dapr 的边车访问和默认存储类要求

1. 更新安全组规则以允许 EKS 集群与 Dapr 边车通信，为端口 4000 创建入站规则。

   ```bash
   aws ec2 authorize-security-group-ingress --region [your_aws_region] \
   --group-id [your_security_group] \
   --protocol tcp \
   --port 4000 \
   --source-group [your_security_group]
   ```

2. 如果您没有默认存储类，请添加一个： 

  ```bash
  kubectl patch storageclass gp2 -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
  ```

## 安装 Dapr

通过运行以下命令在集群上安装 Dapr：

```bash
dapr init -k
```

您应该看到以下响应：

```bash
⌛  Making the jump to hyperspace...
ℹ️  Note: To install Dapr using Helm, see here: https://docs.dapr.io/getting-started/install-dapr-kubernetes/#install-with-helm-advanced

ℹ️  Container images will be pulled from Docker Hub
✅  Deploying the Dapr control plane with latest version to your cluster...
✅  Deploying the Dapr dashboard with latest version to your cluster...
✅  Success! Dapr has been installed to namespace dapr-system. To verify, run `dapr status -k' in your terminal. To get started, go here: https://docs.dapr.io/getting-started
```

## 服务账户的 IAM 角色 (IRSA)

您可以为 `dapr_rbac` Helm 子图表创建的 ServiceAccounts 附加自定义注解——这对于在 AWS EKS 上启用服务账户的 IAM 角色 (IRSA) 非常有用。
这可以通过 EKS 的 IRSA 机制为 Dapr 组件启用细粒度的安全访问控制。
更新您的 Dapr Helm 值文件以包含以下 ServiceAccounts 所需的注解。

有关 AWS 身份验证的更多信息，请参阅[此处]({{% ref authenticating-aws.md %}})。

```yaml
serviceAccount:
  operator:
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/operator-role
  injector:
    annotations: {}
  placement:
    annotations: {}
  scheduler:
    annotations: {}
  sentry:
    annotations: {}
````

## 故障排除

### 访问权限

如果遇到任何访问权限问题，请确保您使用的是创建集群时所用的同一 AWS 配置文件。如需要，请使用正确的配置文件更新 kubectl 配置。更多信息请参见[此处](https://repost.aws/knowledge-center/eks-api-server-unauthorized-error)：

```bash
aws eks --region [your_aws_region] update-kubeconfig --name [your_eks_cluster_name] --profile [your_profile_name]
```

## 相关链接

- [了解更多关于 EKS 集群的信息](https://docs.aws.amazon.com/eks/latest/userguide/clusters.html)
- [了解更多关于 eksctl 的信息](https://eksctl.io/getting-started/)
- [尝试 Dapr 快速入门]({{% ref quickstarts.md %}})
- 了解如何[在您的集群上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [Kubernetes 生产环境指南]({{% ref kubernetes-production.md %}})
