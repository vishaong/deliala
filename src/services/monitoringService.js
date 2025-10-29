// 배송 상태 모니터링 서비스

import { trackDelivery } from './api';
import { updateTrackingData, getTrackingData } from './trackingStorage';
import { getSettings } from './settingsStorage';
import { sendSlackNotification, createNotificationMessage } from './slackService';

class MonitoringService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // 모니터링 시작
  start() {
    if (this.isRunning) {
      console.log('모니터링이 이미 실행 중입니다.');
      return;
    }

    const settings = getSettings();
    if (!settings.slackWebhookUrl) {
      console.log('슬랙 웹후크 URL이 설정되지 않아 모니터링을 시작할 수 없습니다.');
      return;
    }

    this.isRunning = true;
    const intervalMs = settings.monitoringInterval * 60 * 1000; // 분을 밀리초로 변환
    
    console.log(`모니터링을 시작합니다. 주기: ${settings.monitoringInterval}분`);
    
    // 즉시 한 번 실행
    this.checkAllTrackings();
    
    // 주기적으로 실행
    this.intervalId = setInterval(() => {
      this.checkAllTrackings();
    }, intervalMs);
  }

  // 모니터링 중지
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('모니터링이 중지되었습니다.');
  }

  // 모든 송장 상태 확인
  async checkAllTrackings() {
    try {
      const trackingList = getTrackingData();
      if (trackingList.length === 0) {
        return;
      }

      console.log(`${trackingList.length}개의 송장을 확인합니다.`);

      for (const trackingData of trackingList) {
        await this.checkTrackingStatus(trackingData);
        // API 호출 간격 조절 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('송장 상태 확인 중 오류:', error);
    }
  }

  // 개별 송장 상태 확인
  async checkTrackingStatus(trackingData) {
    try {
      const currentResult = trackingData.trackingResult;
      const newResult = await trackDelivery(trackingData.carrierCode, trackingData.trackingNumber);
      
      // 상태 변화 감지
      const statusChanged = this.detectStatusChange(currentResult, newResult);
      
      if (statusChanged) {
        console.log(`송장 ${trackingData.trackingNumber}의 상태가 변경되었습니다.`);
        
        // 데이터 업데이트
        const updatedData = {
          ...trackingData,
          trackingResult: newResult,
          lastUpdated: new Date().toISOString()
        };
        updateTrackingData(trackingData.trackingNumber, updatedData);
        
        // 알림 전송
        await this.sendNotifications(trackingData, newResult, currentResult);
      }
    } catch (error) {
      console.error(`송장 ${trackingData.trackingNumber} 확인 중 오류:`, error);
    }
  }

  // 상태 변화 감지
  detectStatusChange(oldResult, newResult) {
    if (!oldResult && newResult) {
      return true; // 처음 조회 성공
    }
    
    if (!oldResult || !newResult) {
      return false;
    }

    // 배송 완료 상태 변화
    if (oldResult.complete !== newResult.complete) {
      return true;
    }

    // 배송 단계 변화
    const oldSteps = oldResult.trackingDetails || [];
    const newSteps = newResult.trackingDetails || [];
    
    if (oldSteps.length !== newSteps.length) {
      return true;
    }

    // 마지막 단계의 내용 변화
    if (oldSteps.length > 0 && newSteps.length > 0) {
      const lastOldStep = oldSteps[oldSteps.length - 1];
      const lastNewStep = newSteps[newSteps.length - 1];
      
      return lastOldStep.where !== lastNewStep.where || 
             lastOldStep.timeString !== lastNewStep.timeString;
    }

    return false;
  }

  // 알림 전송
  async sendNotifications(trackingData, newResult, oldResult) {
    const settings = getSettings();
    if (!settings.slackWebhookUrl) {
      return;
    }

    try {
      // 출고 시 알림
      if (settings.notifyOnShipment && this.isFirstShipment(newResult, oldResult)) {
        const message = createNotificationMessage('shipment', trackingData);
        await sendSlackNotification(settings.slackWebhookUrl, message);
      }

      // 배송 완료 시 알림
      if (settings.notifyOnDelivery && newResult.complete && !oldResult?.complete) {
        const message = createNotificationMessage('delivery', trackingData);
        await sendSlackNotification(settings.slackWebhookUrl, message);
      }

      // 출고지연 시 알림 (48시간 체크)
      if (settings.notifyOnDelay && this.isDelayed(trackingData)) {
        const message = createNotificationMessage('delay', trackingData);
        await sendSlackNotification(settings.slackWebhookUrl, message);
      }

      // 배송 예외 시 알림
      if (settings.notifyOnException && this.hasException(newResult)) {
        const message = createNotificationMessage('exception', trackingData);
        await sendSlackNotification(settings.slackWebhookUrl, message);
      }
    } catch (error) {
      console.error('알림 전송 실패:', error);
    }
  }

  // 첫 출고 여부 확인
  isFirstShipment(newResult, oldResult) {
    if (!newResult.trackingDetails || newResult.trackingDetails.length === 0) {
      return false;
    }

    // 이전에 배송 정보가 없었거나, 새로운 배송 단계가 추가된 경우
    return !oldResult || 
           !oldResult.trackingDetails || 
           newResult.trackingDetails.length > oldResult.trackingDetails.length;
  }

  // 출고지연 여부 확인 (48시간)
  isDelayed(trackingData) {
    const createdAt = new Date(trackingData.createdAt);
    const now = new Date();
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);
    
    // 48시간 이상 지났고 아직 배송이 시작되지 않은 경우
    return hoursDiff >= 48 && 
           (!trackingData.trackingResult || 
            !trackingData.trackingResult.trackingDetails || 
            trackingData.trackingResult.trackingDetails.length === 0);
  }

  // 배송 예외 여부 확인
  hasException(trackingResult) {
    if (!trackingResult.trackingDetails || trackingResult.trackingDetails.length === 0) {
      return false;
    }

    const lastStep = trackingResult.trackingDetails[trackingResult.trackingDetails.length - 1];
    const exceptionKeywords = ['반송', '지연', '예외', '오류', '문제', '불가'];
    
    return exceptionKeywords.some(keyword => 
      lastStep.where.includes(keyword) || 
      (lastStep.kind && lastStep.kind.includes(keyword))
    );
  }

  // 모니터링 상태 확인
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// 싱글톤 인스턴스
const monitoringService = new MonitoringService();

export default monitoringService;
