import type { Currency, Invoice, Payment, Profile } from '../types'

const symbols: Record<Currency, string> = {
  BYN: 'Br',
  RUB: '₽',
  USD: '$',
  EUR: '€',
}

export function formatMoney(amount: number, currency: Currency, locale: 'ru' | 'en' = 'ru') {
  const tag = locale === 'ru' ? 'ru-RU' : 'en-US'
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'BYN' || currency === 'RUB' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${symbols[currency]} ${amount.toLocaleString(tag)}`
  }
}

export function daysOverdue(dueAt: string, now = new Date()) {
  const due = new Date(dueAt)
  const ms = now.getTime() - due.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

export function refreshInvoiceStatuses(invoices: Invoice[], now = new Date()): Invoice[] {
  return invoices.map((inv) => {
    if (inv.status === 'paid' || inv.status === 'draft') return inv
    if (new Date(inv.dueAt) < now && inv.status !== 'overdue') {
      return { ...inv, status: 'overdue' }
    }
    return inv
  })
}

export function safeToSpend(profile: Profile) {
  return Math.max(0, profile.cashOnHand - profile.taxBuffer)
}

export function overdueInvoices(invoices: Invoice[]) {
  return invoices
    .filter((i) => i.status === 'overdue' || (i.status === 'sent' && daysOverdue(i.dueAt) > 0))
    .sort((a, b) => daysOverdue(b.dueAt) - daysOverdue(a.dueAt))
}

export function unpaidTotal(invoices: Invoice[]) {
  return invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)
}

export function monthIncome(payments: Payment[], now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  return payments
    .filter((p) => {
      const d = new Date(p.receivedAt)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .reduce((sum, p) => sum + p.amount, 0)
}

export function taxNeededThisMonth(payments: Payment[], taxRate: number, now = new Date()) {
  return Math.round(monthIncome(payments, now) * (taxRate / 100))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
