'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';

interface CameraCaptureProps {
  onCapture: (image: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access.');
      return;
    }

    try {
      setError(null);
      stopCamera(); // Ensure previous is stopped

      const constraints = {
        video: { facingMode: 'environment' },
        audio: false,
      };
      
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera permission denied.' 
        : 'Could not start camera.');
    }
  }, [stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && isReady) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Small delay to let previous camera sessions close fully
      await new Promise(resolve => setTimeout(resolve, 300));
      if (isMounted) {
        startCamera();
      }
    };

    init();

    return () => {
      isMounted = false;
      // Stop the stream immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-gray-900 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white bg-gray-900/95 backdrop-blur-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
               <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <h3 className="text-xl font-black mb-2 tracking-tight">Camera Issue</h3>
            <p className="text-gray-400 text-sm mb-8 max-w-[240px] leading-relaxed">
              {error}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <Button onClick={() => { setError(null); startCamera(); }} variant="secondary" size="sm">
                Try Again
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="!border-white/20 !text-white hover:!bg-white/10">
                Upload Image
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'}`}
            />
            {!isReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                 <div className="w-12 h-12 border-4 border-brand-100/20 border-t-brand-500 rounded-full animate-spin mb-4" />
                 <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Initializing...</p>
              </div>
            )}
            {/* Visual Guides */}
            <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-white/20 rounded-[3rem] pointer-events-none" />
            
            {/* Corner Markers */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-white/60 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-white/60 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-white/60 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-white/60 rounded-br-xl pointer-events-none" />
          </>
        )}
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="mt-8 flex flex-col items-center w-full">
        {!error && (
          <div className="flex justify-center w-full mb-4">
            <Button 
              onClick={capturePhoto} 
              disabled={!isReady} 
              className="w-full sm:max-w-sm" 
              size="lg"
              leftIcon={
                <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-current rounded-full" />
                </div>
              }
            >
              Take Action Photo
            </Button>
          </div>
        )}
        
        {!error && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-brand-500 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Choose from Gallery
          </button>
        )}
      </div>
    </div>
  );
};
