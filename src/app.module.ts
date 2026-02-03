import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import * as path from "node:path";
import { PrismaService } from "./prisma/prisma.service";
import { StudentsModule } from "./students/students.module";
import { FeesModule } from "./fees/fees.module";
import { ChargesModule } from "./charges/charges.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { CreditsModule } from "./credits/credits.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: path.join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      introspection: true,
    }),
    StudentsModule,
    FeesModule,
    ChargesModule,
    InvoicesModule,
    PaymentsModule,
    CreditsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
