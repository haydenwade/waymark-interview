'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size allowed is 200MB.');
      return;
    }

    setUploading(true);
    setFileId(null);
    setDownloadUrl(null);

    try {
      const res = await fetch('/api/audio-files/signed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error('Failed to get signed URL');
      const { fileId, uploadUrl } = await res.json();
      setFileId(fileId);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);
      
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setStatus(`Uploading... ${percent}%`);
          }
        };
      
        xhr.onload = () => {
          if (xhr.status === 200) {
            setStatus('Upload complete. Queued for processing.');
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };
      
        xhr.onerror = () => {
          reject(new Error('Network error'));
        };
      
        xhr.send(file);
      });
      
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Poll for status if we have a fileId and not yet completed or errored
  useEffect(() => {
    if (!fileId || status?.includes('Uploading')) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audio-files/${fileId}/status`);
        const data = await res.json();
        const currentStatus = data?.versions?.browser?.status;
        const processedUrl = data?.versions?.browser?.processedUrl;

        if (currentStatus) {
          setStatus(currentStatus);

          if (currentStatus === 'completed' && processedUrl) {
            setDownloadUrl(processedUrl);
            clearInterval(interval);
          } else if (currentStatus === 'errored') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [fileId, status]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="h1">Audio Upload</h1>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-sm"
        />
        {status && <p>Status: <strong>{status}</strong></p>}
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline mt-4"
          >
            Download Processed Audio
          </a>
        )}
      </main>
    </div>
  );
}
