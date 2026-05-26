import CouponsPanel from '../_components/CouponsPanel';

export const metadata = {
  title: 'Coupons – AdminOS',
};

export default function AdminCouponsStandalonePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <CouponsPanel showHeader={true} />
      </div>
    </div>
  );
}
