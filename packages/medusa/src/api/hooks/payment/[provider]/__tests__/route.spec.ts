import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PaymentModuleOptions } from "@medusajs/framework/types"
import { Modules, PaymentWebhookEvents } from "@medusajs/framework/utils"
import { POST } from "../route"

const createRequest = (
  paymentModuleOptions?: PaymentModuleOptions,
  emit: jest.Mock = jest.fn().mockResolvedValue(undefined)
) => {
  const resolve = jest.fn((key: string) => {
    if (key === Modules.PAYMENT) {
      return { options: paymentModuleOptions }
    }

    if (key === Modules.EVENT_BUS) {
      return { emit }
    }

    return undefined
  })

  const req = {
    params: { provider: "pp_stripe_stripe" },
    body: { id: "evt_123" },
    rawBody: Buffer.from(JSON.stringify({ id: "evt_123" })),
    headers: { "stripe-signature": "sig" },
    scope: { resolve },
  } as unknown as MedusaRequest

  return { req, emit }
}

const createResponse = () => {
  const send = jest.fn().mockReturnThis()
  const status = jest.fn().mockReturnThis()
  const sendStatus = jest.fn().mockReturnThis()

  return { status, send, sendStatus } as unknown as MedusaResponse & {
    status: jest.Mock
    send: jest.Mock
    sendStatus: jest.Mock
  }
}

describe("POST /hooks/payment/:provider", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("emits the webhook event with the delay and retries configured on the Payment Module", async () => {
    const { req, emit } = createRequest({
      webhook_delay: 1000,
      webhook_retries: 10,
    })
    const res = createResponse()

    await POST(req, res)

    expect(emit).toHaveBeenCalledWith(
      {
        name: PaymentWebhookEvents.WebhookReceived,
        data: {
          provider: "pp_stripe_stripe",
          payload: {
            data: req.body,
            rawData: req.rawBody,
            headers: req.headers,
          },
        },
      },
      { delay: 1000, attempts: 10 }
    )
    expect(res.sendStatus).toHaveBeenCalledWith(200)
  })

  it("falls back to the default delay and retries when the module has no webhook options", async () => {
    const { req, emit } = createRequest({})
    const res = createResponse()

    await POST(req, res)

    expect(emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delay: 5000, attempts: 3 })
    )
  })

  it("falls back to the default delay and retries when the module exposes no options", async () => {
    const { req, emit } = createRequest(undefined)
    const res = createResponse()

    await POST(req, res)

    expect(emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delay: 5000, attempts: 3 })
    )
  })

  it("honours a delay and retries explicitly configured to 0", async () => {
    const { req, emit } = createRequest({
      webhook_delay: 0,
      webhook_retries: 0,
    })
    const res = createResponse()

    await POST(req, res)

    expect(emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ delay: 0, attempts: 0 })
    )
  })

  it("responds with a 400 when the event can't be emitted", async () => {
    const { req } = createRequest(
      {},
      jest.fn().mockRejectedValue(new Error("Queue is down"))
    )
    const res = createResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith("Webhook Error: Queue is down")
    expect(res.sendStatus).not.toHaveBeenCalled()
  })
})
