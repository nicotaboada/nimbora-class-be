import { Module } from "@nestjs/common";
import { BulkOperationsService } from "./bulk-operations.service";
import { BulkOperationsResolver } from "./bulk-operations.resolver";
import { AuthModule } from "../auth/auth.module";
import { AfipModule } from "../afip/afip.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";

@Module({
  imports: [AuthModule, AfipModule, FeatureFlagsModule],
  providers: [BulkOperationsService, BulkOperationsResolver],
  exports: [BulkOperationsService],
})
export class BulkOperationsModule {}
