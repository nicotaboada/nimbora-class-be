import { registerEnumType } from "@nestjs/graphql";

export enum ImportEntityType {
  STUDENT = "STUDENT",
}

registerEnumType(ImportEntityType, {
  name: "ImportEntityType",
  description: "Tipo de entidad a importar desde archivo",
});
