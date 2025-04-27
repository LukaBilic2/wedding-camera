'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
import Confetti from 'react-confetti';
import { motion, LayoutGroup } from 'framer-motion';

export default function Home() {
  const [name, setName] = useState('');
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) {
      setStatus('🚫 Please select at least one photo before uploading.');
      return;
    }

    setStatus('Preparing to upload...');
    setLoading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file, 0.7);
        const formData = new FormData();
        formData.append('file', compressedFile);
        formData.append('upload_preset', 'bilkex4');
        formData.append('context', `guest=${name}`);

        let attempts = 0;
        let success = false;

        while (attempts < 2 && !success) {
          try {
            await axios.post(
              'https://api.cloudinary.com/v1_1/dxiuikb3z/image/upload',
              formData,
              {
                onUploadProgress: (progressEvent) => {
                  const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  setUploadProgress(
                    Math.round(
                      ((i + percentCompleted / 100) / files.length) * 100
                    )
                  );
                },
              }
            );
            success = true;
          } catch (err) {
            attempts++;
            if (attempts === 2) {
              throw err;
            }
          }
        }
      }

      setStatus('✅ Uploaded! Thank you for sharing 🎉');
      setFiles([]);
      setPreviewUrls([]);
      setName('');
      setShowConfetti(true);

      setTimeout(() => {
        setStatus('');
        setShowConfetti(false);
      }, 6000);
    } catch (err) {
      console.error(err);
      setStatus(
        '🚫 Upload failed after several tries. Please try again later.'
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const compressImage = (file, quality) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            },
            'image/jpeg',
            quality
          );
        };
      };
    });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);

    const notImages = selected.filter(
      (file) => !file.type.startsWith('image/')
    );
    if (notImages.length > 0) {
      alert(
        `🚫 Only image files are allowed! Skipped:\n\n${notImages
          .map((f) => f.name)
          .join('\n')}`
      );
    }

    const imagesOnly = selected.filter((file) =>
      file.type.startsWith('image/')
    );

    const oversized = imagesOnly.filter((file) => file.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(
        `🚫 Some images are too large (max 10MB). Skipped:\n\n${oversized
          .map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`)
          .join('\n')}`
      );
    }

    const validFiles = imagesOnly.filter(
      (file) => file.size <= 10 * 1024 * 1024
    );

    const combinedFiles = [...files, ...validFiles];
    if (combinedFiles.length > 10) {
      alert('🚫 You can only upload up to 10 photos at a time.');
      return;
    }

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

    setFiles(combinedFiles);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();
  const triggerCameraCapture = () => cameraInputRef.current?.click();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4 bg-cover bg-center text-gray-900 backdrop-blur-sm">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {!isOnline && (
        <div className="bg-yellow-300 text-yellow-900 px-4 py-2 rounded-md shadow mb-4">
          ⚠️ You are currently offline. Uploads won&apos;t work until
          you&apos;re back online.
        </div>
      )}

      <LayoutGroup>
        <motion.div
          layout
          transition={{ layout: { duration: 0.6, ease: 'easeInOut' } }}
          className="flex flex-col items-center justify-center gap-4 w-full"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={triggerCameraCapture}
              className="p-3 border border-gray-800 rounded-md w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-white bg-neutral-900 text-white"
            >
              📷 Take a Photo
            </button>
            <button
              onClick={triggerFileSelect}
              className="p-3 border border-gray-800 rounded-md w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-white bg-neutral-900 text-white"
            >
              🗂️ Choose Photos From Library
            </button>
          </div>
        </motion.div>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="w-full max-w-sm mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-red-400 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm mt-1">
              Uploading {uploadProgress}%
            </p>
          </div>
        )}

        {previewUrls.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 max-w-5xl w-full mt-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {previewUrls.map((url, index) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative w-full aspect-square group rounded-xl overflow-hidden shadow-lg border border-white/50 backdrop-blur-md bg-white/60"
              >
                <Image
                  src={url}
                  alt={`Preview ${index + 1}`}
                  fill
                  className={`object-cover transition duration-300 ease-in-out group-hover:scale-105 ${
                    loading ? 'blur-md grayscale' : ''
                  }`}
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 text-xs flex items-center justify-center rounded-full shadow hover:bg-red-700"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 text-gray-700 shadow">
                  {files[index] &&
                    `${(files[index].size / 1024 / 1024).toFixed(1)} MB`}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div layout className="mt-4">
          <motion.button
            initial={false}
            layout
            transition={{ layout: { duration: 0.6, ease: 'easeInOut' } }}
            onClick={handleUpload}
            className="bg-red-400 text-white font-semibold px-6 py-2 rounded-md shadow hover:bg-red-600 transition"
            disabled={!isOnline || loading}
          >
            {loading ? 'Sending...' : '💌 SEND'}
          </motion.button>
        </motion.div>
      </LayoutGroup>

      <Image
        src="/lukaandjosipa.png"
        alt="Luka & Josipa"
        width={500}
        height={300}
        className="object-contain mt-4"
      />

      {status && <p className="mt-4 text-center font-medium">{status}</p>}
    </main>
  );
}
