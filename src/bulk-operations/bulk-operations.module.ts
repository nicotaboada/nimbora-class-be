import { Module } from "@nestjs/common";
import { BulkOperationsService } from "./bulk-operations.service";
import { BulkOperationsResolver } from "./bulk-operations.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [BulkOperationsService, BulkOperationsResolver],
  exports: [BulkOperationsService],
})
export class BulkOperationsModule {}
