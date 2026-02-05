import { Module } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { InvoicesResolver } from "./invoices.resolver";
import { AuthModule } from "../auth/auth.module";
import { StudentsModule } from "../students/students.module";

@Module({
  imports: [AuthModule, StudentsModule],
  providers: [InvoicesService, InvoicesResolver],
  exports: [InvoicesService],
})
export class InvoicesModule {}
