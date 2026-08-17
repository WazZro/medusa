import {
  Logger,
  ModuleProviderExports,
  ModuleServiceInitializeOptions,
  PaymentModuleOptions as PaymentWebhookOptions,
} from "@medusajs/framework/types"

export type InitializeModuleInjectableDependencies = {
  logger?: Logger
}

/**
 * `PaymentWebhookOptions` holds the webhook options (`webhook_delay` and
 * `webhook_retries`) that are consumed by the `POST /hooks/payment/:provider`
 * route. They're part of the options accepted by the module, so they have to be
 * part of the type registered in the `ModuleOptions` registry, otherwise they
 * can't be set in `medusa-config.ts`.
 */
export type PaymentModuleOptions = Partial<ModuleServiceInitializeOptions> &
  PaymentWebhookOptions & {
    /**
     * Providers to be registered
     */
    providers?: {
      /**
       * The module provider to be registered
       */
      resolve: string | ModuleProviderExports
      /**
       * The id of the provider
       */
      id: string
      /**
       * key value pair of the configuration to be passed to the provider constructor
       */
      options?: Record<string, unknown>
    }[]
  }

declare module "@medusajs/types" {
  interface ModuleOptions {
    "@medusajs/payment": PaymentModuleOptions
    "@medusajs/medusa/payment": PaymentModuleOptions
  }
}
