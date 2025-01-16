import {Box, Text} from "grommet";
import {TokenTrade} from "../../types.ts";
import {useEffect, useMemo, useState} from "react";
import {getTrades} from "../../api";
import {Table, Tooltip, Typography} from "antd";
import moment from "moment";
import {UserTag} from "../../components/UserTag.tsx";
import {NumberValue} from "../../components/number";

const columns = [
  {
    title: 'Account',
    dataIndex: 'account',
    key: 'account',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
  },
  {
    title: 'Amount (ONE)',
    dataIndex: 'amountOne',
    key: 'amountOne',
  },
  {
    title: 'Amount (Token)',
    dataIndex: 'amountToken',
    key: 'amountToken',
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
  },
  {
    title: 'Transaction',
    dataIndex: 'txn',
    key: 'txn',
  }
];

export const TokenTrades = (props: { tokenAddress: string }) => {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true)
      const items = await getTrades({ tokenAddress: props.tokenAddress, limit: 200 })
      setTrades(items)
      console.log('Trades loaded:', items)
    } catch (e) {
      console.log('Failed to load trades', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []);

  const dataSource: any = useMemo(() => {
    return trades.map(trade => {
      const prefixOne = trade.type === 'buy' ? '-' : '+'
      const prefixToken = trade.type === 'buy' ? '+' : '-'
      return {
        key: trade.id,
        account: <UserTag user={trade.user} />,
        type: <Text color={trade.type === 'buy' ? 'positiveValue' : 'negativeValue'}>{trade.type}</Text>,
        amountOne: <Text>{prefixOne}<NumberValue value={trade.type === 'buy' ? trade.amountIn : trade.amountOut} /></Text>,
        amountToken: <Text>{prefixToken}<NumberValue value={trade.type === 'buy' ? trade.amountOut : trade.amountIn} /></Text>,
        date: <Tooltip title={<Text>{moment(+trade.timestamp * 1000).format('hh:mm:ss A')}</Text>}>
          <Text style={{ cursor: 'pointer' }}>
            {moment(+trade.timestamp * 1000).fromNow()}
          </Text>
        </Tooltip>,
        txn: <Typography.Link href={`https://explorer.harmony.one/tx/${trade.txnHash}?shard=0`} target="_blank">
          {trade.txnHash.slice(0, 8)}
        </Typography.Link>
      }
    })
  }, [trades])

  return <Box>
    <Box>
      <Table
        loading={isLoading}
        dataSource={dataSource}
        columns={columns}
        pagination={{
          pageSize: 20,
          position: ['bottomCenter']
      }}
      />
    </Box>
  </Box>
}
