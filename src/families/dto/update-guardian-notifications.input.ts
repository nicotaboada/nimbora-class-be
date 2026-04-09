import { InputType, Field } from "@nestjs/graphql";
import { IsUUID, IsBoolean } from "class-validator";

@InputType()
export class UpdateGuardianNotificationsInput {
  @Field()
  @IsUUID()
  guardianId: string;

  @Field()
  @IsBoolean()
  emailNotifications: boolean;
}
