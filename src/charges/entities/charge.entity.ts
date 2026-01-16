import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ChargeStatus } from "../enums/charge-status.enum";

@ObjectType()
export class Charge {
  @Field()
  id: string;

  @Field()
  feeId: string;

  @Field()
  studentId: string;

  @Field(() => Int, {
    description: "Monto en centavos (snapshot del Fee.cost)",
  })
  amount: number;

  @Field({ description: "Mes al que pertenece el cargo (formato YYYY-MM)" })
  periodMonth: string;

  @Field(() => Int, { description: "Número de cuota (1, 2, 3... N)" })
  installmentNumber: number;

  @Field({ description: "Fecha de emisión del cargo" })
  issueDate: Date;

  @Field({ description: "Fecha de vencimiento del cargo" })
  dueDate: Date;

  @Field(() => ChargeStatus)
  status: ChargeStatus;

  @Field({
    description:
      "Indica si el cargo está vencido (dueDate < hoy y status === PENDING)",
  })
  isOverdue: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
