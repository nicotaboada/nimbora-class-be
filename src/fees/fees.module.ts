import { Module } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { FeesResolver } from "./fees.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [FeesResolver, FeesService, PrismaService],
})
export class FeesModule {}
