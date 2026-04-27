interface DetailBlockProps {
  label: string;
  value: string;
  className?: string;
}

export function DetailBlock({ label, value, className }: DetailBlockProps) {
  return (
    <div className={`flex flex-col gap-2.5 min-w-0 ${className ?? ""}`}>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-brand/30">
        {label}
      </span>
      <p className="font-sans font-light text-[clamp(0.8rem,1.4vw,0.9rem)] leading-[1.65] text-brand/60 max-w-full break-words">
        {value}
      </p>
    </div>
  );
}
