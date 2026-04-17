import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ImportValidationError } from "./import-validation-error.entity";

@ObjectType()
export class ImportValidationResult {
  @Field(() => Int)
  totalRows: number;

  @Field(() => Int)
  validRows: number;

  @Field(() => Int)
  invalidRows: number;

  @Field(() => [ImportValidationError])
  errors: ImportValidationError[];
}
