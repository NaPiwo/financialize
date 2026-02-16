
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Account, BalanceEntry, Person } from './api/tracker'
import { fileApi } from './api/tracker'

export type IncomeSource = {
    id: string
    name: string
    amount: number
    personId?: string
}

export type ExpenseCategory = {
    id: string
    name: string
    amount: number
    percentage: number // allocation percentage
    isFixed: boolean
}


export type LifeEvent = {
    id: string
    name: string
    year: number
    amount: number
    isRecurring: boolean
    duration: number
}

// Re-export types from API
export type { Account, BalanceEntry, Person }

type FinancialState = {
    incomes: IncomeSource[]
    expenses: ExpenseCategory[]
    currency: string
    theme: 'light' | 'dark' | 'system'
    showCoach: boolean
    actualExpenses: Record<string, number>
    exchangeRates: Record<string, number>
    simulationParams: {
        annualRaise: number
        marketReturn: number
        inflation: number
        years: number
        currentSavings: number
        currentAge: number
    }
    planningTargets: {
        targetNetWorth: number
        targetYears: number
    }
    events: LifeEvent[]

    // Backend State
    persons: Person[]
    accounts: Account[]
    history: BalanceEntry[]

    // Actions
    setSimulationParams: (params: Partial<FinancialState['simulationParams']>) => void
    setPlanningTargets: (params: Partial<FinancialState['planningTargets']>) => void
    setCurrency: (symbol: string) => void
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    setShowCoach: (show: boolean) => void
    setActualExpense: (id: string, amount: number) => void
    clearActualExpenses: () => void
    setExchangeRate: (currency: string, rate: number) => void
    removeExchangeRate: (currency: string) => void
    resetData: () => void
    addIncome: (name: string, amount: number) => void
    removeIncome: (id: string) => void
    updateIncome: (id: string, field: 'name' | 'amount' | 'personId', value: string | number | undefined) => void

    addEvent: (event: LifeEvent) => void
    removeEvent: (id: string) => void


    addExpense: (name: string) => void
    removeExpense: (id: string) => void
    updateExpense: (id: string, field: 'name' | 'percentage' | 'isFixed', value: string | number | boolean) => void
    setExpenseAllocations: (allocations: { id: string, percentage: number }[]) => void

    // Async Person Actions
    fetchPersons: () => Promise<void>
    createPerson: (name: string, age?: number, color?: string) => Promise<void>
    updatePerson: (id: number, name: string, age?: number, color?: string) => Promise<void>
    deletePerson: (id: number) => Promise<void>

    // Async Account/History Actions
    fetchAccounts: () => Promise<void>
    createAccount: (data: Partial<Account>) => Promise<void>
    updateAccount: (id: number, data: Partial<Account>) => Promise<void>
    deleteAccount: (id: number) => Promise<void>
    addHistoryEntry: (accountId: number, amount: number, date: string, note?: string) => Promise<void>
    fetchHistory: (accountId?: number) => Promise<void>
    removeHistoryEntry: (id: number) => Promise<void>

    // Computed (helper)
    getTotalIncome: () => number
    getTotalExpenses: () => number
    getFreeCashFlow: () => number
    getMonthlySavings: () => number
}

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

