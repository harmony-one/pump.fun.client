import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import './index.css';
import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
  TimeFrameType,
  widget,
} from '../../../charting_library';
import {CreateDatafeed, DatafeedParams} from "./datafeed";
import {customFormatters, disabledFeatured, enabledFeatures, ExchangeName, SupportedResolutions} from "./constants";
import {Box, Spinner} from "grommet";

// 72 candles for all
const TimeFrameMap: Record<string, string> = {
  '60': '4D',
  '1H': '4D',
  '240': '16D',
  '4H': '16D',
  '1D': '72D'
}

const defaultInterval = '1H'

export const AdvancedTradingView = (props: {
  tokenAddress: string
  tokenName: string
}) => {
  const [isChartReady, setIsChartReady] = React.useState(false)
  const chartContainerRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;

  const [selectedInterval, setSelectedInterval] = useState<string>(defaultInterval)
  // const [setChartWidget] = useState<IChartingLibraryWidget>()

  useEffect(() => {
    const symbol = props.tokenName

    const datafeedParams: DatafeedParams = {
      tokenAddress: props.tokenAddress,
      symbols: []
    }

    if(symbol) {
      datafeedParams.symbols.push({
        symbol,
        full_name: `${ExchangeName}:${symbol}`,
        description: symbol,
        exchange: ExchangeName,
        ticker: symbol,
        type: 'crypto',
      })
    }

    const chartOverrides = {
      "paneProperties.background": "#1E1E20",
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": "#272729",
      "paneProperties.horzGridProperties.color": "#272729",
      "scalesProperties.textColor": "#D6D6DC",
      "scalesProperties.lineColor": "#1E1E20",
    };

    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: `${ExchangeName}:${symbol}`,
      datafeed: CreateDatafeed(datafeedParams) as any,
      interval: selectedInterval as ResolutionString,
      timeframe: TimeFrameMap[selectedInterval],
      container: chartContainerRef.current,
      library_path: '/charting_library/',
      locale: 'en',
      autosize: true,
      disabled_features: disabledFeatured,
      enabled_features: enabledFeatures,
      theme: 'dark',
      overrides: chartOverrides,
      // compare_symbols: [{
      //   symbol: rateSymbol,
      //   title: rateSymbol
      // }],
      loading_screen: { backgroundColor: "#1E1E20", foregroundColor: "#1E1E20" },
      custom_formatters: customFormatters,
      custom_css_url: "/tradingview-chart.css",
      favorites: {
        intervals: SupportedResolutions
      }
    };

    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(async () => {
      tvWidget.activeChart().setChartType(1)
      tvWidget.activeChart().onIntervalChanged().subscribe(null, (interval, timeframeObj) => {
        if(Number(interval)) {
          setSelectedInterval(`${Number(interval) / 60}H`)
        } else {
          setSelectedInterval(interval)
        }
        const value = TimeFrameMap[interval]
        console.log('Interval changed:', interval, 'next value: ', value)
        return timeframeObj.timeframe = {
          value,
          type: 'period-back' as TimeFrameType.PeriodBack
        }
      })
      tvWidget.activeChart().getTimeScale().defaultRightOffset().setValue(20, true)
      // setChartWidget(tvWidget)
      setIsChartReady(true)
    });

    return () => {
      // setChartWidget(undefined)
      tvWidget.remove();
    };
  }, [props.tokenAddress, props.tokenName]);

  return (
    <Box
      background={'widgetBg'}
      style={{ position: 'relative' }}
    >
      {!isChartReady &&
        <Box
            height={'100%'}
            width={'100%'}
            align={'center'}
            justify={'center'}
            style={{ position: 'absolute' }}
        >
          <Spinner color={'spinner'} />
        </Box>
      }
      <Box
        ref={ chartContainerRef }
        className={ 'TVChartContainer' }
        style={{ visibility: isChartReady ? 'visible' : 'hidden' }}
      />
    </Box>
  );
};
