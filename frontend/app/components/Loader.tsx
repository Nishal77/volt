"use client";

// From Uiverse.io by JkHuger — squares pick up `color` from the wrapping
// element so it reads on both light and dark backgrounds; pass a text-color
// className on <Loader> to theme it.
export function Loader({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-[60px] w-[60px] ${className}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`square sq${i + 1}`} />
      ))}
      <style jsx>{`
        .square {
          background: currentColor;
          width: 10px;
          height: 10px;
          position: absolute;
          top: 50%;
          left: 50%;
          margin-top: -5px;
          margin-left: -5px;
          animation: loader-square 675ms ease-in-out infinite alternate;
        }
        .sq1 { margin-top: -25px; margin-left: -25px; animation-delay: 0ms; }
        .sq2 { margin-top: -25px; animation-delay: 75ms; }
        .sq3 { margin-top: -25px; margin-left: 15px; animation-delay: 150ms; animation-direction: normal; }
        .sq4 { margin-left: -25px; animation-delay: 225ms; animation-direction: normal; }
        .sq5 { animation-delay: 300ms; animation-direction: normal; }
        .sq6 { margin-left: 15px; animation-delay: 375ms; animation-direction: normal; }
        .sq7 { margin-top: 15px; margin-left: -25px; animation-delay: 450ms; animation-direction: normal; }
        .sq8 { margin-top: 15px; animation-delay: 525ms; animation-direction: normal; }
        .sq9 { margin-top: 15px; margin-left: 15px; animation-delay: 600ms; animation-direction: normal; }
        @keyframes loader-square {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function LoaderScreen({ className = "" }: { className?: string }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <Loader />
    </div>
  );
}
