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
