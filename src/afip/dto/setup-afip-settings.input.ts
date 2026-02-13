import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";
import { AcademyTaxStatus } from "../entities/academy-afip-settings.entity";

@InputType()
export class SetupAfipSettingsInput {
  @Field({ description: "CUIT de la academy (con o sin guiones)" })
  @IsString()
  @IsNotEmpty()
  cuit: string;

  @Field(() => AcademyTaxStatus, {
    description: "Condición impositiva de la academy",
  })
  @IsNotEmpty()
  taxStatus: AcademyTaxStatus;
}
