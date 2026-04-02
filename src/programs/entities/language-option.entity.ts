import { ObjectType, Field } from "@nestjs/graphql";
import { Language } from "../../common/enums";

@ObjectType()
export class LanguageOption {
  @Field(() => Language)
  code: Language;

  @Field()
  label: string;
}
