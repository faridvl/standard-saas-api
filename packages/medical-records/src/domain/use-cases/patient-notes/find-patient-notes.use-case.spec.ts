import { describe, it, expect } from '@jest/globals';
import { FindPatientNotesUseCase } from './find-patient-notes.use-case';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

describe('FindPatientNotesUseCase: autores', () => {
  const notes = [
    { uuid: 'n1', authorUuid: 'u1', text: 'a' },
    { uuid: 'n2', authorUuid: '', text: 'migrada sin autor' },
    { uuid: 'n3', authorUuid: 'u-roto', text: 'c' },
  ];

  it('la lista carga aunque una nota tenga autor vacío o un autor que falla', async () => {
    const storage = { findAllByPatient: () => Promise.resolve(notes) };
    const getOrCreateUser = {
      execute: (uuid: string) => {
        if (uuid === 'u-roto') return Promise.reject(new Error('identity caído'));
        return Promise.resolve(uuid === 'u1' ? 'Dra. Ana' : null);
      },
    };
    const useCase = new FindPatientNotesUseCase(storage as never, getOrCreateUser as never);

    const result = await useCase.execute('p1', 't1');

    expect(result.map((note) => note.authorName)).toEqual(['Dra. Ana', null, null]);
    expect(result).toHaveLength(3);
  });

  it('con el caso de uso real, una nota de autor vacío no llega a identity ni a la base de usuarios', async () => {
    let identityCalls = 0;
    const userStorage = {
      findByUuid: () => Promise.reject(new Error('no debería consultarse')),
    };
    const identity = {
      getUser: () => {
        identityCalls += 1;
        return Promise.resolve(null);
      },
    };
    const getOrCreateUser = new GetOrCreateUserUseCase(userStorage as never, identity as never);
    const storage = { findAllByPatient: () => Promise.resolve([notes[1]]) };
    const useCase = new FindPatientNotesUseCase(storage as never, getOrCreateUser);

    const result = await useCase.execute('p1', 't1');

    expect(result[0].authorName).toBeNull();
    expect(identityCalls).toBe(0);
  });
});

describe('FindPatientNotesUseCase: audiometría enlazada', () => {
  it('devuelve el uuid de la audiometría en su nota y null en las demás', async () => {
    const storage = {
      findAllByPatient: () =>
        Promise.resolve([
          { uuid: 'n1', authorUuid: 'u1', audiometryEntryUuid: 'a1' },
          { uuid: 'n2', authorUuid: 'u1', audiometryEntryUuid: null },
        ]),
    };
    const getOrCreateUser = { execute: () => Promise.resolve('Dra. Ana') };
    const useCase = new FindPatientNotesUseCase(storage as never, getOrCreateUser as never);

    const result = await useCase.execute('p1', 't1');

    expect(result.map((note) => note.audiometryEntryUuid)).toEqual(['a1', null]);
  });
});
