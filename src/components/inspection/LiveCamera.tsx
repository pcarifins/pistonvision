import React, { useState, useEffect, useRef } from 'react';
import { Camera, SwitchCamera, Zap, ZapOff, RotateCcw, Check, Upload, AlertTriangle } from 'lucide-react';

interface LiveCameraProps {
  onCapture: (dataUrl: string) => void;
  areaTitle: string;
  onOpenReference?: () => void;
  initialCapturedImage?: string;
}

export const LiveCamera: React.FC<LiveCameraProps> = ({
  onCapture,
  areaTitle,
  onOpenReference,
  initialCapturedImage,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(initialCapturedImage || null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize or re-initialize camera stream
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      if (capturedImage) return; // Don't stream if currently reviewing a captured photo

      setIsInitializing(true);
      setCameraError(null);

      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported in this browser environment.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as { torch?: boolean };
          setHasTorch(!!capabilities.torch);
        }

        setIsInitializing(false);
      } catch (err: unknown) {
        console.warn('getUserMedia error:', err);
        if (isMounted) {
          setIsInitializing(false);
          const errorMsg =
            err instanceof Error
              ? err.name === 'NotAllowedError'
                ? 'Camera permission denied. Please allow camera access in browser settings.'
                : err.name === 'NotFoundError'
                ? 'No camera found on this device.'
                : err.message
              : 'Failed to access camera.';
          setCameraError(errorMsg);
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, capturedImage]);

  // Handle Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchEnabled;
      // @ts-expect-error torch constraint in W3C MediaTrackConstraintSet
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      setTorchEnabled(nextState);
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
    }
  };

  // Switch between front and rear cameras
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture frame from video feed
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, unmirror for consistent shop recording
    if (facingMode === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Stop camera stream while reviewing photo to save smartphone battery & CPU
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCapturedImage(dataUrl);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Confirm photo usage
  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  // File upload fallback (if camera unavailable on desktop/VM)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCapturedImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
      {/* Camera Header Bar */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[190px] text-slate-200">{areaTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenReference && (
            <button
              onClick={onOpenReference}
              className="px-2.5 py-1 bg-blue-700 active:bg-blue-800 text-white font-semibold rounded text-[11px] tracking-wide"
            >
              OFFICIAL REF
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
        {capturedImage ? (
          // Review captured image
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured Inspection"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur text-white text-[11px] rounded font-mono">
              PREVIEW READY
            </div>
          </div>
        ) : cameraError ? (
          // Camera Error / Permission Fallback
          <div className="p-4 text-center text-slate-300 max-w-xs flex flex-col items-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-xs font-semibold text-white mb-1">Camera Stream Unavailable</p>
            <p className="text-[11px] text-slate-400 mb-3">{cameraError}</p>
            <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 active:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Inspection Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          // Live Video Stream
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {isInitializing && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">
                Initializing rear camera...
              </div>
            )}

            {/* Shop Inspection Alignment Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-400/80 rounded-full" />
              </div>
              <div className="absolute bottom-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white/80 font-mono">
                CENTER INSPECTION AREA
              </div>
            </div>

            {/* Quick Controls in Viewport */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <button
                onClick={switchCamera}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center active:bg-black/90 shadow"
                aria-label="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur shadow ${
                    torchEnabled ? 'bg-amber-500 text-black' : 'bg-black/60 text-white'
                  }`}
                  aria-label="Torch"
                >
                  {torchEnabled ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Camera Action Footer */}
      <div className="px-4 py-3 bg-slate-950 flex items-center justify-between min-h-[64px]">
        {capturedImage ? (
          // Review Mode Actions: RETAKE or USE PHOTO
          <div className="w-full grid grid-cols-2 gap-3">
            <button
              onClick={handleRetake}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-800 active:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg uppercase tracking-wider min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              RETAKE
            </button>
            <button
              onClick={handleUsePhoto}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold rounded-lg uppercase tracking-wider shadow min-h-[44px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              USE PHOTO
            </button>
          </div>
        ) : (
          // Live Capture Mode
          <div className="w-full flex items-center justify-between">
            {/* Gallery Fallback */}
            <label className="p-2 text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-transform">
              <Upload className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Primary Large Touch Shutter Button (>= 60px) */}
            <button
              onClick={handleCapture}
              disabled={isInitializing || !!cameraError}
              className="w-16 h-16 rounded-full border-4 border-white bg-red-600 active:scale-95 flex items-center justify-center shadow-lg transition-transform disabled:opacity-50"
              aria-label="Capture Photo"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>

            {/* Camera facing indicator */}
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">
              {facingMode === 'environment' ? 'REAR' : 'FRONT'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
