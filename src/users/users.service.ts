import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserInput } from "./dto/create-user.input";
import { UpdateUserInput } from "./dto/update-user.input";
import { User } from "./entities/user.entity";
import { UserRole } from "./enums/user-role.enum";
import { mapUserToEntity } from "./utils/user-mapper.util";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = await this.prisma.user.create({
      data: input,
    });
    return mapUserToEntity(user);
  }

  async findAll(academyId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { academyId },
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => mapUserToEntity(user));
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? mapUserToEntity(user) : null;
  }

  async findBySupabaseId(supabaseUserId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
    });
    return user ? mapUserToEntity(user) : null;
  }

  async findByAcademyAndRole(
    academyId: string,
    role: UserRole,
  ): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { academyId, role },
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => mapUserToEntity(user));
  }

  async update(input: UpdateUserInput): Promise<User> {
    const { id, ...data } = input;
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    return mapUserToEntity(user);
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.delete({
      where: { id },
    });
    return mapUserToEntity(user);
  }
}
