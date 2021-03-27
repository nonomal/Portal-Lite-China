import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FaUserAlt } from 'react-icons/fa';
import { AuthingGuard } from '@authing/react-ui-components';

// 引入 css 文件
import '@authing/react-ui-components/lib/index.min.css';
import { appId, GuardConfig } from '../../InitialConfig';
import { useWidgetSettings } from '../../hooks';
const StyledIcon = styled.div`
  position: relative;
  cursor: pointer;
  width: 0.6rem;
  height: 0.6rem;
  background-color: #c7beff;
  border-radius: 50%;
  padding: 0.14rem;
  z-index: 996;
  display: flex;
  align-items: center;
  box-shadow: 0 0 5px #333;
  .status {
    width: 0.1rem;
    height: 0.1rem;
    border-radius: 50%;
    position: absolute;
    top: -0.05rem;
    right: -0.05rem;
    background-color: #aaa;
    &.logged {
      background-color: #07d302;
    }
  }
`;
export default function AuthIcon({ setSyncing, user, openModal, updateUserInfo }) {
  const { widgetSettings, importWidgetSettings } = useWidgetSettings();
  const [guardVisible, setGuardVisible] = useState(false);
  const [isReg, setIsReg] = useState(false);
  const currAuthClient = useRef(null);
  useEffect(() => {
    const syncWidgetData = async () => {
      let auth = currAuthClient.current;
      let { status } = await auth.checkLoginStatus();
      if (!status) return;
      setSyncing(true);
      let localData = widgetSettings;
      let [cloudData = null] = await auth.listUdv('widget_data');
      console.log({ localData, cloudData });
      if (isReg && localData) {
        // 第一次注册，则把本地数据，同步到云上
        await auth.setUdv('widget_data', JSON.stringify(localData));
        // location.reload();
      } else {
        // 登录常态，则把云上数据，同步覆盖到本地
        importWidgetSettings(cloudData.value);
        // location.reload();
      }
      // await auth.setUdv('widget_data', JSON.stringify(localData));
      setSyncing(false);
    };
    if (user) {
      syncWidgetData();
    }
  }, [user, isReg]);
  const handleIconClick = () => {
    if (user) {
      // 已登录的逻辑

      openModal();
    } else {
      // 去登陆
      setGuardVisible(true);
    }
  };
  const handleGuardLoad = async (authClient) => {
    currAuthClient.current = authClient;
    let currUser = await authClient.getCurrentUser();
    // console.log({ authingResp });
    // const { userInfo, session } = authingResp;
    if (currUser) {
      if (process.env.REACT_APP_CHROME_EXT == 'true') {
        // 扩展环境，则注入用户信息
        chrome.storage.local.set({ user: currUser }, function () {
          console.log('Value is set to ', user);
        });
      }
      setGuardVisible(false);
      updateUserInfo(currUser);
    }
  };
  const handleGuardLogin = async (user) => {
    console.log('login', { user });
    updateUserInfo(user);
    setGuardVisible(false);
  };
  const handleGuardClose = () => {
    setGuardVisible(false);
  };
  const handleRegComplete = (user) => {
    updateUserInfo(user);
    setIsReg(true);
    setGuardVisible(false);
  };
  return (
    <>
      <AuthingGuard
        visible={guardVisible}
        onRegisterInfoCompleted={handleRegComplete}
        // onRegister={handleReg}
        onClose={handleGuardClose}
        onLogin={handleGuardLogin}
        onLoad={handleGuardLoad}
        appId={appId}
        config={GuardConfig}
      />
      <StyledIcon className="icon profile" onClick={handleIconClick}>
        <FaUserAlt />
        <i className={`status ${user ? 'logged' : ''}`}></i>
      </StyledIcon>
    </>
  );
}
