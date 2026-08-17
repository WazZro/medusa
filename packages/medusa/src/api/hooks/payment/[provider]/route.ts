import { PaymentModuleOptions } from "@medusajs/framework/types"
import { Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const DEFAULT_WEBHOOK_DELAY = 5000
const DEFAULT_WEBHOOK_RETRIES = 3

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { provider } = req.params

    // The Payment Module exposes the options it was registered with, but they
    // aren't part of `IPaymentModuleService`, hence the explicit resolution type.
    const { options = {} } = req.scope.resolve<{
      options?: PaymentModuleOptions
    }>(Modules.PAYMENT)

    const event = {
      provider,
      payload: { data: req.body, rawData: req.rawBody, headers: req.headers },
    }

    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    // we delay the processing of the event to avoid a conflict caused by a race condition
    await eventBus.emit(
      {
        name: PaymentWebhookEvents.WebhookReceived,
        data: event,
      },
      {
        delay: options.webhook_delay ?? DEFAULT_WEBHOOK_DELAY,
        attempts: options.webhook_retries ?? DEFAULT_WEBHOOK_RETRIES,
      }
    )
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`)
    return
  }

  res.sendStatus(200)
}
