import { registerEnumType } from "@nestjs/graphql";

export enum GuardianRelationship {
  PADRE = "PADRE",
  MADRE = "MADRE",
  ABUELO = "ABUELO",
  ABUELA = "ABUELA",
  TIO = "TIO",
  TIA = "TIA",
  TUTOR = "TUTOR",
  OTRO = "OTRO",
}

registerEnumType(GuardianRelationship, {
  name: "GuardianRelationship",
  description: "Relación del tutor con la familia",
});
