import { Module } from "@nestjs/common";
import { ProgramsService } from "./programs.service";
import { ProgramsResolver } from "./programs.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [ProgramsResolver, ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
