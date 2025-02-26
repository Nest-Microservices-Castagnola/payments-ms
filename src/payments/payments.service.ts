import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecretKey);

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
        success_url: 'http://localhost:3003/payments/success',
        cancel_url: 'http://localhost:3003/payments/cancel',
      });

    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    let event: Stripe.Event;
    //Testing
    const endpointSecret =
      'whsec_d3383f340cb5687b9c18417bc7998264640fd415cba46713c4f3986d64048fbc';

    //Real
    //const endpointSecret = 'whsec_Na9HKQFfJLs69ZH5E5WkvWNgiLGNlZEj';

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
        console.log(
          '🚀 ~ PaymentsService ~ stripeWebhook ~ chargeSucceeded:',
          chargeSucceeded.metadata.orderId,
        );
        break;
      default:
      // console.log('🚀 ~ PaymentsService ~ stripeWebhook ~ event:', event);
    }

    return res.status(200).json({ sig });
  }
}
