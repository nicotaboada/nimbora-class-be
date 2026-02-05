import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOneOffFeeInput } from "./dto/create-one-off-fee.input";
import { CreateMonthlyFeeInput } from "./dto/create-monthly-fee.input";
import { CreatePeriodicFeeInput } from "./dto/create-periodic-fee.input";
import { UpdateOneOffFeeInput } from "./dto/update-one-off-fee.input";
import { UpdateMonthlyFeeInput } from "./dto/update-monthly-fee.input";
import { UpdatePeriodicFeeInput } from "./dto/update-periodic-fee.input";
import { FeeType as PrismaFeeType, ChargeStatus } from "@prisma/client";
import { assertOwnership } from "../common/utils/tenant-validation";

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  async createOneOffFee(input: CreateOneOffFeeInput, academyId: string) {
    const fee = await this.prisma.fee.create({
      data: {
        description: input.description,
        startDate: input.startDate,
        cost: input.cost,
        academyId,
        type: PrismaFeeType.ONE_OFF,
        occurrences: 1,
        period: null,
      },
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async createMonthlyFee(input: CreateMonthlyFeeInput, academyId: string) {
    const fee = await this.prisma.fee.create({
      data: {
        description: input.description,
        startDate: input.startDate,
        cost: input.cost,
        occurrences: input.occurrences,
        academyId,
        type: PrismaFeeType.MONTHLY,
        period: null,
      },
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async createPeriodicFee(input: CreatePeriodicFeeInput, academyId: string) {
    const fee = await this.prisma.fee.create({
      data: {
        description: input.description,
        startDate: input.startDate,
        cost: input.cost,
        occurrences: input.occurrences,
        academyId,
        type: PrismaFeeType.PERIODIC,
        period: input.period,
      },
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async findOne(id: string, academyId: string) {
    const fee = await this.prisma.fee.findUnique({
      where: { id },
    });

    assertOwnership(fee, academyId, "Fee");

    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async findAll(academyId: string, page = 1, limit = 10) {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100);
    const skip = (validPage - 1) * validLimit;
    const take = validLimit;
    const [total, data] = await Promise.all([
      this.prisma.fee.count({ where: { academyId } }),
      this.prisma.fee.findMany({
        where: { academyId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const totalPages = Math.ceil(total / validLimit);
    return {
      data: data.map((fee) => {
        const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
        return { ...fee, total };
      }),
      meta: {
        total,
        page: validPage,
        limit: validLimit,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    };
  }

  async updateOneOffFee(input: UpdateOneOffFeeInput, academyId: string) {
    const { id, ...data } = input;
    await this.findOne(id, academyId);
    const fee = await this.prisma.fee.update({
      where: { id },
      data,
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async updateMonthlyFee(input: UpdateMonthlyFeeInput, academyId: string) {
    const { id, ...data } = input;
    await this.findOne(id, academyId);
    const fee = await this.prisma.fee.update({
      where: { id },
      data,
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async updatePeriodicFee(input: UpdatePeriodicFeeInput, academyId: string) {
    const { id, ...data } = input;
    await this.findOne(id, academyId);
    const fee = await this.prisma.fee.update({
      where: { id },
      data,
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  async remove(id: string, academyId: string) {
    await this.findOne(id, academyId);
    // Verificar si hay cargos INVOICED
    const invoicedCharge = await this.prisma.charge.findFirst({
      where: { feeId: id, status: ChargeStatus.INVOICED },
    });
    if (invoicedCharge) {
      throw new BadRequestException({
        message: "No se puede borrar el fee porque tiene cargos facturados",
        errorCode: "FEE_HAS_INVOICED_CHARGES",
      });
    }
    // Borrar todos los cargos del fee
    await this.prisma.charge.deleteMany({
      where: { feeId: id },
    });
    // Borrar el fee
    const fee = await this.prisma.fee.delete({
      where: { id },
    });
    const total = this.calculateTotal(fee.type, fee.cost, fee.occurrences);
    return { ...fee, total };
  }

  private calculateTotal(
    type: PrismaFeeType,
    cost: number,
    occurrences: number | null,
  ): number {
    if (type === PrismaFeeType.ONE_OFF) {
      return cost;
    }
    return cost * (occurrences ?? 1);
  }
}
