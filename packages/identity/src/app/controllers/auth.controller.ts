// import { Controller, Post, Body } from '@nestjs/common';
// import { RegisterOwnerUseCase } from '../../domain/use-cases/create-owner.use-case';
// import { RegisterClinicSchema } from '../dtos/register-clinic.schema';
// import { SchemaValidator } from '@project/core';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly registerOwnerUseCase: RegisterOwnerUseCase) {}

//   @Post('register-clinic')
//   async registerClinic(@Body() body: unknown) {
//     // Validamos y tipamos en una sola línea
//     const validatedData = SchemaValidator.validate(RegisterClinicSchema, body);

//     return await this.registerOwnerUseCase.execute(validatedData);
//   }
// }
