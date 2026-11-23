"use client";

import Image from "next/image";

interface GhostSpriteProps {
  variant?: "pink" | "purple";
  lookLeft?: boolean;
  caption: string;
  highlighted?: boolean;
  bobDelayMs?: number;
}

export function GhostSprite({
  variant = "pink",
  lookLeft = false,
  caption,
  highlighted = false,
  bobDelayMs = 0,
}: GhostSpriteProps) {
  const bodySrc =
    variant === "purple"
      ? "/assets/ghost-purple-body.svg"
      : "/assets/ghost-pink-body.svg";
  const pupilSrc =
    variant === "purple"
      ? "/assets/ghost-purple-pupil.svg"
      : "/assets/ghost-pink-pupil.svg";

  const leftPupilClass = lookLeft
    ? "inset-[43.75%_62.5%_43.75%_31.25%]"
    : "inset-[43.75%_56.25%_43.75%_37.5%]";
  const rightPupilClass = lookLeft
    ? "inset-[43.75%_37.5%_43.75%_56.25%]"
    : "inset-[43.75%_31.25%_43.75%_62.5%]";

  return (
    <div
      className={
        highlighted
          ? "flex shrink-0 flex-col items-center rounded-[7px] border-[1.7px] border-[#c084fc] bg-[rgba(88,28,135,0.45)] px-2 py-1.5 shadow-[0_0_12px_rgba(192,132,252,0.35)]"
          : "flex shrink-0 flex-col items-center"
      }
    >
      <div
        className="animate-ghost-float relative h-[34px] w-[42px] shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
        style={{ animationDelay: `${bobDelayMs}ms` }}
      >
        {/* Corpo do fantasma */}
        <div className="absolute inset-[12.5%_18.75%_6.25%_18.75%]">
          <Image
            src={bodySrc}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-fill"
          />
        </div>
        {/* Olho esquerdo */}
        <div className="absolute inset-[37.5%_56.25%_43.75%_31.25%]">
          <Image
            src="/assets/ghost-eye.svg"
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-fill"
          />
        </div>
        {/* Olho direito */}
        <div className="absolute inset-[37.5%_31.25%_43.75%_56.25%]">
          <Image
            src="/assets/ghost-eye.svg"
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-fill"
          />
        </div>
        {/* Pupila esquerda */}
        <div className={`absolute ${leftPupilClass}`}>
          <Image
            src={pupilSrc}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-fill"
          />
        </div>
        {/* Pupila direita */}
        <div className={`absolute ${rightPupilClass}`}>
          <Image
            src={pupilSrc}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            className="object-fill"
          />
        </div>
      </div>

      <span
        className={
          highlighted
            ? "font-pixel mt-1 text-[10px] leading-[14px] text-[#00f0ff]"
            : "font-mono-tech mt-1 text-[12px] leading-[16px] text-[#f9a8d4]"
        }
      >
        {caption}
      </span>
    </div>
  );
}