export const useFinancialStore = create<FinancialState>()(
    persist(
        (set, get) => ({
            currency: '$',
            theme: 'light' as const,
            showCoach: true,
            actualExpenses: {},
            exchangeRates: {},
            incomes: [
                { id: '1', name: 'Main Salary', amount: 4200 },
                { id: '2', name: 'Side Hustle', amount: 1200 },
            ],
            expenses: [
                { id: 'house', name: 'Housing', amount: 0, percentage: 30, isFixed: true },
                { id: 'food', name: 'Food & Dining', amount: 0, percentage: 15, isFixed: false },
                { id: 'transport', name: 'Transportation', amount: 0, percentage: 10, isFixed: false },
                { id: 'savings', name: 'Savings/Investments', amount: 0, percentage: 20, isFixed: false },
                { id: 'lifestyle', name: 'Lifestyle', amount: 0, percentage: 25, isFixed: false },
            ],

            simulationParams: {
                annualRaise: 2.0,
                marketReturn: 7.0,
                inflation: 2.5,
                years: 10,
                currentSavings: 10000,
                currentAge: 30
            },
            planningTargets: {
                targetNetWorth: 1000000,
                targetYears: 20
            },

            events: [],

            persons: [],
            accounts: [],
            history: [],

            setSimulationParams: (params) => set((state) => ({
                simulationParams: { ...state.simulationParams, ...params }
            })),

            setPlanningTargets: (params) => set((state) => ({
                planningTargets: { ...state.planningTargets, ...params }
            })),

            setCurrency: (symbol) => set(() => ({ currency: symbol })),

            setShowCoach: (show) => set({ showCoach: show }),

            setActualExpense: (id, amount) => set((state) => ({
                actualExpenses: { ...state.actualExpenses, [id]: amount }
            })),

            clearActualExpenses: () => set({ actualExpenses: {} }),

            setExchangeRate: (currency, rate) => set((state) => ({
                exchangeRates: { ...state.exchangeRates, [currency]: rate }
            })),

            removeExchangeRate: (currency) => set((state) => {
                const { [currency]: _, ...rest } = state.exchangeRates
                return { exchangeRates: rest }
            }),

            setTheme: (theme) => {
                set({ theme })
                const root = document.documentElement
                if (theme === 'dark') {
                    root.classList.add('dark')
                } else if (theme === 'light') {
                    root.classList.remove('dark')
                } else {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        root.classList.add('dark')
                    } else {
                        root.classList.remove('dark')
                    }
                }
            },

            resetData: () => {
                // Clear the onboarding flag so the wizard re-triggers on next load
                localStorage.removeItem('financialize-onboarded')
                set(() => ({
                    incomes: [],
                    expenses: [],
                    currency: '$',
                    theme: 'light' as const,
                    showCoach: true,
                    actualExpenses: {},
                    exchangeRates: {},
                    simulationParams: {
                        annualRaise: 2.0,
                        marketReturn: 7.0,
                        inflation: 2.5,
                        years: 10,
                        currentSavings: 0,
                        currentAge: 30
                    },
                    planningTargets: {
                        targetNetWorth: 1000000,
                        targetYears: 20
                    },
                    events: [],
                    persons: [],
                    accounts: [],
                    history: []
                }))
            },

            addEvent: (event) => set((state) => ({
                events: [...state.events, event]
            })),

            removeEvent: (id) => set((state) => ({
                events: state.events.filter(e => e.id !== id)
            })),

            addIncome: (name, amount) => set((state) => ({
                incomes: [...state.incomes, { id: generateId(), name, amount }]
            })),

            removeIncome: (id) => set((state) => ({
                incomes: state.incomes.filter(i => i.id !== id)
            })),

            updateIncome: (id, field, value) => set((state) => ({
                incomes: state.incomes.map(i => i.id === id ? { ...i, [field]: value } : i)
            })),

            addExpense: (name) => set((state) => ({
                expenses: [...state.expenses, { id: generateId(), name, amount: 0, percentage: 0, isFixed: false }]
            })),

            removeExpense: (id) => set((state) => ({
                expenses: state.expenses.filter(e => e.id !== id)
            })),

            updateExpense: (id, field, value) => set((state) => ({
                expenses: state.expenses.map(e => e.id === id ? { ...e, [field]: value } : e)
            })),

            setExpenseAllocations: (allocations) => set((state) => {
                const newExpenses = state.expenses.map(e => {
                    const alloc = allocations.find(a => a.id === e.id)
                    return alloc ? { ...e, percentage: alloc.percentage } : e
                })
                // Clamp: if total exceeds 100%, scale down the changed item
                const total = newExpenses.reduce((sum, e) => sum + e.percentage, 0)
                if (total > 100) {
                    const changedId = allocations[0]?.id
                    const overflow = total - 100
                    return {
                        expenses: newExpenses.map(e =>
                            e.id === changedId ? { ...e, percentage: Math.max(0, e.percentage - overflow) } : e
                        )
                    }
                }
                return { expenses: newExpenses }
            }),

            getTotalIncome: () => get().incomes.reduce((sum, i) => sum + i.amount, 0),

            getTotalExpenses: () => {
                const totalIncome = get().incomes.reduce((sum, i) => sum + i.amount, 0)
                return get().expenses.reduce((sum, e) => sum + (totalIncome * (e.percentage / 100)), 0)
            },

            getFreeCashFlow: () => {
                const income = get().incomes.reduce((sum, i) => sum + i.amount, 0)
                const savingsAlloc = get().expenses.find(e => e.id === 'savings')
                const savingsAmount = savingsAlloc ? income * (savingsAlloc.percentage / 100) : 0
                const totalAllocated = get().expenses.reduce((sum, e) => sum + e.percentage, 0)
                const unallocatedAmount = Math.max(0, 100 - totalAllocated) / 100 * income
                return savingsAmount + unallocatedAmount
            },

            getMonthlySavings: () => {
                const income = get().incomes.reduce((sum, i) => sum + i.amount, 0)
                const savingsAlloc = get().expenses.find(e => e.id === 'savings')
                return savingsAlloc ? income * (savingsAlloc.percentage / 100) : 0
            },

            // --- Async Backend Actions ---
            fetchPersons: async () => {
                try {
                    const persons = await fileApi.getPersons()
                    set({ persons })
                } catch (e) {
                    console.error("Failed to fetch persons", e)
                }
            },

            createPerson: async (name, age, color) => {
                await fileApi.createPerson(name, age, color)
                get().fetchPersons()
            },

            updatePerson: async (id, name, age, color) => {
                await fileApi.updatePerson(id, name, age, color)
                get().fetchPersons()
            },

            deletePerson: async (id) => {
                await fileApi.deletePerson(id)
                get().fetchPersons()
                get().fetchAccounts() // refresh accounts as person_name may change
            },

            fetchAccounts: async () => {
                try {
                    const accounts = await fileApi.getAccounts()
                    set({ accounts })
                } catch (e) {
                    console.error("Failed to fetch accounts", e)
                }
            },

            createAccount: async (data) => {
                await fileApi.createAccount(data)
                get().fetchAccounts()
            },

            updateAccount: async (id, data) => {
                await fileApi.updateAccount(id, data)
                get().fetchAccounts()
            },

            deleteAccount: async (id) => {
                await fileApi.deleteAccount(id)
                get().fetchAccounts()
            },

            addHistoryEntry: async (accountId, amount, date, note) => {
                await fileApi.addEntry(accountId, date, amount, note)
                get().fetchAccounts()
                get().fetchHistory() // Refresh full history
            },

            fetchHistory: async (accountId) => {
                const history = await fileApi.getHistory(accountId)
                set({ history })
            },

            removeHistoryEntry: async (id) => {
                await fileApi.deleteEntry(id)
                get().fetchAccounts()
                get().fetchHistory()
            }
        }),
        {
            name: 'financialize-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                // Only persist client-side prefs. Backend data is not persisted to localStorage.
                simulationParams: state.simulationParams,
                planningTargets: state.planningTargets,
                incomes: state.incomes,
                expenses: state.expenses,
                currency: state.currency,
                theme: state.theme,
                showCoach: state.showCoach,
                actualExpenses: state.actualExpenses,
                exchangeRates: state.exchangeRates,
                events: state.events,
            }),
        }
    )
)
