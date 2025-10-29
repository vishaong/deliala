// 설정 데이터를 로컬 스토리지에 저장/로드하는 서비스

const SETTINGS_KEY = 'deliala_settings';

// 기본 설정값
const DEFAULT_SETTINGS = {
  slackWebhookUrl: '',
  monitoringInterval: 30, // 30분
  notifyOnShipment: false,
  notifyOnDelay: true,
  notifyOnDelivery: false,
  notifyOnException: false
};

// 설정 저장
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return false;
  }
};

// 설정 로드
export const getSettings = () => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      const savedSettings = JSON.parse(data);
      // 기본값과 병합하여 누락된 설정이 있으면 기본값으로 채움
      return { ...DEFAULT_SETTINGS, ...savedSettings };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('설정 로드 실패:', error);
    return DEFAULT_SETTINGS;
  }
};

// 설정 초기화
export const clearSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch (error) {
    console.error('설정 초기화 실패:', error);
    return false;
  }
};
