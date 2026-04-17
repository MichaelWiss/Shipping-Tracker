interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`border border-rule-lt bg-panel p-4 ${className}`}
    >
      {title && (
        <>
          <span className="font-mono text-[7.5px] uppercase tracking-[0.20em] text-red">
            {title}
          </span>
          <div className="rule mt-1.5 mb-3" />
        </>
      )}
      {children}
    </div>
  );
}
