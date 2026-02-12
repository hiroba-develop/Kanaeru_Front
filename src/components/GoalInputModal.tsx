import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type GoalType = 'qualitative' | 'revenue' | 'grossProfit' | 'operatingProfit';

interface GoalInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    goal: string, 
    goalType: GoalType,
    amountInManYen?: number,  // ★ 追加：万円単位の数値
    targetYear?: number       // ★ 追加：目標年度
  ) => void;
  initialValue?: string;
  initialGoalType?: GoalType | null;
  title?: string;
  cellType?: 'center' | 'large' | 'middle' | 'small';
}

const GoalInputModal: React.FC<GoalInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue = '',
  initialGoalType = null,
  title = 'どんな目標にする？',
  cellType
}) => {
  const [selectedType, setSelectedType] = useState<GoalType | null>(null);
  const [goalText, setGoalText] = useState('');
  const [yearNumber, setYearNumber] = useState<string>('10');
  const [amount, setAmount] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false); // アニメーション用

  // ★ 修正: initialGoalTypeを優先的に使用
  const detectGoalType = (value: string): GoalType | null => {
    // ★ initialGoalTypeが渡されていればそれを最優先
    if (initialGoalType !== null && initialGoalType !== undefined) {
      return initialGoalType;
    }
    
    // フォールバック: テキストから推測（念のため）
    if (!value) return null;
    return 'qualitative';
  };

  const hasExistingGoal = initialValue.trim() !== '';
  const existingGoalType = detectGoalType(initialValue);

  // ★ 修正: 現在選択中のタイプと既存目標のタイプが一致するかチェック
  const isCurrentTypeSet = (type: GoalType): boolean => {
    if (!hasExistingGoal) return false;
    
    if (!selectedType) {
      // ステップ1では初期値のタイプと比較
      return existingGoalType === type;
    }
    
    // ステップ2では選択中のタイプと初期値のタイプが一致するかチェック
    // ただし、選択中のタイプが異なる場合はfalseを返す
    if (selectedType !== type) {
      return false;
    }
    
    // 選択中のタイプと既存のタイプが一致する場合のみtrue
    return existingGoalType === type;
  };

  useEffect(() => {
    if (isOpen) {
      setGoalText(initialValue);
      
      // 初期化
      setYearNumber('10');
      setAmount('');
      setSelectedType(null);
      
      // 既存データがある場合、タイプと値を抽出（ただしステップ1を表示）
      if (initialValue && initialValue.trim()) {
        const value = initialValue.trim();
        
        if (value.includes('売上') || value.includes('粗利益') || value.includes('営業利益')) {
          // 年度を抽出（例: "2年目に" → "2"）
          const yearMatch = value.match(/(\d+)年目に/);
          if (yearMatch) {
            setYearNumber(yearMatch[1]);
          }
          
          // ★ 修正：金額を抽出（億と万円の両方に対応）
          // パターン1: "99億9999万円" → 999999万円
          // パターン2: "1000万円" → 1000万円
          
          let amountInManYen = 0;
          
          // 億円が含まれる場合
          const okuMatch = value.match(/(\d+)億/);
          const manMatch = value.match(/(\d+)万円/);
          
          if (okuMatch) {
            // 億があれば、億を万円に変換
            amountInManYen += parseInt(okuMatch[1]) * 10000;
          }
          
          if (manMatch) {
            // 「XX億YY万円」の場合、YYの部分を加算
            // 「XX万円」の場合、XXをそのまま使用
            const manValue = parseInt(manMatch[1]);
            
            // 億がある場合は、万の部分を加算
            // 億がない場合は、万の値をそのまま使用
            if (okuMatch) {
              amountInManYen += manValue;
            } else {
              amountInManYen = manValue;
            }
          }
          
          if (amountInManYen > 0) {
            setAmount(amountInManYen.toString());
          }
        }
      }
      
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, initialValue]);

  // formatAmount関数を追加（useEffectの直後）
  const formatAmount = (amountInManYen: string): string => {
    const num = parseInt(amountInManYen);
    if (isNaN(num)) return '';
    
    if (num >= 10000) {
      // 1万万円 = 1億円以上
      const oku = Math.floor(num / 10000);
      const man = num % 10000;
      if (man === 0) {
        return `${oku}億円`;
      } else {
        return `${oku}億${man}万円`;
      }
    }
    return `${num}万円`;
  };
  if (!isOpen) return null;

  const handleTypeSelect = (type: GoalType) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSubmit = () => {
    
    if (selectedType === 'qualitative') {
      if (goalText.trim()) {
        onSubmit(goalText.trim(), selectedType);
        onClose();
      }
    } else if (selectedType) {
      if (amount && yearNumber) {
        const typeLabel = 
          selectedType === 'revenue' ? '売上' :
          selectedType === 'grossProfit' ? '粗利益' :
          '営業利益';
        
        const amountInManYen = parseInt(amount);
        const targetYearNum = parseInt(yearNumber);
        
        // 表示用のフォーマット済み文字列を作成
        const formattedAmount = formatAmount(amount);
        
        if (cellType === 'small') {
          const formattedGoal = `${yearNumber}年目に${typeLabel}${formattedAmount}`;
          onSubmit(formattedGoal, selectedType, amountInManYen, targetYearNum); // ★ 引数を追加
        } else {
          const formattedGoal = selectedType === 'operatingProfit'
            ? `${yearNumber}年目に\n${typeLabel}\n${formattedAmount}`
            : `${yearNumber}年目に${typeLabel}\n${formattedAmount}`;
          
          onSubmit(formattedGoal, selectedType, amountInManYen, targetYearNum); // ★ 引数を追加
        }
        onClose();
      } 
    } 
  };

  const isSubmitDisabled = () => {
    if (!selectedType) return true;
    if (selectedType === 'qualitative') {
      return !goalText.trim();
    }
    return !amount || !yearNumber;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景オーバーレイ - フェードイン */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* モーダル本体 - スケールアップ + フェードイン */}
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
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: 'clamp(16px, 4vw, 20px)',
              color: '#13AE67'
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 sm:p-6">
        {!selectedType ? (
        // ステップ1: 目標タイプ選択
        <div className="space-y-4">
          <p
            style={{
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: 'clamp(12px, 3vw, 14px)',
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 'clamp(16px, 4vw, 24px)'
            }}
          >
            目標を具体的に決めていきましょう
            <br />
            決まっていなければ空欄で構いません
          </p>

          {/* 各ボタンに遅延アニメーションを追加 */}
          <button
            onClick={() => handleTypeSelect('qualitative')}
            className={`w-full p-3 sm:p-4 rounded-2xl transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            } hover:scale-105 hover:shadow-lg hover:-translate-y-1`}
            style={{
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              transitionDelay: '100ms'
            }}
          >
            <div className="text-left">
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 'clamp(14px, 3.5vw, 16px)',
                  color: '#13AE67',
                  marginBottom: '4px'
                }}
              >
                {isCurrentTypeSet('qualitative')
                  ? initialValue
                  : '目標が叶った時のイメージを言葉にしてみましょう'}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: '#9CA3AF',
                  ...(isCurrentTypeSet('qualitative') && {
                    background: 'rgba(19, 174, 103, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  })
                }}
              >
                {isCurrentTypeSet('qualitative')
                  ? '設定済み'
                  : '例: 新しいパソコンを買えるようになっている'}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('revenue')}
            className={`w-full p-4 rounded-2xl transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            } hover:scale-105 hover:shadow-lg hover:-translate-y-1`}
            style={{
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              transitionDelay: '200ms'
            }}
          >
            <div className="text-left">
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: '#13AE67',
                  marginBottom: '4px'
                }}
              >
                {hasExistingGoal && existingGoalType === 'revenue'
                  ? initialValue
                  : 'そのために売上はいくら必要ですか？'}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: '#9CA3AF',
                  ...(isCurrentTypeSet('revenue') && {
                    background: 'rgba(19, 174, 103, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  })
                }}
              >
                {isCurrentTypeSet('revenue')
                  ? '設定済み'
                  : '年次PLと連動します'}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('grossProfit')}
            className={`w-full p-4 rounded-2xl transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            } hover:scale-105 hover:shadow-lg hover:-translate-y-1`}
            style={{
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              transitionDelay: '300ms'
            }}
          >
            <div className="text-left">
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: '#13AE67',
                  marginBottom: '4px'
                }}
              >
                {hasExistingGoal && existingGoalType === 'grossProfit'
                  ? initialValue
                  : 'そのために粗利益はいくら必要ですか？'}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: '#9CA3AF',
                  ...(isCurrentTypeSet('grossProfit') && {
                    background: 'rgba(19, 174, 103, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  })
                }}
              >
                {isCurrentTypeSet('grossProfit')
                  ? '設定済み'
                  : '年次PLと連動します'}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('operatingProfit')}
            className={`w-full p-4 rounded-2xl transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            } hover:scale-105 hover:shadow-lg hover:-translate-y-1`}
            style={{
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              transitionDelay: '400ms'
            }}
          >
            <div className="text-left">
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  color: '#13AE67',
                  marginBottom: '4px'
                }}
              >
                {hasExistingGoal && existingGoalType === 'operatingProfit'
                  ? initialValue
                  : 'そのために営業利益はいくら必要ですか？'}
              </p>
              <p
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 2.5vw, 12px)',
                  color: '#9CA3AF',
                  ...(isCurrentTypeSet('operatingProfit') && {
                    background: 'rgba(19, 174, 103, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  })
                }}
              >
                {isCurrentTypeSet('operatingProfit')
                  ? '設定済み'
                  : '年次PLと連動します'}
              </p>
            </div>
          </button>
        </div>
          ) : selectedType === 'qualitative' ? (
            // ステップ2-A: 定性的目標の入力
            <div className="space-y-4">
              <div>
                <label
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#13AE67',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  目標が叶った時のイメージを言葉にしてみましょう
                </label>
                <textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="例: 新しいパソコンを買えるようになっている"
                  className="w-full p-2 sm:p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-200"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    minHeight: 'clamp(100px, 20vw, 120px)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                  }}
                  maxLength={22}
                />
                <p
                  style={{
                    fontFamily: 'Inter',
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
          ) : (
            // ステップ2-B: PL連動目標の入力
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-xl">
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#13AE67',
                    marginBottom: '4px'
                  }}
                >
                  {selectedType === 'revenue' ? '売上目標' :
                   selectedType === 'grossProfit' ? '粗利益目標' :
                   '営業利益目標'}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    color: '#6B7280'
                  }}
                >
                  年次PL画面に自動で反映されます
                </p>
              </div>

              <div>
                <label
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: '#1E1F1F',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  達成年度
                </label>
                <select
                  value={yearNumber}
                  onChange={(e) => setYearNumber(e.target.value)}
                  className="w-full p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
                    <option key={year} value={year}>
                      {year}年目
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 500,
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    color: '#1E1F1F',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                >
                  目標金額（万円）
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 6桁以内に制限
                    if (value === '' || (parseInt(value) >= 0 && value.length <= 6)) {
                      setAmount(value);
                    }
                  }}
                  placeholder="例:1000"
                  className="w-full p-2 sm:p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    fontFamily: 'Inter',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                  }}
                  min="0"
                  max="999999"
                />
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    color: '#9CA3AF',
                    textAlign: 'right',
                    marginTop: '4px'
                  }}
                >
                  {amount.length} / 6桁（最大999,999万円 = 約99億9,999万円）
                </p>
              </div>

              {amount && yearNumber && (
              <div className="bg-gray-50 p-4 rounded-xl">
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 'clamp(10px, 2.5vw, 12px)',
                    color: '#6B7280',
                    marginBottom: '4px'
                  }}
                >
                  プレビュー
                </p>
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 'clamp(14px, 3.5vw, 16px)',
                    color: '#13AE67'
                  }}
                >
                  {yearNumber}年目に
                  {selectedType === 'revenue' ? '売上' :
                  selectedType === 'grossProfit' ? '粗利益' :
                  '営業利益'}
                  {formatAmount(amount)}
                </p>
              </div>
            )}
            </div>
          )}
        </div>

        {/* フッター */}
        {selectedType && (
        <div className="p-4 sm:p-6 flex gap-2 sm:gap-3" style={{ boxShadow: '0 -1px 0 0 rgba(229, 231, 235, 0.5)' }}>
          <button
              onClick={handleBack}
              className="flex-1 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-md hover:-translate-y-0.5 hover:bg-gray-50"
              style={{
                fontFamily: 'Inter',
                fontSize: 'clamp(12px, 3vw, 14px)',
                color: '#6B7280',
                boxShadow: '0 0 0 2px #E5E7EB'
              }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className={`flex-1 py-3 rounded-full font-medium transition-all duration-300 ${
                !isSubmitDisabled() && 'hover:scale-105 hover:shadow-lg hover:-translate-y-0.5'
              }`}
              style={{
                fontFamily: 'Inter',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                background: isSubmitDisabled() ? '#E5E7EB' : '#13AE67',
                color: isSubmitDisabled() ? '#9CA3AF' : '#FFFFFF',
                cursor: isSubmitDisabled() ? 'default' : 'pointer'
              }}
            >
              保存する
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalInputModal;