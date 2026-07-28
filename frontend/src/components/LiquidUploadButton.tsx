'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, Film, Image as ImageIcon, Sparkles, CloudUpload, Eye } from 'lucide-react';
import ApiService from '@/services/apiService';
import { useToast } from '@/context/ToastContext';

interface LiquidUploadButtonProps {
  onUploadSuccess: (fileUrl: string, mediaType: 'IMAGE' | 'VIDEO') => void;
  onMediaSelect?: (previewUrl: string, mediaType: 'IMAGE' | 'VIDEO') => void;
  onRemove?: () => void;
  currentMediaUrl?: string;
  currentMediaType?: 'IMAGE' | 'VIDEO' | null;
  disabled?: boolean;
  multiMode?: boolean;
}

export default function LiquidUploadButton({
  onUploadSuccess,
  onMediaSelect,
  onRemove,
  currentMediaUrl,
  currentMediaType,
  disabled = false,
  multiMode = false,
}: LiquidUploadButtonProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(currentMediaType || null);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [isUploaded, setIsUploaded] = useState<boolean>(Boolean(currentMediaUrl));
  const [remoteUrl, setRemoteUrl] = useState<string>(currentMediaUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!currentMediaUrl && !multiMode) {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setSelectedFile(null);
      setLocalPreviewUrl('');
      setMediaType(null);
      setIsUploaded(false);
      setRemoteUrl('');
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else if (currentMediaUrl && !localPreviewUrl && !multiMode) {
      setLocalPreviewUrl(currentMediaUrl);
      setIsUploaded(true);
      setRemoteUrl(currentMediaUrl);
    }
  }, [currentMediaUrl, multiMode]);

  // Handle file selection and auto-upload immediately to Cloudflare R2
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    setSelectedFile(file);
    setLocalPreviewUrl(objectUrl);
    setMediaType(type);
    setIsUploaded(false);
    setRemoteUrl('');
    setProgress(5);

    if (onMediaSelect) {
      onMediaSelect(objectUrl, type);
    }

    // Auto-start upload to Cloudflare R2 with real-time percentage updates
    setUploading(true);
    try {
      const response = await ApiService.uploadMedia(
        file,
        (percent) => {
          // Scale 0-100% browser byte transfer to 5%-92% range
          const scaledPercent = Math.min(92, Math.max(5, Math.round(percent * 0.9)));
          setProgress(scaledPercent);
        },
        'instagram_feed'
      );

      if (response && response.fileUrl) {
        setProgress(98);
        setTimeout(() => {
          setProgress(100);
          onUploadSuccess(response.fileUrl, response.mediaType as 'IMAGE' | 'VIDEO');
          toast.success(`Media uploaded to Cloudflare R2 (${type === 'VIDEO' ? 'uploads/videos/' : 'uploads/photos/'})!`);
          
          if (multiMode) {
            if (objectUrl.startsWith('blob:')) {
              URL.revokeObjectURL(objectUrl);
            }
            setSelectedFile(null);
            setLocalPreviewUrl('');
            setMediaType(null);
            setIsUploaded(false);
            setRemoteUrl('');
            setUploading(false);
            setProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } else {
            setRemoteUrl(response.fileUrl);
            setIsUploaded(true);
            setUploading(false);
          }
        }, 200);
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload media to Cloudflare R2.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setSelectedFile(null);
    setLocalPreviewUrl('');
    setMediaType(null);
    setIsUploaded(false);
    setRemoteUrl('');
    setProgress(0);
    if (onRemove) onRemove();
  };

  const activeDisplayUrl = localPreviewUrl || currentMediaUrl || '';

  return (
    <div className="w-full space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        id="liquid-media-upload-input"
      />

      {/* STATE 1: Local Preview Ready (Before Upload or Uploading Progress) */}
      {activeDisplayUrl ? (
        <div className="relative w-full rounded-3xl bg-slate-900/80 border border-slate-800 p-5 md:p-6 backdrop-blur-md space-y-4 shadow-xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-850">
            <div className="flex items-center gap-2.5">
              {mediaType === 'VIDEO' ? (
                <Film className="h-5 w-5 text-indigo-400 shrink-0" />
              ) : (
                <ImageIcon className="h-5 w-5 text-emerald-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider block">
                  {mediaType || 'MEDIA'} PREVIEW READY
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {selectedFile ? selectedFile.name : 'Attached Media File'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isUploaded && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  <CheckCircle2 className="h-3 w-3" /> Uploaded
                </span>
              )}

              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-slate-750"
                title="Remove Media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Instant Media Preview Area */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-955 min-h-[200px] max-h-[320px] flex items-center justify-center p-2 shadow-inner">
            {mediaType === 'VIDEO' ? (
              <video src={activeDisplayUrl} controls className="max-h-[300px] rounded-xl object-contain w-full" />
            ) : (
              <img
                src={activeDisplayUrl}
                alt="Selected Media Preview"
                className="max-h-[300px] rounded-xl object-contain w-full"
                onError={(e) => {
                  console.warn('Image load error, setting fallback preview.');
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
                }}
              />
            )}
          </div>

          {/* Action Row */}
          {uploading ? (
            /* Liquid Progress Bar Animation */
            <div className="relative w-full h-16 rounded-2xl bg-slate-955 border border-indigo-500/40 overflow-hidden flex flex-col justify-center items-center select-none shadow-lg">
              {/* Liquid Water Fill Layer (Fills from Left to Right) */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              >
                {/* Animated Wave Crest on leading right edge */}
                <div className="absolute top-0 bottom-0 right-0 w-8 translate-x-1/2 overflow-hidden pointer-events-none opacity-90">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-12 text-cyan-200 animate-liquid-wave fill-current"
                  >
                    <path d="M0,0 C30,20 70,20 100,0 L100,100 L0,100 Z" />
                  </svg>
                </div>

                {/* Rising Water Bubbles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute left-[20%] bottom-0 w-2 h-2 rounded-full bg-white/50 animate-bubble-1" />
                  <div className="absolute left-[55%] bottom-0 w-3 h-3 rounded-full bg-white/40 animate-bubble-2" />
                  <div className="absolute left-[85%] bottom-0 w-2.5 h-2.5 rounded-full bg-white/60 animate-bubble-3" />
                </div>
              </div>

              {/* Progress Text */}
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-100 animate-spin" />
                <span className="text-sm font-extrabold text-white tracking-wider shadow-sm">
                  Uploading... {progress}%
                </span>
              </div>
            </div>
          ) : (
            <label
              htmlFor="liquid-media-upload-input"
              className="w-full py-2.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-750"
            >
              <Upload className="h-4 w-4" /> Change Attached Media
            </label>
          )}
        </div>
      ) : (
        /* STATE 2: Initial Dropzone Button */
        <label
          htmlFor="liquid-media-upload-input"
          className="relative group w-full min-h-[140px] rounded-3xl border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/80 bg-gradient-to-r from-slate-950 via-indigo-955/40 to-slate-955 flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/30 overflow-hidden"
        >
          <div className="relative z-10 flex flex-col items-center text-center space-y-2">
            <div className="p-3.5 rounded-2xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-md">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors block">
                Click or Drop Media File to Preview
              </span>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Preview your image or video first before uploading to R2 Cloud
              </p>
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
