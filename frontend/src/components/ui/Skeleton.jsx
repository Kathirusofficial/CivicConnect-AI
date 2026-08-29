export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const base = 'animate-pulse bg-surface-200 dark:bg-surface-800';
  if (variant === 'circle') return <div className={`${base} rounded-full ${className}`} />;
  return <div className={`${base} rounded-xl ${className}`} />;
};

export const ProfileSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center gap-4">
      <Skeleton variant="circle" className="w-16 h-16" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);
