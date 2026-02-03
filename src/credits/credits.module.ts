import { Module } from "@nestjs/common";
import { CreditsService } from "./credits.service";
import { CreditsResolver } from "./credits.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [CreditsService, CreditsResolver, PrismaService],
  exports: [CreditsService],
})
export class CreditsModule {}
