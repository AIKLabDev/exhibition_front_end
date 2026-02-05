import React from 'react';

const Fireworks: React.FC = () => {
  const particles = Array.from({ length: 12 });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-[100]">
      {particles.map((_, i) => (
        <div
          key={i}
          className="firework"
          style={{
            top: `${10 + Math.random() * 80}%`,
            left: `${10 + Math.random() * 80}%`,
            borderColor: ['#4ade80', '#22c55e', '#facc15', '#ffffff'][i % 4],
            animationDelay: `${i * 0.15}s`,
            width: `${200 + Math.random() * 300}px`,
            height: `${200 + Math.random() * 300}px`
          }}
        />
      ))}
    </div>
  );
};

export default Fireworks;
