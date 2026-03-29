import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../common/dto/paginated.output";
import { InvoiceBulkAfipPreview } from "../entities/invoice-bulk-afip-preview.entity";

@ObjectType()
export class PaginatedInvoicesForBulkAfip extends Paginated(
  InvoiceBulkAfipPreview,
) {}
