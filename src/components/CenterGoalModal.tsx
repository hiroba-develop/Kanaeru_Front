import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CenterGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: string, startDate: string) => void;
  initialGoal?: string;
  initialStartDate?: string;
}

const CenterGoalModal: React.FC<CenterGoalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialGoal = '',
  initialStartDate = ''
}) => {
  const [goalText, setGoalText] = useState('');
  const [startYear, setStartYear] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGoalText(initialGoal);
      
      // 初期値から年月を抽出
      if (initialStartDate) {
        // YYYYMM形式（例: "202502"）またはYYYY-MM形式に対応
        if (initialStartDate.includes('-')) {
          // YYYY-MM形式の場合
          const [year, month] = initialStartDate.split('-');
          setStartYear(year || '');
          setStartMonth(month || '');
        } else if (initialStartDate.length === 6) {
          // YYYYMM形式の場合（例: "202502"）
          const year = initialStartDate.substring(0, 4);
          const month = initialStartDate.substring(4, 6);
          setStartYear(year);
          setStartMonth(month);
        }
      } else {
        // デフォルトは現在の年月
        const now = new Date();
        setStartYear(now.getFullYear().toString());
        setStartMonth((now.getMonth() + 1).toString().padStart(2, '0'));
      }
      
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, initialGoal, initialStartDate]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (goalText.trim() && startYear && startMonth) {
      // YYYYMM形式で返す（例: "202502"）
      const startDate = `${startYear}${startMonth}`;
      onSubmit(goalText.trim(), startDate);
      onClose();
    }
  };

  const isSubmitDisabled = !goalText.trim() || !startYear || !startMonth;

  // 年の選択肢（2020年から10年後まで）
  const currentYear = new Date().getFullYear();
  const startYearRange = 2020;
  const endYearRange = currentYear + 10;
  const years = Array.from({ length: endYearRange - startYearRange + 1 }, (_, i) => startYearRange + i);

  // 月の選択肢
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: `${i + 1}月`
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景オーバーレイ */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* モーダル本体 */}
      <div
        className={`relative bg-white rounded-3xl shadow-xl mx-4 transition-all duration-300 ${
          isVisible 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 sm:p-6" style={{ boxShadow: '0 1px 0 0 rgba(229, 231, 235, 0.5)' }}>
          <h2
            style={{
              fontWeight: 600,
              fontSize: 'clamp(16px, 4vw, 20px)',
              color: '#13AE67'
            }}
          >
            私が叶える目標
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 sm:p-6 space-y-4">
          <p
            style={{
              fontWeight: 400,
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 'clamp(8px, 2vw, 16px)'
            }}
          >
            あなたのメインの目標を設定しましょう
          </p>

          {/* 開始年月 */}
          <div>
            <label
              style={{
                fontWeight: 500,
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: '#1E1F1F',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              開始年月
            </label>
            <div className="flex gap-3">
              <select
                value={startYear}
                onChange={(e) => setStartYear(e.target.value)}
                className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
              >
                <option value="">年を選択</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                style={{
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
              >
                <option value="">月を選択</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 目標テキスト */}
          <div>
            <label
              style={{
                fontWeight: 500,
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: '#1E1F1F',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              目標
            </label>
            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="例: 新しいパソコンを買えるようになっている"
              className="w-full p-2 sm:p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-300"
              style={{
                fontSize: 'clamp(12px, 3vw, 14px)',
                minHeight: 'clamp(100px, 20vw, 120px)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
              }}
              maxLength={22}
            />
            <p
              style={{
                fontWeight: 400,
                fontSize: 'clamp(10px, 2.5vw, 12px)',
                color: '#9CA3AF',
                textAlign: 'right',
                marginTop: '4px'
              }}
            >
              {goalText.length} / 22文字
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 sm:p-6 flex gap-2 sm:gap-3" style={{ boxShadow: '0 -1px 0 0 rgba(229, 231, 235, 0.5)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md hover:-translate-y-0.5 hover:bg-gray-50"
            style={{
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#6B7280',
              boxShadow: '0 0 0 2px #E5E7EB'
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className={`flex-1 py-3 rounded-full font-medium transition-all duration-300 ${
              !isSubmitDisabled && 'hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
            }`}
            style={{
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              background: isSubmitDisabled ? '#E5E7EB' : '#13AE67',
              color: isSubmitDisabled ? '#9CA3AF' : '#FFFFFF',
              cursor: isSubmitDisabled ? 'default' : 'pointer'
            }}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default CenterGoalModal;