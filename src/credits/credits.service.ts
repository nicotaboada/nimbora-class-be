import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StudentsService } from "../students/students.service";
import { StudentCredit } from "./entities/student-credit.entity";
import { CreditStatus } from "@prisma/client";

@Injectable()
export class CreditsService {
  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
  ) {}

  /**
   * Obtiene todos los créditos de un estudiante.
   */
  async findByStudent(
    studentId: string,
    academyId: string,
  ): Promise<StudentCredit[]> {
    // Ownership: validar que student pertenece a la academy
    await this.studentsService.findOne(studentId, academyId);

    return this.prisma.studentCredit.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Obtiene el balance total de créditos disponibles de un estudiante.
   */
  async getStudentCreditBalance(
    studentId: string,
    academyId: string,
  ): Promise<number> {
    // Ownership: validar que student pertenece a la academy
    await this.studentsService.findOne(studentId, academyId);

    const result = await this.prisma.studentCredit.aggregate({
      where: {
        studentId,
        status: CreditStatus.AVAILABLE,
      },
      _sum: {
        availableAmount: true,
      },
    });

    return result._sum.availableAmount ?? 0;
  }
}
