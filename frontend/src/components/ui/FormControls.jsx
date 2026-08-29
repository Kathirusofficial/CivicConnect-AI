import React, { useState, forwardRef, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, UploadCloud, X, Camera, Image as ImageIcon, Video, Trash2, RefreshCw, Maximize2, FileText, Plus } from 'lucide-react';

const formElementStyle = {
  backgroundColor: '#1A1027',
  color: '#FFFFFF',
  caretColor: '#C084FC',
};

// Error shake animation
const shakeAnimation = {
  shake: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } },
  normal: { x: 0 }
};

export const AppInput = forwardRef(({ label, error, success, type = 'text', ...props }, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-gray-300 block mb-1.5">{label}</label>
      )}
      <motion.div
        variants={shakeAnimation}
        animate={error ? "shake" : "normal"}
        initial={false}
        className="relative"
      >
        <motion.div
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-[14px] overflow-hidden"
          style={{
            border: `1px solid ${error ? '#EF4444' : success ? '#10B981' : isFocused ? '#A855F7' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isFocused && !error && !success ? '0 0 0 4px rgba(168,85,247,.20)' : 'none',
            backgroundColor: error ? 'rgba(239, 68, 68, 0.05)' : '#1A1027'
          }}
        >
          <input
            ref={ref}
            type={type}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={`w-full px-4 py-3 bg-transparent placeholder-gray-500 appearance-none focus:outline-none focus:ring-0 ${props.className || ''}`}
            style={formElementStyle}
            {...props}
          />
          {success && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
              <Check size={18} />
            </div>
          )}
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="text-red-500 text-xs mt-1.5 flex items-center gap-1"
          >
            <AlertCircle size={12} /> {error.message || error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export const AppTextarea = forwardRef(({ label, error, success, maxLength = 500, value, onChange, ...props }, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Calculate length based on controlled value, or uncontrolled default length?
  // We can track value locally just for the counter if needed, or rely on passed value
  const charCount = (value && typeof value === 'string') ? value.length : 0;

  return (
    <div className="w-full">
      {label && (
        <label className="text-sm font-medium text-gray-300 block mb-1.5 flex justify-between">
          <span>{label}</span>
          {maxLength && <span className="text-gray-500 text-xs">{charCount} / {maxLength}</span>}
        </label>
      )}
      <motion.div
        variants={shakeAnimation}
        animate={error ? "shake" : "normal"}
        initial={false}
        className="relative"
      >
        <motion.div
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-[14px] overflow-hidden"
          style={{
            border: `1px solid ${error ? '#EF4444' : success ? '#10B981' : isFocused ? '#A855F7' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isFocused && !error && !success ? '0 0 0 4px rgba(168,85,247,.20)' : 'none',
            backgroundColor: error ? 'rgba(239, 68, 68, 0.05)' : '#1A1027'
          }}
        >
          <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            className={`w-full px-4 py-3 bg-transparent placeholder-gray-500 appearance-none focus:outline-none focus:ring-0 min-h-[160px] max-h-[350px] resize-y ${props.className || ''}`}
            style={formElementStyle}
            maxLength={maxLength}
            {...props}
          />
          {success && (
            <div className="absolute right-3 top-3 text-emerald-500">
              <Check size={18} />
            </div>
          )}
        </motion.div>
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="text-red-500 text-xs mt-1.5 flex items-center gap-1"
          >
            <AlertCircle size={12} /> {error.message || error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export const AppMediaCapture = ({ media, setMedia }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoInputRef = useRef(null);
  
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFiles = (files, type = 'image') => {
    if (!files || files.length === 0) return;
    
    // Max 5 items total
    if (media.length >= 5) {
      alert("Maximum 5 evidence files allowed.");
      return;
    }
    
    const newMedia = Array.from(files).filter((file, idx) => {
      if (media.length + idx >= 5) return false;
      const isVideo = file.type.startsWith('video');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB video, 10MB image
      
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the maximum size limit of ${isVideo ? '50MB' : '10MB'}.`);
        return false;
      }
      return true;
    }).map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name,
      size: formatSize(file.size),
      file: file
    }));
    
    if (newMedia.length > 0) {
      setMedia(prev => [...prev, ...newMedia]);
    }
  };

  const removeMedia = (idx) => {
    setMedia(prev => prev.filter((_, i) => i !== idx));
  };
  
  const triggerCamera = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    cameraInputRef.current?.click();
  };
  
  const triggerGallery = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    fileInputRef.current?.click();
  };
  
  const triggerVideo = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    videoInputRef.current?.click();
  };

  // If there are files out there
  return (
    <div className="w-full space-y-6">
      {/* Hidden inputs */}
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp,image/jpg" 
        capture="environment" 
        ref={cameraInputRef} 
        onChange={(e) => handleFiles(e.target.files, 'image')} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp,image/jpg" 
        ref={fileInputRef} 
        onChange={(e) => handleFiles(e.target.files, 'image')} 
        multiple 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="video/mp4,video/quicktime,video/webm" 
        capture="environment" 
        ref={videoInputRef} 
        onChange={(e) => handleFiles(e.target.files, 'video')} 
        className="hidden" 
      />

      <AnimatePresence mode="wait">
        {media.length === 0 ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* CARD 1: PRIMARY CAMERA */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={triggerCamera}
              className="bg-gradient-to-br from-brand-500 to-accent-violet rounded-[20px] p-6 shadow-xl shadow-brand-500/20 text-white cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md"
                >
                  <Camera size={32} />
                </motion.div>
                <div>
                  <h3 className="font-bold text-xl drop-shadow-md">Capture Live Photo</h3>
                  <p className="text-white/80 text-sm mt-1">Take a live photo of the issue for accurate verification.</p>
                </div>
                <button type="button" className="px-6 py-2.5 bg-white text-brand-700 font-semibold rounded-full shadow-lg hover:shadow-xl transition-shadow w-full max-w-[200px]">
                  Open Camera
                </button>
              </div>
            </motion.div>

            {/* CARD 2: SECONDARY GALLERY */}
            <div className="flex flex-col gap-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={triggerGallery}
                className="flex-1 bg-[#1A1027] border border-white/5 rounded-[20px] p-6 shadow-lg shadow-black/20 cursor-pointer group flex flex-col items-center justify-center text-center hover:border-[#7C3AED] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 text-gray-400 group-hover:bg-[#7C3AED]/20 group-hover:text-[#7C3AED] flex items-center justify-center mb-3 transition-colors">
                  <ImageIcon size={24} />
                </div>
                <h3 className="font-semibold text-white">Upload Existing Photo</h3>
                <p className="text-gray-400 text-xs mt-1 mb-4">Choose an image from your device.</p>
                <button type="button" className="px-5 py-2 bg-white/5 text-white text-sm font-medium rounded-full hover:bg-white/10 transition-colors border border-white/10 w-full max-w-[180px]">
                  Browse Files
                </button>
              </motion.div>

              {/* CARD 3: VIDEO OPTION */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={triggerVideo}
                className="bg-[#1A1027] border border-white/5 rounded-[20px] p-4 shadow-lg shadow-black/20 cursor-pointer group flex items-center gap-4 hover:border-pink-500/50 hover:bg-pink-500/5 transition-colors h-[80px]"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 text-gray-400 group-hover:bg-pink-500/20 group-hover:text-pink-500 flex items-center justify-center shrink-0 transition-colors">
                  <Video size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-white text-sm">Record or Upload Video</h3>
                  <p className="text-gray-500 text-xs">Maximum 50 MB limits.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="previews"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {media.map((item, idx) => (
                  <motion.div 
                    key={item.url + idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-[#1A1027] border border-white/10 rounded-2xl overflow-hidden shadow-lg group relative flex flex-col"
                  >
                    <div className="h-40 w-full relative bg-black/40 flex items-center justify-center overflow-hidden">
                      {item.type === 'image' ? (
                        <img src={item.url} alt="Evidence" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" controls />
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-[#140C1F] to-transparent opacity-60" />
                      
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button type="button" onClick={() => removeMedia(idx)} className="p-1.5 bg-red-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-500 shadow transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-medium text-white truncate flex items-center gap-2">
                          <FileText size={14} className="text-[#7C3AED]" /> {item.name || `Evidence_${idx + 1}`}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">{item.size} • {item.type.toUpperCase()}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-auto">
                        <button type="button" onClick={item.type === 'image' ? triggerCamera : triggerVideo} className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors">
                          <RefreshCw size={12} /> Replace
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {media.length < 5 && (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onClick={triggerGallery}
                  className="bg-[#1A1027] border border-dashed border-white/20 hover:border-[#7C3AED] rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-lg cursor-pointer transition-colors min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mb-3">
                    <Plus size={24} />
                  </div>
                  <h3 className="font-semibold text-white">Add Another Photo</h3>
                  <p className="text-xs text-gray-500 mt-1">{5 - media.length} uploads remaining</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
