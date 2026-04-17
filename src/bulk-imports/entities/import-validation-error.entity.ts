import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class ImportValidationError {
  @Field(() => Int, { description: "Número de fila en el archivo (1-indexed)" })
  row: number;

  @Field({ description: "Columna del archivo donde está el error" })
  column: string;

  @Field({ description: "Mensaje de error en texto plano" })
  message: string;
}
