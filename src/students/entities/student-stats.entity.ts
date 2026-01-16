import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class StudentStats {
  @Field(() => Int, { description: 'Total de estudiantes en el sistema' })
  total: number;

  @Field(() => Int, { description: 'Total de estudiantes activos (ENABLED)' })
  active: number;

  @Field(() => Int, { description: 'Total de estudiantes inactivos (DISABLED)' })
  inactive: number;
}



