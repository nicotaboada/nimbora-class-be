import { ObjectType, Field } from "@nestjs/graphql";

@ObjectType()
export class ImportTemplateFile {
  @Field({ description: "Nombre sugerido del archivo" })
  filename: string;

  @Field({ description: "MIME type del archivo" })
  mimeType: string;

  @Field({ description: "Contenido del archivo en base64" })
  fileBase64: string;
}
