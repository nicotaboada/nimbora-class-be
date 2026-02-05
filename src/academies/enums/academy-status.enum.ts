import { registerEnumType } from "@nestjs/graphql";

export enum AcademyStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

registerEnumType(AcademyStatus, {
  name: "AcademyStatus",
  description: "Estado de la academia",
});
