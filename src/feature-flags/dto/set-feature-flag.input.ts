import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, IsString, IsBoolean } from "class-validator";

@InputType()
export class SetFeatureFlagInput {
  @Field({ description: "Feature key (e.g. AFIP, PAYMENTS, WHATSAPP)" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @Field({ description: "Enable or disable the feature" })
  @IsBoolean()
  enabled: boolean;
}
