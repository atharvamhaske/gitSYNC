import React, { useState } from 'react';
import StepOne from './StepOne';
import StepTwo from './StepTwo';

function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [githubToken, setGithubToken] = useState(null);

  const handleStepOneComplete = (token) => {
    setGithubToken(token);
    setCurrentStep(2);
  };

  const handleStepTwoComplete = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body ${
          currentStep >= 1 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          1
        </div>
        <div className={`w-12 h-px ${currentStep >= 2 ? 'bg-black' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-body ${
          currentStep >= 2 ? 'bg-black text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          2
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && (
        <StepOne onComplete={handleStepOneComplete} />
      )}
      {currentStep === 2 && (
        <StepTwo githubToken={githubToken} onComplete={handleStepTwoComplete} />
      )}
    </div>
  );
}

export default OnboardingFlow;
