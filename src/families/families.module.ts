import { Module } from "@nestjs/common";
import { FamiliesResolver } from "./families.resolver";
import { FamiliesService } from "./families.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [FamiliesResolver, FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
