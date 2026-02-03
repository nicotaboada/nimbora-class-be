import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      transactionOptions: {
        maxWait: 10_000, // 10 segundos - tiempo máximo esperando para adquirir la transacción
        timeout: 10_000, // 10 segundos - tiempo máximo de ejecución de la transacción
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
