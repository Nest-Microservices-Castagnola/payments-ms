import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-payment-session')
  async createPaymentSession(
    @Body()
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<any> {
    console.log(
      '🚀 ~ PaymentsController ~ createPaymentSessionDto:',
      createPaymentSessionDto,
    );

    return await this.paymentsService.createPaymentSession(
      createPaymentSessionDto,
    );
  }

  @Get('success')
  success(): object {
    return {
      ok: true,
      message: 'Payments succesful',
    };
  }

  @Get('cancel')
  cancel(): object {
    return {
      ok: true,
      message: 'Payments succesful',
    };
  }

  @Post('webhook')
  async stripeWebhook(@Req() req: Request, @Res() res: Response): Promise<any> {
    return await this.paymentsService.stripeWebhook(req, res);
  }
}
