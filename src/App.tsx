/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AccessGate } from './components/AccessGate';
import { LearnerView } from './components/LearnerView';
import { InstructorDashboard } from './components/InstructorDashboard';
import { useGameSocket } from './hooks/useGameSocket';

export default function App() {
  const [role, setRole] = useState<'learner' | 'instructor' | null>(() => {
    const saved = localStorage.getItem('to_be_role');
    if (saved === 'learner' || saved === 'instructor') {
      return saved;
    }
    return null;
  });

  const {
    isConnected,
    sessionState,
    detailedParticipants,
    personalInfo,
    finalSummary,
    errorMessage,
    createSession,
    reconnectInstructor,
    joinSession,
    addDemoLearners,
    startGame,
    submitAnswer,
    pauseResume,
    revealAnswer,
    showLeaderboard,
    nextQuestion,
    endGame,
    clearError
  } = useGameSocket();

  const handleRoleGranted = (newRole: 'learner' | 'instructor') => {
    setRole(newRole);
    localStorage.setItem('to_be_role', newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem('to_be_role');
    localStorage.removeItem('to_be_active_pin');
    localStorage.removeItem('to_be_participant_id');
    setRole(null);
  };

  if (!role) {
    return <AccessGate onRoleGranted={handleRoleGranted} />;
  }

  if (role === 'learner') {
    return (
      <LearnerView
        sessionState={sessionState}
        personalInfo={personalInfo}
        onJoinSession={joinSession}
        onSubmitAnswer={submitAnswer}
        onLogout={handleLogout}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <InstructorDashboard
      sessionState={sessionState}
      detailedParticipants={detailedParticipants}
      finalSummary={finalSummary}
      errorMessage={errorMessage}
      onCreateSession={createSession}
      onAddDemoLearners={addDemoLearners}
      onStartGame={startGame}
      onPauseResume={pauseResume}
      onRevealAnswer={revealAnswer}
      onShowLeaderboard={showLeaderboard}
      onNextQuestion={nextQuestion}
      onEndGame={endGame}
      onLogout={handleLogout}
    />
  );
}
