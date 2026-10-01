import React, { useRef, useState, useEffect, useCallback } from 'react';
import './FaceScanner.css';

interface FaceScannerProps {
  onCapture: (base64Image: string) => void;
  onCancel?: () => void;
}

interface DetectedFaceBox {
  visualX: number;      // 0..1 (horizontal center in mirrored selfie view)
  visualY: number;      // 0..1 (vertical center)
  visualWidth: number;  // 0..1
  visualHeight: number; // 0..1
}

// Subtle native audio shutter feedback via Web Audio API
const playShutterSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore if audio permissions blocked
  }
};

export const FaceScanner: React.FC<FaceScannerProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<any>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceAligned, setFaceAligned] = useState(false);
  const [faceBox, setFaceBox] = useState<DetectedFaceBox | null>(null);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState('INITIALIZING SENSORS...');

  const lockStartTimeRef = useRef<number | null>(null);
  const hasAutoSnappedRef = useRef(false);
  const LOCK_DURATION_MS = 3000; // 3 seconds lock-in before auto-capture

  // Callback ref to ensure video element always attaches to stream when mounted
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  // Start Webcam Stream
  const startCamera = async () => {
    setCameraError(null);
    setScanningStatus('INITIALIZING SENSORS...');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setScanningStatus('POSITION YOUR FACE IN FRONT OF CAMERA');
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable. You can upload a photo below.');
      setCameraActive(false);
    }
  };

  // Stop Webcam
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Ensure stream stays bound to video element across preview/retake transitions
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive, capturedImage]);

  // Capture Snapshot function
  const handleSnap = useCallback(() => {
    if (hasAutoSnappedRef.current && capturedImage) return;
    hasAutoSnappedRef.current = true;
    setIsFlashing(true);
    playShutterSound();

    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.88);

    setTimeout(() => {
      setCapturedImage(base64);
      setIsFlashing(false);
      stopCamera();
    }, 120);
  }, [capturedImage, stopCamera]);

  const handleSnapRef = useRef(handleSnap);
  handleSnapRef.current = handleSnap;

  // Real-Time Smart Multi-Tier Face Detection Engine
  const detectFace = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<DetectedFaceBox | null> => {
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // --- Tier 1: Native Hardware FaceDetector API (Chromium / Mobile) ---
    if ('FaceDetector' in window) {
      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(video);
        if (faces && faces.length > 0) {
          const b = faces[0].boundingBox;
          const rawCenterX = (b.x + b.width / 2) / vw;
          return {
            visualX: 1 - rawCenterX, // mirrored
            visualY: (b.y + b.height / 2) / vh,
            visualWidth: b.width / vw,
            visualHeight: b.height / vh,
          };
        }
      } catch {}
    }

    // --- Tier 2: Haar Cascade via tracking.js (Client-side) ---
    const trackingGlobal = (window as any).tracking;
    if (trackingGlobal && trackingGlobal.ObjectTracker) {
      try {
        if (!trackerRef.current) {
          const tr = new trackingGlobal.ObjectTracker('face');
          tr.setInitialScale(3.5);
          tr.setStepSize(2);
          tr.setEdgesDensity(0.1);
          trackerRef.current = tr;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const w = 160;
          const h = 120;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);

          let foundRect: any = null;
          const onTrack = (ev: any) => {
            if (ev.data && ev.data.length > 0) {
              foundRect = ev.data[0];
            }
          };
          trackerRef.current.once('track', onTrack);
          trackerRef.current.track(imgData.data, w, h);
          trackerRef.current.removeListener('track', onTrack);

          if (foundRect) {
            const rawCenterX = (foundRect.x + foundRect.width / 2) / w;
            return {
              visualX: 1 - rawCenterX, // mirrored
              visualY: (foundRect.y + foundRect.height / 2) / h,
              visualWidth: foundRect.width / w,
              visualHeight: foundRect.height / h,
            };
          }
        }
      } catch {}
    }

    // --- Tier 3: High-Speed Anatomical Skin & Density Centroid (100% Offline Fallback) ---
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const w = 80;
    const h = 60;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const sum = r + g + b;

        if (sum > 60) {
          const nr = r / sum;
          const ng = g / sum;
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

          // Universal inclusive human skin chromatic envelope
          const isSkin =
            nr > 0.33 &&
            nr < 0.65 &&
            ng > 0.22 &&
            ng < 0.40 &&
            nr - ng >= 0.03 &&
            brightness > 28 &&
            brightness < 242;

          if (isSkin) {
            totalWeight++;
            sumX += x;
            sumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    const sampledPixels = (w / 2) * (h / 2);
    // At least 4% skin coverage to qualify as a face in frame
    if (totalWeight > sampledPixels * 0.04) {
      const avgX = sumX / totalWeight;
      const avgY = sumY / totalWeight;

      // Compute standard deviation of cluster to prevent edge pixels blowing out box size
      let varSumX = 0;
      let varSumY = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const sum = r + g + b;
          if (sum > 50) {
            const nr = r / sum;
            const ng = g / sum;
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const isSkin =
              nr > 0.32 && nr < 0.68 &&
              ng > 0.20 && ng < 0.42 &&
              brightness > 20 && brightness < 245;

            if (isSkin) {
              const dx = x - avgX;
              const dy = y - avgY;
              varSumX += dx * dx;
              varSumY += dy * dy;
            }
          }
        }
      }

      const stdX = Math.sqrt(varSumX / totalWeight);
      const stdY = Math.sqrt(varSumY / totalWeight);

      // Stable face bounding box based on statistical distribution
      const boxW = Math.max(0.32, Math.min(0.68, (stdX * 2.8) / w));
      const boxH = Math.max(0.38, Math.min(0.75, (stdY * 3.0) / h));
      const rawCenterX = avgX / w;

      return {
        visualX: 1 - rawCenterX, // mirrored
        visualY: avgY / h,
        visualWidth: boxW,
        visualHeight: boxH,
      };
    }

    return null;
  }, []);

  // Real-time Face Tracking & Alignment Evaluation Loop
  useEffect(() => {
    if (!cameraActive || capturedImage) {
      lockStartTimeRef.current = null;
      setAutoCaptureProgress(0);
      setFaceBox(null);
      return;
    }

    let animId: number;
    let isBusy = false;

    const checkFace = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && !hasAutoSnappedRef.current && !isBusy) {
        isBusy = true;
        try {
          const box = await detectFace(video, canvas);
          setFaceBox(box);

          if (!box) {
            setFaceDetected(false);
            setFaceAligned(false);
            lockStartTimeRef.current = null;
            setAutoCaptureProgress(0);
            setScanningStatus('👤 POSITION FACE IN FRONT OF CAMERA');
          } else {
            setFaceDetected(true);

            // Alignment Evaluation (Centered in Reticle Oval)
            if (box.visualWidth < 0.16) {
              setFaceAligned(false);
              lockStartTimeRef.current = null;
              setAutoCaptureProgress(0);
              setScanningStatus('👤 MOVE CLOSER TO CAMERA');
            } else {
              const dx = box.visualX - 0.5;
              const dy = box.visualY - 0.48;

              if (dx < -0.20) {
                setFaceAligned(false);
                lockStartTimeRef.current = null;
                setAutoCaptureProgress(0);
                setScanningStatus('👉 SHIFT SLIGHTLY RIGHT');
              } else if (dx > 0.20) {
                setFaceAligned(false);
                lockStartTimeRef.current = null;
                setAutoCaptureProgress(0);
                setScanningStatus('👈 SHIFT SLIGHTLY LEFT');
              } else if (dy < -0.22) {
                setFaceAligned(false);
                lockStartTimeRef.current = null;
                setAutoCaptureProgress(0);
                setScanningStatus('👇 SHIFT SLIGHTLY DOWN');
              } else if (dy > 0.22) {
                setFaceAligned(false);
                lockStartTimeRef.current = null;
                setAutoCaptureProgress(0);
                setScanningStatus('👆 SHIFT SLIGHTLY UP');
              } else {
                // Face is aligned! Begin 3-second steady lock-in
                setFaceAligned(true);
                const now = performance.now();
                if (lockStartTimeRef.current === null) {
                  lockStartTimeRef.current = now;
                }

                const elapsed = now - lockStartTimeRef.current;
                const pct = Math.min(100, Math.round((elapsed / LOCK_DURATION_MS) * 100));
                setAutoCaptureProgress(pct);

                const secondsRemaining = Math.max(1, Math.ceil((LOCK_DURATION_MS - elapsed) / 1000));

                if (elapsed >= LOCK_DURATION_MS) {
                  setScanningStatus('🎯 3s LOCK COMPLETE — CAPTURING!');
                  handleSnapRef.current();
                } else {
                  setScanningStatus(`🔒 FACE LOCKED — HOLD STILL (${secondsRemaining}s)`);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Face detection error:', err);
        } finally {
          isBusy = false;
        }
      }

      animId = requestAnimationFrame(checkFace);
    };

    animId = requestAnimationFrame(checkFace);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, capturedImage, detectFace]);

  const handleRetake = () => {
    hasAutoSnappedRef.current = false;
    lockStartTimeRef.current = null;
    setAutoCaptureProgress(0);
    setIsFlashing(false);
    setCapturedImage(null);
    setFaceDetected(false);
    setFaceAligned(false);
    setFaceBox(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  // Fallback file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="face-scanner-container">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {!capturedImage ? (
        <div className="scanner-viewfinder-wrapper">
          <div
            className={`biometric-reticle ${faceAligned ? 'locked' : faceDetected ? 'tracking' : 'scanning'} ${
              autoCaptureProgress > 0 ? 'locking' : ''
            }`}
          >
            {isFlashing && <div className="scanner-flash-overlay" />}

            <video
              ref={setVideoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
              className="scanner-video-feed"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            {!cameraActive && (
              <div className="scanner-placeholder">
                {cameraError ? '⚠ NO CAMERA' : 'STARTING CAMERA...'}
              </div>
            )}

            {/* Smart Face Tracking Bounding Box */}
            {faceBox && cameraActive && (
              <div
                className={`scanner-face-box ${faceAligned ? 'aligned' : ''}`}
                style={{
                  left: `${faceBox.visualX * 100}%`,
                  top: `${faceBox.visualY * 100}%`,
                  width: `${Math.max(70, faceBox.visualWidth * 220)}px`,
                  height: `${Math.max(80, faceBox.visualHeight * 260)}px`,
                }}
              >
                <div className="scanner-face-tag">
                  {faceAligned ? '✓ ALIGNED' : 'TRACKING'}
                </div>
              </div>
            )}

            {/* Glowing cyber laser scan line */}
            <div className="scanner-laser-line"></div>

            {/* Biometric corner crosshairs */}
            <div className="reticle-corner top-left"></div>
            <div className="reticle-corner top-right"></div>
            <div className="reticle-corner bottom-left"></div>
            <div className="reticle-corner bottom-right"></div>
          </div>

          {/* Auto-Capture Progress Bar */}
          {cameraActive && (
            <div className="scanner-progress-container">
              <div className="scanner-progress-bar-wrap">
                <div
                  className="scanner-progress-bar-fill"
                  style={{ width: `${autoCaptureProgress}%` }}
                />
              </div>
              <div className="scanner-progress-label">
                {autoCaptureProgress > 0 ? (
                  <span>LOCKING IN ({Math.max(1, Math.ceil((LOCK_DURATION_MS * (1 - autoCaptureProgress / 100)) / 1000))}s) — HOLD STILL {autoCaptureProgress}%</span>
                ) : faceAligned ? (
                  <span>HOLD STILL 3 SECONDS TO LOCK IN</span>
                ) : (
                  <span>ALIGN FACE IN OVAL TO AUTO-CAPTURE</span>
                )}
              </div>
            </div>
          )}

          <div className={`scanner-status-badge ${faceAligned ? 'active' : ''}`}>
            <span className="scanner-dot"></span>
            <span>{scanningStatus}</span>
          </div>

          {cameraActive && (
            <button
              type="button"
              className="scanner-capture-btn"
              onClick={handleSnap}
              disabled={!faceDetected}
              title={faceDetected ? 'Click to capture or hold still 3s' : 'Position face in frame'}
            >
              {autoCaptureProgress > 0
                ? `⚡ LOCKING IN (${Math.max(1, Math.ceil((LOCK_DURATION_MS * (1 - autoCaptureProgress / 100)) / 1000))}s)...`
                : faceAligned
                ? '📸 CAPTURE NOW (OR HOLD 3s)'
                : faceDetected
                ? '📸 MANUAL CAPTURE'
                : '👤 POSITION FACE TO SCAN'}
            </button>
          )}

          {cameraError && (
            <div className="scanner-fallback-box">
              <p className="scanner-error-text">{cameraError}</p>
              <label className="scanner-upload-label">
                📁 UPLOAD PHOTO INSTEAD
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        /* Snapshot Preview Mode */
        <div className="scanner-preview-wrapper">
          <div className="scanner-preview-frame">
            <img src={capturedImage} alt="Captured Face Scan" className="scanner-preview-img" />
            <div className="scanner-verified-watermark">BIOMETRIC SNAPSHOT ACQUIRED</div>
          </div>

          <div className="scanner-action-row">
            <button type="button" className="scanner-btn-secondary" onClick={handleRetake}>
              🔄 RETAKE SCAN
            </button>
            <button type="button" className="scanner-btn-primary" onClick={handleConfirm}>
              ✅ CONFIRM FACE ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
