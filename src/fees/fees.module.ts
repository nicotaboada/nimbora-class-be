import { Module } from "@nestjs/common";
import { FeesService } from "./fees.service";
import { FeesResolver } from "./fees.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [FeesResolver, FeesService],
  exports: [FeesService],
})
export class FeesModule {}
