import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { FeatureFlagsService } from "./feature-flags.service";
import { FeatureFlagsResolver } from "./feature-flags.resolver";

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  providers: [FeatureFlagsService, FeatureFlagsResolver],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
