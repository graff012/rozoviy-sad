import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from '../../core/database/prisma.service';
import { plainToInstance } from 'class-transformer';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const { phone_number, ...orderData } = createOrderDto;

    const order = await this.prismaService.order.create({
      data: {
        ...orderData,
        phone_number,
      },
    });

    return { order };
  }

  async findAll() {
    const orders = await this.prismaService.order.findMany({
      include: {
        items: {
          include: {
            flower: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!orders) return [];

    return { orders };
  }

  async findOne(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
    });

    if (!order) throw new NotFoundException('order not found');

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) throw new NotFoundException('order not found');

    const updateData: any = {};

    if (updateOrderDto.name !== undefined)
      updateData.name = updateOrderDto.name;
    if (updateOrderDto.phone_number !== undefined)
      updateData.phone_number = updateOrderDto.phone_number;
    if (updateOrderDto.address !== undefined)
      updateData.address = updateOrderDto.address;
    if (updateOrderDto.telegram_username !== undefined)
      updateData.telegram_username = updateOrderDto.telegram_username;

    // Handle status changes with inventory impact
    const newStatus = updateOrderDto.status as
      | 'pending'
      | 'paid'
      | 'cancelled'
      | undefined;

    if (newStatus && newStatus !== order.status) {
      // Transition to paid -> decrement stock atomically
      if (newStatus === 'paid') {
        await this.prismaService.$transaction(async (tx) => {
          // For each order item, ensure sufficient stock and decrement
          for (const item of order.items) {
            const updated = await tx.flower.updateMany({
              where: { id: item.flower_id, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count !== 1) {
              throw new BadRequestException(
                `Insufficient stock for one of the items (flowerId=${item.flower_id}).`
              );
            }
          }

          await tx.order.update({
            where: { id },
            data: { status: 'paid', updated_at: new Date() },
          });
        });

        return { message: 'Order marked as paid' };
      }

      // Transition to cancelled or pending -> just update status (no stock changes by default)
      updateData.status = newStatus;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    const updateOrder = await this.prismaService.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { flower: true },
        },
      },
    });

    return updateOrder;
  }

  async remove(id: string) {
    try {
      const deletedOrder = await this.prismaService.order.delete({
        where: { id },
      });

      return {
        message: 'Order deleted successfully',
        deletedOrder,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('order not found');
      }

      console.error(err);
    }
  }
}
