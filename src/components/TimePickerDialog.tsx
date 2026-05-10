import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TimePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTimeChange: (time: string) => void;
  initialTime?: string; // "HH:mm"
  title?: string;
}

export function TimePickerDialog({
  isOpen,
  onClose,
  onTimeChange,
  initialTime = "12:00",
  title = "SELECT TIME"
}: TimePickerDialogProps) {
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialTime && initialTime.includes(':')) {
        const [h, m] = initialTime.split(':');
        setHours(parseInt(h, 10) || 0);
        setMinutes(parseInt(m, 10) || 0);
      } else {
        const now = new Date();
        setHours(now.getHours());
        setMinutes(now.getMinutes());
      }
      setMode('hours');
    }
  }, [isOpen, initialTime]);

  const handleOk = () => {
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    onTimeChange(`${hh}:${mm}`);
    onClose();
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Clock UI Dimensions
  const SIZE = 260;
  const CENTER = SIZE / 2;
  const OUTER_RADIUS = 100;
  const INNER_RADIUS = 60;
  const MINUTE_RADIUS = OUTER_RADIUS;

  const clockRef = useRef<HTMLDivElement>(null);

  const getPositionFromCenter = (val: number, isHour: boolean, isInner: boolean) => {
    let angle = 0;
    if (isHour) {
      angle = (val % 12) * 30; // 360 / 12 = 30 deg per hour
    } else {
      angle = (val % 60) * 6; // 360 / 60 = 6 deg per minute
    }
    const rad = (angle - 90) * (Math.PI / 180);
    const radius = !isHour ? MINUTE_RADIUS : (isInner ? INNER_RADIUS : OUTER_RADIUS);
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad)
    };
  };

  const handleClockInteract = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, isCommit = false) => {
    if (!clockRef.current) return;
    const rect = clockRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    const x = clientX - rect.left - CENTER;
    const y = clientY - rect.top - CENTER;
    
    // Calculate angle in degrees (0 at top, clockwise)
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const radius = Math.sqrt(x*x + y*y);

    if (mode === 'hours') {
      const isInner = radius < (OUTER_RADIUS + INNER_RADIUS) / 2;
      let hr = Math.round(angle / 30) % 12;
      if (hr === 0) hr = 12;

      if (isInner) {
         if (hr === 12) hr = 0;
         else hr += 12;
      } else {
         if (hr === 12) hr = 12; // 12 PM
      }

      setHours(hr);

      if (isCommit) {
        setTimeout(() => setMode('minutes'), 300);
      }
    } else {
      let min = Math.round(angle / 6) % 60;
      setMinutes(min);
    }
  };

  useEffect(() => {
    const handleUp = (e: MouseEvent | TouchEvent) => {
      // Only process if we started a drag or click in the clock
    };
    return () => {};
  }, []);

  if (!isOpen) return null;

  const renderHours = () => {
    const outerHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const innerHours = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

    return (
      <>
        {outerHours.map(h => {
          const { x, y } = getPositionFromCenter(h, true, false);
          const isSelected = hours === h;
          return (
             <div 
               key={`hr-out-${h}`}
               className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm cursor-pointer z-10 transition-colors ${isSelected ? 'text-white' : 'text-slate-700 hover:bg-slate-200'}`}
               style={{ left: x, top: y }}
             >
               {h}
             </div>
          );
        })}
        {innerHours.map(h => {
          const { x, y } = getPositionFromCenter(h, true, true);
          const isSelected = hours === h;
          return (
             <div 
               key={`hr-in-${h}`}
               className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-xs cursor-pointer z-10 transition-colors ${isSelected ? 'text-white' : 'text-slate-500 hover:bg-slate-200'}`}
               style={{ left: x, top: y }}
             >
               {h === 0 ? '00' : h}
             </div>
          );
        })}
      </>
    );
  };

  const renderMinutes = () => {
    let minutesArray = [];
    for(let i = 0; i < 60; i += 5) {
      minutesArray.push(i);
    }
    return (
      <>
        {minutesArray.map(m => {
          const { x, y } = getPositionFromCenter(m, false, false);
          const isSelected = minutes === m;
          return (
             <div 
               key={`min-${m}`}
               className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm cursor-pointer z-10 transition-colors ${isSelected ? 'text-white' : 'text-slate-700 hover:bg-slate-200'}`}
               style={{ left: x, top: y }}
             >
               {pad(m)}
             </div>
          );
        })}
      </>
    );
  };

  const getHandStyle = () => {
    const isHour = mode === 'hours';
    const isInnerHour = isHour && (hours === 0 || hours > 12);
    
    let angle = 0;
    if (isHour) {
      angle = (hours % 12) * 30;
    } else {
      angle = (minutes % 60) * 6;
    }
    
    const length = !isHour ? MINUTE_RADIUS : (isInnerHour ? INNER_RADIUS : OUTER_RADIUS);

    return {
      height: length,
      transform: `rotate(${angle}deg)`,
      transformOrigin: 'bottom center'
    };
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-md shadow-2xl overflow-hidden w-full max-w-[320px] select-none"
        >
          {/* Header */}
          <div className="bg-[#00bcd4] p-6 text-white text-center rounded-t-md">
             <div className="text-xs tracking-wider opacity-80 uppercase font-semibold mb-6">{title}</div>
             <div className="flex justify-center items-baseline space-x-1 text-6xl font-light">
                <span 
                  onClick={() => setMode('hours')} 
                  className={`cursor-pointer transition-opacity ${mode === 'hours' ? 'opacity-100 font-normal' : 'opacity-60'}`}
                >
                  {pad(hours)}
                </span>
                <span className="opacity-60 pb-2 text-4xl">:</span>
                <span 
                  onClick={() => setMode('minutes')} 
                  className={`cursor-pointer transition-opacity ${mode === 'minutes' ? 'opacity-100 font-normal' : 'opacity-60'}`}
                >
                  {pad(minutes)}
                </span>
             </div>
          </div>

          {/* Clock Face */}
          <div className="p-6 flex justify-center">
             <div 
               ref={clockRef}
               onMouseDown={(e) => handleClockInteract(e)}
               onMouseUp={(e) => handleClockInteract(e, true)}
               onMouseMove={(e) => e.buttons === 1 && handleClockInteract(e)}
               onTouchStart={(e) => handleClockInteract(e)}
               onTouchMove={(e) => handleClockInteract(e)}
               onTouchEnd={(e) => handleClockInteract(e, true)}
               className="relative rounded-full bg-slate-100 cursor-crosshair touch-none"
               style={{ width: SIZE, height: SIZE }}
             >
                {/* Center Dot */}
                <div 
                  className="absolute rounded-full bg-[#00bcd4] w-2 h-2 z-20"
                  style={{ left: CENTER - 4, top: CENTER - 4 }}
                />

                {/* Hand */}
                <div 
                  className="absolute pointer-events-none z-0"
                  style={{ 
                    left: CENTER - 1, 
                    bottom: CENTER, 
                    width: 2, 
                    backgroundColor: '#00bcd4',
                    ...getHandStyle() 
                  }}
                >
                   {/* Circle at end of hand */}
                   <div 
                     className="absolute rounded-full bg-[#00bcd4]"
                     style={{ 
                        left: '50%',
                        top: 0,
                        width: 32,
                        height: 32,
                        transform: 'translate(-50%, -50%)'
                     }}
                   >
                     {/* Small inner dot if pointing to an outer number but mode is minutes and not a multiple of 5 */}
                     {mode === 'minutes' && minutes % 5 !== 0 && (
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
                     )}
                   </div>
                </div>

                {mode === 'hours' ? renderHours() : renderMinutes()}
             </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end p-2 space-x-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-[#00bcd4] text-sm font-semibold hover:bg-slate-50 uppercase rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleOk}
              className="px-4 py-2 text-[#00bcd4] text-sm font-semibold hover:bg-slate-50 uppercase rounded transition-colors"
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
