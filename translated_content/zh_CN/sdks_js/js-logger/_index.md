---
type: docs
title: "JavaScript SDK 中的日志记录"
linkTitle: "日志"
weight: 4000
description: 在 JavaScript SDK 中配置日志记录
---

## 简介

JavaScript SDK 内置了基于 `Console` 的日志记录器。SDK 会发出各种内部日志，以帮助用户了解事件链并排查问题。SDK 的使用者可以自定义日志的详细程度，也可以提供自己的日志记录器实现。

## 配置日志级别

日志共有五个级别，按重要性**降序排列** - `error`、`warn`、`info`、`verbose` 和 `debug`。将日志设置到某个级别意味着日志记录器将发出所有重要性不低于该级别的日志。例如，设置为 `verbose` 级别意味着 SDK 将不会发出 `debug` 级别的日志。默认日志级别为 `info`。

### Dapr Client

```js
import { CommunicationProtocolEnum, DaprClient, LogLevel } from "@dapr/dapr";

// create a client instance with log level set to verbose.
const client = new DaprClient({
  daprHost,
  daprPort,
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  logger: { level: LogLevel.Verbose },
});
```

> 有关如何使用 Client 的更多详细信息，请参阅 [JavaScript Client]({{% ref js-client %}})。

### DaprServer

```ts
import { CommunicationProtocolEnum, DaprServer, LogLevel } from "@dapr/dapr";

// create a server instance with log level set to error.
const server = new DaprServer({
  serverHost,
  serverPort,
  clientOptions: {
    daprHost,
    daprPort,
    logger: { level: LogLevel.Error },
  },
});
```

> 有关如何使用 Server 的更多详细信息，请参阅 [JavaScript Server]({{% ref js-server %}})。

## 自定义 LoggerService

JavaScript SDK 使用内置的 `Console` 进行日志记录。要使用 Winston 或 Pino 等自定义日志记录器，可以实现 `LoggerService` 接口。

### 基于 Winston 的日志记录：

创建 `LoggerService` 的新实现。

```ts
import { LoggerService } from "@dapr/dapr";
import * as winston from "winston";

export class WinstonLoggerService implements LoggerService {
  private logger;

  constructor() {
    this.logger = winston.createLogger({
      transports: [new winston.transports.Console(), new winston.transports.File({ filename: "combined.log" })],
    });
  }

  error(message: any, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams);
  }
  warn(message: any, ...optionalParams: any[]): void {
    this.logger.warn(message, ...optionalParams);
  }
  info(message: any, ...optionalParams: any[]): void {
    this.logger.info(message, ...optionalParams);
  }
  verbose(message: any, ...optionalParams: any[]): void {
    this.logger.verbose(message, ...optionalParams);
  }
  debug(message: any, ...optionalParams: any[]): void {
    this.logger.debug(message, ...optionalParams);
  }
}
```

将新实现传递给 SDK。

```ts
import { CommunicationProtocolEnum, DaprClient, LogLevel } from "@dapr/dapr";
import { WinstonLoggerService } from "./WinstonLoggerService";

const winstonLoggerService = new WinstonLoggerService();

// create a client instance with log level set to verbose and logger service as winston.
const client = new DaprClient({
  daprHost,
  daprPort,
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  logger: { level: LogLevel.Verbose, service: winstonLoggerService },
});
```
