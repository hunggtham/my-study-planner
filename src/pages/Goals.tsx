import React from 'react';
import { format } from 'date-fns';
import { GoalsPanel } from '../components/GoalsPanel';

export const Goals: React.FC<{ periodType: 'week' | 'month' }> = ({ periodType }) => {
  const currentStart = periodType === 'week' 
    ? format(new Date(), 'yyyy-MM-dd') // Simplifying for demo: should be startOfWeek
    : format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Mục tiêu {periodType === 'week' ? 'Tuần' : 'Tháng'}</h1>
        <p className="text-muted">Checklist theo dõi tiến độ.</p>
      </header>
      <div className="card">
        <GoalsPanel periodType={periodType} periodStartDate={currentStart} />
      </div>
    </div>
  );
};
