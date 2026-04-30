function Bone({ className = '', style }) {
  return (
    <div
      className={`bg-[#252525] animate-pulse rounded ${className}`}
      style={style}
    />
  );
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="aspect-[3/4] w-full rounded-lg" />
      <Bone className="h-3 w-3/4" />
      <Bone className="h-3 w-1/2" />
    </div>
  );
}

export function GameCardsGridSkeleton({ count = 5, cols = 'grid-cols-5' }) {
  return (
    <div className={`grid ${cols} gap-5`}>
      {Array.from({ length: count }).map((_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GameDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] w-full">
      <Bone className="h-[300px] w-full rounded-none" />
      <div className="flex gap-8 px-12 pb-10" style={{ marginTop: '-60px' }}>
        <Bone className="w-[220px] h-[300px] rounded-xl flex-shrink-0" />
        <div className="flex flex-col gap-4 pt-16 flex-1">
          <Bone className="h-10 w-2/3" />
          <Bone className="h-4 w-1/3" />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
          <Bone className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="flex gap-5 py-5 border-b border-[#1A1A1A]">
      <Bone className="w-[90px] h-[120px] rounded-lg flex-shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-3 w-1/3" />
        <Bone className="h-16 w-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] w-full">
      <Bone className="h-[200px] w-full rounded-none" />
      <div className="flex items-center gap-6 px-12 py-6">
        <Bone
          className="w-24 h-24 rounded-full flex-shrink-0"
          style={{ marginTop: '-48px' }}
        />
        <div className="flex flex-col gap-2 flex-1">
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-32" />
          <Bone className="h-4 w-64" />
        </div>
        <div className="flex gap-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Bone className="h-7 w-10" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-12">
        {[0, 1, 2].map((i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FeedCardSkeleton() {
  return (
    <article className="flex flex-col gap-4 p-5 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]">
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1 flex-1">
          <Bone className="h-3 w-32" />
          <Bone className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-4 bg-[#111111] rounded-xl p-4">
        <Bone className="w-16 h-[86px] rounded-lg flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Bone className="h-4 w-2/3" />
          <Bone className="h-3 w-1/2" />
          <Bone className="h-3 w-1/3" />
        </div>
      </div>
    </article>
  );
}

export function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="pt-16 flex gap-8 max-w-5xl mx-auto px-6 py-8">
        <div className="flex-1 flex flex-col gap-6">
          <Bone className="h-10 w-32" />
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3].map((i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 pt-1">
          <Bone className="h-6 w-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-6 h-6 rounded-full flex-shrink-0" />
              <Bone className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ListCardSkeleton({ tall = false }) {
  return <Bone className={`w-full rounded-xl ${tall ? 'h-64' : 'h-48'}`} />;
}

export function ListsGridSkeleton() {
  const pattern = [false, false, false, true, true, false, false, false, true, true];
  return (
    <div className="grid grid-cols-6 gap-4">
      {pattern.map((tall, i) => (
        <div key={i} className={tall ? 'col-span-3' : 'col-span-2'}>
          <ListCardSkeleton tall={tall} />
        </div>
      ))}
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] w-full">
      <div className="flex flex-col gap-6 px-10 pt-8 pb-6">
        <Bone className="h-14 w-full rounded-xl" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bone key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex gap-8 px-12 py-6">
        <Bone className="w-[260px] h-[400px] rounded-lg flex-shrink-0" />
        <div className="flex flex-col gap-3 flex-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Bone key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
