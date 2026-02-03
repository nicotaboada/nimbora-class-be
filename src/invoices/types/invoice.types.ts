import { InvoiceLineType } from "../enums/invoice-line-type.enum";
import { DiscountType } from "../enums/discount-type.enum";
import { Prisma } from "@prisma/client";

export interface LineDataToCreate {
  type: InvoiceLineType;
  chargeId: string | null;
  description: string;
  originalAmount: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountReason: string | null;
  finalAmount: number;
  isActive: boolean;
}

// Tipo para invoice con líneas incluidas
export type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true; payments: true };
}>;
