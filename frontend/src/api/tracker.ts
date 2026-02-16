
import { apiClient } from './client'

const api = apiClient

export type Person = {
    id: number
    name: string
    age?: number
    color: string
}

export type Account = {
    id: number
    name: string
    type: string
    subtype?: string
    description?: string
    target_balance?: number
    currency?: string
    person_id?: number
    person_name?: string
    current_balance: number
}

export type BalanceEntry = {
    id: number
    account_id: number
    date: string
    amount: number
    type?: 'deposit' | 'withdrawal' | 'expense' | 'income'
    note?: string
}

export const fileApi = {
    // Persons
    getPersons: async (): Promise<Person[]> => {
        const response = await api.get('/tracker/persons')
        return response.data
    },

    createPerson: async (name: string, age?: number, color?: string): Promise<Person> => {
        const response = await api.post('/tracker/persons', { name, age, color })
        return response.data
    },

    updatePerson: async (id: number, name: string, age?: number, color?: string): Promise<Person> => {
        const response = await api.put(`/tracker/persons/${id}`, { name, age, color })
        return response.data
    },

    deletePerson: async (id: number): Promise<void> => {
        await api.delete(`/tracker/persons/${id}`)
    },

    // Accounts
    getAccounts: async (): Promise<Account[]> => {
        const response = await api.get('/tracker/accounts')
        return response.data
    },

    createAccount: async (data: Partial<Account>): Promise<Account> => {
        const response = await api.post('/tracker/accounts', data)
        return response.data
    },

    deleteAccount: async (id: number): Promise<void> => {
        await api.delete(`/tracker/accounts/${id}`)
    },

    updateAccount: async (id: number, data: Partial<Account>): Promise<Account> => {
        const response = await api.put(`/tracker/accounts/${id}`, data)
        return response.data
    },

    // Entries
    addEntry: async (account_id: number, date: string, amount: number, note?: string): Promise<BalanceEntry> => {
        const response = await api.post('/tracker/entries', { account_id, date, amount, note })
        return response.data
    },

    getHistory: async (account_id?: number): Promise<BalanceEntry[]> => {
        const url = account_id ? `/tracker/history?account_id=${account_id}` : '/tracker/history'
        const response = await api.get(url)
        return response.data
    },

    deleteEntry: async (id: number): Promise<void> => {
        await api.delete(`/tracker/entries/${id}`)
    }
}
