import { Module } from "@nestjs/common";
import { AcademiesService } from "./academies.service";
import { AcademiesResolver } from "./academies.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [AcademiesResolver, AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
