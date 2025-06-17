import React from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  text?: string;
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  className = '',
  color = 'primary'
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Color configurations
  const colorClasses = {
    primary: 'text-primary-500 border-primary-500',
    secondary: 'text-gray-600 border-gray-500',
    white: 'text-white border-white'
  };

  // Spinner component
  const Spinner = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Dots component
  const Dots = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${sizeClasses[size].replace('w-', 'w-').replace('h-', 'h-')} 
            ${colorClasses[color].split(' ')[0].replace('text-', 'bg-')} 
            rounded-full animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s'
          }}
        />
      ))}
    </div>
  );

  // Pulse component
  const Pulse = () => (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color].split(' ')[0].replace('text-', 'bg-')}
        rounded-full animate-pulse-slow ${className}
      `}
    />
  );

  // Skeleton component
  const Skeleton = () => (
    <div className={`animate-pulse ${className}`}>
      <div className="flex space-x-4">
        <div className="rounded-full bg-gray-300 h-10 w-10" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-300 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded" />
            <div className="h-4 bg-gray-300 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );

  // Render the appropriate variant
  const renderLoading = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      case 'skeleton':
        return <Skeleton />;
      default:
        return <Spinner />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderLoading()}
      {text && (
        <p className={`text-sm ${colorClasses[color].split(' ')[0]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );
};

// Pre-configured loading components for common use cases
export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-64 py-12">
    <Loading size="lg" text={text} />
  </div>
);

export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => (
  <Loading size="sm" text={text} className="inline-flex" />
);

export const ButtonLoading: React.FC = () => (
  <Loading size="sm" color="white" className="mr-2" />
);

export default Loading; 