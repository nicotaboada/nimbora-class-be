import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProgramInput } from "./dto/create-program.input";
import { Program } from "./entities/program.entity";
import { ProgramsByLanguage } from "./entities/programs-by-language.entity";
import { mapProgramToEntity } from "./utils/program-mapper.util";
import { assertOwnership } from "../common/utils/tenant-validation";
import { Language } from "../common/enums";

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async create(
    input: CreateProgramInput,
    academyId: string,
  ): Promise<Program> {
    const program = await this.prisma.program.create({
      data: {
        ...input,
        academyId,
      },
    });
    return mapProgramToEntity(program);
  }

  async findOne(id: string, academyId: string): Promise<Program> {
    const program = await this.prisma.program.findUnique({
      where: { id },
    });

    assertOwnership(program, academyId, "Programa");

    return mapProgramToEntity(program);
  }

  async findAll(academyId: string): Promise<ProgramsByLanguage[]> {
    const programs = await this.prisma.program.findMany({
      where: { academyId },
      orderBy: { name: "asc" },
    });

    const grouped = new Map<Language, Program[]>();

    for (const p of programs) {
      const lang = p.language as Language;
      if (!grouped.has(lang)) {
        grouped.set(lang, []);
      }
      grouped.get(lang)!.push(mapProgramToEntity(p));
    }

    return Array.from(grouped.entries()).map(([language, items]) => ({
      language,
      programs: items,
    }));
  }
}
