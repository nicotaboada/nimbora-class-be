import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StudentCredit } from "./entities/student-credit.entity";
import { CreditStatus } from "@prisma/client";

@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene todos los créditos de un estudiante.
   */
  async findByStudent(studentId: string): Promise<StudentCredit[]> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Estudiante con ID ${studentId} no encontrado`,
      );
    }

    return this.prisma.studentCredit.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Obtiene el balance total de créditos disponibles de un estudiante.
   */
  async getStudentCreditBalance(studentId: string): Promise<number> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(
        `Estudiante con ID ${studentId} no encontrado`,
      );
    }

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
