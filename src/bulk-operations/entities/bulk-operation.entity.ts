import { ObjectType, Field, Int } from "@nestjs/graphql";
import { BulkOperationType } from "../enums/bulk-operation-type.enum";
import { BulkOperationStatus } from "../enums/bulk-operation-status.enum";
import { BulkOperationResult } from "./bulk-operation-result.entity";
import { BulkAfipResult } from "./bulk-afip-result.entity";

@ObjectType()
export class BulkOperation {
  @Field()
  id: string;

  @Field(() => BulkOperationType)
  type: BulkOperationType;

  @Field(() => BulkOperationStatus)
  status: BulkOperationStatus;

  @Field(() => Int, { description: "Total de items a procesar" })
  totalItems: number;

  @Field(() => Int, { description: "Items completados exitosamente" })
  completedItems: number;

  @Field(() => Int, { description: "Items que fallaron" })
  failedItems: number;

  @Field(() => Int, { description: "Items salteados (sin charges)" })
  skippedItems: number;

  @Field(() => [BulkOperationResult], {
    nullable: true,
    description: "Resultados de facturación interna",
  })
  results?: BulkOperationResult[];

  @Field(() => [BulkAfipResult], {
    nullable: true,
    description: "Resultados de emisión AFIP",
  })
  afipResults?: BulkAfipResult[];

  @Field({ nullable: true })
  startedAt?: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;
}
