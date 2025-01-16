import {
  ChartingLibraryFeatureset,
  CustomFormatters,
  ResolutionString
} from "../../../charting_library";

export const disabledFeatured: ChartingLibraryFeatureset[] = [
  'display_market_status',
  'header_compare',
  'header_symbol_search',
  'timeframes_toolbar',
  'left_toolbar',
  'header_undo_redo',
  'header_screenshot',
  'header_indicators'
]

export const enabledFeatures: ChartingLibraryFeatureset[] = [
  'hide_left_toolbar_by_default'
]

export const customFormatters: CustomFormatters = {
  timeFormatter: {
    format(date: Date): string {
      return date.toLocaleTimeString()
    },
    formatLocal(date: Date): string {
      return this.format(date)
    }
  },
  dateFormatter: {
    format(date: Date): string {
      return date.toLocaleDateString()
    },
    formatLocal(date: Date): string {
      return this.format(date)
    }
  },
  // tickMarkFormatter: (date, tickMarkType) => {
  //   return 'test'
  // },
  priceFormatterFactory: () => {
    return {
      format(price: number): string {
        return price && !isNaN(price) ? `${price.toFixed(2)} ONE` : '0.00 ONE'
      },
      // formatChange(currentPrice: number, prevPrice: number, signPositive?: boolean): string {
      //   return ''
      // }
    }
  }
}

export const SupportedResolutions = ['1H'] as ResolutionString[]
export const ExchangeName = 'PumpONE'
