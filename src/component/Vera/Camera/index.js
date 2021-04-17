import { useState, useEffect, useRef } from 'react';
import Loading from '../Loading';
import Username from '../Username';
import emitter, { EVENTS } from '../hooks/useEmitter';

import OffMask from './CameraOffMask';
import BgOffMask from './BgRemoveMask';
import useUserMedia from '../hooks/useUserMedia';
import StyledWrapper from './styled';
const tipVideo = chrome.i18n.getMessage('tipDisableVideo');
const tipAudio = chrome.i18n.getMessage('tipDisableAudio');
const tipRemoveBg = chrome.i18n.getMessage('tipRemoveBg');
// const tipProcessing = chrome.i18n.getMessage('tipProcessing');
const tipPin = chrome.i18n.getMessage('tipPin');
// status: loading ready error
export default function Camera({
  peerId,
  remote = true,
  mediaStream = null,
  dataConnections = null
}) {
  const [status, setStatus] = useState(mediaStream ? 'ready' : 'loading');
  const [stream, setStream] = useState(mediaStream);
  const [controls, setControls] = useState({ pin: false, video: true, audio: true, bg: true });
  const { enableStream } = useUserMedia();
  const videoRef = useRef(null);
  useEffect(() => {
    const attachLocalStream = async () => {
      let localStream = await enableStream();
      let cloned = localStream.clone();
      cloned.getAudioTracks().forEach((t) => (t.enabled = false));
      setStatus('ready');
      setStream(cloned);
    };
    if (!remote) {
      attachLocalStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote]);
  useEffect(() => {
    if (videoRef && stream) {
      console.log('video ref', videoRef.current);
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    // 来自远程对方的消息
    emitter.on(EVENTS.CAMERA_CONTROL, ({ pid, type }) => {
      if (pid !== peerId) return;
      console.log('data connection msg in camra', pid, peerId, type);
      switch (type) {
        case 'CC_VIDEO_ON':
          setMedia({ type: 'video', enable: true });
          break;
        case 'CC_VIDEO_OFF':
          setMedia({ type: 'video', enable: false });
          break;

        case 'CC_AUDIO_ON':
          setMedia({ type: 'audio', enable: true });
          break;
        case 'CC_AUDIO_OFF':
          setMedia({ type: 'audio', enable: false });
          break;
        case 'CC_BG_ON':
          setBackground({ keep: true });
          break;
        case 'CC_BG_OFF':
          setBackground({ keep: false });
          break;

        default:
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);
  // 画中画
  const handlePin = () => {
    const { pin } = controls;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    if (!pin) {
      let videoEle = videoRef.current;
      videoEle
        .requestPictureInPicture()
        .then(() => {
          setControls((prev) => {
            return { ...prev, pin: true };
          });
          videoEle.onleavepictureinpicture = () => {
            setControls((prev) => {
              return { ...prev, pin: false };
            });
          };
        })
        .catch((error) => {
          // Error handling
          console.log('pip error', error);
        });
    }
  };
  // 音视频
  const setMedia = ({ type = 'video', enable = true }) => {
    console.log('start toggle media');
    const tracks = type == 'video' ? stream.getVideoTracks() : stream.getAudioTracks();
    tracks.forEach((t) => {
      t.enabled = enable;
    });
    setControls((prev) => {
      return { ...prev, [type]: enable };
    });
    // 如果是host，则同步给每个连接
    if (dataConnections) {
      let cmd = { type: `CC_${type.toUpperCase()}_${enable ? 'ON' : 'OFF'}` };
      Object.entries(dataConnections).forEach(([, conn]) => {
        console.log('send msg to connection', conn.peer);
        conn.send(cmd);
      });
    }
  };
  // 背景
  const setBackground = ({ keep = true }) => {
    setControls((prev) => {
      return { ...prev, bg: keep };
    });
    // 如果是host，则同步给每个连接
    if (dataConnections) {
      let cmd = { type: `CC_BG_${keep ? 'ON' : 'OFF'}` };
      Object.entries(dataConnections).forEach(([, conn]) => {
        console.log('send msg to connection', conn.peer);
        conn.send(cmd);
      });
    }
  };
  const handleMediaControl = ({ target }) => {
    if (remote) return;
    const { type, status } = target.dataset;
    setMedia({ type, enable: status !== 'true' });
  };
  const handleBgControl = ({ target }) => {
    if (remote) return;
    const { status } = target.dataset;
    setBackground({ keep: status !== 'true' });
  };
  if (status == 'loading') return <Loading />;
  const { pin, video, audio, bg } = controls;
  if (status == 'ready')
    return (
      <StyledWrapper data-peer={peerId} className={remote ? 'remote' : ''}>
        <div className={`video ${!bg ? 'hidden' : ''}`}>
          <Username />
          <div className="opts">
            <button
              className="opt bg"
              onClick={handleBgControl}
              data-status={bg}
              title={tipRemoveBg}
            ></button>
            <button
              className="opt video"
              onClick={handleMediaControl}
              data-type={'video'}
              data-status={video}
              title={tipVideo}
            ></button>
            <button
              className="opt audio"
              onClick={handleMediaControl}
              data-type={'audio'}
              data-status={audio}
              title={tipAudio}
            ></button>
            <button
              className="opt pin"
              onClick={handlePin}
              data-status={pin}
              title={tipPin}
            ></button>
          </div>
          {!video && <OffMask />}
          {!bg && <BgOffMask video={videoRef.current} />}
          <video ref={videoRef} playsInline autoPlay muted={remote ? false : 'muted'}></video>
        </div>
      </StyledWrapper>
    );
}
