import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shareSlug, setShareSlug] = useState('');
  const [hasShare, setHasShare] = useState(false);

  const importLocalData = async () => {
    if (!user) return;
    const ok = window.confirm('Quá trình này sẽ lấy dữ liệu từ bản demo cũ (localStorage) và đẩy lên mây. Bạn chắc chắn chứ?');
    if (!ok) return;

    setLoading(true);
    try {
      const raw = localStorage.getItem('study-planner-demo-v1');
      if (!raw) {
        alert('Không tìm thấy dữ liệu cũ trong localStorage.');
        setLoading(false);
        return;
      }

      const data = JSON.parse(raw);
      if (!data.tasks || !Array.isArray(data.tasks)) {
        alert('Dữ liệu không hợp lệ.');
        setLoading(false);
        return;
      }

      const tasksToInsert = data.tasks.map((t: any) => ({
        user_id: user.id,
        date: t.date,
        start_time: t.time.split(' - ')[0] || '',
        end_time: t.time.split(' - ')[1] || '',
        category: t.category,
        title: t.title,
        description: t.detail || '',
        task_type: t.type || 'main',
        status: t.status,
        priority: t.priority,
        score_weight: t.score || 1,
        note: t.note || '',
      }));

      const { error } = await supabase.from('tasks').insert(tasksToInsert);
      if (error) throw error;
      
      alert('Đồng bộ dữ liệu thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Có lỗi xảy ra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const slug = Math.random().toString(36).substring(2, 10);
      const { error } = await supabase.from('public_shares').insert([
        { user_id: user.id, slug, is_active: true }
      ]);
      if (error) {
        if (error.code === '23505') {
          // Already exists
          const { data } = await supabase.from('public_shares').select('slug').eq('user_id', user.id).single();
          if (data) {
            setShareSlug(data.slug);
            setHasShare(true);
          }
        } else {
          throw error;
        }
      } else {
        setShareSlug(slug);
        setHasShare(true);
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cài đặt</h1>
      </header>

      <div className="card settings-section">
        <h3>Tài khoản</h3>
        <p>Đăng nhập bằng: <strong>{user?.email}</strong></p>
      </div>

      <div className="card settings-section">
        <h3>Đồng bộ dữ liệu cũ</h3>
        <p className="text-muted">Lấy dữ liệu từ phiên bản dùng thử (chỉ lưu trên máy này) và đẩy lên tài khoản của bạn.</p>
        <button className="primary-btn" onClick={importLocalData} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đồng bộ từ LocalStorage'}
        </button>
      </div>

      <div className="card settings-section">
        <h3>Chia sẻ (Public Link)</h3>
        <p className="text-muted">Tạo link chia sẻ tiến độ học tập (chỉ đọc) cho bạn bè.</p>
        
        {hasShare ? (
          <div className="share-link-box">
            <input type="text" readOnly value={`${window.location.origin}/${shareSlug}/shared`} />
            <button className="secondary" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${shareSlug}/shared`)}>
              Copy Link
            </button>
          </div>
        ) : (
          <button className="primary-btn" onClick={generateShareLink} disabled={loading}>
            Tạo link chia sẻ
          </button>
        )}
      </div>
    </div>
  );
};
