import {Box, Text} from 'grommet'
import {Button, Image, Tag, Typography} from "antd";
import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useMemo, useState} from "react";
import {Competition, TokenEnriched, WinnerLiquidityProvision} from "../../types.ts";
import {getCompetitions, getTokenBalances, getTokens, getWinnerLiquidityProvisions} from "../../api";
import {TradingForm} from "./TradingForm.tsx";
import {TokenComments} from "./TokenComments.tsx";
import { Radio } from 'antd';
import {TokenTrades} from "./TokenTrades.tsx";
import {TokenHolders} from "./TokenHolders.tsx";
import {PriceChart} from "./price-chart";
import usePoller from "../../hooks/usePoller.ts";
import useActiveTab from "../../hooks/useActiveTab.ts";
import Decimal from "decimal.js";
import {useClientData} from "../../providers/DataProvider.tsx";
import {BurnTokenForm} from "./BurnTokenForm.tsx";
import {PublishToUniswap} from "./PublishToUniswap.tsx";
import {useMediaQuery} from "react-responsive";
import {breakpoints} from "../../utils/breakpoints.ts";
import {CompetitionWinner} from "./CompetitionWinner.tsx";
import {TokenHeader} from "./TokenHeader.tsx";
import {shortEthAddress} from "../../utils";
import {AdvancedTradingView} from "./trading-view-chart";

const ButtonBack = () => {
  const navigate = useNavigate()

  return <Box align={'center'}>
    <Button
      type={'text'}
      style={{ fontSize: '22px' }}
      onClick={() => navigate('/board')}
    >
      Go back
    </Button>
  </Box>
}

const TokenCard = (props: { token: TokenEnriched }) => {
  const { token } = props

  return <Box gap={'8px'}>
    <Box direction={'row'} gap={'16px'} style={{ maxWidth: '600px' }}>
      <Box>
        <Image
          width={200}
          src={token.uriData?.image}
        />
      </Box>
      <Box style={{ maxWidth: 'calc(100% - 200px - 16px)' }}>
        <Text><b>{token.name} (ticker: {token.symbol})</b>: {token.uriData?.description}</Text>
      </Box>
    </Box>
    <Typography.Text copyable={{ text: token.address }}>
      Contract address: {shortEthAddress(token.address)}
    </Typography.Text>
  </Box>
}

