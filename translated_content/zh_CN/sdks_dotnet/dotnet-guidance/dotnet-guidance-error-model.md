---
type: docs
title: "Dapr .NET SDK 中的错误模型"
linkTitle: "错误模型"
weight: 85100
description: 了解如何使用 .NET SDK 中更丰富的错误模型。
---

Dapr .NET SDK 支持 Dapr 运行时实现的更丰富的错误模型。该模型为应用程序提供了一种使用额外上下文来丰富错误的方式，
使应用程序的使用者能够更好地理解问题并更快地解决它。你可以在[这里](https://google.aip.dev/193)阅读有关更丰富的错误模型的更多信息，并可以在[这里](https://github.com/googleapis/googleapis/blob/master/google/rpc/error_details.proto")找到实现这些错误的 Dapr proto 文件。

Dapr .NET SDK 实现了 Dapr 运行时支持的所有详细信息，这些详细信息位于 `Dapr.Common.Exceptions` 命名空间中，并可通过
`DaprException` 扩展方法 `TryGetExtendedErrorInfo` 访问。目前，仅当详细信息存在时，才支持从 `RpcException` 中提取这些详细信息。

```csharp
// ExtendedErrorInfo 的使用示例

try
{
    // 使用 Dapr 客户端执行某些会抛出 DaprException 的操作。
}
catch (DaprException daprEx)
{
    if (daprEx.TryGetExtendedErrorInfo(out DaprExtendedErrorInfo errorInfo))
    {
        Console.WriteLine(errorInfo.Code);
        Console.WriteLine(errorInfo.Message);

        foreach (DaprExtendedErrorDetail detail in errorInfo.Details)
        {
            Console.WriteLine(detail.ErrorType);
            switch (detail.ErrorType)
            {
                case ExtendedErrorType.ErrorInfo:
                    Console.WriteLine(detail.Reason);
                    Console.WriteLine(detail.Domain);
                    break;
                default:
                    Console.WriteLine(detail.TypeUrl);
                    break;
            }
        }
    }
}
```

## DaprExtendedErrorInfo

包含与错误关联的 `Code`（状态代码）和 `Message`（错误消息），二者从内部的 `RpcException` 解析而来。
还包含从异常详细信息中解析出的 `DaprExtendedErrorDetails` 集合。

## DaprExtendedErrorDetail

所有详细信息都实现了抽象类 `DaprExtendedErrorDetail`，并具有关联的 `DaprExtendedErrorType`。

1. [RetryInfo](#retryinfo)

2. [DebugInfo](#debuginfo)

3. [QuotaFailure](#quotafailure)

4. [PreconditionFailure](#preconditionfailure)

5. [RequestInfo](#requestinfo)

6. [LocalizedMessage](#localizedmessage)

7. [BadRequest](#badrequest)

8. [ErrorInfo](#errorinfo)

9. [Help](#help)

10. [ResourceInfo](#resourceinfo)

11. [Unknown](#unknown)

## RetryInfo

告知客户端在重试前应等待多长时间的信息。提供一个 `DaprRetryDelay`，其属性为 `Second`（秒偏移量）和 `Nano`（纳秒偏移量）。

## DebugInfo

服务器提供的调试信息。包含 `StackEntries`（包含堆栈跟踪的字符串集合）和 `Detail`（进一步的调试信息）。

## QuotaFailure

与可能已达到的配额相关的信息，例如某个 API 的每日使用限制。它有一个属性 `Violations`，即 `DaprQuotaFailureViolation` 的集合，每个元素包含 `Subject`（请求的主题）和 `Description`（有关失败的更多信息）。

## PreconditionFailure

告知客户端某个必需的前提条件未满足的信息。它有一个属性 `Violations`，即 `DaprPreconditionFailureViolation` 的集合，每个元素包含 `Subject`（发生前提条件失败的主题，例如 “Azure”）、`Type`（前提条件类型的表示，例如 “TermsOfService”）和 `Description`（进一步的描述，例如 “ToS must be accepted.”）。

## RequestInfo

服务器返回的信息，服务器可以借此标识客户端的请求。包含 `RequestId` 和 `ServingData` 属性：`RequestId` 是服务器可以解释的某个字符串（例如 UID），`ServingData` 是构成该请求一部分的任意数据。

## LocalizedMessage

包含一条本地化消息及其区域设置。包含 `Locale`（区域设置，例如 “en-US”）和 `Message`（本地化消息）。

## BadRequest

描述有问题的请求字段。包含 `DaprBadRequestDetailFieldViolation` 集合，每个元素包含 `Field`（请求中有问题的字段，例如 'first_name'）和 `Description`（详细说明原因的更多信息，例如 “first_name cannot contain special characters”）。

## ErrorInfo

详细说明错误的原因。包含三个属性：`Reason`（错误原因，应采用 UPPER_SNAKE_CASE 形式，例如 DAPR_INVALID_KEY）、`Domain`（错误所属的域，例如 'dapr.io'）和 `Metadata`，一个包含更多信息的键/值集合。

## Help

为客户端提供进一步研究该问题的资源。包含 `DaprHelpDetailLink` 集合，每个元素提供 `Url`（帮助或文档的 URL）和 `Description`（该链接所提供内容的描述）。

## ResourceInfo

提供与所访问资源相关的信息。提供三个属性：`ResourceType`（所访问资源的类型，例如 “Azure service bus”）、`ResourceName`（资源名称，例如 “my-configured-service-bus”）、`Owner`（资源的所有者，例如 “subscriptionowner@dapr.io”）和 `Description`（与错误相关的资源的更多信息，例如 “missing permissions to use this resource”）。

## Unknown

当详细信息的类型 URL 无法映射到正确的 `DaprExtendedErrorDetail` 实现时返回。提供一个属性 `TypeUrl`（无法解析的类型 URL，例如 “type.googleapis.com/Google.rpc.UnrecognizedType”）。
