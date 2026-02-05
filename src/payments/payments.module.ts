import { Module, forwardRef } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsResolver } from "./payments.resolver";
import { AuthModule } from "../auth/auth.module";
import { InvoicesModule } from "../invoices/invoices.module";

@Module({
  imports: [AuthModule, forwardRef(() => InvoicesModule)],
  providers: [PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
})
export class PaymentsModule {}
