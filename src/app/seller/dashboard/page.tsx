import Navbar from "@/components/Navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SellerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      products: {
        include: { variants: true }
      }
    }
  });

  if (!sellerProfile) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container py-12 text-center text-white">
          <h1 className="text-4xl font-serif mb-4">No Seller Profile Found</h1>
          <p>Please contact support to register as a seller.</p>
        </div>
      </main>
    );
  }

  // Calculate stats
  const activeProducts = sellerProfile.products.filter(p => p.published).length;
  const outOfStock = sellerProfile.products.filter(p => p.variants.reduce((acc, v) => acc + v.stockCount, 0) === 0).length;

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      <div className="container py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-white mb-2">{sellerProfile.storeName} <span className="text-[hsl(var(--accent))]">Dashboard</span></h1>
            <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Manage your brand presence</p>
          </div>
          <div className="flex gap-4">
            <Link href="/seller/products/new" className="btn bg-white/5 text-white border border-white/10 px-6 py-2 text-sm">+ Add Product</Link>
            <button className="btn btn-accent px-6 py-2 text-sm">View Store</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass p-8 rounded-3xl border border-white/5">
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-4">Wallet Balance</span>
            <span className="text-3xl font-serif font-bold text-white block mb-2">{sellerProfile.balance.toLocaleString()} EGP</span>
            <span className="text-[hsl(var(--accent))] text-xs cursor-pointer hover:underline">Request Payout</span>
          </div>
          <div className="glass p-8 rounded-3xl border border-white/5">
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-4">Active Products</span>
            <span className="text-3xl font-serif font-bold text-white block mb-2">{activeProducts}</span>
            <span className="text-white/30 text-xs">{outOfStock > 0 ? `${outOfStock} Out of Stock` : "All items in stock"}</span>
          </div>
          <div className="glass p-8 rounded-3xl border border-white/5">
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-4">Commission Rate</span>
            <span className="text-3xl font-serif font-bold text-white block mb-2">{(sellerProfile.commissionRate * 100).toFixed(0)}%</span>
            <span className="text-white/30 text-xs">Platform Fee</span>
          </div>
        </div>

        {/* Inventory View */}
        <div className="glass rounded-[2.5rem] border border-white/5 p-10">
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-2xl font-serif font-bold text-white">Current <span className="text-white/20">Inventory</span></h2>
             <input type="text" placeholder="Search products..." className="bg-transparent border-b border-white/20 text-white p-2 outline-none focus:border-[hsl(var(--accent))]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest font-bold">
                  <th className="pb-6">Item</th>
                  <th className="pb-6">Base Price</th>
                  <th className="pb-6">Total Stock</th>
                  <th className="pb-6">Status</th>
                  <th className="pb-6 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {sellerProfile.products.map((item) => {
                  const stock = item.variants.reduce((acc, v) => acc + v.stockCount, 0);
                  const status = item.published ? (stock > 0 ? 'Active' : 'Out of Stock') : 'Draft';
                  
                  return (
                    <tr key={item.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                      <td className="py-6 font-bold text-white">{item.title}</td>
                      <td className="py-6 text-white/60">{item.basePrice.toLocaleString()} EGP</td>
                      <td className="py-6 text-white/60">
                        <span className={stock === 0 ? "text-red-400 font-bold" : ""}>{stock} Units</span>
                      </td>
                      <td className="py-6">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            status === 'Draft' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                         }`}>
                           {status}
                         </span>
                      </td>
                      <td className="py-6 text-[hsl(var(--accent))] cursor-pointer hover:underline">
                         <Link href={`/seller/products/${item.id}/edit`}>Edit</Link>
                      </td>
                    </tr>
                  );
                })}
                {sellerProfile.products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40">No products found. Start by adding one!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
