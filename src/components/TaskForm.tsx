import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType } from '../types';

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    description: '',
    task_type: 'main',
    status: 'todo',
    priority: 'medium',
    score_weight: 1,
    note: '',
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field: keyof Task, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="task-form-overlay">
      <div className="task-form-container card">
        <h3>{initialData?.id ? 'Chỉnh sửa Task' : 'Thêm Task mới'}</h3>
        
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-row">
            <label className="field">
              Tiêu đề *
              <input required type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} />
            </label>
            <label className="field">
              Môn học / Phân loại *
              <input required type="text" value={formData.category} onChange={e => handleChange('category', e.target.value)} list="categories" />
              <datalist id="categories">
                <option value="SQLD" />
                <option value="정보처리기사" />
                <option value="IELTS" />
                <option value="Korean" />
                <option value="Spring Boot" />
                <option value="React/WebSquare" />
                <option value="Exercise" />
                <option value="Other" />
              </datalist>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              Ngày *
              <input required type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
            </label>
            <label className="field">
              Từ
              <input type="time" value={formData.start_time} onChange={e => handleChange('start_time', e.target.value)} />
            </label>
            <label className="field">
              Đến
              <input type="time" value={formData.end_time} onChange={e => handleChange('end_time', e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              Loại
              <select value={formData.task_type} onChange={e => handleChange('task_type', e.target.value as TaskType)}>
                <option value="main">Chính</option>
                <option value="secondary">Phụ</option>
                <option value="exercise">Thể dục</option>
                <option value="review">Ôn tập</option>
                <option value="class">Học lớp</option>
                <option value="optional">Tự chọn</option>
              </select>
            </label>
            <label className="field">
              Độ ưu tiên
              <select value={formData.priority} onChange={e => handleChange('priority', e.target.value as TaskPriority)}>
                <option value="high">Cao</option>
                <option value="medium">Vừa</option>
                <option value="low">Thấp</option>
              </select>
            </label>
            <label className="field">
              Trạng thái
              <select value={formData.status} onChange={e => handleChange('status', e.target.value as TaskStatus)}>
                <option value="todo">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="done">Hoàn thành</option>
                <option value="skipped">Bỏ qua</option>
                <option value="moved">Đã dời</option>
              </select>
            </label>
          </div>

          <label className="field">
            Chi tiết
            <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} />
          </label>
          <label className="field">
            Ghi chú
            <textarea value={formData.note} onChange={e => handleChange('note', e.target.value)} rows={2} />
          </label>

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onCancel} disabled={isLoading}>Hủy</button>
            <button type="submit" className="primary-btn" disabled={isLoading} style={{ width: 'auto', marginTop: 0 }}>
              {isLoading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
