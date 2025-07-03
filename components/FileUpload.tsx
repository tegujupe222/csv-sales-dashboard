import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';

interface FileUploadProps {
  onFileProcess: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);

  const processFiles = async (files: FileList) => {
    const csvFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      alert('CSVファイルが見つかりませんでした。');
      return;
    }

    setProcessingFiles(csvFiles.map(f => f.name));

    for (const file of csvFiles) {
      try {
        await onFileProcess(file);
      } catch (error) {
        console.error(`ファイル ${file.name} の処理中にエラーが発生しました:`, error);
      }
    }

    setProcessingFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
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
      processFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4">売上CSVファイルをアップロード</h2>
      <p className="text-gray-600 mb-6 lg:mb-8 text-sm lg:text-base">複数のCSVファイルをドラッグ＆ドロップするか、クリックして参照してください。</p>
      
      {processingFiles.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold text-blue-800 mb-2">処理中のファイル:</h3>
          <ul className="text-sm text-blue-700">
            {processingFiles.map((fileName, index) => (
              <li key={index} className="flex items-center">
                <span className="animate-spin mr-2">⏳</span>
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex justify-center items-center w-full h-48 lg:h-64 px-4 lg:px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-primary' : 'border-gray-300'} border-dashed rounded-md transition-colors duration-200 bg-white shadow-sm`}
      >
        <div className="space-y-1 text-center">
          <UploadIcon className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-gray-400" />
          <div className="flex flex-col lg:flex-row text-sm text-gray-600 gap-1 lg:gap-0">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
              <span>ファイルをアップロード</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv" multiple />
            </label>
            <p className="lg:pl-1">またはドラッグ＆ドロップ</p>
          </div>
          <p className="text-xs text-gray-500">複数のCSVファイルに対応</p>
        </div>
      </div>
    </div>
  );
};