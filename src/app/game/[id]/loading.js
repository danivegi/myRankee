import Navbar from '@/app/components/Navbar';
import { GameDetailSkeleton } from '@/app/components/Skeletons';

export default function GameLoading() {
  return (
    <>
      <Navbar />
      <GameDetailSkeleton />
    </>
  );
}
