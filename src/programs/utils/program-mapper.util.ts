import { Program as PrismaProgram } from "@prisma/client";
import { Program } from "../entities/program.entity";
import { Language, Status } from "../../common/enums";

const statusMap: Record<string, Status> = {
  ENABLED: Status.ENABLED,
  DISABLED: Status.DISABLED,
};

const languageMap: Record<string, Language> = {
  ENGLISH: Language.ENGLISH,
  SPANISH: Language.SPANISH,
  FRENCH: Language.FRENCH,
  ITALIAN: Language.ITALIAN,
  PORTUGUESE: Language.PORTUGUESE,
};

export function mapProgramToEntity(p: PrismaProgram): Program {
  return {
    id: p.id,
    academyId: p.academyId,
    name: p.name,
    language: languageMap[p.language],
    description: p.description ?? undefined,
    status: statusMap[p.status] || Status.ENABLED,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
