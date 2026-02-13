import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import * as path from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { StudentsModule } from "./students/students.module";
import { FeesModule } from "./fees/fees.module";
import { ChargesModule } from "./charges/charges.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { CreditsModule } from "./credits/credits.module";
import { AfipModule } from "./afip/afip.module";
import { BillingProfilesModule } from "./billing-profiles/billing-profiles.module";
import { FeatureFlagsModule } from "./feature-flags/feature-flags.module";
import { AcademiesModule } from "./academies/academies.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: path.join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      introspection: true,
    }),
    PrismaModule,
    AcademiesModule,
    UsersModule,
    AuthModule,
    StudentsModule,
    FeesModule,
    ChargesModule,
    InvoicesModule,
    PaymentsModule,
    CreditsModule,
    FeatureFlagsModule,
    AfipModule,
    BillingProfilesModule,
  ],
})
export class AppModule {}
