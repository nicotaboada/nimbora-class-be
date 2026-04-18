import { GuardianRelationship } from "../../families/enums/guardian-relationship.enum";

export const GUARDIAN_RELATIONSHIP_LABELS: Record<
  GuardianRelationship,
  string
> = {
  [GuardianRelationship.PADRE]: "Padre",
  [GuardianRelationship.MADRE]: "Madre",
  [GuardianRelationship.ABUELO]: "Abuelo",
  [GuardianRelationship.ABUELA]: "Abuela",
  [GuardianRelationship.TIO]: "Tío",
  [GuardianRelationship.TIA]: "Tía",
  [GuardianRelationship.TUTOR]: "Tutor",
  [GuardianRelationship.OTRO]: "Otro",
};

export const GUARDIAN_RELATIONSHIP_OPTIONS: GuardianRelationship[] = [
  GuardianRelationship.PADRE,
  GuardianRelationship.MADRE,
  GuardianRelationship.ABUELO,
  GuardianRelationship.ABUELA,
  GuardianRelationship.TIO,
  GuardianRelationship.TIA,
  GuardianRelationship.TUTOR,
  GuardianRelationship.OTRO,
];

const LABEL_TO_CODE = new Map<string, GuardianRelationship>(
  GUARDIAN_RELATIONSHIP_OPTIONS.map((code) => [
    GUARDIAN_RELATIONSHIP_LABELS[code],
    code,
  ]),
);

export function parseGuardianRelationshipLabel(
  raw: string,
): GuardianRelationship | null {
  return LABEL_TO_CODE.get(raw.trim()) ?? null;
}
