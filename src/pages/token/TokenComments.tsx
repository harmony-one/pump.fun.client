import {Box, BoxExtendedProps, Text} from "grommet";
import {SortOrder, UserComment} from "../../types.ts";
import {useEffect, useMemo, useState} from "react";
import {addComment, getTokenComments} from "../../api";
import {Button, Input, message, Modal, Tooltip} from "antd";
import moment from "moment";
import {useClientData} from "../../providers/DataProvider.tsx";
import {UserTag} from "../../components/UserTag.tsx";

interface TokenCommentItemProps extends BoxExtendedProps {
  data: UserComment
  highlightCommentId: number
  replyClicked: () => void
  setHighlightCommentId: (id: number) => void
}

const TokenCommentItem = (props: TokenCommentItemProps) => {
  const {
    data: {
      id,
      text,
      user,
      createdAt
    },
    highlightCommentId,
    replyClicked,
    setHighlightCommentId
  } = props

  const {
    replyToCommentId,
    message
  } = useMemo(() => {
    let replyToCommentId = 0
    let message = text
    const regex = /#(\d+)/;
    if(text.startsWith(`#`)) {
      const [firstPart, ...restPart] = text.split(' ')
      if(firstPart.match(regex)) {
        replyToCommentId = Number(firstPart.replace('#', ''))
        message = restPart.join(' ')
      }
    }
    return {
      replyToCommentId,
      message
    }
  }, [text])

  const isHighlighted = highlightCommentId === id

  return <Box
    background={'badgeBackground'}
    border={{ color: isHighlighted ? 'positiveValue' : 'transparent' }}
    pad={'8px'}
    round={'6px'}
    margin={{ top: '4px' }}
    {...props}
  >
    <Box direction={'row'} gap={'6px'} align={'center'}>
      <UserTag user={user} />
      <Tooltip title={<Text>{moment(createdAt).format('DD MMM YYYY, hh:mm:ss A')}</Text>}>
        <Text style={{ cursor: 'pointer' }}>{moment(createdAt).format('hh:mm:ss A')}</Text>
      </Tooltip>
      <Button type={'text'} size={'small'} onClick={replyClicked}>
        #{id} [reply]
      </Button>
    </Box>
    <Box margin={{ top: '4px' }}>
      {replyToCommentId
        ? <Box direction={'row'}>
          <Text
            weight={500}
            color={'positiveValue'}
            onMouseEnter={() => setHighlightCommentId(replyToCommentId)}
          >
            #{replyToCommentId}
          </Text>
          &nbsp;<Text>{message}</Text>
        </Box>
        : <Text>{message}</Text>
      }
    </Box>
  </Box>
}

export const TokenComments = (props: { tokenAddress: string }) => {
  const {tokenAddress} = props
  const { state: { jwtTokens } } = useClientData()

  const [isInitialLoading, setInitialLoading] = useState(true);
  const [sortingOrder, setSortingOrder] = useState<SortOrder>(SortOrder.ASC)
  const [comments, setComments] = useState<UserComment[]>([]);

  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyMessage, setReplyMessage] = useState<string>('')
  const [highlightCommentId, setHighlightCommentId] = useState(0)

  const loadComments = async () => {
    try {
      const items = await getTokenComments({
        tokenAddress: props.tokenAddress,
        sortingOrder
      })
      setComments(items)
    } catch (e) {
      console.log('Failed to load comments', e)
    }
  }

  useEffect(() => {
    setInitialLoading(true)
    loadComments().finally(() => setInitialLoading(false))
  }, []);

  useEffect(() => {
    loadComments()
  }, [sortingOrder]);

  const onPostReplyClicked = async () => {
    try {
      if(!jwtTokens) {
        message.error('Connect your Wallet to post')
        return
      }
      const id = await addComment({
        tokenAddress,
        text: replyMessage
      }, {
        accessToken: jwtTokens.accessToken
      })
      console.log('Reply id: ', id)
      setReplyMessage('')
      setShowReplyModal(false)
      loadComments()
      message.success(`Reply sent`);
    } catch (e) {
      console.error('Failed to post reply', e)
      message.error(`Failed to post reply`);
    }
  }

  return <Box>
    <Box
      direction={'row'}
      align={'center'}
      gap={'16px'}
      margin={{ bottom: '16px' }}
    >
      <Box width={'160px'}>
        <Button onClick={
          () => setSortingOrder(sortingOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC)
        }>sort: time ({sortingOrder.toLowerCase()}) {
          sortingOrder === SortOrder.DESC ? '↓' : '↑'
        }</Button>
      </Box>
      {comments.length > 10 &&
          <Box width={'120px'}>
              <Button type={'primary'} onClick={() => setShowReplyModal(true)}>
                  Post a reply
              </Button>
          </Box>
      }
    </Box>
    {!isInitialLoading && comments.length === 0 &&
      <Box>
          <Text size={'18px'}>No comments yet. Be the first to share your thoughts!</Text>
      </Box>
    }
    {comments.map((comment) => <TokenCommentItem
      key={comment.id}
      data={comment}
      replyClicked={() => {
        setReplyMessage(`#${comment.id} `)
        setShowReplyModal(true)
      }}
      highlightCommentId={highlightCommentId}
      setHighlightCommentId={setHighlightCommentId}
    />)}
    <Box width={'200px'} margin={{ top: '16px' }}>
      <Button type={'primary'} onClick={() => setShowReplyModal(true)}>
        Post a reply
      </Button>
    </Box>
    <Modal
      title="Add a comment"
      open={showReplyModal}
      footer={null}
      onOk={() => setShowReplyModal(false)}
      onCancel={() => {
        setReplyMessage('')
        setShowReplyModal(false)
      }}
      styles={{
        mask: {
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <Box gap={'16px'}>
        <Input.TextArea
          placeholder={'comment'}
          rows={4}
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          style={{ fontSize: '18px' }}
        />
        <Box gap={'16px'}>
          <Button type={'primary'} size={'large'} onClick={onPostReplyClicked}>
            Post a reply
          </Button>
          <Button type={'default'} onClick={() => setShowReplyModal(false)}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  </Box>
}
