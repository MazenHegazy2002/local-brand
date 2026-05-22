import React from 'react';
import { UploadIcon } from './Icons';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  selectedImage: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, selectedImage }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300">
        1. Upload Clothing Item Photo
      </label>
      <div
        className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 ${selectedImage ? 'border-pink-500 bg-pink-500/5' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="p-10 flex flex-col items-center justify-center text-center">
          {selectedImage ? (
            <div className="relative w-40 h-40 rounded-lg overflow-hidden border border-white/20">
              <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-semibold">Change Photo</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 text-white/50 group-hover:text-white/80 transition-colors">
                <UploadIcon />
              </div>
              <p className="text-sm text-gray-400 group-hover:text-gray-200">
                Click to upload or drag and drop
                <br />
                <span className="text-xs opacity-60">PNG, JPG, HEIC (Max 10MB)</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
