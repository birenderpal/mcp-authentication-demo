import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className={cn("flex justify-center items-center", className)}>
      <div className={cn("animate-spin rounded-full border-4 border-solid border-gray-200 border-t-blue-600", sizeClasses[size])}></div>
    </div>
  );
};

export default LoadingSpinner;
