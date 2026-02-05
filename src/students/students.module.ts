import { Module } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { StudentsResolver } from "./students.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [StudentsResolver, StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
