import Navbar from '@/app/components/Navbar';
import { ListsGridSkeleton } from '@/app/components/Skeletons';

export default function ListsLoading() {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-[#252525] animate-pulse h-12 w-80 rounded mb-10" />
        <ListsGridSkeleton />
      </div>
    </>
  );
}
