import { TaskStatus } from '../types';
import { CircleDashed, PlayCircle, CheckCircle2, XCircle, ArrowRightCircle } from 'lucide-react';

export const getStatusMeta = (status: TaskStatus) => {
  switch (status) {
    case 'todo':
      return {
        label: 'Chưa làm',
        className: 'status-todo',
        icon: CircleDashed,
        intent: 'neutral'
      };
    case 'in_progress':
      return {
        label: 'Đang làm',
        className: 'status-in-progress',
        icon: PlayCircle,
        intent: 'primary'
      };
    case 'done':
      return {
        label: 'Hoàn thành',
        className: 'status-done',
        icon: CheckCircle2,
        intent: 'success'
      };
    case 'skipped':
      return {
        label: 'Bỏ qua',
        className: 'status-skipped',
        icon: XCircle,
        intent: 'muted'
      };
    case 'moved':
      return {
        label: 'Đã dời',
        className: 'status-moved',
        icon: ArrowRightCircle,
        intent: 'warning'
      };
    default:
      return {
        label: 'Chưa làm',
        className: 'status-todo',
        icon: CircleDashed,
        intent: 'neutral'
      };
  }
};
