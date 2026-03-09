import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      // Clean up stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]); // stream is intentionally omitted to avoid infinite loop

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
        stopCamera();
        onCapture(imageSrc);
      }
    }
  };

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="w-full max-w-md mx-auto aspect-[4/3] bg-black rounded-[2.5rem] overflow-hidden relative shadow-2xl border-4 border-gray-900 flex flex-col items-center justify-center">
      {error ? (
        <div className="text-white text-center p-6">
          <p className="mb-4 text-red-400 font-bold">{error}</p>
          <button 
            onClick={startCamera}
            className="px-4 py-2 bg-white text-black rounded-lg font-bold flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-center gap-8">
            <button 
              onClick={handleCancel}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/20"
            >
              <X size={24} />
            </button>
            <button 
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-brand-600 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] border-4 border-gray-200"
            >
              <Camera size={32} />
            </button>
            <div className="w-12 h-12" /> {/* alignment spacer */}
          </div>
        </>
      )}
    </div>
  );
};
