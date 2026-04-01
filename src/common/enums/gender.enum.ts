import { registerEnumType } from "@nestjs/graphql";

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
  NOT_SPECIFIED = "NOT_SPECIFIED",
}

registerEnumType(Gender, {
  name: "Gender",
  description: "Género de la persona",
});
