import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class StudentBulkInvoicePreview {
  @Field({ description: "ID del estudiante" })
  studentId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field(() => Int, {
    description: "Cantidad de charges PENDING que matchean el filtro",
  })
  chargeCount: number;

  @Field(() => Int, {
    description: "Suma total de los montos en centavos",
  })
  totalAmount: number;

  @Field(() => [String], {
    description: "IDs de los charges (para pasar a bulkCreateInvoices)",
  })
  chargeIds: string[];
}
