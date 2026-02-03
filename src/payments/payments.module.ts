import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsResolver } from "./payments.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [PaymentsService, PaymentsResolver, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
