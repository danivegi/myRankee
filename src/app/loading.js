import { GameCardsGridSkeleton } from './components/Skeletons';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] w-full">
      {/* Hero placeholder */}
      <div className="bg-[#252525] animate-pulse h-[380px] w-full" />
      <div className="flex flex-col gap-8 px-10 py-10 border-t border-[#1A1A1A]">
        <div className="bg-[#252525] animate-pulse h-8 w-48 rounded" />
        <GameCardsGridSkeleton count={5} cols="grid-cols-5" />
      </div>
    </div>
  );
}
