import { registerEnumType } from "@nestjs/graphql";

export enum DocumentType {
  DNI = "DNI",
  PASSPORT = "PASSPORT",
  NIE = "NIE",
  OTHER = "OTHER",
}

registerEnumType(DocumentType, {
  name: "DocumentType",
  description: "Tipo de documento de identidad",
});
