import React from 'react';

function Button({ children, onClick, variant = 'primary', disabled = false, className = '' }) {
  const baseStyles = 'font-body font-medium px-6 py-3 text-sm transition-all duration-200 w-full';
  
  const variants = {
    primary: 'bg-black text-white border border-black hover:bg-gray-900 disabled:bg-gray-400 disabled:border-gray-400',
    outline: 'bg-white text-black border border-black hover:bg-gray-50 disabled:border-gray-300 disabled:text-gray-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
