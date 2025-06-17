import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
}

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled';
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Base styles
  const baseStyles = 'w-full px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-1';
  
  // Variant styles
  const variantStyles = {
    default: 'border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500',
    filled: 'border border-gray-200 bg-gray-50 focus:ring-primary-500 focus:border-primary-500 focus:bg-white'
  };
  
  // Error styles
  const errorStyles = error 
    ? 'border-error-500 focus:ring-error-500 focus:border-error-500' 
    : '';

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={`
            ${baseStyles} 
            ${variantStyles[variant]} 
            ${errorStyles}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-error-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-600">{helperText}</p>
      )}
    </div>
  );
};

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  variant = 'default',
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  // Base styles
  const baseStyles = 'w-full px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-1 resize-vertical';
  
  // Variant styles
  const variantStyles = {
    default: 'border border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500',
    filled: 'border border-gray-200 bg-gray-50 focus:ring-primary-500 focus:border-primary-500 focus:bg-white'
  };
  
  // Error styles
  const errorStyles = error 
    ? 'border-error-500 focus:ring-error-500 focus:border-error-500' 
    : '';

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <textarea
        id={textareaId}
        className={`${baseStyles} ${variantStyles[variant]} ${errorStyles} ${className}`}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-error-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-600">{helperText}</p>
      )}
    </div>
  );
};

export default Input; 