export interface AuthUser {
  id: number
  email: string
  displayName: string
  profileImageUrl: string | null
  membershipTier: 'FREE' | 'PREMIUM'
}

export type AuthState =
  | { status: 'loading'; user: null; error: null }
  | { status: 'anonymous'; user: null; error: string | null }
  | { status: 'authenticated'; user: AuthUser; error: string | null }
