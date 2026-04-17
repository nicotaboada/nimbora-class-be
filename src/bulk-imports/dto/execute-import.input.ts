import { InputType, Field } from "@nestjs/graphql";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ImportEntityType } from "../enums/import-entity-type.enum";

@InputType()
export class ExecuteImportInput {
  @Field(() => ImportEntityType)
  @IsEnum(ImportEntityType)
  entityType: ImportEntityType;

  @Field({ description: "Contenido del archivo XLSX en base64" })
  @IsString()
  @IsNotEmpty()
  fileBase64: string;
}
