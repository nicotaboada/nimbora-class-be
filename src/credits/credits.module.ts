import { Module } from "@nestjs/common";
import { CreditsService } from "./credits.service";
import { CreditsResolver } from "./credits.resolver";
import { AuthModule } from "../auth/auth.module";
import { StudentsModule } from "../students/students.module";

@Module({
  imports: [AuthModule, StudentsModule],
  providers: [CreditsService, CreditsResolver],
  exports: [CreditsService],
})
export class CreditsModule {}
