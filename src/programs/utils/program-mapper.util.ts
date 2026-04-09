import { Program as PrismaProgram } from "@prisma/client";
import { Program } from "../entities/program.entity";
import { Status, Language } from "../../common/enums";
import { statusMap } from "../../common/utils/enum-maps.util";

const languageMap: Record<string, Language> = {
  SPANISH: Language.SPANISH,
  ENGLISH: Language.ENGLISH,
  PORTUGUESE: Language.PORTUGUESE,
};

export function mapProgramToEntity(p: PrismaProgram): Program {
  return {
    id: p.id,
    academyId: p.academyId,
    name: p.name,
    language: languageMap[p.language] || Language.SPANISH,
    description: p.description ?? undefined,
    status: statusMap[p.status] || Status.ENABLED,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
