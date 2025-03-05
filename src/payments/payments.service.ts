import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecretKey);
  private readonly logger = new Logger(PaymentsService.name);

  async createPaymentSession(
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    const { currency, items, orderId } = createPaymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session: Stripe.Checkout.Session =
      await this.stripe.checkout.sessions.create({
        payment_intent_data: {
          metadata: {
            orderId,
          },
        },
        line_items: lineItems,
        mode: 'payment',
        success_url: envs.stripeSuccessUrl,
        cancel_url: envs.stripeCancelUrl,
      });

    return session;
  }

  async stripeWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    const endpointSecret = envs.stripeEndpointSecret;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
    } catch (err) {
      console.log('🚀 ~ PaymentsService ~ stripeWebhook ~ err:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const chargeSucceeded: Stripe.Charge = event.data.object;
        // console.log(
        //   '🚀 ~ PaymentsService ~ stripeWebhook ~ chargeSucceeded:',
        //   chargeSucceeded.metadata.orderId,
        // );
        const payload = {
          orderId: chargeSucceeded.metadata.orderId,
          paymentId: chargeSucceeded.id,
          receipUrl: chargeSucceeded.receipt_url,
        };
        this.logger.log({ payload });
        break;
      default:
      // console.log('🚀 ~ PaymentsService ~ stripeWebhook ~ event:', event);
    }
    res.status(200).json({ message: 'Webhook received', signature: sig });
  }
}
