import React from 'react';

function Footer() {
  return (
    <footer className="py-4 px-6 border-t border-gray-100">
      <p className="text-center text-sm text-gray-500 font-body">
        made by{' '}
        <a
          href="https://x.com/atharvaxdevs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black underline hover:no-underline"
        >
          atharva
        </a>
        {' '}with{' '}
        <a
          href="https://www.blackbox.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-black underline hover:no-underline"
        >
          @blackboxai
        </a>
      </p>
    </footer>
  );
}

export default Footer;
