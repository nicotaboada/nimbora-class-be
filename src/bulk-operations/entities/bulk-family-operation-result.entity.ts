import { ObjectType, Field, Int } from "@nestjs/graphql";
import {
  BulkFamilyInvoiceResult,
  BulkItemStatus,
} from "../types/bulk-invoice.types";

@ObjectType()
export class BulkFamilyOperationResult implements BulkFamilyInvoiceResult {
  @Field()
  familyId: string;

  @Field()
  familyName: string;

  @Field()
  status: BulkItemStatus;

  @Field({ nullable: true })
  invoiceId?: string;

  @Field(() => Int, { nullable: true })
  studentCount?: number;

  @Field(() => Int, { nullable: true })
  totalLines?: number;

  @Field({ nullable: true })
  error?: string;
}
