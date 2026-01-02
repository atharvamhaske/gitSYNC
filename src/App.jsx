import React, { useState, useEffect } from 'react';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import Dashboard from './components/Dashboard/Dashboard';
import Footer from './components/Footer';
import { getStorageData } from './utils/storage';

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const data = await getStorageData(['githubToken', 'repoUrl', 'onboardingComplete']);
      if (data.onboardingComplete && data.githubToken && data.repoUrl) {
        setIsOnboarded(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboarded(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[480px] bg-white">
        <p className="font-body text-black">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[480px] bg-white">
      <div className="flex-1 p-6">
        {isOnboarded ? (
          <Dashboard />
        ) : (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        )}
      </div>
      <Footer />
    </div>
  );
}

export default App;
