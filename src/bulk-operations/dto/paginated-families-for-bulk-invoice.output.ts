import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../common/dto/paginated.output";
import { FamilyBulkInvoicePreview } from "../entities/family-bulk-invoice-preview.entity";

@ObjectType()
export class PaginatedFamiliesForBulkInvoice extends Paginated(
  FamilyBulkInvoicePreview,
) {}
