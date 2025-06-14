// Bkash API integration service

// These would be environment variables in production
const BKASH_USERNAME = process.env.BKASH_USERNAME || "sandbox"
const BKASH_PASSWORD = process.env.BKASH_PASSWORD || "sandbox"
const BKASH_APP_KEY = process.env.BKASH_APP_KEY || "sandbox"
const BKASH_APP_SECRET = process.env.BKASH_APP_SECRET || "sandbox"
const BKASH_BASE_URL = process.env.BKASH_BASE_URL || "https://checkout.sandbox.bka.sh/v1.2.0-beta"
const BKASH_SANDBOX = process.env.NODE_ENV !== "production"

// Types for Bkash API responses
export interface BkashTokenResponse {
  id_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export interface BkashCreatePaymentResponse {
  paymentID: string
  createTime: string
  orgLogo: string
  orgName: string
  transactionStatus: string
  amount: string
  currency: string
  intent: string
  merchantInvoiceNumber: string
  bkashURL?: string
}

export interface BkashExecutePaymentResponse {
  paymentID: string
  createTime: string
  updateTime: string
  trxID: string
  transactionStatus: string
  amount: string
  currency: string
  intent: string
  merchantInvoiceNumber: string
  customerMsisdn: string
}

export interface BkashQueryPaymentResponse {
  paymentID: string
  createTime: string
  updateTime: string
  trxID: string
  transactionStatus: string
  amount: string
  currency: string
  intent: string
  merchantInvoiceNumber: string
  customerMsisdn: string
}

// Get Bkash auth token
export async function getBkashToken(): Promise<string> {
  try {
    const response = await fetch(`${BKASH_BASE_URL}/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: BKASH_USERNAME,
        password: BKASH_PASSWORD,
      },
      body: JSON.stringify({
        app_key: BKASH_APP_KEY,
        app_secret: BKASH_APP_SECRET,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get Bkash token: ${response.statusText}`)
    }

    const data: BkashTokenResponse = await response.json()
    return data.id_token
  } catch (error) {
    console.error("Error getting Bkash token:", error)
    throw error
  }
}

// Create a Bkash payment
export async function createBkashPayment(
  amount: number,
  invoiceId: string,
  callbackURL: string,
): Promise<BkashCreatePaymentResponse> {
  try {
    const token = await getBkashToken()

    const response = await fetch(`${BKASH_BASE_URL}/checkout/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "x-app-key": BKASH_APP_KEY,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoiceId,
        callbackURL,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create Bkash payment: ${response.statusText}`)
    }

    const data: BkashCreatePaymentResponse = await response.json()
    return data
  } catch (error) {
    console.error("Error creating Bkash payment:", error)
    throw error
  }
}

// Execute a Bkash payment
export async function executeBkashPayment(paymentId: string): Promise<BkashExecutePaymentResponse> {
  try {
    const token = await getBkashToken()

    const response = await fetch(`${BKASH_BASE_URL}/checkout/payment/execute/${paymentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "x-app-key": BKASH_APP_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to execute Bkash payment: ${response.statusText}`)
    }

    const data: BkashExecutePaymentResponse = await response.json()
    return data
  } catch (error) {
    console.error("Error executing Bkash payment:", error)
    throw error
  }
}

// Query a Bkash payment
export async function queryBkashPayment(paymentId: string): Promise<BkashQueryPaymentResponse> {
  try {
    const token = await getBkashToken()

    const response = await fetch(`${BKASH_BASE_URL}/checkout/payment/query/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        "x-app-key": BKASH_APP_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to query Bkash payment: ${response.statusText}`)
    }

    const data: BkashQueryPaymentResponse = await response.json()
    return data
  } catch (error) {
    console.error("Error querying Bkash payment:", error)
    throw error
  }
}

// Verify a Bkash payment
export async function verifyBkashPayment(paymentId: string): Promise<boolean> {
  try {
    const paymentData = await queryBkashPayment(paymentId)
    return paymentData.transactionStatus === "Completed"
  } catch (error) {
    console.error("Error verifying Bkash payment:", error)
    return false
  }
}
