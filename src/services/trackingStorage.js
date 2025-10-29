// 송장 데이터를 로컬 스토리지에 저장/로드하는 서비스

const STORAGE_KEY = 'deliala_tracking_data';

// 송장 데이터 저장
export const saveTrackingData = (trackingData) => {
  try {
    const existingData = getTrackingData();
    const updatedData = [...existingData, trackingData];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return true;
  } catch (error) {
    console.error('송장 데이터 저장 실패:', error);
    return false;
  }
};

// 모든 송장 데이터 로드
export const getTrackingData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('송장 데이터 로드 실패:', error);
    return [];
  }
};

// 특정 송장 데이터 업데이트
export const updateTrackingData = (trackingNumber, updatedData) => {
  try {
    const allData = getTrackingData();
    const updatedAllData = allData.map(item => 
      item.trackingNumber === trackingNumber ? { ...item, ...updatedData } : item
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAllData));
    return true;
  } catch (error) {
    console.error('송장 데이터 업데이트 실패:', error);
    return false;
  }
};

// 특정 송장 데이터 삭제
export const deleteTrackingData = (trackingNumber) => {
  try {
    const allData = getTrackingData();
    const filteredData = allData.filter(item => item.trackingNumber !== trackingNumber);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredData));
    return true;
  } catch (error) {
    console.error('송장 데이터 삭제 실패:', error);
    return false;
  }
};

// 송장 데이터 초기화
export const clearTrackingData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('송장 데이터 초기화 실패:', error);
    return false;
  }
};
