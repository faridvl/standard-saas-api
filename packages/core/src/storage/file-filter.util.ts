import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export function imageAndPdfFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Formato no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, GIF) y PDF.',
      ),
      false,
    );
  }
}
