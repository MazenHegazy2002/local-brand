import Navbar from "@/components/Navbar";

export default function SellerDashboard() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      <div className="container py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-white mb-2">Seller <span className="text-[hsl(var(--accent))]">Dashboard</span></h1>
            <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Manage your brand presence</p>
          </div>
          <div className="flex gap-4">
            <button className="btn bg-white/5 text-white border border-white/10 px-6 py-2 text-sm">+ Add Product</button>
            <button className="btn btn-accent px-6 py-2 text-sm">View Store</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "Monthly Sales", value: "48,500 EGP", detail: "+5% vs last month" },
            { label: "Active Products", value: "24", detail: "2 Out of Stock" },
            { label: "Pending Orders", value: "12", detail: "Action required today" }
          ].map((stat) => (
            <div key={stat.label} className="glass p-8 rounded-3xl border border-white/5">
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-4">{stat.label}</span>
              <span className="text-3xl font-serif font-bold text-white block mb-2">{stat.value}</span>
              <span className="text-white/30 text-xs">{stat.detail}</span>
            </div>
          ))}
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
                  <th className="pb-6">Price</th>
                  <th className="pb-6">Stock</th>
                  <th className="pb-6">Status</th>
                  <th className="pb-6 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { name: "Sakkara Leather Briefcase", price: "3,450", stock: 12, status: "Active" },
                  { name: "Nubian Silk Scarf", price: "850", stock: 0, status: "Out of Stock" },
                  { name: "Brass Desk Lamp", price: "1,200", stock: 5, status: "Active" }
                ].map((item) => (
                  <tr key={item.name} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                    <td className="py-6 font-bold text-white">{item.name}</td>
                    <td className="py-6 text-white/60">{item.price} EGP</td>
                    <td className="py-6 text-white/60">
                      <span className={item.stock === 0 ? "text-red-400" : ""}>{item.stock} Units</span>
                    </td>
                    <td className="py-6">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                         {item.status}
                       </span>
                    </td>
                    <td className="py-6 text-[hsl(var(--accent))] cursor-pointer hover:underline">Edit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
