import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "../../common/dto/paginated.output";
import { StudentBulkInvoicePreview } from "../entities/student-bulk-invoice-preview.entity";

@ObjectType()
export class PaginatedStudentsForBulkInvoice extends Paginated(
  StudentBulkInvoicePreview,
) {}
