import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppState, Currency, Invoice, InvoiceStatus } from './types'
import { t, type Locale } from './i18n'
import { clearState, loadState, saveState } from './lib/storage'
import { createDemoState, createEmptyProfile } from './lib/demo'
import {
  daysOverdue,
  formatMoney,
  monthIncome,
  overdueInvoices,
  refreshInvoiceStatuses,
  safeToSpend,
  taxNeededThisMonth,
  uid,
  unpaidTotal,
} from './lib/money'

type View = 'landing' | 'home' | 'invoices' | 'brief' | 'pricing' | 'settings' | 'onboarding'

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [view, setView] = useState<View>(() =>
    loadState().profile.onboardingDone ? 'landing' : 'onboarding',
  )
  const [toast, setToast] = useState<string | null>(null)

  const locale = state.profile.locale

  useEffect(() => {
    saveState({
      ...state,
      invoices: refreshInvoiceStatuses(state.invoices),
    })
  }, [state])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const currency = state.profile.currency
  const overdue = useMemo(() => overdueInvoices(state.invoices), [state.invoices])
  const unpaid = unpaidTotal(state.invoices)
  const income = monthIncome(state.payments)
  const taxNeed = taxNeededThisMonth(state.payments, state.profile.taxRate)
  const bufferRatio =
    taxNeed > 0 ? Math.min(1, state.profile.taxBuffer / taxNeed) : state.profile.taxBuffer > 0 ? 1 : 0

  function show(message: string) {
    setToast(message)
  }

  function updateProfile(patch: Partial<AppState['profile']>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
  }

  function enterApp() {
    if (!state.profile.onboardingDone) {
      setView('onboarding')
      return
    }
    setView('home')
  }

  function resetDemo() {
    const demo = createDemoState()
    demo.profile.locale = locale
    setState(demo)
    clearState()
    saveState(demo)
    setView('home')
    show(locale === 'ru' ? 'Демо обновлено' : 'Demo reset')
  }

  function markInvoice(id: string, status: InvoiceStatus) {
    setState((s) => {
      const invoices = s.invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      if (status !== 'paid') return { ...s, invoices }

      const inv = s.invoices.find((i) => i.id === id)
      if (!inv || inv.status === 'paid') return { ...s, invoices }

      const tax = Math.round(inv.amount * (s.profile.taxRate / 100))
      return {
        ...s,
        invoices,
        payments: [
          {
            id: uid('pay'),
            invoiceId: inv.id,
            label: inv.client,
            amount: inv.amount,
            receivedAt: new Date().toISOString().slice(0, 10),
            taxSetAside: tax,
          },
          ...s.payments,
        ],
        profile: {
          ...s.profile,
          cashOnHand: s.profile.cashOnHand + inv.amount,
          taxBuffer: s.profile.taxBuffer + tax,
        },
      }
    })
    show(locale === 'ru' ? 'Оплата учтена, налог отложен' : 'Payment logged, tax set aside')
  }

  function addInvoice(payload: {
    client: string
    amount: number
    dueAt: string
    note: string
    status: InvoiceStatus
  }) {
    const invoice: Invoice = {
      id: uid('inv'),
      client: payload.client,
      amount: payload.amount,
      currency,
      issuedAt: new Date().toISOString().slice(0, 10),
      dueAt: payload.dueAt,
      status: payload.status,
      note: payload.note || undefined,
    }
    setState((s) => ({ ...s, invoices: [invoice, ...s.invoices] }))
    show(locale === 'ru' ? 'Счёт создан' : 'Invoice created')
  }

  function logLoosePayment(amount: number, label: string) {
    const tax = Math.round(amount * (state.profile.taxRate / 100))
    setState((s) => ({
      ...s,
      payments: [
        {
          id: uid('pay'),
          label,
          amount,
          receivedAt: new Date().toISOString().slice(0, 10),
          taxSetAside: tax,
        },
        ...s.payments,
      ],
      profile: {
        ...s.profile,
        cashOnHand: s.profile.cashOnHand + amount,
        taxBuffer: s.profile.taxBuffer + tax,
      },
    }))
    show(locale === 'ru' ? 'Оплата зачислена' : 'Payment added')
  }

  if (view === 'landing') {
    return (
      <div className="app-shell">
        <header className="topnav">
          <div className="brand">
            Yours<span>.</span>
          </div>
          <div className="nav-actions">
            <button className="btn btn-ghost btn-small" onClick={() => setView('pricing')}>
              {t(locale, 'ctaPricing')}
            </button>
            <button className="btn btn-primary btn-small" onClick={enterApp}>
              {t(locale, 'ctaOpen')}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-visual" aria-hidden>
            <div className="hero-orb" />
            <div className="hero-ring" />
          </div>
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="brand" style={{ fontSize: 'clamp(3.4rem, 10vw, 6.8rem)' }}>
              Yours<span>.</span>
            </div>
            <h1>
              {locale === 'ru' ? (
                <>
                  Деньги, которые <em>остаются</em> вашими
                </>
              ) : (
                <>
                  Money that <em>stays</em> yours
                </>
              )}
            </h1>
            <p>{t(locale, 'heroSupport')}</p>
            <div className="cta-row">
              <button className="btn btn-primary" onClick={enterApp}>
                {t(locale, 'ctaOpen')}
              </button>
              <button
                className="btn"
                onClick={() => {
                  resetDemo()
                }}
              >
                {t(locale, 'ctaDemo')}
              </button>
            </div>
          </motion.div>
        </section>

        <section className="section">
          <h2>{locale === 'ru' ? 'Один ритуал в неделю' : 'One weekly ritual'}</h2>
          <p className="lead">
            {locale === 'ru'
              ? 'Не бухгалтерия и не банк. Три сигнала: сколько можно тратить, сколько отложить на налог, кого пнуть за оплату.'
              : 'Not accounting, not a bank. Three signals: safe to spend, tax to set aside, who to chase.'}
          </p>
          <div className="feature-grid">
            {[
              locale === 'ru'
                ? ['Налоговая подушка', 'Каждая оплата автоматически откладывает % налога. Safe-to-spend всегда честный.']
                : ['Tax buffer', 'Every payment sets aside your tax %. Safe-to-spend stays honest.'],
              locale === 'ru'
                ? ['Охота за счетами', 'Просрочки сверху списка — одно касание: напомнить или отметить оплату.']
                : ['Invoice chase', 'Overdues on top — one tap to chase or mark paid.'],
              locale === 'ru'
                ? ['Недельный бриф', 'Один экран: доход, подушка, топ-просрочка и следующий шаг.']
                : ['Weekly brief', 'One screen: income, buffer, top overdue, next action.'],
            ].map(([title, body]) => (
              <div className="feature" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>
        <Toast message={toast} />
      </div>
    )
  }

  if (view === 'onboarding') {
    return (
      <div className="app-shell">
        <div className="app-frame" style={{ maxWidth: 560, paddingTop: '2rem' }}>
          <div className="brand" style={{ marginBottom: '1rem' }}>
            Yours<span>.</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '2.4rem', marginTop: 0 }}>
            {t(locale, 'onboardingTitle')}
          </h2>
          <OnboardingForm
            locale={locale}
            initial={state.profile}
            onDone={(profile) => {
              setState((s) => ({
                ...s,
                profile: {
                  ...profile,
                  onboardingDone: true,
                  cashOnHand: profile.startingCash,
                  taxBuffer: profile.taxBuffer,
                },
              }))
              setView('home')
            }}
            onUseDemo={resetDemo}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div>
            <button className="brand" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => setView('landing')}>
              Yours<span>.</span>
            </button>
            <div className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              {state.profile.name || (locale === 'ru' ? 'Фрилансер' : 'Freelancer')} · {t(locale, 'sampleBadge')}
            </div>
          </div>
          <nav className="tabs desktop-tabs" aria-label="Main">
            {(
              [
                ['home', 'navHome'],
                ['invoices', 'navInvoices'],
                ['brief', 'navBrief'],
                ['pricing', 'navPricing'],
                ['settings', 'navSettings'],
              ] as const
            ).map(([id, key]) => (
              <button
                key={id}
                className={`tab ${view === id ? 'active' : ''}`}
                onClick={() => setView(id)}
              >
                {t(locale, key)}
              </button>
            ))}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            {view === 'home' && (
              <HomeView
                locale={locale}
                state={state}
                overdue={overdue}
                unpaid={unpaid}
                income={income}
                bufferRatio={bufferRatio}
                taxNeed={taxNeed}
                onChase={() => setView('invoices')}
                onPaid={(id) => markInvoice(id, 'paid')}
                onLogPayment={logLoosePayment}
              />
            )}
            {view === 'invoices' && (
              <InvoicesView
                locale={locale}
                state={state}
                isPro={state.profile.isPro}
                onAdd={addInvoice}
                onMark={markInvoice}
                onNeedPro={() => {
                  show(t(locale, 'paywalled'))
                  setView('pricing')
                }}
              />
            )}
            {view === 'brief' && (
              <BriefView
                locale={locale}
                state={state}
                overdue={overdue}
                income={income}
                taxNeed={taxNeed}
                onGoInvoices={() => setView('invoices')}
              />
            )}
            {view === 'pricing' && (
              <PricingView
                locale={locale}
                isPro={state.profile.isPro}
                onTogglePro={() => {
                  updateProfile({ isPro: !state.profile.isPro })
                  show(
                    !state.profile.isPro
                      ? locale === 'ru'
                        ? 'Pro включён (демо)'
                        : 'Pro enabled (demo)'
                      : locale === 'ru'
                        ? 'Pro выключен'
                        : 'Pro disabled',
                  )
                }}
              />
            )}
            {view === 'settings' && (
              <SettingsView
                locale={locale}
                state={state}
                onLocale={(l) => updateProfile({ locale: l })}
                onSave={(p) => updateProfile(p)}
                onReset={resetDemo}
                onFresh={() => {
                  const empty = createEmptyProfile()
                  empty.profile.locale = locale
                  setState(empty)
                  setView('onboarding')
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="mobile-nav" aria-label="Mobile">
        {(
          [
            ['home', 'navHome'],
            ['invoices', 'navInvoices'],
            ['brief', 'navBrief'],
            ['pricing', 'navPricing'],
            ['settings', 'navSettings'],
          ] as const
        ).map(([id, key]) => (
          <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
            {t(locale, key)}
          </button>
        ))}
      </nav>
      <Toast message={toast} />
    </div>
  )
}

function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function HomeView({
  locale,
  state,
  overdue,
  unpaid,
  income,
  bufferRatio,
  taxNeed,
  onChase,
  onPaid,
  onLogPayment,
}: {
  locale: Locale
  state: AppState
  overdue: Invoice[]
  unpaid: number
  income: number
  bufferRatio: number
  taxNeed: number
  onChase: () => void
  onPaid: (id: string) => void
  onLogPayment: (amount: number, label: string) => void
}) {
  const c = state.profile.currency
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')

  return (
    <>
      <div className="metric-row">
        <div className="metric ok">
          <div className="label">{t(locale, 'safeSpend')}</div>
          <div className="value">{formatMoney(safeToSpend(state.profile), c, locale)}</div>
        </div>
        <div className="metric">
          <div className="label">{t(locale, 'taxBuffer')}</div>
          <div className="value">{formatMoney(state.profile.taxBuffer, c, locale)}</div>
          <div className="progress" aria-hidden>
            <span style={{ width: `${Math.round(bufferRatio * 100)}%` }} />
          </div>
          <div className="muted" style={{ fontSize: '0.78rem', marginTop: 6 }}>
            {locale === 'ru'
              ? `Нужно ~${formatMoney(taxNeed, c, locale)} с дохода месяца`
              : `Need ~${formatMoney(taxNeed, c, locale)} from month income`}
          </div>
        </div>
        <div className={`metric ${overdue.length ? 'warn' : ''}`}>
          <div className="label">{t(locale, 'overdue')}</div>
          <div className="value">{overdue.length}</div>
        </div>
        <div className="metric">
          <div className="label">{t(locale, 'unpaid')}</div>
          <div className="value">{formatMoney(unpaid, c, locale)}</div>
        </div>
      </div>

      <div className="panel">
        <h3>{locale === 'ru' ? 'Кого пнуть сегодня' : 'Chase today'}</h3>
        {overdue.length === 0 ? (
          <p className="muted">{locale === 'ru' ? 'Просрочек нет — отличная неделя.' : 'No overdues — great week.'}</p>
        ) : (
          <div className="list">
            {overdue.slice(0, 3).map((inv) => (
              <div className="row" key={inv.id}>
                <div>
                  <strong>{inv.client}</strong>
                  <div className="meta">
                    {formatMoney(inv.amount, c, locale)} · {daysOverdue(inv.dueAt)}{' '}
                    {locale === 'ru' ? 'дн. просрочки' : 'days late'}
                  </div>
                </div>
                <div className="row-actions">
                  <button className="btn btn-small" onClick={onChase}>
                    {t(locale, 'chase')}
                  </button>
                  <button className="btn btn-small btn-primary" onClick={() => onPaid(inv.id)}>
                    {t(locale, 'markPaid')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>{t(locale, 'logPayment')}</h3>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(amount)
            if (!n || n <= 0) return
            onLogPayment(n, label || (locale === 'ru' ? 'Оплата' : 'Payment'))
            setAmount('')
            setLabel('')
          }}
        >
          <label>
            {t(locale, 'amount')}
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1200"
              required
            />
          </label>
          <label>
            {locale === 'ru' ? 'Откуда' : 'From'}
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Client" />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-primary" type="submit">
              {t(locale, 'save')}
            </button>
          </div>
        </form>
        <p className="muted" style={{ marginBottom: 0, marginTop: '0.8rem', fontSize: '0.85rem' }}>
          {locale === 'ru'
            ? `С дохода месяца ${formatMoney(income, c, locale)} уже отложено в подушку.`
            : `${formatMoney(income, c, locale)} month income already feeding the buffer.`}
        </p>
      </div>
    </>
  )
}

function InvoicesView({
  locale,
  state,
  isPro,
  onAdd,
  onMark,
  onNeedPro,
}: {
  locale: Locale
  state: AppState
  isPro: boolean
  onAdd: (p: {
    client: string
    amount: number
    dueAt: string
    note: string
    status: InvoiceStatus
  }) => void
  onMark: (id: string, status: InvoiceStatus) => void
  onNeedPro: () => void
}) {
  const [client, setClient] = useState('')
  const [amount, setAmount] = useState('')
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [note, setNote] = useState('')

  return (
    <>
      <div className="panel">
        <h3>{t(locale, 'newInvoice')}</h3>
        <form
          className="form-grid"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            const n = Number(amount)
            if (!client || !n) return
            onAdd({ client, amount: n, dueAt, note, status: 'draft' })
            setClient('')
            setAmount('')
            setNote('')
          }}
        >
          <label>
            {t(locale, 'client')}
            <input value={client} onChange={(e) => setClient(e.target.value)} required />
          </label>
          <label>
            {t(locale, 'amount')}
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
          </label>
          <label>
            {t(locale, 'due')}
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
          </label>
          <label>
            {locale === 'ru' ? 'Заметка' : 'Note'}
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn btn-primary" type="submit">
              {t(locale, 'save')}
            </button>
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>{locale === 'ru' ? 'Все счета' : 'All invoices'}</h3>
        {state.invoices.length === 0 ? (
          <p className="muted">{t(locale, 'emptyInvoices')}</p>
        ) : (
          <div className="list">
            {state.invoices.map((inv) => (
              <div className="row" key={inv.id}>
                <div>
                  <strong>{inv.client}</strong>{' '}
                  <span className={`status ${inv.status}`}>{inv.status}</span>
                  <div className="meta">
                    {formatMoney(inv.amount, state.profile.currency, locale)} · due {inv.dueAt}
                    {inv.note ? ` · ${inv.note}` : ''}
                  </div>
                </div>
                <div className="row-actions">
                  {inv.status === 'draft' && (
                    <button className="btn btn-small" onClick={() => onMark(inv.id, 'sent')}>
                      {t(locale, 'markSent')}
                    </button>
                  )}
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <>
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          if (!isPro) {
                            onNeedPro()
                            return
                          }
                          const text =
                            locale === 'ru'
                              ? `Привет! Напоминаю про счёт на ${formatMoney(inv.amount, state.profile.currency, locale)}, срок был ${inv.dueAt}. Когда удобно оплатить?`
                              : `Hi! Reminder about the ${formatMoney(inv.amount, state.profile.currency, locale)} invoice due ${inv.dueAt}. When can you pay?`
                          void navigator.clipboard?.writeText(text)
                        }}
                      >
                        {t(locale, 'chase')}
                      </button>
                      <button className="btn btn-small btn-primary" onClick={() => onMark(inv.id, 'paid')}>
                        {t(locale, 'markPaid')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function BriefView({
  locale,
  state,
  overdue,
  income,
  taxNeed,
  onGoInvoices,
}: {
  locale: Locale
  state: AppState
  overdue: Invoice[]
  income: number
  taxNeed: number
  onGoInvoices: () => void
}) {
  const c = state.profile.currency
  const top = overdue[0]
  const gap = Math.max(0, taxNeed - state.profile.taxBuffer)

  return (
    <div className="panel">
      <h3>{t(locale, 'weeklyBrief')}</h3>
      <div className="stack">
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.8rem', lineHeight: 1.2 }}>
          {locale === 'ru'
            ? `На этой неделе можно тратить ${formatMoney(safeToSpend(state.profile), c, locale)}.`
            : `This week you can spend ${formatMoney(safeToSpend(state.profile), c, locale)}.`}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {locale === 'ru'
            ? `Доход месяца: ${formatMoney(income, c, locale)}. Подушка: ${formatMoney(state.profile.taxBuffer, c, locale)} из ~${formatMoney(taxNeed, c, locale)}.`
            : `Month income: ${formatMoney(income, c, locale)}. Buffer: ${formatMoney(state.profile.taxBuffer, c, locale)} of ~${formatMoney(taxNeed, c, locale)}.`}
        </p>
        {gap > 0 && (
          <p style={{ margin: 0, color: 'var(--warn)' }}>
            {locale === 'ru'
              ? `До цели подушки не хватает ${formatMoney(gap, c, locale)}.`
              : `${formatMoney(gap, c, locale)} still needed for the buffer target.`}
          </p>
        )}
        {top ? (
          <>
            <p style={{ margin: 0 }}>
              {locale === 'ru'
                ? `Главный долг: ${top.client} — ${formatMoney(top.amount, c, locale)}, ${daysOverdue(top.dueAt)} дн.`
                : `Top chase: ${top.client} — ${formatMoney(top.amount, c, locale)}, ${daysOverdue(top.dueAt)} days late.`}
            </p>
            <div>
              <button className="btn btn-primary" onClick={onGoInvoices}>
                {t(locale, 'chase')}
              </button>
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {locale === 'ru' ? 'Просрочек нет. Держите ритм.' : 'No overdues. Keep the rhythm.'}
          </p>
        )}
      </div>
    </div>
  )
}

function PricingView({
  locale,
  isPro,
  onTogglePro,
}: {
  locale: Locale
  isPro: boolean
  onTogglePro: () => void
}) {
  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, marginTop: 0 }}>
        {t(locale, 'proTitle')}
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t(locale, 'proBlurb')}
      </p>
      <div className="pricing">
        <div className="price-plan">
          <h3>{t(locale, 'freePlan')}</h3>
          <div className="price">{locale === 'ru' ? '0 BYN' : '$0'}</div>
          <ul>
            <li>{locale === 'ru' ? 'Подушка и safe-to-spend' : 'Buffer + safe-to-spend'}</li>
            <li>{locale === 'ru' ? 'Счета и статусы' : 'Invoices & statuses'}</li>
            <li>{locale === 'ru' ? 'Недельный бриф' : 'Weekly brief'}</li>
            <li>{locale === 'ru' ? 'Демо и локальное хранение' : 'Demo + local storage'}</li>
          </ul>
        </div>
        <div className="price-plan featured">
          <h3>{t(locale, 'proPlan')}</h3>
          <div className="price">{locale === 'ru' ? '19 BYN / мес' : '$9 / mo'}</div>
          <ul>
            <li>{locale === 'ru' ? 'Текст напоминания в буфер обмена' : 'Chase copy to clipboard'}</li>
            <li>{locale === 'ru' ? 'Мультивалюта (скоро)' : 'Multi-currency (soon)'}</li>
            <li>{locale === 'ru' ? 'PDF-счёт (скоро)' : 'PDF invoices (soon)'}</li>
            <li>{locale === 'ru' ? 'Сценарии ставки налога' : 'Tax rate scenarios'}</li>
          </ul>
          <button className="btn btn-primary" onClick={onTogglePro}>
            {isPro ? t(locale, 'deactivatePro') : t(locale, 'activatePro')}
          </button>
        </div>
      </div>
    </>
  )
}

function SettingsView({
  locale,
  state,
  onLocale,
  onSave,
  onReset,
  onFresh,
}: {
  locale: Locale
  state: AppState
  onLocale: (l: Locale) => void
  onSave: (p: Partial<AppState['profile']>) => void
  onReset: () => void
  onFresh: () => void
}) {
  const [name, setName] = useState(state.profile.name)
  const [taxRate, setTaxRate] = useState(String(state.profile.taxRate))
  const [currency, setCurrency] = useState<Currency>(state.profile.currency)

  return (
    <div className="panel">
      <h3>{t(locale, 'navSettings')}</h3>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ name, taxRate: Number(taxRate) || 0, currency })
        }}
      >
        <label>
          {locale === 'ru' ? 'Имя' : 'Name'}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {locale === 'ru' ? 'Ставка налога %' : 'Tax rate %'}
          <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>
        <label>
          {locale === 'ru' ? 'Валюта' : 'Currency'}
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            <option value="BYN">BYN</option>
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label>
          Language
          <select value={locale} onChange={(e) => onLocale(e.target.value as Locale)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit">
            {t(locale, 'save')}
          </button>
          <button className="btn" type="button" onClick={onReset}>
            {t(locale, 'resetDemo')}
          </button>
          <button className="btn" type="button" onClick={onFresh}>
            {locale === 'ru' ? 'Начать с нуля' : 'Start fresh'}
          </button>
        </div>
      </form>
    </div>
  )
}

function OnboardingForm({
  locale,
  initial,
  onDone,
  onUseDemo,
}: {
  locale: Locale
  initial: AppState['profile']
  onDone: (p: AppState['profile']) => void
  onUseDemo: () => void
}) {
  const [name, setName] = useState(initial.name || '')
  const [currency, setCurrency] = useState<Currency>(initial.currency)
  const [taxRate, setTaxRate] = useState(String(initial.taxRate || 6))
  const [cash, setCash] = useState(String(initial.startingCash || 0))

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        const startingCash = Number(cash) || 0
        onDone({
          ...initial,
          name: name || (locale === 'ru' ? 'Фрилансер' : 'Freelancer'),
          currency,
          taxRate: Number(taxRate) || 6,
          startingCash,
          cashOnHand: startingCash,
          taxBuffer: 0,
          onboardingDone: true,
          locale,
        })
      }}
    >
      <label>
        {locale === 'ru' ? 'Как к вам обращаться' : 'Your name'}
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
      </label>
      <label>
        {locale === 'ru' ? 'Валюта' : 'Currency'}
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          <option value="BYN">BYN</option>
          <option value="RUB">RUB</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <label>
        {locale === 'ru' ? 'Ожидаемая ставка налога %' : 'Expected tax rate %'}
        <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
      </label>
      <label>
        {locale === 'ru' ? 'Сейчас на руках' : 'Cash on hand'}
        <input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" />
      </label>
      <div className="cta-row">
        <button className="btn btn-primary" type="submit">
          {t(locale, 'ctaOpen')}
        </button>
        <button className="btn" type="button" onClick={onUseDemo}>
          {t(locale, 'ctaDemo')}
        </button>
      </div>
    </form>
  )
}

export default App
