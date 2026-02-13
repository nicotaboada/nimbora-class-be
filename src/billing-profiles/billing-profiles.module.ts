import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { BillingProfilesService } from "./billing-profiles.service";
import { BillingProfilesResolver } from "./billing-profiles.resolver";

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [BillingProfilesService, BillingProfilesResolver],
  exports: [BillingProfilesService],
})
export class BillingProfilesModule {}
