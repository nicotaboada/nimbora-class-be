import { Module } from "@nestjs/common";
import { ChargesService } from "./charges.service";
import { ChargesResolver } from "./charges.resolver";
import { AuthModule } from "../auth/auth.module";
import { StudentsModule } from "../students/students.module";
import { FeesModule } from "../fees/fees.module";

@Module({
  imports: [AuthModule, StudentsModule, FeesModule],
  providers: [ChargesResolver, ChargesService],
})
export class ChargesModule {}
