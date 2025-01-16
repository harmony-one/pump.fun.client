export interface UserAccount {
  id: string
  address: string
  username: string
  createdAt: string
  updatedAt: string
  tokens: Token[]
}

export interface UserComment {
  id: number
  text: string
  token: Token
  user: UserAccount
  createdAt: string
}

export interface TokenUriData {
  userAddress: string
  name: string
  ticker: string
  description: string
  image: string
  twitterLink: string
  telegramLink: string
  websiteLink: string
}

export interface Token {
  id: string;
  txnHash: string
  blockNumber: number
  address: string
  name: string
  symbol: string
  uri: string
  uriData: TokenUriData | null
  totalSupply: string
  price: string
  marketCap: string
  timestamp: number
  isWinner: boolean
  createdAt: string
  updatedAt: string
  user: UserAccount | null
}

// GET /tokens enriched token response
export interface TokenEnriched extends Token {
  commentsCount: number
  competition: Competition
}

export interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image: string
  twitterLink: string
  telegramLink: string
  websiteLink: string
}

export type TokenTradeType = 'buy' | 'sell'

export interface TokenTrade {
  id: string
  txnHash: string
  blockNumber: number
  type: TokenTradeType
  user: UserAccount
  token: Token
  amountIn: string
  amountOut: string
  price: string
  fee: string
  timestamp: string
  createdAt: string
}

export interface TokenBalance {
  id: string
  user: UserAccount
  token: Token
  balance: string
  createdAt: string
  updatedAt: string
}

export interface JWTTokensPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface JwtTokenPayload {
  address: string
  username: string
  createdAt: string
}

export interface Candle {
  highPrice: number
  lowPrice: number
  openPrice: number
  closePrice: number
  volume: string
  time: string
}

export interface TokenBurn {
  id: string
  txnHash: string
  blockNumber: number
  burnedAmount: string
  receivedETH: string
  mintedAmount: string
  token: Token
  winnerToken: Token
  sender: UserAccount
  timestamp: string
  createdAt: string
}

export interface WinnerLiquidityProvision {
  id: string
  txnHash: string
  blockNumber: number
  pool: string
  sender: string
  tokenId: string
  liquidity: string
  amount0: string
  amount1: string
  timestamp: string
  createdAt: string
  token: Token
  tokenCreator: UserAccount
}

export interface Competition {
  id: string
  txnHash: string
  blockNumber: string
  competitionId: number
  timestampStart: string
  timestampEnd: string
  isCompleted: boolean
  winnerToken: Token | null
  createdAt: string
}

export enum SortField {
  timestamp = 'timestamp',
  marketCap = 'marketCap',
  lastComment = 'lastComment',
  lastTrade = 'lastTrade',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
