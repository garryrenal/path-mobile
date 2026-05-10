import React, { useState } from 'react';
import { TimePickerDialog } from './TimePickerDialog';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className={`flex items-center cursor-pointer ${className}`}
      >
        <span>{value || '--:--'}</span>
        <Clock className="w-3 h-3 ml-auto opacity-50" />
      </div>
      
      <TimePickerDialog 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialTime={value}
        onTimeChange={onChange}
      />
    </>
  );
}
