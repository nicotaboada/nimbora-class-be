import { Resolver, Query, Args, ID, Int } from "@nestjs/graphql";
import { CreditsService } from "./credits.service";
import { StudentCredit } from "./entities/student-credit.entity";

@Resolver(() => StudentCredit)
export class CreditsResolver {
  constructor(private readonly creditsService: CreditsService) {}

  /**
   * Lista todos los créditos de un estudiante.
   */
  @Query(() => [StudentCredit], {
    name: "studentCredits",
    description: "Lista los créditos de un estudiante",
  })
  async findByStudent(
    @Args("studentId", { type: () => ID }) studentId: string,
  ): Promise<StudentCredit[]> {
    return this.creditsService.findByStudent(studentId);
  }

  /**
   * Obtiene el balance total de créditos disponibles de un estudiante.
   */
  @Query(() => Int, {
    name: "studentCreditBalance",
    description: "Suma de créditos disponibles de un estudiante (en centavos)",
  })
  async getCreditBalance(
    @Args("studentId", { type: () => ID }) studentId: string,
  ): Promise<number> {
    return this.creditsService.getStudentCreditBalance(studentId);
  }
}
