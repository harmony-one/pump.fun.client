import moment from "moment/moment";
import {DatafeedConfiguration, PeriodParams} from "../../../charting_library";
import {ExchangeName, SupportedResolutions} from "./constants";
import {getCandles} from "../../../api";

export interface DatafeedSymbolInfo {
  symbol: string;
  full_name: string;
  description?: string;
  exchange?: string;
  ticker: string;
  type?: string;
}

const configurationData: DatafeedConfiguration = {
  // Represents the resolutions for bars supported by your datafeed
  supported_resolutions: SupportedResolutions,
  // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
  exchanges: [
    { value: ExchangeName, name: ExchangeName, desc: ExchangeName},
  ],
  // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
  symbols_types: [
    { name: 'crypto', value: 'crypto'}
  ]
};

export interface DatafeedParams {
  tokenAddress: string
  symbols: DatafeedSymbolInfo[]
}

const subscribeIntervals: Record<string, any> = {}
let isSubscribeRequestRunning = false

const getTokenPriceBars = async (
  tokenAddress: string,
  timestampFrom: number,
  timestampTo: number,
) => {
  const params = {
    tokenAddress,
    timestampFrom,
    timestampTo,
  }
  const candlesData = await getCandles(params)

  return candlesData.map(item => {
    return {
      low: item.lowPrice,
      high: item.highPrice,
      open: item.openPrice,
      close: item.closePrice,
      volume: item.volume,
      time: moment(item.time).unix() * 1000,
    }
  })
}

export const CreateDatafeed = (params: DatafeedParams) => {
  const { tokenAddress, symbols } = params

  const getAllSymbols = () => {
    return symbols
  }

  return {
    onReady: (callback: (options: {}) => void) => {
      console.log('[onReady]: Method call');
      setTimeout(() => callback(configurationData));
    },
    searchSymbols: async (
      userInput: string,
      exchange: string,
      symbolType: string,
      onResultReadyCallback: (
        options: DatafeedSymbolInfo[]
      ) => void
    ) => {
      console.log('[searchSymbols]: Method call', symbolType);
      const symbols = getAllSymbols();
      const newSymbols = symbols.filter(symbol => {
        const isExchangeValid = exchange === '' || symbol.exchange === exchange;
        const isFullSymbolContainsInput = symbol.full_name
          .toLowerCase()
          .indexOf(userInput.toLowerCase()) !== -1;
        return isExchangeValid && isFullSymbolContainsInput;
      });
      onResultReadyCallback(newSymbols);
    },
    resolveSymbol: async (
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: ISymbolInfo) => void,
      onResolveErrorCallback: (error: any) => void,
    ) => {
      console.log('[resolveSymbol]: Method call', symbolName);
      const symbols = getAllSymbols();
      const symbolItem = symbols.find(({ full_name }) => full_name === symbolName);
      if (!symbolItem) {
        console.log('[resolveSymbol]: cannot resolve symbol:', symbolName, 'all symbols:', symbols);
        onResolveErrorCallback('Cannot resolve symbol');
        return;
      }
      // Symbol information object
      const symbolInfo = {
        ticker: symbolItem.full_name,
        name: symbolItem.symbol,
        description: symbolItem.description,
        type: symbolItem.type,
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: symbolItem.exchange,
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        visible_plots_set: 'ohlc',
        has_weekly_and_monthly: true,
        supported_resolutions: configurationData.supported_resolutions,
        volume_precision: 2,
        data_status: 'streaming',
      };
      console.log('[resolveSymbol]: Symbol resolved', symbolName);
      // @ts-ignore
      onSymbolResolvedCallback(symbolInfo);
    },
    getBars: async (
      symbolInfo: ISymbolInfo,
      resolution: string,
      periodParams: PeriodParams,
      onHistoryCallback: (bars: IBar[], options: { noData?: boolean }) => void,
      onErrorCallback: (error: string) => void
    ) => {
      const { from, to } = periodParams;
      console.log('[getBars]: Method call', symbolInfo, 'resolution:', resolution, 'periodParams:', periodParams);

      let bars: IBar[] = []
      try {
        // const interval = Number(resolution) ? `${Number(resolution) / 60}h` : resolution.toLowerCase()
        bars = await getTokenPriceBars(tokenAddress, from - Math.round(Date.now() - 30 * 24 * 60 * 60), to)
      } catch (e) {
        console.log('[getBars]: historical data error:', e);
        onErrorCallback('Unable to load historical data');
        return false
      }

      console.log(`[getBars]: returned ${bars.length} bar(s)`, bars);
      onHistoryCallback(bars, { noData: bars.length === 0 });
    },
    subscribeBars: async (
      symbolInfo: ISymbolInfo,
      resolution: string,
      onRealtimeCallback: (ohlc: IBar) => void,
      subscriberUID: string,
      // onResetCacheNeededCallback: () => void
    ) => {
      console.log('[subscribeBars]: symbolInfo', symbolInfo, resolution);

      const runSubscribeUpdate = async () => {
        try {
          let bars: IBar[] = []
          isSubscribeRequestRunning = true
          const from = Math.round(Date.now() / 1000) - 60 * 60
          const to = Math.round(Date.now() / 1000)
          bars = await getTokenPriceBars(tokenAddress, from, to)
          // console.log('[subscribeBars] bars result: ', bars)
          bars.forEach((bar) => {
            onRealtimeCallback(bar);
          })
        } catch (error) {
          console.log('[subscribeBars]: Failed to fetch:', error);
        } finally {
          isSubscribeRequestRunning = false
        }
      }

      subscribeIntervals[subscriberUID] = setInterval(() => {
        if(!isSubscribeRequestRunning) {
          runSubscribeUpdate()
        }
      }, 3 * 1000)
    },
    unsubscribeBars: (subscriberUID: string) => {
      console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
      const timerId = subscribeIntervals[subscriberUID]
      if(timerId) {
        clearInterval(timerId)
        console.log('[unsubscribeBars]: Clear interval', subscriberUID);
      }
    },
  };
}
