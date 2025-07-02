import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onFileProcess: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileProcess(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileProcess(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileProcess]);

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">売上CSVファイルをアップロード</h2>
      <p className="text-gray-600 mb-8">ファイルをドラッグ＆ドロップするか、クリックして参照してください。</p>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex justify-center items-center w-full h-64 px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-primary' : 'border-gray-300'} border-dashed rounded-md transition-colors duration-200 bg-white shadow-sm`}
      >
        <div className="space-y-1 text-center">
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
              <span>ファイルをアップロード</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv" />
            </label>
            <p className="pl-1">またはドラッグ＆ドロップ</p>
          </div>
          <p className="text-xs text-gray-500">CSVファイルのみ</p>
        </div>
      </div>
    </div>
  );
};