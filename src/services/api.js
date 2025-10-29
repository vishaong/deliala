import axios from 'axios';

const API_BASE_URL = 'https://info.sweettracker.co.kr';

// API 키를 로컬 스토리지에서 가져오는 함수
const getApiKey = () => {
  return localStorage.getItem('sweettracker_api_key');
};

// API 키를 로컬 스토리지에 저장하는 함수
export const saveApiKey = (apiKey) => {
  localStorage.setItem('sweettracker_api_key', apiKey);
};

// 택배사 목록 조회
export const getCarrierList = async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다.');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/companylist`, {
      params: {
        t_key: apiKey
      }
    });
    return response.data;
  } catch (error) {
    console.error('택배사 목록 조회 실패:', error);
    throw new Error('택배사 목록을 불러오는데 실패했습니다.');
  }
};

// 배송 추적
export const trackDelivery = async (carrierId, trackingNumber) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다.');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/trackingInfo`, {
      params: {
        t_key: apiKey,
        t_code: carrierId,
        t_invoice: trackingNumber
      }
    });
    return response.data;
  } catch (error) {
    console.error('배송 추적 실패:', error);
    if (error.response?.data?.msg) {
      throw new Error(error.response.data.msg);
    }
    throw new Error('배송 정보를 조회하는데 실패했습니다.');
  }
};
