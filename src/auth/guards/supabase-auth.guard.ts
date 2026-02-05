import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { UsersService } from "../../users/users.service";
import { SupabaseService } from "../supabase.service";
import { User } from "../../users/entities/user.entity";

interface AuthenticatedRequest extends Request {
  headers: Headers & { authorization?: string };
  user?: User;
  academyId?: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext<{ req: AuthenticatedRequest }>().req;

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    // 1. Validar el token con JWKS (claves públicas cacheadas)
    const supabaseUser = await this.supabaseService.validateToken(token);

    if (!supabaseUser) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // 2. Buscar el usuario en nuestra base de datos
    const user = await this.usersService.findBySupabaseId(supabaseUser.id);

    if (!user) {
      throw new UnauthorizedException("User not registered in the system");
    }

    // 3. Inyectar user y academyId en el request context
    request.user = user;
    request.academyId = user.academyId;

    return true;
  }
}