export const TokenPage = () => {
  const isTabActive = useActiveTab()
  const { tokenAddress = '' } = useParams()

  const { state: { userAccount } } = useClientData()

  const [isLoading, setLoading] = useState(false)
  const [token, setToken] = useState<TokenEnriched>()
  const [userIsHolder, setUserIsHolder] = useState<boolean>(false)
  const [winnerLiquidityProvision, setWinnerLiquidityProvision] = useState<WinnerLiquidityProvision>()
  const [competition, setCompetition] = useState<Competition>()
  const [activeTab, setActiveTab] = useState<'thread' | 'trades'>('thread')
  const isMobile = useMediaQuery({ query: `(max-width: ${breakpoints.mobile})` })

  const loadData = async (updateStatus = false) => {
    try {
      if(updateStatus) {
        setLoading(true)
      }

      const [tokens, holders, liquidityProvisionItems] = await Promise.all([
        getTokens({ search: tokenAddress, limit: 1 }),
        getTokenBalances({ tokenAddress, userAddress: userAccount?.address || 'address', limit: 1 }),
        getWinnerLiquidityProvisions({ tokenAddress }),
      ])

      if(tokens.length > 0) {
        setToken(tokens[0])
        const competitionItems = await getCompetitions({
          competitionId: tokens[0].competition.competitionId
        })
        if(competitionItems.length > 0) {
          setCompetition(competitionItems[0])
        }
      }
      if(holders.length > 0) {
        setUserIsHolder(new Decimal(holders[0].balance).gt(0))
      }
      setWinnerLiquidityProvision(liquidityProvisionItems[0])
    } catch (e) {
      console.error('Failed to load token', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [userAccount?.address]);

  usePoller(() => {
    if(isTabActive) {
      loadData()
    }
  }, 3000)

  const isTradeAvailable = useMemo(() => {
    if(token) {
      return !token.competition.isCompleted
    }
    return false
  }, [token])

  const isBurnAvailable = useMemo(() => {
    if(!isTradeAvailable && token && !token.isWinner) {
      const totalSupply = new Decimal(token.totalSupply)
      return totalSupply.gt(0) && userIsHolder
    }
    return false
  }, [isTradeAvailable, token, userIsHolder, winnerLiquidityProvision])

  const isPublishToUniswapAvailable = useMemo(() => {
    if(
      !isBurnAvailable
      && token
      && token.isWinner
      && token.user
      && userAccount
      && !winnerLiquidityProvision
    ) {
      if(token.user.address === userAccount?.address) {
        return true
      }
      return true
    }
    return false
  }, [token, userAccount, isBurnAvailable, winnerLiquidityProvision])

  if(isMobile) {
    return <Box gap={'16px'} pad={'8px'} align={'center'}>
      <ButtonBack />
      <TokenHeader isLoading={isLoading} data={token} />
      <Box style={{ position: 'relative' }} width={'100%'}>
        <PriceChart tokenAddress={tokenAddress} />
      </Box>
      {token &&
          <TokenCard token={token} />
      }
      <Box alignSelf={'start'}>
        {token &&
            <TokenHolders token={token} limit={5} />
        }
      </Box>
      <Box alignSelf={'start'}>
        {token && competition && competition.isCompleted &&
            <CompetitionWinner
                token={token}
                winnerLiquidityProvision={winnerLiquidityProvision}
                competition={competition}
            />
        }
      </Box>
    </Box>
  }

  return <Box width={'100%'} pad={'0 32px'} style={{ maxWidth: '1300px', minWidth: '1000px' }}>
    <ButtonBack />
    <Box margin={{ top: '16px' }} width={'100%'}>
      <TokenHeader isLoading={isLoading} data={token} />
      <Box direction={'row'} justify={'between'} gap={'48px'}>
        <Box width={'100%'} margin={{ top: '16px' }}>
          <Box style={{ position: 'relative', height: '500px' }}>
            {/*<PriceChart tokenAddress={tokenAddress} />*/}
            <AdvancedTradingView
              tokenAddress={tokenAddress}
              tokenName={token?.name || '-'}
            />
          </Box>
          {token &&
              <Box margin={{ top: '32px' }}>
                  <Radio.Group onChange={(e) => setActiveTab(e.target.value)} value={activeTab} style={{ marginBottom: 8 }}>
                      <Radio.Button value="thread">Thread</Radio.Button>
                      <Radio.Button value="trades">Trades</Radio.Button>
                  </Radio.Group>
                  <Box margin={{ top: '8px' }}>
                    {activeTab === 'thread' &&
                        <TokenComments tokenAddress={tokenAddress} />
                    }
                    {activeTab === 'trades' &&
                        <TokenTrades tokenAddress={tokenAddress} />
                    }
                  </Box>
              </Box>
          }
        </Box>
        <Box style={{ minWidth: '420px' }} margin={{ top: '16px' }} gap={'24px'}>
          {token && competition && competition.isCompleted &&
              <CompetitionWinner
                  token={token}
                  winnerLiquidityProvision={winnerLiquidityProvision}
                  competition={competition}
              />
          }
          {isTradeAvailable &&
              <TradingForm token={token} />
          }
          {isBurnAvailable &&
              <BurnTokenForm token={token} />
          }
          {isPublishToUniswapAvailable &&
              <PublishToUniswap token={token} />
          }
          {token &&
              <TokenCard token={token} />
          }
          {token && token.uriData &&
            <Box direction={'row'}>
              {token.uriData.twitterLink &&
                  <Box onClick={() => window.open(token.uriData!.twitterLink, '_blank')}>
                      <Tag>Twitter</Tag>
                  </Box>
              }
              {token.uriData.telegramLink &&
                  <Box onClick={() => window.open(token.uriData!.telegramLink, '_blank')}>
                      <Tag>Telegram</Tag>
                  </Box>
              }
              {token.uriData.websiteLink &&
                  <Box onClick={() => window.open(token.uriData!.websiteLink, '_blank')}>
                      <Tag>Website</Tag>
                  </Box>
              }
            </Box>
          }
          {token &&
              <TokenHolders token={token} />
          }
        </Box>
      </Box>
    </Box>
  </Box>
}
