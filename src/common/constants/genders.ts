import { Gender } from "../enums";

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: "Masculino",
  [Gender.FEMALE]: "Femenino",
  [Gender.OTHER]: "Otro",
  [Gender.NOT_SPECIFIED]: "Prefiero no decirlo",
};

export const GENDER_OPTIONS: Gender[] = [
  Gender.MALE,
  Gender.FEMALE,
  Gender.OTHER,
  Gender.NOT_SPECIFIED,
];

const LABEL_TO_CODE = new Map<string, Gender>(
  GENDER_OPTIONS.map((code) => [GENDER_LABELS[code], code]),
);

export function parseGenderLabel(raw: string): Gender | null {
  return LABEL_TO_CODE.get(raw.trim()) ?? null;
}
