import { InputType, Field } from "@nestjs/graphql";
import { IsUUID } from "class-validator";

@InputType()
export class UpdateGuardianBillingInput {
  @Field()
  @IsUUID()
  guardianId: string;
}
