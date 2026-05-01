export const Skeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`animate-pulse bg-slate-200 rounded-2xl ${className}`} />
  );
};
