import { Module } from "@nestjs/common";
import { StudentsService } from "./students.service";
import { StudentsResolver } from "./students.resolver";
import { AuthModule } from "../auth/auth.module";
import { ClassesModule } from "../classes/classes.module";

@Module({
  imports: [AuthModule, ClassesModule],
  providers: [StudentsResolver, StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
