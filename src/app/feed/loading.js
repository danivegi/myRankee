import Navbar from '@/app/components/Navbar';
import { FeedSkeleton } from '@/app/components/Skeletons';

export default function FeedLoading() {
  return (
    <>
      <Navbar />
      <FeedSkeleton />
    </>
  );
}
