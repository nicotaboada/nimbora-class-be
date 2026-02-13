import { Module, forwardRef } from "@nestjs/common";
import { AcademiesService } from "./academies.service";
import { AcademiesResolver } from "./academies.resolver";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsModule } from "../feature-flags/feature-flags.module";

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => FeatureFlagsModule)],
  providers: [AcademiesResolver, AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
