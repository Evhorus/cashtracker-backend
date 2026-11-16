import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';

@Injectable()
export class PaymentMethodsRepository {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly repository: Repository<PaymentMethod>,
  ) {}

  findAllForUser(userId: string) {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  findById(id: string) {
    return this.repository.findOneBy({ id });
  }

  findForUserById(userId: string, id: string) {
    return this.repository.findOneBy({ id, userId });
  }

  /** Case-insensitive: "Davivienda" and "DAVIVIENDA" are the same card. */
  findForUserByName(userId: string, name: string) {
    return this.repository
      .createQueryBuilder('method')
      .where('method.userId = :userId', { userId })
      .andWhere('LOWER(method.name) = LOWER(:name)', { name })
      .getOne();
  }

  create(data: Partial<PaymentMethod>) {
    return this.repository.save(this.repository.create(data));
  }

  update(id: string, data: Partial<PaymentMethod>) {
    return this.repository.update(id, data);
  }

  remove(method: PaymentMethod) {
    return this.repository.remove(method);
  }
}
