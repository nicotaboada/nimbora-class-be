import { registerEnumType } from "@nestjs/graphql";

export enum UserRole {
  ADMIN = "ADMIN",
  OWNER = "OWNER",
  STAFF = "STAFF",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
}

registerEnumType(UserRole, {
  name: "UserRole",
  description: "Rol del usuario en el sistema",
});
