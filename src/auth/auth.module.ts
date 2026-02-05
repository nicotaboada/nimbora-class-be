import { Module, forwardRef } from "@nestjs/common";
import { SupabaseAuthGuard } from "./guards/supabase-auth.guard";
import { SupabaseService } from "./supabase.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [SupabaseAuthGuard, SupabaseService],
  exports: [SupabaseAuthGuard, SupabaseService, UsersModule],
})
export class AuthModule {}
