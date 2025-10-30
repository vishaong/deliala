import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trackDelivery } from '../services/api';
import { updateTrackingData, deleteTrackingData, getTrackingData } from '../services/trackingStorage';

function TrackingDetail() {
  const navigate = useNavigate();
  const { trackingNumber } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    trackingNumber: '',
    carrierCode: '',
    carrierName: ''
  });

  const getStatusText = (trackingResult) => {
    if (!trackingResult) return '정보 없음';
    const noEvents = !trackingResult.trackingDetails || trackingResult.trackingDetails.length === 0;
    if (noEvents) return '미출고';
    return trackingResult.complete ? '배송완료' : '배송중';
  };

  useEffect(() => {
    loadTrackingData();
  }, [trackingNumber]);

  // 송장 데이터 로드
  const loadTrackingData = () => {
    const allData = getTrackingData();
    const data = allData.find(item => item.trackingNumber === trackingNumber);
    if (data) {
      setTrackingData(data);
      setEditForm({
        trackingNumber: data.trackingNumber,
        carrierCode: data.carrierCode,
        carrierName: data.carrierName
      });
    } else {
      setError('송장 정보를 찾을 수 없습니다.');
    }
  };

  // 배송 정보 새로고침
  const handleRefresh = async () => {
    if (!trackingData) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await trackDelivery(trackingData.carrierCode, trackingData.trackingNumber);
      
      const updatedData = {
        ...trackingData,
        trackingResult: response,
        lastUpdated: new Date().toISOString()
      };
      
      updateTrackingData(trackingData.trackingNumber, updatedData);
      setTrackingData(updatedData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 송장 삭제
  const handleDelete = () => {
    if (window.confirm('이 송장을 삭제하시겠습니까?')) {
      deleteTrackingData(trackingNumber);
      navigate('/');
    }
  };

  // 수정 모드 토글
  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // 수정 취소 시 원래 데이터로 복원
      setEditForm({
        trackingNumber: trackingData.trackingNumber,
        carrierCode: trackingData.carrierCode,
        carrierName: trackingData.carrierName
      });
    }
  };

  // 수정 폼 저장
  const handleSaveEdit = () => {
    if (!editForm.trackingNumber.trim()) {
      setError('송장번호를 입력해주세요.');
      return;
    }

    const updatedData = {
      ...trackingData,
      trackingNumber: editForm.trackingNumber.trim(),
      carrierCode: editForm.carrierCode,
      carrierName: editForm.carrierName,
      lastUpdated: new Date().toISOString()
    };

    updateTrackingData(trackingData.trackingNumber, updatedData);
    setTrackingData(updatedData);
    setIsEditing(false);
    
    // URL 업데이트 (새 송장번호로)
    if (editForm.trackingNumber !== trackingData.trackingNumber) {
      navigate(`/tracking/${editForm.trackingNumber}`, { replace: true });
    }
  };

  if (!trackingData) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">
            {error || '송장 정보를 불러올 수 없습니다.'}
          </div>
          <button onClick={() => navigate('/')} className="btn">
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 헤더 */}
      <div className="card">
        <div className="detail-header">
          <button onClick={() => navigate('/')} className="btn-back">
            ← 메인으로
          </button>
          <div className="detail-title">
            <h1>송장 상세정보</h1>
            <div className="tracking-number-large">{trackingData.trackingNumber}</div>
          </div>
          <div className="detail-actions">
            <button onClick={handleRefresh} className="btn-small btn-secondary" disabled={loading}>
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
            <button onClick={toggleEdit} className="btn-small btn-primary">
              {isEditing ? '취소' : '수정'}
            </button>
            <button onClick={handleDelete} className="btn-small btn-danger">
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 수정 폼 */}
      {isEditing && (
        <div className="card">
          <h2>송장 정보 수정</h2>
          <div className="form-group">
            <label>송장번호</label>
            <input
              type="text"
              value={editForm.trackingNumber}
              onChange={(e) => setEditForm({...editForm, trackingNumber: e.target.value})}
              placeholder="송장번호를 입력하세요"
            />
          </div>
          <div className="form-group">
            <label>택배사</label>
            <input
              type="text"
              value={editForm.carrierName}
              onChange={(e) => setEditForm({...editForm, carrierName: e.target.value})}
              placeholder="택배사명을 입력하세요"
            />
          </div>
          <button onClick={handleSaveEdit} className="btn">
            저장
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* 배송 정보 */}
      <div className="card tracking-result">
        <h2>배송 정보</h2>
        
        {/* 기본 정보 */}
        <div className="tracking-info">
          <div className="info-item">
            <div className="info-label">택배사</div>
            <div className="info-value">{trackingData.carrierName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">송장번호</div>
            <div className="info-value">{trackingData.trackingNumber}</div>
          </div>
          <div className="info-item">
            <div className="info-label">배송 상태</div>
            <div className="info-value">
              {getStatusText(trackingData.trackingResult)}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">배송자</div>
            <div className="info-value">
              {trackingData.trackingResult?.deliveryMan || '정보 없음'}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">등록일</div>
            <div className="info-value">
              {new Date(trackingData.createdAt).toLocaleString('ko-KR')}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">마지막 업데이트</div>
            <div className="info-value">
              {new Date(trackingData.lastUpdated).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 배송 단계 */}
        {trackingData.trackingResult?.trackingDetails && trackingData.trackingResult.trackingDetails.length > 0 && (
          <div className="tracking-steps">
            <h3>배송 진행 상황</h3>
            {trackingData.trackingResult.trackingDetails.map((step, index) => {
              const isLastStep = index === trackingData.trackingResult.trackingDetails.length - 1;
              const isCurrentStep = !trackingData.trackingResult.complete && isLastStep;
              
              return (
                <div 
                  key={index} 
                  className={`step ${trackingData.trackingResult.complete ? 'completed' : isCurrentStep ? 'current' : ''}`}
                >
                  <div className="step-icon">
                    {trackingData.trackingResult.complete ? '✓' : isCurrentStep ? '●' : '○'}
                  </div>
                  <div className="step-content">
                    <div>{step.where}</div>
                    <div className="step-time">{step.timeString}</div>
                    {step.kind && (
                      <div className="step-location">{step.kind}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!trackingData.trackingResult?.trackingDetails || trackingData.trackingResult.trackingDetails.length === 0) && (
          <div className="no-tracking-info">
            <p>배송 정보가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackingDetail;
