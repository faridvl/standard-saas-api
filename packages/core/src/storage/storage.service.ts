import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = process.env.CF_ACCOUNT_ID;
    this.bucket = process.env.R2_BUCKET_NAME ?? '';
    this.publicUrl = process.env.R2_PUBLIC_URL ?? '';

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  /**
   * Sube un archivo a R2 y retorna la URL pública.
   *
   * @param api          Prefijo de la API: 'identity' | 'medical_records'
   * @param tenantId     UUID del tenant
   * @param tipo         Subcarpeta: 'logos' | 'signatures' | 'audiometrias' | etc.
   * @param file         Objeto Multer
   * @param id           UUID opcional (usuario, paciente) para subcarpeta adicional
   */
  async upload(
    api: string,
    tenantId: string,
    tipo: string,
    file: Express.Multer.File,
    id?: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const ext = extname(file.originalname);
    const baseName = file.originalname.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '-');
    const fileName = `${baseName}-${timestamp}${ext}`;

    const folder = id
      ? `${api}/${tenantId}/${id}/${tipo}`
      : `${api}/${tenantId}/${tipo}`;

    const key = `${folder}/${fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.publicUrl}/${key}`;
  }
}
