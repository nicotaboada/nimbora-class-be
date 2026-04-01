import { registerEnumType } from "@nestjs/graphql";

export enum Status {
  ENABLED = "ENABLED",
  DISABLED = "DISABLED",
}

registerEnumType(Status, {
  name: "Status",
  description: "Estado genérico (activado/desactivado)",
});
