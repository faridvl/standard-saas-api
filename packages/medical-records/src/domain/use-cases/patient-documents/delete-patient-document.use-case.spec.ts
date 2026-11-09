import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { DeletePatientDocumentUseCase } from './delete-patient-document.use-case';

const DOCUMENT = {
  uuid: 'doc-1',
  patientUuid: 'patient-1',
  originalName: 'informe.pdf',
  category: 'OTHER',
};

describe('DeletePatientDocumentUseCase', () => {
  let storage: { findByUuid: jest.Mock; delete: jest.Mock };
  let recordActivity: { execute: jest.Mock };

  const build = () => new DeletePatientDocumentUseCase(storage as never, recordActivity as never);

  beforeEach(() => {
    storage = {
      findByUuid: jest.fn().mockResolvedValue(DOCUMENT as never),
      delete: jest.fn().mockResolvedValue(DOCUMENT as never),
    };
    recordActivity = { execute: jest.fn() };
  });

  it('documento de la clínica: lo borra y deja la bitácora', async () => {
    const result = await build().execute('doc-1', 'tenant-1', 'actor-1');

    expect(storage.delete).toHaveBeenCalledWith('doc-1', 'tenant-1');
    expect(recordActivity.execute).toHaveBeenCalledTimes(1);
    expect(result).toBe(DOCUMENT);
  });

  it('documento inexistente o de otra clínica: 404 y no borra nada', async () => {
    storage.findByUuid.mockResolvedValue(null as never);

    await expect(build().execute('doc-1', 'tenant-2', 'actor-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.findByUuid).toHaveBeenCalledWith('doc-1', 'tenant-2');
    expect(storage.delete).not.toHaveBeenCalled();
    expect(recordActivity.execute).not.toHaveBeenCalled();
  });
});
