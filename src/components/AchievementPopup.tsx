import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import achieveBoy from "../assets/man.png";
import achieveGirl from "../assets/girl.png";
import kira from "../assets/kira.png";
import kira2 from "../assets/kira2.png";

interface AchievementPopupProps {
  isOpen: boolean;
  onClose: () => void;
  goalTitle: string;
  level: "large" | "middle" | "small";
  message?: string;
}

const AchievementPopup: React.FC<AchievementPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const petals = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 18 + Math.random() * 16,
    duration: 7 + Math.random() * 4,
    delay: Math.random() * -8,
  }));

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        onClick={onClose}
      >
       {/* 紙吹雪（画像版） - 下から上へ、拡大縮小ループ */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(100)].map((_, i) => {
            const useKira2 = Math.random() > 0.5;
            const startDelay = Math.random() * 10;
            const duration = 4 + Math.random() * 4;
            const pulseDelay = Math.random() * 2;
            
            return (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: '-50px',
                  animation: `rise ${duration}s linear ${startDelay}s infinite`,
                }}
              >
                <img
                  src={useKira2 ? kira2 : kira}
                  alt=""
                  style={{
                    width: `${15 + Math.random() * 25}px`,
                    height: 'auto',
                    animation: `pulse 1.5s ease-in-out ${pulseDelay}s infinite`,
                    opacity: 1,
                    display: 'block',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ポップアップコンテンツ */}
        <div
          className="bg-white rounded-card-xl shadow-2xl w-[min(92vw,900px)] max-w-3xl overflow-hidden animate-scaleIn relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 閉じるボタン（右上のX） */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-30"
          >
            <X className="w-6 h-6" />
          </button>

          {/* バナー部分 */}
          <div 
            className="bg-white flex flex-col items-center"
            style={{
              paddingTop: 'clamp(24px, 5vw, 40px)',
              paddingBottom: 'clamp(16px, 3vw, 24px)',
              paddingLeft: 'clamp(16px, 4vw, 32px)',
              paddingRight: 'clamp(16px, 4vw, 32px)'
            }}
          >
            {/* バナー本体 - レスポンシブ対応 */}
            <div 
              className="relative w-full mx-auto"
              style={{
                maxWidth: 'min(633px, 90vw)',
                height: 'clamp(250px, 50vw, 392px)'
              }}
            >
              {/* 白背景のカード */}
              <div className="absolute inset-0 rounded-[18px] bg-white flex flex-col items-center justify-start z-[5]"
                style={{
                  paddingTop: 'clamp(20px, 4vw, 28px)'
                }}
              >
                <p 
                  className="text-[#1e1f1f] leading-none"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 'clamp(32px, 8vw, 64px)'
                  }}
                >
                  Congratulations!
                </p>
                <p 
                  className="text-[#1e1f1f]"
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 'clamp(14px, 3vw, 24px)',
                    marginTop: 'clamp(4px, 1vw, 8px)'
                  }}
                >
                  今日は宴にしよう！
                </p>
              </div>

              {/* 女子イラスト（左下） */}
              <img
                src={achieveGirl}
                alt="girl"
                className="absolute animate-banner-girl pointer-events-none z-[10]"
                style={{ 
                  bottom: 'clamp(-10px, -1vw, 0px)',
                  left: 'clamp(35px, 15vw, 120px)',
                  width: 'clamp(100px, 22vw, 180px)',
                  height: 'auto',
                  //transform: "rotate(0deg)"
                }}
              />

              {/* 男子イラスト（右下） */}
              <img
                src={achieveBoy}
                alt="boy"
                className="absolute animate-banner-boy pointer-events-none z-[10]"
                style={{ 
                  bottom: 'clamp(-30px, -5vw, 0px)',
                  right: 'clamp(35px, 15vw, 120px)',
                  width: 'clamp(120px, 24vw, 200px)',
                  height: 'auto',
                  //transform: "rotate(0deg)"
                }}
              />
            </div>
          </div>

          {/* コンテンツ部分 */}
          <div 
            className="flex justify-center"
            style={{
              paddingTop: 'clamp(12px, 2vw, 16px)',
              paddingBottom: 'clamp(24px, 4vw, 32px)',
              paddingLeft: 'clamp(16px, 4vw, 32px)',
              paddingRight: 'clamp(16px, 4vw, 32px)'
            }}
          >
            {/* Closeボタン */}
            <button
              onClick={onClose}
              className="text-primary font-semibold hover:opacity-80 transition-all"
              style={{
                fontSize: 'clamp(14px, 3vw, 16px)',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                border: '2px solid #13AE67',
                borderRadius: '999px'
              }}
            >
              Close
            </button>
          </div>

          {/* アニメーション */}
          <style>{`
            @keyframes fall {
              to {
                transform: translateY(100vh) rotate(360deg);
                opacity: 0;
              }
            }

            @keyframes sakura-fall {
              0% {
                transform: translate3d(0, -10vh, 0) rotateZ(0deg);
                opacity: 0;
              }
              10% {
                opacity: 0.95;
              }
              100% {
                transform: translate3d(-40px, 110vh, 0) rotateZ(360deg);
                opacity: 0;
              }
            }

            .sakura-petal {
              position: absolute;
              top: -10%;
              background: radial-gradient(circle at 30% 30%, #ffffff 0, #fecaca 40%, #fb7185 75%);
              border-radius: 999px;
              box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
              opacity: 0.9;
              animation-name: sakura-fall;
              animation-timing-function: linear;
              animation-iteration-count: infinite;
              pointer-events: none;
            }

            @keyframes rise {
              0% {
                transform: translateY(0);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(-120vh);
                opacity: 0;
              }
            }

            @keyframes pulse {
              0%, 100% {
                transform: scale(0.7);
              }
              50% {
                transform: scale(1);
              }
            }

            @keyframes banner-boy {
              0%, 100% {
                transform: translateY(0) rotate(0deg);
              }
              50% {
                transform: translateY(-6px) rotate(0deg);
              }
            }

            @keyframes banner-girl {
              0%, 100% {
                transform: translateY(0) rotate(0deg);
              }
              50% {
                transform: translateY(4px) rotate(0deg);
              }
            }

            .animate-banner-boy {
              animation: banner-boy 2.2s ease-in-out infinite;
            }

            .animate-banner-girl {
              animation: banner-girl 2.4s ease-in-out infinite;
            }
          `}</style>
        </div>
      </div>
    </>
  );
};

export default AchievementPopup;