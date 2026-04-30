import Navbar from '@/app/components/Navbar';
import { SearchSkeleton } from '@/app/components/Skeletons';

export default function SearchLoading() {
  return (
    <>
      <Navbar />
      <SearchSkeleton />
    </>
  );
}
