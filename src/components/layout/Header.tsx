import {Box, Text} from "grommet";
import {Button, Modal} from "antd";
import {UserOutlined} from "@ant-design/icons";
import {useClientData} from "../../providers/DataProvider.tsx";
import {ProfileModal} from "./ProfileModal.tsx";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {LatestUpdate} from "../latest-update";
import {GradientButtonText} from "../button";
import { ConnectKitButton } from 'connectkit'
import {useAccount, useSignMessage} from "wagmi";
import {getJWTTokens, storeJWTTokens} from "../../utils/localStorage.ts";
import {getNonce, getUserByAddress, signIn, verifySignature} from "../../api";
import {JWTTokensPair, UserAccount} from "../../types.ts";
import {decodeJWT} from "../../utils";
import {useMediaQuery} from "react-responsive";
import {breakpoints} from "../../utils/breakpoints.ts";

export const Header = () => {
  const navigate = useNavigate();
  const { address: userAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage()
  const { state: clientState, setState: setClientState, onDisconnect } = useClientData()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSimpleSwapModalOpened, setSimpleSwapModalOpened] = useState(false)

  const isMobile = useMediaQuery({ query: `(max-width: ${breakpoints.mobile})` })

  useEffect(() => {
    const loginUser = async (userAddress: string) => {
      try {
        let userAccount: UserAccount
        let jwtTokens: JWTTokensPair

        const storedJwtTokens = getJWTTokens()
        if(storedJwtTokens) {
          const { address: jwtTokensAddress } = decodeJWT(storedJwtTokens.accessToken)
          if(jwtTokensAddress.toLowerCase() === userAddress.toLowerCase()) {
            const data = await signIn({ accessToken: storedJwtTokens.accessToken })
            console.log('User account restored from JWT:', data)
            jwtTokens = data.tokens
            userAccount = data.user
            storeJWTTokens(jwtTokens)
            setClientState({
              ...clientState,
              jwtTokens,
              userAccount
            })
            console.log('Client is logged in using JWT tokens from localStorage', jwtTokens, userAccount)
            return
          }
        }

        const nonce = await getNonce(userAddress)
        const rawMessage = `I'm signing my one-time nonce: ${nonce}`
        // const signature = await window.ethereum.request({
        //   method: "personal_sign",
        //   params: [rawMessage, userAddress],
        // })
        const signature = await signMessageAsync({
          message: rawMessage
        })
        jwtTokens = await verifySignature(userAddress, signature)
        console.log('Signature is valid, JWT tokens:', jwtTokens)
        userAccount = await getUserByAddress({ address: userAddress })
        storeJWTTokens(jwtTokens)
        setClientState({
          ...clientState,
          jwtTokens,
          userAccount
        })
        console.log('Client is logged in', jwtTokens, userAccount)
      } catch (e) {
        console.error('Failed to login user, disconnect', e)
        onDisconnect()
      }
    }

    if(userAddress) {
      console.log('Account connected:', userAddress)
      loginUser(userAddress)
    }
  }, [userAddress]);

  return <Box
    width={'100%'}
    height={'50px'}
    background={'#1E1E20'}
    pad={'8px 16px'}
    direction={'row'}
    justify={'between'}
    style={{
      position: 'absolute',
      zIndex: 10,
      backgroundColor: 'rgba(30, 30, 32, 0.7)',
      backdropFilter: 'blur(5px)',
      boxShadow: '0 -6px 10px 5px rgba(0, 0, 0, 0.6)'
  }}
  >
    <Box direction={'row'} gap={'16px'} align={'center'}>
      <Box onClick={() => {
        navigate('/')
      }}>
        <GradientButtonText size={'24px'}>PumpOne</GradientButtonText>
      </Box>
      {!isMobile && <Box>
          <LatestUpdate />
      </Box>}
    </Box>
    <Box direction={'row'} align={'center'} gap={'16px'}>
      {/*<Box onClick={() => navigate('/leaderboard')}>*/}
      {/*  <Text size={'18px'}>Leaderboard</Text>*/}
      {/*</Box>*/}
      {!isMobile && <Box onClick={() => navigate('/rules')}>
          <Text size={'18px'}>How it works</Text>
      </Box>}
      {!isMobile && <Box align={'center'} onClick={() => setSimpleSwapModalOpened(true)}>
          <GradientButtonText size={'16px'}>Get ONE</GradientButtonText>
      </Box>}
      {!isConnected &&
          <ConnectKitButton />
          // <Button type={'primary'} loading={false} onClick={onConnectClicked}>
          //     Connect Wallet
          // </Button>
      }
      {(isConnected && !clientState.userAccount) &&
          <Box>
              <Button style={{ minWidth: '180px' }}>
                  <UserOutlined />
                  <Box width={'100%'} justify={'between'} direction={'row'} align={'center'} gap={'8px'}>
                      <Text size={'16px'}>{userAddress ? userAddress.toLowerCase().slice(2, 8) : 'Connecting...'}</Text>
                      <Text size={'12px'}>▼</Text>
                  </Box>
              </Button>
          </Box>
      }
      {isConnected && clientState.userAccount &&
        <Box>
            <Button
              // size={'large'}
                onClick={() => setIsProfileModalOpen(true)}
                style={{ minWidth: '180px' }}
            >
                <UserOutlined />
                <Box width={'100%'} justify={'between'} direction={'row'} align={'center'} gap={'8px'}>
                    <Text size={'16px'}>{clientState.userAccount?.username}</Text>
                    <Text size={'12px'}>▼</Text>
                </Box>
            </Button>
        </Box>
      }
    </Box>
    <Modal
      centered
      title={null}
      footer={null}
      open={isProfileModalOpen}
      onOk={() => setIsProfileModalOpen(false)}
      onCancel={() => setIsProfileModalOpen(false)}
      styles={{
        mask: {
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      {clientState.userAccount
        ? <ProfileModal
            user={clientState.userAccount}
            onClose={() => setIsProfileModalOpen(false)}
          />
        : <Button type={'primary'} onClick={onDisconnect}>Disconnect</Button>
      }
    </Modal>
    <Modal
      className={'pump_app_get_one_widget'}
      centered
      width={'536px'}
      title={null}
      footer={null}
      open={isSimpleSwapModalOpened}
      onOk={() => setSimpleSwapModalOpened(false)}
      onCancel={() => setSimpleSwapModalOpened(false)}
      styles={{
        content: {
          padding: '4px 4px 0px',
          borderRadius: '32px'
        },
        mask: {
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      {isSimpleSwapModalOpened &&
          <Box
              width={'100%'}
              height={'100%'}
              align={'center'}
              justify={'center'}
              style={{ position: 'absolute', zIndex: 1 }}
          >
              <Box
                  pad={'6px 16px'}
                  background={'white'}
                  round={'6px'}
              >
                  <Text color={'black'} size={'16px'}>Loading SimpleSwap widget...</Text>
              </Box>
          </Box>
      }
      <Box style={{ zIndex: 2, position: 'relative' }}>
        <iframe id="simpleswap-frame" name="SimpleSwap Widget" width="528px" height="392px"
                src="https://simpleswap.io/widget/26484d8c-7182-44e6-8a5b-9feddeb6354b" frameBorder="0"></iframe>
      </Box>
    </Modal>
  </Box>
}
