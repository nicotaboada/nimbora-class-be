import { Module, forwardRef } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersResolver } from "./users.resolver";
import { AuthModule } from "../auth/auth.module";
import { AcademiesModule } from "../academies/academies.module";

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => AcademiesModule)],
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
