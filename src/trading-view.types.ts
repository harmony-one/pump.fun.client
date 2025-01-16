interface ISymbolInfo {
  ticker: string;
  name: string;
  full_name: string
  description?: string;
  type: string;
  exchange?: string;
  supported_resolutions: string[];
  has_no_volume: boolean;
  has_weekly_and_monthly: boolean;
  timezone: string;
  minmov: number;
  has_intraday: boolean;
  session: string;
  pricescale: number;
}

interface IBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
