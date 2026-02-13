import { Resolver, Mutation, Query, Args } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ChargesService } from "./charges.service";
import { Charge } from "./entities/charge.entity";
import { AssignFeeOutput } from "./dto/assign-fee.output";
import { AssignFeeInput } from "./dto/assign-fee.input";
import { ChargesForInvoiceInput } from "./dto/charges-for-invoice.input";
import { ChargesForInvoiceOutput } from "./dto/charges-for-invoice.output";
import { StudentFeeOverview } from "./dto/student-fee-overview.output";
import { StudentFeeOverviewFilter } from "./dto/student-fee-overview-filter.input";
import { StudentFeeDetail } from "./dto/student-fee-detail.output";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => Charge)
@UseGuards(SupabaseAuthGuard)
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
    @CurrentUser() user: User,
  ): Promise<AssignFeeOutput> {
    return this.chargesService.assignFeeToStudents(input, user.academyId);
  }

  /**
   * Obtiene los IDs de estudiantes que ya tienen un fee asignado.
   */
  @Query(() => [String], {
    description: "Obtiene IDs de estudiantes que ya tienen un fee asignado",
  })
  async studentIdsWithFee(
    @Args("feeId") feeId: string,
    @CurrentUser() user: User,
  ): Promise<string[]> {
    return this.chargesService.findStudentIdsWithFee(feeId, user.academyId);
  }

  /**
   * Obtiene todos los cargos de un estudiante.
   */
  @Query(() => [Charge], {
    description: "Obtiene todos los cargos de un estudiante",
  })
  async chargesByStudent(
    @Args("studentId") studentId: string,
    @CurrentUser() user: User,
  ): Promise<Charge[]> {
    return this.chargesService.findByStudent(studentId, user.academyId);
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
    @CurrentUser() user: User,
  ): Promise<ChargesForInvoiceOutput> {
    return await this.chargesService.findChargesForInvoice(
      input,
      user.academyId,
    );
  }

  /**
   * Obtiene los cargos de un estudiante agrupados por fee, con estados computados.
   */
  @Query(() => [StudentFeeOverview], {
    name: "studentFeeOverviews",
    description:
      "Obtiene los cargos de un estudiante agrupados por fee con estados de facturación",
  })
  async getStudentFeeOverviews(
    @Args("studentId") studentId: string,
    @Args("filter", { nullable: true }) filter: StudentFeeOverviewFilter,
    @CurrentUser() user: User,
  ): Promise<StudentFeeOverview[]> {
    return await this.chargesService.getStudentFeeOverviews(
      studentId,
      user.academyId,
      filter,
    );
  }

  /**
   * Obtiene el detalle de cuotas de un fee para un estudiante (slideout).
   */
  @Query(() => StudentFeeDetail, {
    name: "studentFeeDetail",
    description:
      "Obtiene el detalle de cuotas de un fee para un estudiante",
  })
  async getStudentFeeDetail(
    @Args("studentId") studentId: string,
    @Args("feeId") feeId: string,
    @CurrentUser() user: User,
  ): Promise<StudentFeeDetail> {
    return await this.chargesService.getStudentFeeDetail(
      studentId,
      feeId,
      user.academyId,
    );
  }
}
