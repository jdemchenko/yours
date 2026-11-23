export type Currency = 'BYN' | 'RUB' | 'USD' | 'EUR'

export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid'

export interface Invoice {
  id: string
  client: string
  amount: number
  currency: Currency
  issuedAt: string
  dueAt: string
  status: InvoiceStatus
  note?: string
}

export interface Payment {
  id: string
  invoiceId?: string
  label: string
  amount: number
  receivedAt: string
  taxSetAside: number
}

export interface Profile {
  name: string
  currency: Currency
  taxRate: number
  startingCash: number
  taxBuffer: number
  cashOnHand: number
  onboardingDone: boolean
  isPro: boolean
  locale: 'ru' | 'en'
}

export interface AppState {
  profile: Profile
  invoices: Invoice[]
  payments: Payment[]
}
