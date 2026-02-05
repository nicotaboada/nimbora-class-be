import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext<{ req: { user: User } }>().req;
    return request.user;
  },
);
