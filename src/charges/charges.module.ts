import { Module } from "@nestjs/common";
import { ChargesService } from "./charges.service";
import { ChargesResolver } from "./charges.resolver";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  providers: [ChargesResolver, ChargesService, PrismaService],
})
export class ChargesModule {}
