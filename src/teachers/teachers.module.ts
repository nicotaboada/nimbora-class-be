import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { ClassesModule } from "src/classes/classes.module";
import { TeachersService } from "./teachers.service";
import { TeachersResolver } from "./teachers.resolver";

@Module({
  imports: [AuthModule, ClassesModule],
  providers: [TeachersResolver, TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
