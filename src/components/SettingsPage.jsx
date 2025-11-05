import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveSettings, getSettings } from '../services/settingsStorage';
import { saveApiKey } from '../services/api';

function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    apiKey: '',
    slackWebhookUrl: '',
    monitoringInterval: 30, // 기본 30분
    notifyOnShipment: false,
    notifyOnDelay: true,
    notifyOnDelivery: false,
    notifyOnException: false,
    autoDeleteCompleted: true // 배송 완료 후 4시간 자동 삭제
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedSettings = getSettings();
    const savedApiKey = localStorage.getItem('sweettracker_api_key');
    if (savedSettings) {
      setSettings({ ...settings, ...savedSettings, apiKey: savedApiKey || '' });
    } else {
      setSettings({ ...settings, apiKey: savedApiKey || '' });
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // API 키 저장
    if (settings.apiKey.trim()) {
      saveApiKey(settings.apiKey.trim());
    }
    
    // 다른 설정 저장
    const { apiKey, ...otherSettings } = settings;
    saveSettings(otherSettings);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestWebhook = async () => {
    if (!settings.slackWebhookUrl.trim()) {
      alert('슬랙 웹후크 URL을 먼저 입력해주세요.');
      return;
    }

    try {
      const { sendSlackNotification } = await import('../services/slackService');
      await sendSlackNotification(settings.slackWebhookUrl, {
        text: '🧪 테스트 알림입니다. 설정이 정상적으로 작동합니다!',
        type: 'test'
      });
      alert('테스트 알림이 전송되었습니다. 슬랙 채널을 확인해주세요.');
    } catch (error) {
      // CORS 오류인 경우 수동 테스트 방법 안내
      if (error.message.includes('브라우저 보안 정책') || error.message.includes('CORS')) {
        const manualTest = confirm(
          '브라우저 보안 정책으로 인해 자동 테스트가 불가능합니다.\n\n' +
          '수동으로 테스트하시겠습니까?\n' +
          '확인을 누르면 웹후크 URL이 클립보드에 복사됩니다.'
        );
        
        if (manualTest) {
          navigator.clipboard.writeText(settings.slackWebhookUrl).then(() => {
            alert(
              '웹후크 URL이 클립보드에 복사되었습니다.\n\n' +
              '다음 단계를 따라 테스트하세요:\n' +
              '1. Postman, curl, 또는 다른 도구를 사용\n' +
              '2. POST 요청으로 웹후크 URL 호출\n' +
              '3. Content-Type: application/json\n' +
              '4. Body: {"text": "테스트 메시지"}'
            );
          }).catch(() => {
            alert('클립보드 복사에 실패했습니다. 웹후크 URL을 수동으로 복사해주세요: ' + settings.slackWebhookUrl);
          });
        }
      } else {
        alert('테스트 알림 전송에 실패했습니다: ' + error.message);
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← 메인으로
        </button>
        <h1>⚙️ 설정</h1>
        <p>API 키, 알림 및 모니터링 설정을 관리하세요</p>
      </div>

      {/* API 키 설정 */}
      <div className="card">
        <h2>API 키 설정</h2>
        <div className="form-group">
          <label htmlFor="apiKey">스마트택배 API 키</label>
          <input
            type="password"
            id="apiKey"
            value={settings.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="API 키를 입력하세요"
            required
          />
          <small style={{ color: '#7f8c8d', marginTop: '5px', display: 'block' }}>
            스마트택배 API를 사용하기 위해 API 키가 필요합니다.
            <br />
            <a href="https://info.sweettracker.co.kr/apidoc" target="_blank" rel="noopener noreferrer" 
               style={{ color: '#3498db', textDecoration: 'none' }}>
              API 키 발급받기
            </a>
          </small>
        </div>
      </div>

      {/* 슬랙 웹후크 설정 */}
      <div className="card">
        <h2>슬랙 알림 설정</h2>
        <div className="form-group">
          <label htmlFor="webhookUrl">슬랙 웹후크 URL</label>
          <input
            type="url"
            id="webhookUrl"
            value={settings.slackWebhookUrl}
            onChange={(e) => handleInputChange('slackWebhookUrl', e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            required
          />
          <small style={{ color: '#7f8c8d', marginTop: '5px', display: 'block' }}>
            슬랙 웹후크 URL을 입력하면 배송 상태 변화 시 알림을 받을 수 있습니다.
            <br />
            <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" 
               style={{ color: '#3498db', textDecoration: 'none' }}>
              슬랙 웹후크 설정 방법 보기
            </a>
          </small>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button onClick={handleTestWebhook} className="btn-small btn-secondary">
            테스트 알림 전송
          </button>
        </div>
      </div>

      {/* 모니터링 설정 */}
      <div className="card">
        <h2>모니터링 설정</h2>
        <div className="form-group">
          <label htmlFor="monitoringInterval">모니터링 주기 (분)</label>
          <select
            id="monitoringInterval"
            value={settings.monitoringInterval}
            onChange={(e) => handleInputChange('monitoringInterval', parseInt(e.target.value))}
          >
            <option value={5}>5분</option>
            <option value={10}>10분</option>
            <option value={15}>15분</option>
            <option value={30}>30분</option>
            <option value={60}>1시간</option>
            <option value={120}>2시간</option>
            <option value={240}>4시간</option>
            <option value={480}>8시간</option>
            <option value={720}>12시간</option>
            <option value={1440}>24시간</option>
          </select>
          <small style={{ color: '#7f8c8d', marginTop: '5px', display: 'block' }}>
            등록된 송장의 배송 상태를 확인하는 주기입니다. 짧을수록 빠르게 알림을 받지만 API 사용량이 증가합니다.
          </small>
        </div>
        <div className="notification-item" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e1e8ed' }}>
          <div className="notification-info">
            <h3>배송 완료 자동 삭제</h3>
            <p>배송이 완료된 송장을 완료 후 4시간이 지나면 자동으로 삭제합니다</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.autoDeleteCompleted}
              onChange={(e) => handleInputChange('autoDeleteCompleted', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* 알림 옵션 */}
      <div className="card">
        <h2>알림 옵션</h2>
        <div className="notification-options">
          <div className="notification-item">
            <div className="notification-info">
              <h3>출고 시 알림</h3>
              <p>배송이 시작되면 알림을 받습니다</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.notifyOnShipment}
                onChange={(e) => handleInputChange('notifyOnShipment', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>출고지연 시 알림</h3>
              <p>등록 후 48시간 이내 미출고 시 알림을 받습니다</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.notifyOnDelay}
                onChange={(e) => handleInputChange('notifyOnDelay', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>배송 완료 시 알림</h3>
              <p>배송이 완료되면 알림을 받습니다</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.notifyOnDelivery}
                onChange={(e) => handleInputChange('notifyOnDelivery', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="notification-item">
            <div className="notification-info">
              <h3>배송 예외 시 알림</h3>
              <p>반송, 지연 등의 예외가 발생하면 알림을 받습니다</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.notifyOnException}
                onChange={(e) => handleInputChange('notifyOnException', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="card">
        <button onClick={handleSave} className="btn">
          설정 저장
        </button>
        {saved && (
          <div className="success" style={{ marginTop: '15px' }}>
            ✅ 설정이 저장되었습니다!
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
