import { useState, useRef, useEffect } from 'react';
import settingIcn from '../../assets/icons/settings.svg';
import playIcn from '../../assets/icons/player-play.svg';
import pauseIcn from '../../assets/icons/player-pause.svg';
import playerRewIcn from '../../assets/icons/player-rew.svg';
import playerffIcon from '../../assets/icons/player-ff.svg';
import micIcon from '../../assets/icons/microphone.svg';
import playerListIcn from '../../assets/icons/player-list.svg';
import volumeUpIcn from '../../assets/icons/volume-up.svg';
import volumeOffIcn from '../../assets/icons/volume-off.svg';
import './QuranPlayer.scss';

const QuranPlayer = ({ currentVerseId }) => {
  const audioRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    volume: 1,
    isMuted: false,
    showVolumeControl: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
  });

  // Update audio source when a new Verse is selected
  useEffect(() => {
    if (currentVerseId && audioRef.current) {
      audioRef.current.src = `/assets/audio/${currentVerseId}.mp3`;
      playAudio();
    }
  }, [currentVerseId]);

  const playAudio = () => {
    audioRef.current.play();
    setAudioState((prev) => ({ ...prev, isPlaying: true }));
  };

  const pauseAudio = () => {
    audioRef.current.pause();
    setAudioState((prev) => ({ ...prev, isPlaying: false }));
  };

  const handlePlayPause = () => {
    audioState.isPlaying ? pauseAudio() : playAudio();
  };

  const handleSeek = (e) => {
    const newTime = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setAudioState((prev) => ({ ...prev, progress: e.target.value }));
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setAudioState((prev) => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  };

  const toggleMute = () => {
    const newVolume = audioState.isMuted ? audioState.volume : 0;
    audioRef.current.volume = newVolume;
    setAudioState((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
      volume: newVolume,
    }));
  };

  const updateProgress = () => {
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setAudioState((prev) => ({
      ...prev,
      currentTime: current,
      duration: total,
      progress: (current / total) * 100,
    }));
  };

  const toggleVolumeControl = () => {
    setAudioState((prev) => ({
      ...prev,
      showVolumeControl: !prev.showVolumeControl,
    }));
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <>
      <div
        className={`player__back ${isCollapsed ? 'player__back--collapsed' : ''}`}
      >
        <button
          type="button"
          className="player__toggle"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? 'Show player menu' : 'Hide player menu'}
        >
          {isCollapsed ? '▲' : '▼'}
        </button>
        <div className="player container">
          <audio ref={audioRef} onTimeUpdate={updateProgress} />

          <div
            className={`player__menu ${isCollapsed ? 'player__menu--hidden' : ''}`}
          >
            {/* Progress Bar with Time Display */}
            <div className="player__progress-container">
              <span className="player__time">
                {formatTime(audioState.currentTime)}
              </span>
              <input
                type="range"
                value={audioState.progress}
                onChange={handleSeek}
                max="100"
                className="player__progress-bar"
              />
              <span className="player__time">
                {formatTime(audioState.duration)}
              </span>
            </div>

            <div className="player__second-row">
              <img
                src={settingIcn}
                alt="setting icon"
                className="player__icn"
              />
              <img
                src={micIcon}
                alt="microphone icon"
                className="player__icn"
              />
              <div className="player__control">
                <img
                  src={playerRewIcn}
                  alt="player rewind icon"
                  className="player__icn"
                />
                <img
                  src={audioState.isPlaying ? pauseIcn : playIcn}
                  alt="play pause icon"
                  onClick={handlePlayPause}
                  className="player__play-pause"
                />
                <img
                  src={playerffIcon}
                  alt="player forward icon"
                  className="player__icn"
                />
              </div>
              <img
                src={playerListIcn}
                alt="player list icon"
                className="player__icn"
              />

              <div className="player__volume">
                <img
                  src={audioState.isMuted ? volumeOffIcn : volumeUpIcn}
                  alt="volume icon"
                  onClick={() => {
                    toggleMute();
                    toggleVolumeControl();
                  }}
                  className="player__icn"
                />
                {audioState.showVolumeControl && (
                  <input
                    type="range"
                    value={audioState.volume}
                    onChange={handleVolumeChange}
                    max="1"
                    step="0.01"
                    className="player__volume-control"
                  />
                )}
              </div>
            </div>
          </div>
        </div>{' '}
      </div>
    </>
  );
};

export default QuranPlayer;
