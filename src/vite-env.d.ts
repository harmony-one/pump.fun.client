/// <reference types="vite/client" />

declare global {
  interface Window {
    TradingView?: {
      widget: WidgetContructor;
    };
    tvWidget?: object;
  }
}
