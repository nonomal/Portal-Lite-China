import { useEffect, useState } from 'react';
import { ApolloProvider, ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
// import { formatDistanceToNowStrict } from 'date-fns';
import { useAuthing } from '@authing/react-ui-components';
import Login from '../Common/Login';
import InstallExtension from '../Common/InstallExtension';
import { appId, appHost } from '../../InitialConfig';
import { checkExtensionInstalled } from '../../util';

import StyledWrapper from './styled';
import StyledTip from './StyledTip';
import RoomList from './RoomList';
import AddRoomPopUp from './AddRoom';

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://g.nicegoodthings.com/v1/graphql',
    headers: {
      'x-hasura-admin-secret': 'tristan@privoce'
    }
  }),
  cache: new InMemoryCache()
});
export default function VeraHistory({ lang }) {
  const { authClient } = useAuthing({
    appId,
    appHost
  });
  const [extInstalled, setExtInstalled] = useState(undefined);
  const [username, setUsername] = useState(null);
  const [addVisible, setAddVisible] = useState(false);
  const toggleAddPopup = () => {
    setAddVisible((prev) => !prev);
  };
  useEffect(() => {
    const check = async () => {
      let installed = await checkExtensionInstalled();
      setExtInstalled(installed);
    };
    check();
  }, []);
  useEffect(() => {
    const initUsername = async () => {
      let user = await authClient.getCurrentUser();
      if (user) {
        // 把用户信息同步到vera扩展
        document.dispatchEvent(new CustomEvent('VERA_ROOM_EVENT', { detail: { user } }));
        setUsername(user.username);
      }
    };
    if (authClient) {
      initUsername();
    }
  }, [authClient]);
  if (typeof extInstalled == 'undefined') return <StyledTip>Checking Extension</StyledTip>;
  if (!extInstalled) return <InstallExtension></InstallExtension>;
  if (!username) return <Login></Login>;

  return (
    <ApolloProvider client={client}>
      <StyledWrapper>
        {username ? (
          <RoomList username={username} lang={lang} toggleAddPopup={toggleAddPopup} />
        ) : (
          <StyledTip>Empty</StyledTip>
        )}
        {addVisible && <AddRoomPopUp username={username} togglePopupVisible={toggleAddPopup} />}
      </StyledWrapper>
    </ApolloProvider>
  );
}
