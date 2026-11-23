import type { AppState } from '../types'
import { createDemoState } from './demo'
import { refreshInvoiceStatuses } from './money'

const KEY = 'yours.app.v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return createDemoState()
    const parsed = JSON.parse(raw) as AppState
    return {
      ...parsed,
      invoices: refreshInvoiceStatuses(parsed.invoices ?? []),
    }
  } catch {
    return createDemoState()
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function clearState() {
  localStorage.removeItem(KEY)
}
