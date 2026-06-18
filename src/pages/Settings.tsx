import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [shareSlug, setShareSlug] = useState('');
  const [hasShare, setHasShare] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [dbCheckResult, setDbCheckResult] = useState<any>(null);

  const checkDb = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { count, error: countErr } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (countErr) throw countErr;

      const { data: topTasks, error: taskErr } = await supabase
        .from('tasks')
        .select('title, date, status, start_time')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);
      if (taskErr) throw taskErr;

      setDbCheckResult({ total: count, tasks: topTasks });
    } catch (err: any) {
      alert('Lỗi khi kiểm tra DB: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchShare = async () => {
      if (!user) return;
      const { data } = await supabase.from('public_shares').select('slug, is_active').eq('user_id', user.id).single();
      if (data) {
        setShareSlug(data.slug);
        setHasShare(true);
        setIsActive(data.is_active);
      }
    };
    fetchShare();
  }, [user]);

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

      const { data: existingTasks } = await supabase.from('tasks').select('date, start_time, title').eq('user_id', user.id);
      
      let skippedCount = 0;
      let invalidCount = 0;

      const tasksToInsert = data.tasks
        .filter((t: any) => {
          if (!t.date || !t.title || !t.category) {
            invalidCount++;
            return false;
          }
          const timeText = t.time || '';
          const [startTime = ''] = timeText.split(' - ');

          // duplicate prevention based on date + start_time + title
          const isDup = existingTasks?.some(et => et.date === t.date && et.start_time === startTime && et.title === t.title);
          if (isDup) skippedCount++;
          return !isDup;
        })
        .map((t: any) => {
          let mappedStatus = t.status;
          if (!['todo', 'in_progress', 'done', 'skipped', 'moved'].includes(mappedStatus)) {
            mappedStatus = 'todo';
            if (t.status === 'doing') mappedStatus = 'in_progress';
          }
          
          let mappedPriority = 'medium';
          if (t.priority === 'Cao') mappedPriority = 'high';
          else if (t.priority === 'Thấp') mappedPriority = 'low';

          let mappedType = t.type || 'main';
          if (!['main', 'secondary', 'exercise', 'review', 'class', 'optional'].includes(mappedType)) {
            mappedType = 'main';
            if (t.type === 'health') mappedType = 'exercise';
          }

          const timeText = t.time || '';
          const [startTime = '', endTime = ''] = timeText.split(' - ');

          return {
            user_id: user.id,
            date: t.date,
            start_time: startTime,
            end_time: endTime,
            category: t.category,
            title: t.title,
            description: t.detail || '',
            task_type: mappedType,
            status: mappedStatus,
            priority: mappedPriority,
            score_weight: t.score || 1,
            note: t.note || '',
          };
      });

      if (tasksToInsert.length === 0) {
        alert(`Không có dữ liệu mới nào để đồng bộ. Đã bỏ qua ${skippedCount} task trùng lặp, ${invalidCount} task không hợp lệ.`);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('tasks').insert(tasksToInsert);
      if (error) throw error;
      
      alert(`Đã đồng bộ ${tasksToInsert.length} task lên Supabase. Đã bỏ qua ${skippedCount} task trùng, ${invalidCount} task lỗi. Vào Lịch tháng để xem toàn bộ task.`);

      const { count: finalCount, error: countError } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      if (!countError) {
        alert(`Tài khoản hiện có ${finalCount} task trong database.`);
        if (finalCount === 0) {
          alert('Insert may have failed due to RLS or user mismatch.');
        }
      }
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
          // Already exists, just make active if it wasn't
          const { data } = await supabase.from('public_shares').select('slug').eq('user_id', user.id).single();
          if (data) {
            await supabase.from('public_shares').update({ is_active: true }).eq('user_id', user.id);
            setShareSlug(data.slug);
            setHasShare(true);
            setIsActive(true);
          }
        } else {
          throw error;
        }
      } else {
        setShareSlug(slug);
        setHasShare(true);
        setIsActive(true);
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShare = async () => {
    if (!user) return;
    setLoading(true);
    await supabase.from('public_shares').update({ is_active: !isActive }).eq('user_id', user.id);
    setIsActive(!isActive);
    setLoading(false);
  };

  const regenerateShare = async () => {
    if (!user) return;
    if (!window.confirm('Tạo lại link sẽ làm link cũ không thể truy cập được nữa. Bạn chắc chứ?')) return;
    setLoading(true);
    const newSlug = Math.random().toString(36).substring(2, 10);
    await supabase.from('public_shares').update({ slug: newSlug, is_active: true }).eq('user_id', user.id);
    setShareSlug(newSlug);
    setIsActive(true);
    setLoading(false);
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Cài đặt</h1>
      </header>

      <div className="card settings-section">
        <h3>Tài khoản</h3>
        <p>Đăng nhập bằng: <strong>{user?.email}</strong></p>
        <button className="danger-btn" style={{ marginTop: '1rem', width: 'auto' }} onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
      </div>

      <div className="card settings-section">
        <h3>Kiểm tra dữ liệu cloud</h3>
        <p className="text-muted">Kiểm tra xem dữ liệu đã được lưu thành công trên database chưa.</p>
        <button className="secondary-btn" onClick={checkDb} disabled={loading}>
          Kiểm tra số task trong DB
        </button>
        {dbCheckResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-color)', borderRadius: '8px' }}>
            <p><strong>Tổng số task:</strong> {dbCheckResult.total}</p>
            {dbCheckResult.tasks?.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>5 task gần nhất:</strong>
                <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {dbCheckResult.tasks.map((t: any, i: number) => (
                    <li key={i}>{t.title} - {t.date} {t.start_time} ({t.status})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
          <div>
            <div className="share-link-box">
              <input type="text" readOnly value={isActive ? `${window.location.origin}/${shareSlug}/shared` : 'Đã vô hiệu hóa'} />
              <button className="secondary-btn" disabled={!isActive} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${shareSlug}/shared`)}>
                Copy Link
              </button>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button className={isActive ? "danger-btn" : "primary-btn"} style={{ width: 'auto' }} onClick={toggleShare} disabled={loading}>
                {isActive ? 'Vô hiệu hóa link' : 'Mở lại link'}
              </button>
              <button className="secondary-btn" style={{ width: 'auto' }} onClick={regenerateShare} disabled={loading}>
                Tạo link mới
              </button>
            </div>
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
