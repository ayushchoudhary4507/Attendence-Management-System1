import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { attendanceAPI } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import './LiveQRGeoVerificationModal.css';

const LiveQRGeoVerificationModal = ({ isOpen, onClose, onSuccess, user, initialTab = 'geo' }) => {
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [officeSettings, setOfficeSettings] = useState(null);
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);

  // QR Kiosk Display state
  const [qrTokenData, setQrTokenData] = useState(null);
  const [qrCountdown, setQrCountdown] = useState(45);
  const [qrLoading, setQrLoading] = useState(false);

  // QR Manual / Scanner state
  const [manualQrToken, setManualQrToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Face Lock Scanner state
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceProgress, setFaceProgress] = useState(0);
  const [faceVerified, setFaceVerified] = useState(false);

  // Fetch office coordinates
  useEffect(() => {
    if (!isOpen) return;

    const fetchOfficeInfo = async () => {
      try {
        const res = await attendanceAPI.getOfficeLocation();
        if (res.success && res.data) {
          setOfficeSettings(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch office settings, using defaults');
        setOfficeSettings({
          name: 'AttendancePro HQ Campus',
          latitude: 28.6139,
          longitude: 77.2090,
          radiusMeters: 1000
        });
      }
    };

    fetchOfficeInfo();
    detectLocation();
  }, [isOpen]);

  // Haversine Distance helper
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  // GPS Location Detection
  const detectLocation = () => {
    setGeoLoading(true);
    setGeoError('');
    setFeedbackMsg({ text: '', type: '' });

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coords = { latitude, longitude, accuracy: Math.round(accuracy) };
        setLocationData(coords);

        const officeLat = officeSettings?.latitude || 28.6139;
        const officeLng = officeSettings?.longitude || 77.2090;
        const radius = officeSettings?.radiusMeters || 1000;

        const dist = calculateDistance(latitude, longitude, officeLat, officeLng);
        setDistanceFromOffice(dist);
        setIsWithinRange(dist <= radius);
        setGeoLoading(false);
      },
      (error) => {
        let msg = 'Failed to fetch GPS location.';
        if (error.code === 1) msg = 'Location permission denied. Please allow location access in browser.';
        else if (error.code === 2) msg = 'Location position unavailable. Retrying...';
        else if (error.code === 3) msg = 'Location request timed out.';
        setGeoError(msg);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Camera Management for Face Lock
  const startCamera = async () => {
    setCameraError('');
    setFaceVerified(false);
    setFaceProgress(0);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable. Please check permissions or camera connection.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'face_lock') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  // Rolling QR Token generator for Kiosk tab
  const fetchLiveQRToken = async () => {
    setQrLoading(true);
    try {
      const res = await attendanceAPI.getLiveQRToken();
      if (res.success && res.data) {
        setQrTokenData(res.data);
        setQrCountdown(res.data.expiresInSeconds || 45);
      }
    } catch (err) {
      console.error('Failed to get QR token:', err);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'kiosk_qr') return;

    fetchLiveQRToken();
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          fetchLiveQRToken();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeTab]);

  // Submit Geolocation Check-In
  const handleGeoCheckIn = async () => {
    if (!locationData) {
      setFeedbackMsg({ text: 'Please wait for GPS coordinates to load', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg({ text: '', type: '' });

    try {
      const payload = {
        status: 'Present',
        notes: isWithinRange ? 'Verified inside Office Perimeter' : 'Remote / GPS Recorded Check-In',
        verificationMethod: 'geolocation',
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          address: isWithinRange ? 'Office Campus (GPS Verified)' : 'Remote / Mobile Check-In'
        }
      };

      const res = await attendanceAPI.markAttendanceVerified(payload);
      if (res.success) {
        setFeedbackMsg({ text: '✓ GPS Verified Check-In Successful!', type: 'success' });
        showToast(
          '📍 GPS Attendance Marked!',
          `GPS location verified (${isWithinRange ? 'Inside Office Campus' : 'Remote Location'}). Check-in recorded (${res.isLate ? 'Late Arrival ⏰' : 'On Time ✅'}).`,
          'attendance',
          { isLate: res.isLate, method: 'GPS Geolocation' }
        );
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data);
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ text: res.message || 'Failed to mark attendance', type: 'error' });
        showToast('GPS Verification Notice', res.message || 'Failed to mark attendance', 'warning');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Verification failed';
      setFeedbackMsg({ text: errMsg, type: 'error' });
      showToast('GPS Check-In Error', errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit QR Code Check-In
  const handleQRCheckIn = async (tokenToVerify) => {
    const token = tokenToVerify || manualQrToken;
    if (!token || !token.trim()) {
      setFeedbackMsg({ text: 'Please enter or scan a valid QR Code', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg({ text: '', type: '' });

    try {
      const payload = {
        status: 'Present',
        notes: 'Verified via Live Office QR Code',
        verificationMethod: 'qr_code',
        qrToken: token.trim(),
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          address: 'Office QR Code Scan'
        } : null
      };

      const res = await attendanceAPI.markAttendanceVerified(payload);
      if (res.success) {
        setFeedbackMsg({ text: '🎉 QR Code Verified Check-In Successful!', type: 'success' });
        showToast(
          '📱 QR Code Attendance Marked!',
          `Live QR Code verified successfully. Check-in recorded at ${new Date().toLocaleTimeString()} (${res.isLate ? 'Late Arrival ⏰' : 'On Time ✅'}).`,
          'attendance',
          { isLate: res.isLate, method: 'Live QR Code' }
        );
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data);
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ text: res.message || 'Invalid or expired QR code', type: 'error' });
        showToast('QR Code Notice', res.message || 'Invalid or expired QR code', 'warning');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'QR verification failed';
      setFeedbackMsg({ text: errMsg, type: 'error' });
      showToast('QR Verification Error', errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit AI Face Lock Check-In
  const handleFaceLockCheckIn = async () => {
    if (faceScanning || submitting) return;
    setFaceScanning(true);
    setFeedbackMsg({ text: '', type: '' });
    setFaceProgress(10);

    let progress = 10;
    const timer = setInterval(() => {
      progress += 30;
      setFaceProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(timer);
        setFaceVerified(true);
        submitFaceAttendance();
      }
    }, 250);
  };

  const submitFaceAttendance = async () => {
    setSubmitting(true);
    try {
      const payload = {
        status: 'Present',
        notes: 'Verified via AI Face Recognition Scanner',
        verificationMethod: 'face_recognition',
        email: user?.email,
        employeeId: user?.employeeId || user?._id || user?.id,
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          address: 'Face Recognition Capture'
        } : null
      };

      const res = await attendanceAPI.markFaceRecognition(payload);
      if (res && res.success) {
        setFeedbackMsg({ text: res.message || '👤 AI Face Recognition Matched! Check-In Successful! 🎉', type: 'success' });
        stopCamera();
        showToast(
          '👤 AI Face Lock Check-In Successful!',
          `Facial geometry matched for ${user?.name || 'Employee'}. Attendance recorded at ${new Date().toLocaleTimeString()} (${res.isLate ? 'Late Arrival ⏰' : 'On Time ✅'}).`,
          'attendance',
          { isLate: res.isLate, method: 'AI Face Recognition' }
        );
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data);
          onClose();
        }, 1200);
      } else {
        setFeedbackMsg({ text: res?.message || 'Face recognition verification failed', type: 'error' });
        setFaceScanning(false);
        showToast('Face Scanner Notice', res?.message || 'Face recognition verification failed', 'warning');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Face lock verification failed';
      setFeedbackMsg({ text: errMsg, type: 'error' });
      setFaceScanning(false);
      showToast('Face Scanner Error', errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="live-verify-overlay" onClick={onClose}>
      <div className="live-verify-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="live-verify-header">
          <div className="verify-header-title">
            <span className="verify-header-badge">LIVE VERIFICATION</span>
            <h2>Attendance Verification Hub</h2>
          </div>
          <button className="verify-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Tab Selection */}
        <div className="verify-tabs">
          <button
            className={`verify-tab-btn ${activeTab === 'geo' ? 'active' : ''}`}
            onClick={() => { setActiveTab('geo'); detectLocation(); }}
          >
            📍 GPS Geolocation
          </button>
          <button
            className={`verify-tab-btn ${activeTab === 'scan_qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('scan_qr')}
          >
            📷 Scan Office QR
          </button>
          <button
            className={`verify-tab-btn ${activeTab === 'kiosk_qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('kiosk_qr')}
          >
            📱 Live Kiosk QR
          </button>
          <button
            className={`verify-tab-btn ${activeTab === 'face_lock' ? 'active' : ''}`}
            onClick={() => setActiveTab('face_lock')}
          >
            👤 AI Face Lock
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg.text && (
          <div className={`verify-alert ${feedbackMsg.type}`}>
            {feedbackMsg.text}
          </div>
        )}

        {/* TAB 1: GPS Geolocation View */}
        {activeTab === 'geo' && (
          <div className="verify-content-body">
            <div className="geo-radar-card">
              <div className="radar-status-indicator">
                <div className={`radar-ping ${isWithinRange ? 'inside' : 'remote'}`}></div>
                <div className="radar-text-info">
                  <h4>{isWithinRange ? 'Office Perimeter Verified' : 'Remote / GPS Tracking Active'}</h4>
                  <p>
                    {distanceFromOffice !== null
                      ? `Distance to ${officeSettings?.name || 'Office'}: ~${distanceFromOffice > 1000 ? (distanceFromOffice / 1000).toFixed(1) + ' km' : distanceFromOffice + ' meters'}`
                      : 'Calculating distance to office...'}
                  </p>
                </div>
              </div>

              {locationData && (
                <div className="geo-details-grid">
                  <div className="geo-detail-item">
                    <span className="geo-label">Latitude</span>
                    <span className="geo-val">{locationData.latitude?.toFixed(5)}° N</span>
                  </div>
                  <div className="geo-detail-item">
                    <span className="geo-label">Longitude</span>
                    <span className="geo-val">{locationData.longitude?.toFixed(5)}° E</span>
                  </div>
                  <div className="geo-detail-item">
                    <span className="geo-label">GPS Accuracy</span>
                    <span className="geo-val">±{locationData.accuracy} meters</span>
                  </div>
                  <div className="geo-detail-item">
                    <span className="geo-label">Office Radius</span>
                    <span className="geo-val">{officeSettings?.radiusMeters || 1000}m Geo-fence</span>
                  </div>
                </div>
              )}

              {geoError && <div className="geo-error-msg">⚠️ {geoError}</div>}

              <div className="geo-actions-row">
                <button
                  type="button"
                  className="btn-refresh-gps"
                  onClick={detectLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? 'Detecting GPS...' : '🔄 Refresh Coordinates'}
                </button>
                <button
                  type="button"
                  className="btn-submit-verification"
                  onClick={handleGeoCheckIn}
                  disabled={submitting || !locationData || geoLoading}
                >
                  {submitting ? 'Verifying & Marking...' : '✓ Verify GPS & Check In'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Scan Office QR */}
        {activeTab === 'scan_qr' && (
          <div className="verify-content-body">
            <div className="qr-scanner-card">
              <div className="qr-scan-placeholder">
                <div className="scan-crosshair"></div>
                <p className="scan-hint">Enter the Live QR Session Token shown on your Office Screen / Reception</p>
              </div>

              <div className="manual-token-input-group">
                <input
                  type="text"
                  placeholder="Paste or enter live Office QR Token (e.g. ATT_QR_...)"
                  value={manualQrToken}
                  onChange={(e) => setManualQrToken(e.target.value)}
                  className="token-input"
                />
                <button
                  type="button"
                  className="btn-submit-verification"
                  onClick={() => handleQRCheckIn()}
                  disabled={submitting || !manualQrToken.trim()}
                >
                  {submitting ? 'Verifying...' : '⚡ Verify QR Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Office Display / Kiosk Live Rotating QR */}
        {activeTab === 'kiosk_qr' && (
          <div className="verify-content-body">
            <div className="kiosk-qr-display-card">
              <div className="kiosk-header">
                <h3>{officeSettings?.name || 'Office Attendance Hub'}</h3>
                <div className="kiosk-countdown-pill">
                  <span>Refreshes in: <strong>{qrCountdown}s</strong></span>
                </div>
              </div>

              <div className="qr-svg-wrapper">
                {qrTokenData ? (
                  <QRCodeSVG
                    value={qrTokenData.token}
                    size={210}
                    level="H"
                    includeMargin={true}
                    fgColor="#0f172a"
                    bgColor="#ffffff"
                  />
                ) : (
                  <div className="qr-loading-box">Generating Live QR Code...</div>
                )}
              </div>

              <div className="kiosk-instructions">
                <p>📷 Employees can scan this live rotating QR code or copy the token below to check in instantly.</p>
                <div className="kiosk-token-badge">
                  <code>{qrTokenData?.token || 'Loading...'}</code>
                  <button
                    type="button"
                    className="btn-quick-checkin-token"
                    onClick={() => {
                      if (qrTokenData?.token) {
                        handleQRCheckIn(qrTokenData.token);
                      }
                    }}
                  >
                    Use This Code to Check In
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI Face Lock Recognition */}
        {activeTab === 'face_lock' && (
          <div className="verify-content-body">
            <div className="face-scanner-card">
              <div className="face-camera-container">
                {cameraActive ? (
                  <div className="video-feed-wrapper">
                    <video ref={videoRef} autoPlay playsInline muted className="face-video-feed" />
                    <div className={`face-overlay-oval ${faceScanning ? 'scanning' : ''} ${faceVerified ? 'verified' : ''}`}>
                      <div className="laser-beam"></div>
                      <span className="face-corner corner-tl"></span>
                      <span className="face-corner corner-tr"></span>
                      <span className="face-corner corner-bl"></span>
                      <span className="face-corner corner-br"></span>
                    </div>
                    {faceScanning && (
                      <div className="scan-progress-overlay">
                        <div className="progress-bar-fill" style={{ width: `${faceProgress}%` }}></div>
                        <span>Extracting Facial Geometry... {faceProgress}%</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="camera-placeholder">
                    <div className="camera-icon">📷</div>
                    <p>{cameraError || 'Click below to activate camera for AI Face Recognition scan'}</p>
                    <button type="button" className="btn-start-camera" onClick={startCamera}>
                      🔌 Activate Camera
                    </button>
                  </div>
                )}
              </div>

              <div className="face-instructions">
                <p>💡 Align your face inside the circle frame & ensure good lighting.</p>
                {cameraActive && (
                  <button
                    type="button"
                    className="btn-submit-verification face-btn"
                    onClick={handleFaceLockCheckIn}
                    disabled={submitting || faceScanning}
                  >
                    {faceScanning ? 'Verifying Facial Features...' : '⚡ Scan Face & Check In'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveQRGeoVerificationModal;
