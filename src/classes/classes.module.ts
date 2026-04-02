import { Module } from "@nestjs/common";
import { ClassesService } from "./classes.service";
import { ClassesResolver } from "./classes.resolver";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [ClassesResolver, ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
