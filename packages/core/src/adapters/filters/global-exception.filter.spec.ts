import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

interface ErrorBody {
  success: boolean;
  statusCode: number;
  message: string;
  details: unknown;
  timestamp: string;
  code?: string;
}

function run(exception: unknown): { status: number; body: ErrorBody } {
  const json = jest.fn<(body: ErrorBody) => void>();
  const status = jest.fn<(code: number) => { json: typeof json }>().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/test', method: 'POST', ip: '127.0.0.1' }),
    }),
  } as unknown as ArgumentsHost;

  new GlobalExceptionFilter().catch(exception, host);

  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('GlobalExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('incluye code de primer nivel cuando la HttpException lo trae', () => {
    const { status, body } = run(
      new HttpException({ message: 'Falta el equipo', code: 'EQUIPMENT_REQUIRED' }, 400),
    );

    expect(status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Falta el equipo',
      details: null,
      code: 'EQUIPMENT_REQUIRED',
    });
  });

  it('no agrega el campo code si la excepción no lo trae', () => {
    const { status, body } = run(new BadRequestException('Dato inválido'));

    expect(status).toBe(400);
    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Dato inválido',
      details: null,
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('incluye code en el 409 de PATIENT_ALREADY_PRIORITY', () => {
    const { status, body } = run(
      new ConflictException({
        message: 'El paciente ya está marcado como prioridad',
        code: 'PATIENT_ALREADY_PRIORITY',
      }),
    );

    expect(status).toBe(HttpStatus.CONFLICT);
    expect(body.code).toBe('PATIENT_ALREADY_PRIORITY');
    expect(body.message).toBe('El paciente ya está marcado como prioridad');
  });

  it('un error no HTTP responde 500 sin code', () => {
    const { status, body } = run(new Error('boom'));

    expect(status).toBe(500);
    expect(body).not.toHaveProperty('code');
  });
});
