import 'reflect-metadata';
import express, { Router, type Express, type Response } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../../domain/aggregates/User.ts';
import { UserRole } from '../../../domain/value-objects/UserRole.ts';
import { JoseTokenProvider } from '../../providers/JoseTokenProvider.ts';
import { AuthMiddleware } from '../middlewares/AuthMiddleware.ts';
import { errorHandler } from '../middlewares/errorHandler.ts';
import { Auth, type AuthenticatedRequest } from './Auth.ts';
import { registerControllers } from './registerControllers.ts';
import { Route } from './Route.ts';

class ExampleController {
  @Route('get', '/public')
  async publicRoute(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({ ok: true });
  }

  @Auth()
  @Route('get', '/private')
  async privateRoute(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({ auth: req.auth });
  }

  @Auth(UserRole.ADMIN)
  @Route('delete', '/admin-only')
  async adminOnly(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(204).send();
  }
}

@Auth(UserRole.ADMIN, UserRole.ATTENDANT)
class ProtectedController {
  @Route('get', '/protected/list')
  async list(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json([]);
  }

  @Auth(UserRole.MECHANIC)
  @Route('get', '/protected/mechanic')
  async mechanicOnly(_req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({ ok: true });
  }
}

const tokenProvider = new JoseTokenProvider({
  secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
  expiresInSeconds: 60,
  issuer: 'techchallenge-api',
  audience: 'techchallenge-clients',
});

function buildApp(): Express {
  const app = express();
  const router = Router();

  registerControllers(router, [new ExampleController(), new ProtectedController()], {
    authMiddleware: new AuthMiddleware(tokenProvider),
  });

  app.use(router);
  app.use(errorHandler());

  return app;
}

async function tokenFor(role: UserRole): Promise<string> {
  const issued = await tokenProvider.sign({
    sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b' as UserId,
    email: 'ana@oficina.com',
    role,
  });

  return issued.accessToken;
}

describe('@Auth', () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  it('permite rota sem @Auth sem token', async () => {
    const response = await request(app).get('/public');

    expect(response.status).toBe(200);
  });

  it('responde 401 MISSING_TOKEN quando o header Authorization nao e enviado', async () => {
    const response = await request(app).get('/private');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('responde 401 MISSING_TOKEN quando o esquema nao e Bearer', async () => {
    const response = await request(app).get('/private').set('Authorization', 'Basic YWJjOmRlZg==');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('responde 401 INVALID_TOKEN para token invalido', async () => {
    const response = await request(app).get('/private').set('Authorization', 'Bearer abc.def.ghi');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  it('injeta req.auth com o payload do token valido', async () => {
    const token = await tokenFor(UserRole.MECHANIC);

    const response = await request(app).get('/private').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.auth).toEqual({
      sub: '6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b',
      email: 'ana@oficina.com',
      role: UserRole.MECHANIC,
    });
  });

  it('aceita o esquema Bearer sem diferenciar maiusculas', async () => {
    const token = await tokenFor(UserRole.MECHANIC);

    const response = await request(app).get('/private').set('Authorization', `bearer ${token}`);

    expect(response.status).toBe(200);
  });

  it('responde 403 quando o papel do usuario nao esta entre os permitidos', async () => {
    const token = await tokenFor(UserRole.ATTENDANT);

    const response = await request(app)
      .delete('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('permite acesso quando o papel do usuario esta entre os permitidos', async () => {
    const token = await tokenFor(UserRole.ADMIN);

    const response = await request(app)
      .delete('/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);
  });

  it('aplica @Auth de classe em todas as rotas do controller', async () => {
    const withoutToken = await request(app).get('/protected/list');
    const attendantToken = await tokenFor(UserRole.ATTENDANT);
    const withToken = await request(app)
      .get('/protected/list')
      .set('Authorization', `Bearer ${attendantToken}`);

    expect(withoutToken.status).toBe(401);
    expect(withToken.status).toBe(200);
  });

  it('prioriza @Auth do metodo sobre o @Auth da classe', async () => {
    const adminToken = await tokenFor(UserRole.ADMIN);
    const mechanicToken = await tokenFor(UserRole.MECHANIC);

    const asAdmin = await request(app)
      .get('/protected/mechanic')
      .set('Authorization', `Bearer ${adminToken}`);
    const asMechanic = await request(app)
      .get('/protected/mechanic')
      .set('Authorization', `Bearer ${mechanicToken}`);

    expect(asAdmin.status).toBe(403);
    expect(asMechanic.status).toBe(200);
  });
});
