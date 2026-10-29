// Approve / suspend a seller — shared by Admin OS on the web (updateSellerStatus) and the
// app's admin routes (/api/admin/sellers/[id]/approve|reject), so both email the seller
// and leave an audit trail.
import { prisma } from '@/lib/prisma';
import { PLATFORM_URL } from '@/lib/constants';
import type { SellerStatus } from '@/generated/client';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

export async function setSellerStatus(
  sellerId: string,
  status: SellerStatus,
  adminId?: string | null
) {
  const profile = await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { status },
    include: { user: true },
  });

  if (status === 'ACTIVE') {
    // Approval vouches for the seller, so they don't have to wait on the verification link.
    await prisma.user.update({
      where: { id: profile.userId },
      data: { emailVerified: profile.user.emailVerified || new Date() },
    });

    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: profile.user.email,
        subject: 'Your Brandyy seller account has been approved!',
        html: `<p>Hi ${esc(profile.user.name || 'Seller')},</p><p>Congratulations! Your seller application for store <strong>${esc(profile.storeName)}</strong> has been approved. You can now access your Seller Hub, list products, and start selling!</p><p><a href="${PLATFORM_URL}/seller-hub">Go to Seller Hub</a></p>`,
      });
    } catch (emailErr) {
      console.error('[setSellerStatus] Failed to send approval email:', emailErr);
    }
  }

  // Suspending hides the seller's products from shoppers and approving shows them again,
  // so cached product lists must be rebuilt.
  try {
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('products:*');
    await invalidateCache('homepage:*');
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/shop');
  } catch (err) {
    console.error('[setSellerStatus] cache invalidation failed:', err);
  }

  if (adminId) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: status === 'ACTIVE' ? 'APPROVED_SELLER' : 'SUSPENDED_SELLER',
        targetId: sellerId,
        details: `Status changed to ${status}`,
      },
    });
  }

  return profile;
}
