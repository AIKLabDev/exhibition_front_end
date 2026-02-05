
import React from 'react';

interface GameResultProps {
  result: 'WIN' | 'LOSE';
  text?: string;
}

const GameResult: React.FC<GameResultProps> = ({ result, text }) => {
  const isWin = result === 'WIN';

  return (
    <div className={`h-full flex flex-col items-center justify-center transition-colors duration-1000 ${
      isWin ? 'bg-green-950/20' : 'bg-red-950/20'
    }`}>
      {/* Visual Effects Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isWin ? (
          <div className="absolute inset-0 flex items-center justify-center">
             {/* Confetti-like CSS placeholders */}
             {Array.from({ length: 20 }).map((_, i) => (
               <div 
                 key={i}
                 className="absolute w-4 h-4 rounded-full bg-blue-500 animate-[confetti_3s_infinite]"
                 style={{ 
                   left: `${Math.random() * 100}%`, 
                   top: `-10%`,
                   animationDelay: `${Math.random() * 3}s`,
                   backgroundColor: ['#3b82f6', '#10b981', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 4)]
                 }}
               />
             ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-red-900/10 to-transparent" />
        )}
      </div>

      <div className="relative z-10 text-center scale-110">
        <div className={`text-[180px] mb-8 animate-bounce`}>
          {isWin ? '🏆' : '😢'}
        </div>
        <h2 className={`text-9xl font-black tracking-tighter uppercase italic mb-4 ${
          isWin ? 'text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'text-red-500 opacity-80'
        }`}>
          {isWin ? 'Victory!' : 'Hard Luck'}
        </h2>
        <p className="text-4xl font-bold text-white/60 uppercase tracking-[0.3em]">
          {text || (isWin ? 'You have unlocked a special reward' : 'Don\'t give up, try again next time!')}
        </p>

        {isWin && (
          <div className="mt-16 flex flex-col items-center">
            <div className="px-12 py-4 bg-green-600 rounded-full text-2xl font-black animate-pulse">
              ROBOT IS PREPARING YOUR GIFT
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(800px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default GameResult;
