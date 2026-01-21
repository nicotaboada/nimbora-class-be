import { Module } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { InvoicesResolver } from "./invoices.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [InvoicesService, InvoicesResolver, PrismaService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
