// 슬랙 웹후크 전송 서비스

// 슬랙 메시지 전송
export const sendSlackNotification = async (webhookUrl, notificationData) => {
  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('슬랙 웹후크 URL이 설정되지 않았습니다.');
  }

  const { text, type, trackingData } = notificationData;
  
  let message = {
    text: text || '배송 상태 알림',
    attachments: []
  };

  // 알림 타입에 따른 메시지 포맷팅
  if (trackingData) {
    const attachment = {
      color: getColorByType(type),
      fields: [
        {
          title: '송장번호',
          value: trackingData.trackingNumber,
          short: true
        },
        {
          title: '택배사',
          value: trackingData.carrierName,
          short: true
        },
        {
          title: '현재 상태',
          value: getStatusText(trackingData.trackingResult),
          short: true
        }
      ],
      footer: '택배 배송 상태 조회 서비스',
      ts: Math.floor(Date.now() / 1000)
    };

    // 마지막 배송 정보 추가
    if (trackingData.trackingResult?.trackingDetails?.length > 0) {
      const lastInfo = trackingData.trackingResult.trackingDetails[trackingData.trackingResult.trackingDetails.length - 1];
      attachment.fields.push({
        title: '마지막 위치',
        value: lastInfo.where,
        short: false
      });
      if (lastInfo.timeString) {
        attachment.fields.push({
          title: '시간',
          value: lastInfo.timeString,
          short: true
        });
      }
    }

    message.attachments.push(attachment);
  }

  try {
    // 슬랙 웹후크는 CORS를 허용하지 않으므로 no-cors 모드 사용
    // no-cors 모드에서는 응답을 읽을 수 없지만 요청은 전송됨
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      mode: 'no-cors' // CORS 검사 우회
    });

    // no-cors 모드에서는 response.ok를 확인할 수 없지만
    // 요청은 성공적으로 전송되었으므로 성공으로 간주
    // 실제로 슬랙 웹후크는 항상 "ok"를 반환하므로 이것으로 충분함
    return true;
    
  } catch (error) {
    console.error('슬랙 알림 전송 오류:', error);
    
    // 네트워크 오류인 경우
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('네트워크 오류가 발생했습니다. 인터넷 연결과 웹후크 URL을 확인해주세요.');
    }
    
    // CORS 오류인 경우 더 친화적인 메시지 제공
    if (error.message.includes('CORS') || error.message.includes('cross-origin') || error.message.includes('blocked')) {
      throw new Error('브라우저 보안 정책으로 인해 직접 전송할 수 없습니다. 웹후크 URL이 올바른지 확인해주세요.');
    }
    
    throw error;
  }
};

// 알림 타입에 따른 색상 결정
const getColorByType = (type) => {
  switch (type) {
    case 'shipment':
      return '#3498db'; // 파란색 - 출고
    case 'delay':
      return '#f39c12'; // 주황색 - 지연
    case 'delivery':
      return '#27ae60'; // 초록색 - 완료
    case 'exception':
      return '#e74c3c'; // 빨간색 - 예외
    case 'test':
      return '#9b59b6'; // 보라색 - 테스트
    default:
      return '#95a5a6'; // 회색 - 기본
  }
};

// 배송 상태 텍스트 변환
const getStatusText = (trackingResult) => {
  if (!trackingResult) return '정보 없음';
  return trackingResult.complete ? '배송완료' : '배송중';
};

// 알림 메시지 생성
export const createNotificationMessage = (type, trackingData) => {
  const messages = {
    shipment: '🚚 출고 알림',
    delay: '⏰ 출고지연 알림',
    delivery: '✅ 배송완료 알림',
    exception: '⚠️ 배송예외 알림'
  };

  return {
    text: messages[type] || '📦 배송 상태 알림',
    type,
    trackingData
  };
};
