import type { AppState } from '../types'
import { uid } from './money'

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function isoDaysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function createDemoState(): AppState {
  const inv1 = uid('inv')
  const inv2 = uid('inv')
  const inv3 = uid('inv')
  const inv4 = uid('inv')

  return {
    profile: {
      name: 'Алекс',
      currency: 'BYN',
      taxRate: 6,
      startingCash: 4200,
      taxBuffer: 980,
      cashOnHand: 4200,
      onboardingDone: true,
      isPro: false,
      locale: 'ru',
    },
    invoices: [
      {
        id: inv1,
        client: 'Studio Nord',
        amount: 1800,
        currency: 'BYN',
        issuedAt: isoDaysAgo(25),
        dueAt: isoDaysAgo(5),
        status: 'overdue',
        note: 'Редизайн лендинга',
      },
      {
        id: inv2,
        client: 'Bright Foods',
        amount: 950,
        currency: 'BYN',
        issuedAt: isoDaysAgo(10),
        dueAt: isoDaysFromNow(4),
        status: 'sent',
        note: 'Иллюстрации для меню',
      },
      {
        id: inv3,
        client: 'Orbit Labs',
        amount: 2400,
        currency: 'BYN',
        issuedAt: isoDaysAgo(40),
        dueAt: isoDaysAgo(20),
        status: 'paid',
        note: 'UI-kit + прототип',
      },
      {
        id: inv4,
        client: 'Кафе «Липа»',
        amount: 620,
        currency: 'BYN',
        issuedAt: isoDaysAgo(2),
        dueAt: isoDaysFromNow(12),
        status: 'draft',
        note: 'Сезонные баннеры',
      },
    ],
    payments: [
      {
        id: uid('pay'),
        invoiceId: inv3,
        label: 'Orbit Labs',
        amount: 2400,
        receivedAt: isoDaysAgo(18),
        taxSetAside: 144,
      },
      {
        id: uid('pay'),
        label: 'Разовый заказ — Telegram-бот',
        amount: 700,
        receivedAt: isoDaysAgo(7),
        taxSetAside: 42,
      },
    ],
  }
}

export function createEmptyProfile(): AppState {
  return {
    profile: {
      name: '',
      currency: 'BYN',
      taxRate: 6,
      startingCash: 0,
      taxBuffer: 0,
      cashOnHand: 0,
      onboardingDone: false,
      isPro: false,
      locale: 'ru',
    },
    invoices: [],
    payments: [],
  }
}
