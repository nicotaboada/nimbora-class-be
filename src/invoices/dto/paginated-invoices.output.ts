import { ObjectType } from "@nestjs/graphql";
import { Invoice } from "../entities/invoice.entity";
import { Paginated } from "../../common/dto/paginated.output";

@ObjectType({ description: "Resultado paginado de facturas" })
export class PaginatedInvoices extends Paginated(Invoice) {}
