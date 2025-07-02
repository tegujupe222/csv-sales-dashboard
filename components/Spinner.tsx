import React from 'react';

export const Spinner = (): React.ReactNode => (
  <div className="flex flex-col items-center justify-center p-10">
    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-lg font-semibold text-gray-700">データを処理中...</p>
  </div>
);