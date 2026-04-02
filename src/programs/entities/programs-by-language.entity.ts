import { ObjectType, Field } from "@nestjs/graphql";
import { Language } from "../../common/enums";
import { Program } from "./program.entity";

@ObjectType()
export class ProgramsByLanguage {
  @Field(() => Language)
  language: Language;

  @Field(() => [Program])
  programs: Program[];
}
