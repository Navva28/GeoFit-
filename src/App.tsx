import React, { useState, useEffect } from 'react';
import { AppScreen, Territory, RunRecord } from './types';
import { runManager, ActiveRunSnapshot } from './services/runManager';
import { SplashScreen } from './screens/SplashScreen';
import { LoginScreen } from './screens/LoginScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MapRunScreen } from './screens/MapRunScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { BottomNavBar } from './components/BottomNavBar';
import { TerritoryResultModal } from './components/TerritoryResultModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('SPLASH');
  const [activeRunSnapshot, setActiveRunSnapshot] = useState<ActiveRunSnapshot>(runManager.getSnapshot());

  // Result Modal State
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [lastFinishedRun, setLastFinishedRun] = useState<RunRecord | null>(null);
  const [lastCapturedTerritory, setLastCapturedTerritory] = useState<Territory | null>(null);
  const [highlightTerritoryId, setHighlightTerritoryId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = runManager.subscribe((snapshot) => {
      setActiveRunSnapshot(snapshot);
    });

    return () => unsubscribe();
  }, []);

  const isRunning = activeRunSnapshot.state === 'TRACKING' || activeRunSnapshot.state === 'PAUSED';

  const handleRunFinished = (result: { run: RunRecord; territory: Territory | null }) => {
    setLastFinishedRun(result.run);
    setLastCapturedTerritory(result.territory);
    setResultModalOpen(true);
  };

  const handleViewTerritoryFromModal = () => {
    setResultModalOpen(false);
    if (lastCapturedTerritory) {
      setHighlightTerritoryId(lastCapturedTerritory.territoryId);
    }
    setCurrentScreen('MAP_RUN');
  };

  const handleDoneFromModal = () => {
    setResultModalOpen(false);
    setCurrentScreen('HOME');
  };

  const handleSelectTerritoryFromProfile = (territoryId: string) => {
    setHighlightTerritoryId(territoryId);
    setCurrentScreen('MAP_RUN');
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] flex justify-center text-[#F5F5F5] font-sans">
      {/* Mobile-proportioned App Container */}
      <div className="w-full max-w-md min-h-screen bg-[#050505] shadow-2xl relative flex flex-col overflow-hidden">
        {currentScreen === 'SPLASH' && (
          <SplashScreen onComplete={() => setCurrentScreen('HOME')} />
        )}

        {currentScreen === 'LOGIN' && (
          <LoginScreen
            onSuccess={() => setCurrentScreen('HOME')}
            onNavigateToSignUp={() => setCurrentScreen('SIGNUP')}
            onInstantDemoMode={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'SIGNUP' && (
          <SignUpScreen
            onSuccess={() => setCurrentScreen('HOME')}
            onNavigateToLogin={() => setCurrentScreen('LOGIN')}
          />
        )}

        {currentScreen === 'HOME' && (
          <HomeScreen
            onStartRun={() => setCurrentScreen('MAP_RUN')}
            onOpenMap={() => setCurrentScreen('MAP_RUN')}
            onOpenLeaderboard={() => setCurrentScreen('LEADERBOARD')}
            onOpenProfile={() => setCurrentScreen('PROFILE')}
          />
        )}

        {currentScreen === 'MAP_RUN' && (
          <MapRunScreen
            onRunFinished={handleRunFinished}
            highlightTerritoryId={highlightTerritoryId}
          />
        )}

        {currentScreen === 'LEADERBOARD' && <LeaderboardScreen />}

        {currentScreen === 'PROFILE' && (
          <ProfileScreen
            onSelectTerritory={handleSelectTerritoryFromProfile}
            onLogout={() => setCurrentScreen('LOGIN')}
          />
        )}

        {/* Global Bottom Navigation */}
        <BottomNavBar
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            setHighlightTerritoryId(null);
            setCurrentScreen(screen);
          }}
          isRunning={isRunning}
        />

        {/* Territory Captured Reward Celebration Modal */}
        <TerritoryResultModal
          isOpen={resultModalOpen}
          territory={lastCapturedTerritory}
          run={lastFinishedRun}
          onViewTerritory={handleViewTerritoryFromModal}
          onDone={handleDoneFromModal}
        />
      </div>
    </div>
  );
}
