import ky, { type KyInstance } from "ky"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

let _accessToken: string | null = localStorage.getItem("accessToken")

export function setAccessToken(token: string | null) {
  _accessToken = token
  if (token) localStorage.setItem("accessToken", token)
  else localStorage.removeItem("accessToken")
}

export function getAccessToken() {
  return _accessToken
}

export const api: KyInstance = ky.create({
  prefixUrl: API_BASE,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getAccessToken()
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        if (response.status === 401) {
          const refreshed = await tryRefreshToken()
          if (!refreshed) {
            setAccessToken(null)
            localStorage.removeItem("refreshToken")
            window.dispatchEvent(new CustomEvent("auth:logout"))
            return
          }
          
          const token = getAccessToken()
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`)
          }
          return ky(request)
        }
      },
    ],
  },
})

let refreshTokenPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshTokenPromise) {
    return refreshTokenPromise
  }

  refreshTokenPromise = (async () => {
    const refreshToken = localStorage.getItem("refreshToken")
    if (!refreshToken) return false

    try {
      const res = await ky
        .post(`${API_BASE}/auth/refresh`, {
          json: { refreshToken },
        })
        .json<{ data: { accessToken: string; refreshToken: string } }>()

      setAccessToken(res.data.accessToken)
      localStorage.setItem("refreshToken", res.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

// ── Auth API ──

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  fullName?: string
  phone?: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: string
  tier: string
  isActive: boolean
  createdAt: string
}

export interface AuthResponse {
  message: string
  data: {
    user: AuthUser
    accessToken: string
    refreshToken: string
  }
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post("auth/login", { json: payload }).json<AuthResponse>(),

  register: (payload: RegisterPayload) =>
    api.post("auth/register", { json: payload }).json<AuthResponse>(),

  logout: () =>
    api.post("auth/logout").json<{ message: string }>(),
}

// ── Arena API ──

export interface ArenaAccount {
  balance: number
  totalPnl: number
  totalPnlPercent: number
  winRate: number
  totalOrders: number
  totalAssets: number
}

export interface ArenaOrderResult {
  message: string
  data: {
    id: string
    symbol: string
    side: string
    type: string
    quantity: number
    price: number
    total: number
    fee: number
    status: string
  }
}

export const arenaApi = {
  activate: () =>
    api.post("arena/activate").json<{ message: string; data: ArenaAccount }>(),

  getAccount: () =>
    api.get("arena/account").json<{ message: string; data: ArenaAccount }>(),

  buyMarket: (symbol: string, quantity: number) =>
    api.post("arena/orders/buy", { json: { symbol, quantity } }).json<ArenaOrderResult>(),

  sellMarket: (symbol: string, quantity: number) =>
    api.post("arena/orders/sell", { json: { symbol, quantity } }).json<ArenaOrderResult>(),

  buyLimit: (symbol: string, quantity: number, triggerPrice: number) =>
    api.post("arena/orders/limit-buy", { json: { symbol, quantity, triggerPrice } }).json<ArenaOrderResult>(),

  sellLimit: (symbol: string, quantity: number, triggerPrice: number) =>
    api.post("arena/orders/limit-sell", { json: { symbol, quantity, triggerPrice } }).json<ArenaOrderResult>(),

  cancelOrder: (id: string) =>
    api.delete(`arena/orders/${id}`).json<{ message: string }>(),

  getPendingOrders: () =>
    api.get("arena/orders/pending").json<{ data: any[] }>(),

  getOrders: (page = 1, limit = 20, status?: string) =>
    api.get("arena/orders", { searchParams: { page, limit, ...(status ? { status } : {}) } }).json<{ data: any[] }>(),

  getPortfolio: () =>
    api.get("arena/portfolio").json<{ data: any[] }>(),
}

// ── Users API ──

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  role: string
  isActive: boolean
  premiumExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateProfilePayload {
  fullName?: string
  phone?: string
  password?: string
}

export const usersApi = {
  getProfile: () =>
    api.get("users/profile").json<{ message: string; data: UserProfile }>(),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch("users/profile", { json: payload }).json<{ message: string; data: UserProfile }>(),
}

// ── Payments API ──

export interface PlanInfo {
  plan: string
  label: string
  months: number
  price: number
  currency: string
}

export interface CheckoutData {
  paymentId: string
  checkoutUrl: string
  fields: Record<string, string>
  plan: string
  planLabel: string
  amount: number
}

export const paymentsApi = {
  getPlans: () =>
    api.get("payments/plans").json<{ message: string; data: PlanInfo[] }>(),

  createCheckout: (plan: string) =>
    api.post("payments/checkout", { json: { plan } }).json<{ message: string; data: CheckoutData }>(),

  getHistory: (page = 1, limit = 10) =>
    api.get("payments/history", { searchParams: { page, limit } }).json<{ message: string; data: { items: any[]; total: number; page: number; limit: number; totalPages: number } }>(),
}
