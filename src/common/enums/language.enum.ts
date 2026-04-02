import { registerEnumType } from "@nestjs/graphql";

export enum Language {
  ENGLISH = "ENGLISH",
  SPANISH = "SPANISH",
  FRENCH = "FRENCH",
  ITALIAN = "ITALIAN",
  PORTUGUESE = "PORTUGUESE",
}

registerEnumType(Language, {
  name: "Language",
  description: "Idioma del programa",
});

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ENGLISH]: "Inglés",
  [Language.SPANISH]: "Español",
  [Language.FRENCH]: "Francés",
  [Language.ITALIAN]: "Italiano",
  [Language.PORTUGUESE]: "Portugués",
};
