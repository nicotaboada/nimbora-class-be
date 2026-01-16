import { Resolver, Mutation, Query, Args } from "@nestjs/graphql";
import { ChargesService } from "./charges.service";
import { Charge } from "./entities/charge.entity";
import { AssignFeeOutput } from "./dto/assign-fee.output";
import { AssignFeeInput } from "./dto/assign-fee.input";
import { ChargesForInvoiceInput } from "./dto/charges-for-invoice.input";
import { ChargesForInvoiceOutput } from "./dto/charges-for-invoice.output";

@Resolver(() => Charge)
export class ChargesResolver {
  constructor(private readonly chargesService: ChargesService) {}

  /**
   * Asigna un fee a múltiples estudiantes, generando todos los cargos correspondientes.
   */
  @Mutation(() => AssignFeeOutput, {
    description: "Asigna un fee a estudiantes",
  })
  async assignFeeToStudents(
    @Args("input") input: AssignFeeInput,
  ): Promise<AssignFeeOutput> {
    return this.chargesService.assignFeeToStudents(input);
  }

  /**
   * Obtiene los IDs de estudiantes que ya tienen un fee asignado.
   */
  @Query(() => [String], {
    description: "Obtiene IDs de estudiantes que ya tienen un fee asignado",
  })
  async studentIdsWithFee(@Args("feeId") feeId: string): Promise<string[]> {
    return this.chargesService.findStudentIdsWithFee(feeId);
  }

  /**
   * Obtiene todos los cargos de un estudiante.
   */
  @Query(() => [Charge], {
    description: "Obtiene todos los cargos de un estudiante",
  })
  async chargesByStudent(
    @Args("studentId") studentId: string,
  ): Promise<Charge[]> {
    return this.chargesService.findByStudent(studentId);
  }

  /**
   * Obtiene los cargos de un estudiante para un mes de invoice.
   * Opcionalmente incluye cargos vencidos de meses anteriores.
   */
  @Query(() => ChargesForInvoiceOutput, {
    description: "Obtiene cargos para facturación de un estudiante",
  })
  async chargesForInvoice(
    @Args("input") input: ChargesForInvoiceInput,
  ): Promise<ChargesForInvoiceOutput> {
    return await this.chargesService.findChargesForInvoice(input);
  }
}
