import { registerEnumType } from "@nestjs/graphql";

export enum ImportEntityType {
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  FAMILY = "FAMILY",
}

registerEnumType(ImportEntityType, {
  name: "ImportEntityType",
  description: "Tipo de entidad a importar desde archivo",
});
