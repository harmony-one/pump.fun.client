import {Box, Spinner, Text} from "grommet";
import {Button, Image, Input, message} from "antd";
import styled from "styled-components";
import {useEffect, useMemo, useState} from "react";
import {useAccount, useBalance, useWriteContract} from "wagmi";
import TokenFactoryABI from '../../abi/TokenFactory.json'
import {appConfig} from "../../config.ts";
import { parseUnits, formatUnits } from 'viem'
import {Token, TokenTrade} from "../../types.ts";
import {waitForTransactionReceipt, readContract} from "wagmi/actions";
import {config} from "../../wagmi.ts";
import {getTrades} from "../../api";
import Decimal from "decimal.js";
// @ts-ignore
import { ReactComponent as HarmonyLogo } from '../../assets/harmony-one.svg'
import useDebounce from "../../hooks/useDebounce.ts";

const TradeButton = styled(Box)`
    padding: 8px 16px;
    border-radius: 6px;
    flex: 1;
    text-align: center;
    font-size: 16px;
    color: white;
    border: 1px solid #2D2E43;
`

interface TradeQuote {
  amount: bigint
  amountFormatted: string
  isFetching: boolean
  status: string
}

const defaultTradeQuote: TradeQuote = {
  amount: 0n,
  amountFormatted: '0',
  isFetching: false,
  status: '',
}

