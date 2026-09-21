import { injectable } from 'inversify';
import type { HealthResponse } from '../dto/HealthDto.ts';

@injectable()
export class GetHealthUseCase {
  execute(): HealthResponse {
    return {
      status: 'ok',
      uptimeInSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
