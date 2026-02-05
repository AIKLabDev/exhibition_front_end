
import React from 'react';

interface LaserStyleProps {
  onSelect: (style: string) => void;
}

const LaserStyle: React.FC<LaserStyleProps> = ({ onSelect }) => {
  const styles = [
    { id: 'CLASSIC', label: 'CLASSIC', desc: 'Minimal & Clean' },
    { id: 'BOLD', label: 'BOLD', desc: 'Heavy weight font' },
    { id: 'TECH', label: 'TECH', desc: 'Futuristic design' },
    { id: 'NATURE', label: 'NATURE', desc: 'Organic patterns' },
  ];

  return (
    <div className="h-full flex flex-col p-12">
      <h2 className="text-6xl font-black mb-12 text-center uppercase tracking-tighter">Choose Laser Style</h2>
      
      <div className="grid grid-cols-4 gap-8 flex-1">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className="group flex flex-col items-center justify-center bg-white/5 border-2 border-white/10 rounded-[3rem] p-10 hover:bg-white/10 hover:border-blue-500 transition-all active:scale-95"
          >
            <div className="w-24 h-24 mb-8 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-black">
              {style.label.charAt(0)}
            </div>
            <h3 className="text-4xl font-black mb-2">{style.label}</h3>
            <p className="text-xl text-slate-400">{style.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LaserStyle;
