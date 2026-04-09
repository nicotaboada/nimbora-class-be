import { Gender, DocumentType, Status } from "../enums";
import { GuardianRelationship } from "../../families/enums/guardian-relationship.enum";

export const genderMap: Record<string, Gender | undefined> = {
  MALE: Gender.MALE,
  FEMALE: Gender.FEMALE,
  OTHER: Gender.OTHER,
  NOT_SPECIFIED: Gender.NOT_SPECIFIED,
};

export const documentTypeMap: Record<string, DocumentType | undefined> = {
  DNI: DocumentType.DNI,
  PASSPORT: DocumentType.PASSPORT,
  NIE: DocumentType.NIE,
  OTHER: DocumentType.OTHER,
};

export const statusMap: Record<string, Status> = {
  ENABLED: Status.ENABLED,
  DISABLED: Status.DISABLED,
};

export const guardianRelationshipMap: Record<
  string,
  GuardianRelationship | undefined
> = {
  PADRE: GuardianRelationship.PADRE,
  MADRE: GuardianRelationship.MADRE,
  ABUELO: GuardianRelationship.ABUELO,
  ABUELA: GuardianRelationship.ABUELA,
  TIO: GuardianRelationship.TIO,
  TIA: GuardianRelationship.TIA,
  TUTOR: GuardianRelationship.TUTOR,
  OTRO: GuardianRelationship.OTRO,
};
