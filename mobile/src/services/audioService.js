import { Platform } from 'react-native';

/**
 * Audio Service
 * Cihaz mikrofonu ile ses kaydı alma ve oynatma işlemlerini yöneten servis katmanı.
 * Expo SDK 52+ / 57+ ile uyumlu olan expo-audio modülünü dinamik olarak yükler.
 * Eğer mevcut çalışma ortamında (Expo Go / Emulator) native modül eksikse
 * uygulamanın çökmesini (red screen) önler ve güvenli fallback sunar.
 */

let ExpoAudioModule = null;
let isAudioAvailable = false;

try {
  // expo-audio modülünü dinamik ve güvenli bir şekilde yükle
  const expoAudio = require('expo-audio');
  if (expoAudio && (expoAudio.AudioModule || expoAudio.createAudioPlayer || expoAudio.requestRecordingPermissionsAsync)) {
    ExpoAudioModule = expoAudio;
    isAudioAvailable = true;
  }
} catch (error) {
  console.warn('[audioService] expo-audio yerel modülü mevcut değil veya yüklenemedi:', error?.message);
  isAudioAvailable = false;
}

/**
 * Mevcut cihaz/çalışma ortamında ses kaydı ve oynatmanın desteklenip desteklenmediğini döndürür.
 * @returns {boolean}
 */
export const isAudioSupported = () => {
  return isAudioAvailable;
};

/**
 * Kullanıcıdan mikrofon kayıt izni ister.
 * @returns {Promise<boolean>} İzin verildiyse true, aksi halde false
 */
export const requestAudioPermissions = async () => {
  if (!isAudioAvailable || !ExpoAudioModule) {
    return false;
  }

  try {
    const response = await ExpoAudioModule.requestRecordingPermissionsAsync();
    return response?.granted === true || response?.status === 'granted';
  } catch (err) {
    console.warn('[audioService] requestAudioPermissions hatası:', err);
    return false;
  }
};

/**
 * Ses kaydını başlatır.
 * @returns {Promise<any>} Başlatılan recorder nesnesi
 */
export const startRecording = async () => {
  if (!isAudioAvailable || !ExpoAudioModule) {
    throw new Error('Ses kayıt modülü bu ortamda desteklenmiyor.');
  }

  try {
    // Ses modunu yapılandır
    if (ExpoAudioModule.setAudioModeAsync) {
      await ExpoAudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
    }

    const preset = ExpoAudioModule.RecordingPresets?.HIGH_QUALITY || {
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      android: {
        outputFormat: 'mpeg4',
        audioEncoder: 'aac',
      },
      ios: {
        outputFormat: 'aac ',
        audioQuality: 127,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };

    const recorder = new ExpoAudioModule.AudioModule.AudioRecorder(preset);
    await recorder.prepareToRecordAsync();
    recorder.record();
    return recorder;
  } catch (err) {
    console.warn('[audioService] startRecording hatası:', err);
    throw err;
  }
};

/**
 * Devam eden ses kaydını durdurur ve kaydedilen dosyanın yerel dosya yolunu (URI) döndürür.
 * @param {any} recorder startRecording ile oluşturulan nesne
 * @returns {Promise<string>} Kaydedilen ses dosyasının yerel URI'si
 */
export const stopRecording = async (recorder) => {
  if (!recorder) return null;

  try {
    await recorder.stop();
    const uri = recorder.uri;

    // Oynatma moduna geri dön
    if (ExpoAudioModule?.setAudioModeAsync) {
      await ExpoAudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => {});
    }

    return uri;
  } catch (err) {
    console.warn('[audioService] stopRecording hatası:', err);
    throw err;
  }
};

/**
 * Belirtilen ses dosyasını (yerel URI veya uzak URL) oynatmak üzere bir ses çalar nesnesi oluşturur.
 * @param {string} sourceUri Ses dosyasının URI veya URL adresi
 * @param {Function} onFinish Çalma bittiğinde tetiklenecek callback
 * @returns {any} AudioPlayer nesnesi (play, pause, release metodları ile)
 */
export const createPlayer = (sourceUri, onFinish = null) => {
  if (!isAudioAvailable || !ExpoAudioModule || !sourceUri) {
    return null;
  }

  try {
    const player = ExpoAudioModule.createAudioPlayer(sourceUri);

    let subscription = null;
    if (player && player.addListener) {
      subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (status && status.didJustFinish) {
          if (typeof onFinish === 'function') {
            onFinish();
          }
        }
      });
    }

    return {
      rawPlayer: player,
      play: () => {
        try {
          player.play();
        } catch (e) {
          console.warn('[audioService] player.play hatası:', e);
        }
      },
      pause: () => {
        try {
          player.pause();
        } catch (e) {
          console.warn('[audioService] player.pause hatası:', e);
        }
      },
      release: () => {
        try {
          if (subscription && subscription.remove) {
            subscription.remove();
          }
          if (player.pause) {
            player.pause();
          }
          if (player.release) {
            player.release();
          } else if (player.remove) {
            player.remove();
          }
        } catch (e) {
          // Sessizce geç
        }
      },
    };
  } catch (err) {
    console.warn('[audioService] createPlayer hatası:', err);
    return null;
  }
};

export default {
  isAudioSupported,
  requestAudioPermissions,
  startRecording,
  stopRecording,
  createPlayer,
};
