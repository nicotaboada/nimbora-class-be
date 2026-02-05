import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAcademyInput } from "./dto/create-academy.input";
import { UpdateAcademyInput } from "./dto/update-academy.input";
import { Academy } from "./entities/academy.entity";
import { mapAcademyToEntity } from "./utils/academy-mapper.util";

@Injectable()
export class AcademiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAcademyInput): Promise<Academy> {
    const academy = await this.prisma.academy.create({
      data: input,
    });
    return mapAcademyToEntity(academy);
  }

  async findAll(): Promise<Academy[]> {
    const academies = await this.prisma.academy.findMany({
      orderBy: { createdAt: "desc" },
    });
    return academies.map((academy) => mapAcademyToEntity(academy));
  }

  async findOne(id: string): Promise<Academy | null> {
    const academy = await this.prisma.academy.findUnique({
      where: { id },
    });
    return academy ? mapAcademyToEntity(academy) : null;
  }

  async findBySlug(slug: string): Promise<Academy | null> {
    const academy = await this.prisma.academy.findUnique({
      where: { slug },
    });
    return academy ? mapAcademyToEntity(academy) : null;
  }

  async update(input: UpdateAcademyInput): Promise<Academy> {
    const { id, ...data } = input;
    const academy = await this.prisma.academy.update({
      where: { id },
      data,
    });
    return mapAcademyToEntity(academy);
  }

  async remove(id: string): Promise<Academy> {
    const academy = await this.prisma.academy.delete({
      where: { id },
    });
    return mapAcademyToEntity(academy);
  }
}
