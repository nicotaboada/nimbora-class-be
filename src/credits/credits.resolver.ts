import { Resolver, Query, Args, ID, Int } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { CreditsService } from "./credits.service";
import { StudentCredit } from "./entities/student-credit.entity";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@Resolver(() => StudentCredit)
@UseGuards(SupabaseAuthGuard)
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
    @CurrentUser() user: User,
  ): Promise<StudentCredit[]> {
    return this.creditsService.findByStudent(studentId, user.academyId);
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
    @CurrentUser() user: User,
  ): Promise<number> {
    return this.creditsService.getStudentCreditBalance(
      studentId,
      user.academyId,
    );
  }
}
