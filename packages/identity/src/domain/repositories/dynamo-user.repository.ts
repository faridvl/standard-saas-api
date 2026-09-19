import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class DynamoUserRepository implements UserRepository {
  private users: User[] = [];

  save(user: User): Promise<User> {
    this.users.push(user);
    return Promise.resolve(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.users.find((u) => u.email === email) || null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.find((u) => u.id.toString() === id) || null);
  }
}
