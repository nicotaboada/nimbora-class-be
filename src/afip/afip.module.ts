import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";
import { AfipService } from "./afip.service";
import { AfipSettingsService } from "./afip-settings.service";
import { AfipSettingsResolver } from "./afip-settings.resolver";
import { AfipSalesPointService } from "./afip-sales-point.service";
import { AfipSalesPointResolver } from "./afip-sales-point.resolver";
import { AfipInvoiceService } from "./afip-invoice.service";
import { AfipInvoiceResolver } from "./afip-invoice.resolver";

@Module({
  imports: [PrismaModule, AuthModule, FeatureFlagsModule],
  providers: [
    AfipService,
    AfipSettingsService,
    AfipSettingsResolver,
    AfipSalesPointService,
    AfipSalesPointResolver,
    AfipInvoiceService,
    AfipInvoiceResolver,
  ],
  exports: [
    AfipService,
    AfipSettingsService,
    AfipSalesPointService,
    AfipInvoiceService,
  ],
})
export class AfipModule {}
