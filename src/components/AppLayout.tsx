import React from 'react';
import CinematicUniverse from './CinematicUniverse';

// THE MOST BEAUTIFUL ANOMALY IN THE UNIVERSE
// A continuous, auto-playing cinematic 3D space journey made for My Baby.
// This is intentionally NOT a traditional website layout — no navbar, hero,
// cards, or footer. The entire screen is one immersive experience.
const AppLayout: React.FC = () => {
  return (
    <main className="fixed inset-0 h-full w-full bg-black text-white overflow-hidden">
      <CinematicUniverse />
    </main>
  );
};

export default AppLayout;
