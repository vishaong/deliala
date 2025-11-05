import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCarrierList, trackDelivery } from '../services/api';
import { saveTrackingData, getTrackingData, deleteTrackingData } from '../services/trackingStorage';
import monitoringService from '../services/monitoringService';

function MainPage() {
  const navigate = useNavigate();
  const [carriers, setCarriers] = useState([]);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [trackingNumbers, setTrackingNumbers] = useState('');
  const [trackingList, setTrackingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTrackings, setSelectedTrackings] = useState(new Set());

  // 컴포넌트 마운트 시 택배사 목록과 저장된 송장 데이터 로드
  useEffect(() => {
    loadCarriers();
    loadTrackingList();
    
    // 모니터링 서비스 시작
    monitoringService.start();
    
    // 컴포넌트 언마운트 시 모니터링 중지
    return () => {
      monitoringService.stop();
    };
  }, []);

  // 택배사 목록 로드
  const loadCarriers = async () => {
    try {
      const response = await getCarrierList();
      setCarriers(response.Company || []);
      // 성공 시 에러 메시지 초기화
      if (error && error.includes('API 키')) {
        setError('');
      }
    } catch (err) {
      console.error('택배사 목록 로드 오류:', err);
      if (err.message && err.message.includes('API 키')) {
        setError('API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 입력해주세요.');
      } else {
        setError(err.message || '택배사 목록을 불러오는데 실패했습니다.');
      }
    }
  };

  // 저장된 송장 목록 로드
  const loadTrackingList = () => {
    const data = getTrackingData();
    setTrackingList(data);
    // 목록이 변경되면 선택 상태도 초기화 (삭제된 항목 제거)
    setSelectedTrackings(prev => {
      const newSet = new Set();
      const trackingNumbers = new Set(data.map(item => item.trackingNumber));
      prev.forEach(num => {
        if (trackingNumbers.has(num)) {
          newSet.add(num);
        }
      });
      return newSet;
    });
  };

  // 송장번호 입력 처리 (스페이스, 엔터, 쉼표로 구분)
  const handleTrackingNumbersChange = (e) => {
    setTrackingNumbers(e.target.value);
  };

  // 송장번호 파싱
  const parseTrackingNumbers = (input) => {
    return input
      .split(/[\s\n,]+/)
      .map(num => num.trim())
      .filter(num => num.length > 0);
  };

  // 배송 추적
  const handleTrackingSubmit = async (e) => {
    e.preventDefault();
    
    const numbers = parseTrackingNumbers(trackingNumbers);
    if (numbers.length === 0) {
      setError('송장번호를 입력해주세요.');
      return;
    }

    if (!selectedCarrier) {
      setError('택배사를 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const carrierName = carriers.find(c => c.Code === selectedCarrier)?.Name || selectedCarrier;
      
      // 각 송장번호에 대해 배송 정보 조회
      for (const trackingNumber of numbers) {
        try {
          const response = await trackDelivery(selectedCarrier, trackingNumber);
          
          // 송장 데이터 저장
          const trackingData = {
            id: Date.now() + Math.random(), // 고유 ID
            trackingNumber,
            carrierCode: selectedCarrier,
            carrierName,
            trackingResult: response,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
          
          saveTrackingData(trackingData);
        } catch (err) {
          console.error(`송장번호 ${trackingNumber} 조회 실패:`, err);
          // 개별 송장 조회 실패는 무시하고 계속 진행
        }
      }
      
      // 송장 목록 새로고침
      loadTrackingList();
      setTrackingNumbers('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 송장 상세보기로 이동
  const handleViewDetails = (trackingData) => {
    navigate(`/tracking/${trackingData.trackingNumber}`, { state: { trackingData } });
  };

  // 송장 삭제
  const handleDeleteTracking = (trackingNumber) => {
    if (window.confirm('이 송장을 삭제하시겠습니까?')) {
      deleteTrackingData(trackingNumber);
      loadTrackingList();
      // 선택 목록에서도 제거
      setSelectedTrackings(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackingNumber);
        return newSet;
      });
    }
  };

  // 개별 송장 선택/해제
  const handleToggleTracking = (trackingNumber) => {
    setSelectedTrackings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackingNumber)) {
        newSet.delete(trackingNumber);
      } else {
        newSet.add(trackingNumber);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const handleToggleAll = () => {
    if (selectedTrackings.size === trackingList.length) {
      // 모두 선택된 경우 모두 해제
      setSelectedTrackings(new Set());
    } else {
      // 모두 선택
      setSelectedTrackings(new Set(trackingList.map(item => item.trackingNumber)));
    }
  };

  // 선택된 송장 일괄 삭제
  const handleDeleteSelected = () => {
    if (selectedTrackings.size === 0) {
      return;
    }

    const count = selectedTrackings.size;
    if (window.confirm(`선택한 ${count}개의 송장을 삭제하시겠습니까?`)) {
      selectedTrackings.forEach(trackingNumber => {
        deleteTrackingData(trackingNumber);
      });
      setSelectedTrackings(new Set());
      loadTrackingList();
    }
  };

  // 배송 상태 텍스트 변환
  const getStatusText = (trackingResult) => {
    if (!trackingResult) return '정보 없음';
    const noEvents = !trackingResult.trackingDetails || trackingResult.trackingDetails.length === 0;
    if (noEvents) return '미출고';
    return trackingResult.complete ? '배송완료' : '배송중';
  };

  // 마지막 배송 정보 가져오기
  const getLastTrackingInfo = (trackingResult) => {
    if (!trackingResult || !trackingResult.trackingDetails || trackingResult.trackingDetails.length === 0) {
      return { where: '정보 없음', timeString: '' };
    }
    return trackingResult.trackingDetails[trackingResult.trackingDetails.length - 1];
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📦 Deli-Alarm</h1>
        <p>출고와 배송을 편하게 관리하면 좋잖아.</p>
      </div>

      {/* 배송 추적 폼 */}
      <div className="card">
        <div className="card-header">
          <h2>새 송장번호 추가</h2>
          <button onClick={() => navigate('/settings')} className="btn-small btn-secondary">
            ⚙️ 설정
          </button>
        </div>
        <form onSubmit={handleTrackingSubmit}>
          <div className="form-group">
            <label htmlFor="carrier">택배사</label>
            <select
              id="carrier"
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              required
              disabled={carriers.length === 0}
            >
              <option value="">
                {carriers.length === 0 ? '택배사 목록을 불러오는 중...' : '택배사를 선택하세요'}
              </option>
              {carriers.map((carrier) => (
                <option key={carrier.Code} value={carrier.Code}>
                  {carrier.Name}
                </option>
              ))}
            </select>
            {carriers.length === 0 && !error && (
              <small style={{ color: '#7f8c8d', marginTop: '5px', display: 'block' }}>
                택배사 목록을 불러오는 중입니다...
              </small>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="trackingNumbers">송장번호 (여러 개 입력 가능)</label>
            <textarea
              id="trackingNumbers"
              value={trackingNumbers}
              onChange={handleTrackingNumbersChange}
              placeholder="송장번호를 입력하세요. 여러 개는 스페이스, 엔터, 또는 쉼표로 구분하세요."
              required
            />
            <small style={{ color: '#7f8c8d', marginTop: '5px', display: 'block' }}>
              예: 1234567890 9876543210 또는 한 줄에 하나씩 입력
            </small>
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? '조회 중...' : '배송 상태 조회'}
          </button>
        </form>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error">
          <div style={{ marginBottom: error.includes('API 키') ? '10px' : '0' }}>
            {error}
          </div>
          {error.includes('API 키') && (
            <button 
              onClick={() => navigate('/settings')} 
              className="btn"
              style={{ marginTop: '10px', width: 'auto' }}
            >
              설정 페이지로 이동
            </button>
          )}
        </div>
      )}

      {/* 송장 목록 */}
      {trackingList.length > 0 && (
        <div className="card">
          <div className="tracking-list-header">
            <h2>송장 목록 ({trackingList.length}개)</h2>
            <div className="tracking-list-actions">
              {selectedTrackings.size > 0 && (
                <>
                  <span className="selected-count">
                    {selectedTrackings.size}개 선택됨
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    className="btn-small btn-danger"
                  >
                    선택 삭제
                  </button>
                </>
              )}
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTrackings.size === trackingList.length && trackingList.length > 0}
                  onChange={handleToggleAll}
                />
                <span>전체 선택</span>
              </label>
            </div>
          </div>
          <div className="tracking-list">
            {trackingList.map((item) => {
              const lastInfo = getLastTrackingInfo(item.trackingResult);
              return (
                <div key={item.id} className="tracking-item">
                  <div className="tracking-item-header">
                    <div className="tracking-item-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTrackings.has(item.trackingNumber)}
                        onChange={() => handleToggleTracking(item.trackingNumber)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="tracking-item-info">
                      <div className="tracking-number">{item.trackingNumber}</div>
                      <div className="carrier-name">{item.carrierName}</div>
                    </div>
                    <div className="tracking-item-actions">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="btn-small btn-primary"
                      >
                        상세보기
                      </button>
                      <button
                        onClick={() => handleDeleteTracking(item.trackingNumber)}
                        className="btn-small btn-danger"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="tracking-item-details">
                    <div className={`status-badge ${!item.trackingResult?.complete ? 'in-progress' : ''}`}>
                      {getStatusText(item.trackingResult)}
                    </div>
                    <div className="last-info">
                      <div className="last-location">{lastInfo.where}</div>
                      <div className="last-time">{lastInfo.timeString}</div>
                    </div>
                    <div className="created-date">
                      등록일: {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trackingList.length === 0 && (
        <div className="card">
          <div style={{ textAlign: 'center', color: '#7f8c8d', padding: '40px' }}>
            <h3>등록된 송장이 없습니다</h3>
            <p>위의 폼을 사용하여 송장번호를 추가해보세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainPage;