export const TradingForm = (props: {
  token?: Token
}) => {
  const { token } = props

  const { writeContractAsync } = useWriteContract()
  const account = useAccount()
  const [selectedSide, setSelectedSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState<string>()
  const [currentStatus, setCurrentStatus] = useState('')
  const [inProgress, setInProgress] = useState(false)
  const debouncedAmount = useDebounce(amount, 300)
  const [tradeQuote, setTradeQuote] = useState<TradeQuote>(defaultTradeQuote)

  const { data: tokenBalance, refetch: refetchOneBalance } = useBalance({
    token: token?.address as `0x${string}`,
    address: account?.address,
    chainId: account.chainId,
  })
  const tokenBalanceFormatted = useMemo(() => {
    return tokenBalance && tokenBalance.value > 0n
      ? new Decimal(formatUnits(tokenBalance.value, tokenBalance.decimals)).toFixed()
      : '0'
  }, [tokenBalance])
  const { data: oneBalance, refetch: refetchTokenBalance } = useBalance({
    address: account?.address,
    chainId: account.chainId,
  })
  const oneBalanceFormatted = useMemo(() => {
    return oneBalance && oneBalance.value > 0n
      ? new Decimal(formatUnits(oneBalance.value, oneBalance.decimals)).toFixed(4)
      : '0'
  }, [oneBalance])

  useEffect(() => {
    const loadEstimate = async () => {
      try {
        setTradeQuote(() => ({
          ...defaultTradeQuote,
          isFetching: true
        }))
        if(!token?.address) {
          return
        }
        const functionName = selectedSide === 'buy'
          ? '_buyReceivedAmount'
          : '_sellReceivedAmount'
        const amountString = new Decimal(debouncedAmount || 0).toFixed()
        const amountBigInt = parseUnits(amountString, 18)
        const amount = await readContract(config, {
          address: appConfig.tokenFactoryAddress as `0x${string}`,
          abi: TokenFactoryABI,
          functionName,
          args: [token.address, amountBigInt]
        }) as bigint
        console.log('Trade amount estimate:', amount)
        setTradeQuote({
          ...defaultTradeQuote,
          amount,
          amountFormatted: amount > 0n ? new Decimal(formatUnits(amount, 18)).toFixed(6) : '0',
        })
      } catch (e) {
        console.error('Failed to load estimate:', e)
      }
    }
    loadEstimate()
  }, [debouncedAmount, selectedSide, token?.address]);

  // useEffect(() => {
  //   setTradeQuote(defaultTradeQuote)
  // }, [selectedSide]);

  const onTradeClicked = async () => {
    try {
      setInProgress(true)
      if(!account.address) {
        message.error(`Wallet not connected. Please connect your wallet to place a trade.`)
        return
      }
      if(!token) {
        message.error(`Token address is missing`)
        return
      }
      if(!amount) {
        message.error(`Enter amount to trade`)
        return
      }
      // if(account.chainId !== harmonyOne.id) {
      //   await switchNetwork(config, { chainId: harmonyOne.id })
      // }
      const amountFormatted = new Decimal(amount || 0).toFixed()
      console.log('amount formatted:', amountFormatted)
      const value = parseUnits(amountFormatted, 18)

      if(value === 0n) {
        message.error(`Amount should be greater than 0`)
        return
      }

      setCurrentStatus('Signing the transaction...')
      const args: any[] = [token?.address]
      if(selectedSide === 'sell') {
        args.push(value)
      }
      const txnHash = await writeContractAsync({
        abi: TokenFactoryABI,
        address: appConfig.tokenFactoryAddress as `0x${string}`,
        functionName: selectedSide === 'buy' ? 'buy' : 'sell',
        args,
        value: selectedSide === 'buy' ? value : undefined
      })
      console.log('txnHash:', txnHash)
      setCurrentStatus('Waiting for confirmation...')
      const receipt = await waitForTransactionReceipt(config, {
        hash: txnHash,
        confirmations: 2
      })
      console.log('Txn receipt:', receipt)
      let tokenTrade: TokenTrade | undefined
      for(let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const trades = await getTrades({ tokenAddress: token.address, limit: 10 })
        tokenTrade = trades.find(item => item.txnHash.toLowerCase() === txnHash.toLowerCase())
        if(tokenTrade) {
          break;
        }
      }
      if(tokenTrade) {
        const {
          type,
          amountIn,
          amountOut,
          token: { name, symbol }
        } = tokenTrade

        // const price = new Decimal(tokenTrade.price)
        //   .toFixed(4)
        const amountInString = new Decimal(amountIn)
          .div(10 ** 18)
          .toString()
        const amountOutString = new Decimal(amountOut)
          .div(10 ** 18)
          .toString()

        if(type === 'buy') {
          message.success(`Bought ${amountOutString} ${name} (${symbol})`, 10);
        } else {
          message.success(`Sold ${amountInString} ${name} (${symbol}), received ${amountOutString} ONE`, 10);
        }
      }
    } catch (e) {
      console.log('Failed to trade:', e)
      message.error(`Failed to trade`)
    } finally {
      setAmount(undefined)
      setInProgress(false)
      setCurrentStatus('')
      refetchOneBalance()
      refetchTokenBalance()
    }
  }

  const tradingToken = selectedSide === 'buy' ? 'ONE' : token?.symbol
  const quoteToken = selectedSide === 'sell' ? 'ONE' : token?.symbol
  const tradingTokenBalance = selectedSide === 'buy'
    ? oneBalance
    : tokenBalance

  const isTradeAvailable = useMemo(() => {
    try {
      const formAmount = parseUnits((amount || 0).toString(), 18)
      if(formAmount > 0) {
        if(tradingTokenBalance && formAmount <= tradingTokenBalance.value) {
          return true
        }
      }
    } catch (e) {}
    return false
  }, [amount, tradingTokenBalance])

  return <Box background={'widgetBg'} pad={'16px'} round={'8px'} width={'330px'}>
    <Box direction={'row'} gap={'6px'}>
      <TradeButton
        onClick={() => setSelectedSide('buy')}
        background={selectedSide === 'buy' ? '#70D693' : 'optionBg'}
        style={{
          opacity: selectedSide === 'buy' ? 1 : 0.4
      }}
      >
        Buy
      </TradeButton>
      <TradeButton
        background={selectedSide === 'sell' ? '#F06666' : 'optionBg'}
        onClick={() => setSelectedSide('sell')}
        style={{
          opacity: selectedSide === 'sell' ? 1 : 0.4
      }}
      >
        Sell
      </TradeButton>
    </Box>
    <Box margin={{ top: '24px' }} gap={'8px'}>
      <Box margin={{ top: '4px' }} align={'end'}>
        <Text color={'textSecondary'}>
          Balance: {selectedSide === 'buy'
          ? `${oneBalanceFormatted} ${tradingToken}`
          : `${tokenBalanceFormatted} ${tradingToken}`
        }
        </Text>
      </Box>
      <Box>
        <Input
          disabled={inProgress}
          placeholder={'0.0'}
          value={amount}
          size={'large'}
          addonAfter={selectedSide === 'buy'
            ? <Box direction={'row'} gap={'8px'} align={'center'}>
              <Text>ONE</Text><Box width={'16px'} height={'16px'}><HarmonyLogo /></Box>
            </Box>
            : <Box direction={'row'} gap={'8px'} align={'center'}>
              <Text>{token?.symbol}</Text><Image width={'20px'} height={'20px'} src={token?.uriData?.image} preview={false} />
            </Box>
          }
          style={{ width: '100%' }}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Box margin={{ top: '4px' }}>
          <Text>You receive: {tradeQuote.amountFormatted} {quoteToken}</Text>
        </Box>
      </Box>
    </Box>
    <Box
      direction={'row'}
      justify={'between'}
      width={'60%'}
      margin={{ top: '16px' }}
      gap={'6px'}
    >
      {[0.1, 0.5].map((value) => {
        return <Button
          key={value}
          size={'small'}
          style={{ width: '100%' }}
          onClick={() => { setAmount(value.toString()) }}
        >
            <Text color={'textSecondary'} size={'small'}>{value} {tradingToken}</Text>
        </Button>

      })}
      <Button
        size={'small'}
        style={{ width: '100%' }}
        onClick={() => {
          const amountNumber = formatUnits(tradingTokenBalance?.value || 0n, 18)
          setAmount(amountNumber)
        }}
      >
        <Text color={'textSecondary'} size={'small'}>max</Text>
      </Button>
    </Box>
    <Box margin={{ top: '16px' }}>
      <Button
        type="primary"
        size={'large'}
        disabled={inProgress || !isTradeAvailable}
        onClick={onTradeClicked}
      >
        {'Place trade'}
      </Button>
      {inProgress &&
          <Box margin={{ top: '16px' }} align={'center'} direction={'row'} gap={'16px'} justify={'center'}>
            {inProgress && <Spinner color={'activeStatus'} />}
            {currentStatus &&
                <Text color={'activeStatus'}>{currentStatus}</Text>
            }
          </Box>
      }
    </Box>
  </Box>
}
