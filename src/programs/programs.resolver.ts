import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ProgramsService } from "./programs.service";
import { Program } from "./entities/program.entity";
import { LanguageOption } from "./entities/language-option.entity";
import { ProgramsByLanguage } from "./entities/programs-by-language.entity";
import { CreateProgramInput } from "./dto/create-program.input";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { User } from "../users/entities/user.entity";
import { Language } from "../common/enums";

const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ENGLISH]: "English",
  [Language.SPANISH]: "Spanish",
  [Language.FRENCH]: "French",
  [Language.ITALIAN]: "Italian",
  [Language.PORTUGUESE]: "Portuguese",
};

@Resolver(() => Program)
@UseGuards(SupabaseAuthGuard)
export class ProgramsResolver {
  constructor(private readonly programsService: ProgramsService) {}

  @Query(() => [LanguageOption], { name: "languages" })
  languages(): LanguageOption[] {
    return Object.values(Language).map((code) => ({
      code,
      label: LANGUAGE_LABELS[code],
    }));
  }

  @Query(() => [ProgramsByLanguage], { name: "programs" })
  programs(@CurrentUser() user: User): Promise<ProgramsByLanguage[]> {
    return this.programsService.findAll(user.academyId);
  }

  @Mutation(() => Program)
  createProgram(
    @Args("createProgramInput") createProgramInput: CreateProgramInput,
    @CurrentUser() user: User,
  ): Promise<Program> {
    return this.programsService.create(createProgramInput, user.academyId);
  }
}
