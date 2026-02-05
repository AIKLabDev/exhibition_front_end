
import React from 'react';

interface SelectGiftProps {
  onSelect: (giftId: string) => void;
}

const SelectGift: React.FC<SelectGiftProps> = ({ onSelect }) => {
  const gifts = [
    { id: 'GIFT_01', name: 'Tumbler', img: 'https://picsum.photos/id/1/200/200' },
    { id: 'GIFT_02', name: 'Keychain', img: 'https://picsum.photos/id/2/200/200' },
    { id: 'GIFT_03', name: 'Notebook', img: 'https://picsum.photos/id/3/200/200' },
    { id: 'GIFT_04', name: 'T-Shirt', img: 'https://picsum.photos/id/4/200/200' },
    { id: 'GIFT_05', name: 'Cap', img: 'https://picsum.photos/id/5/200/200' },
  ];

  return (
    <div className="h-full flex flex-col p-12">
      <h2 className="text-6xl font-black mb-12 text-center">SELECT YOUR REWARD</h2>
      
      <div className="flex-1 flex items-center justify-center gap-6 overflow-x-auto pb-8">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            onClick={() => onSelect(gift.id)}
            className="group min-w-[320px] h-[450px] bg-slate-800 rounded-[2.5rem] p-6 border-4 border-transparent hover:border-blue-500 transition-all active:scale-95"
          >
            <div className="w-full aspect-square bg-slate-900 rounded-3xl mb-6 overflow-hidden">
              <img src={gift.img} alt={gift.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
            </div>
            <h3 className="text-4xl font-bold uppercase text-center">{gift.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectGift;
