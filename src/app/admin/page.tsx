import Navbar from "@/components/Navbar";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      
      <div className="container py-12">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-serif font-bold text-white mb-2">Platform <span className="text-[hsl(var(--accent))]">Control</span></h1>
            <p className="text-white/40 text-sm tracking-widest uppercase font-bold">Administrative Oversight</p>
          </div>
          <div className="flex gap-4">
            <button className="btn bg-white/5 text-white border border-white/10 px-6 py-2 text-sm">Download Report</button>
            <button className="btn btn-accent px-6 py-2 text-sm">System Settings</button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Revenue", value: "1,240,500", detail: "+12.5% vs last month", color: "[hsl(var(--accent))]" },
            { label: "Active Brands", value: "84", detail: "4 pending approval", color: "white" },
            { label: "Daily Orders", value: "312", detail: "Avg. 4,200 EGP / order", color: "white" },
            { label: "Platform Health", value: "99.9%", detail: "All systems operational", color: "emerald-400" }
          ].map((stat) => (
            <div key={stat.label} className="glass p-8 rounded-3xl border border-white/5">
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest block mb-4">{stat.label}</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-3xl font-serif font-bold text-${stat.color}`}>{stat.value}</span>
                {stat.label.includes("Revenue") && <span className="text-sm text-white/40">EGP</span>}
              </div>
              <span className="text-white/30 text-xs">{stat.detail}</span>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brand Approval Queue */}
          <div className="lg:col-span-2 glass rounded-[2.5rem] border border-white/5 p-10">
            <h2 className="text-2xl font-serif font-bold text-white mb-8">Brand Approval <span className="text-white/20">Queue</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest font-bold">
                    <th className="pb-6">Brand Name</th>
                    <th className="pb-6">Category</th>
                    <th className="pb-6">Submitted</th>
                    <th className="pb-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { name: "Luxor Silks", category: "Fashion", date: "2 hours ago" },
                    { name: "Delta Crafts", category: "Home Decor", date: "5 hours ago" },
                    { name: "Alex Perfumery", category: "Wellness", date: "Yesterday" }
                  ].map((brand) => (
                    <tr key={brand.name} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                      <td className="py-6 font-bold text-white">{brand.name}</td>
                      <td className="py-6 text-white/40">{brand.category}</td>
                      <td className="py-6 text-white/40">{brand.date}</td>
                      <td className="py-6">
                        <div className="flex gap-3">
                          <button className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all">Review</button>
                          <button className="p-2 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-all">Details</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass rounded-[2.5rem] border border-white/5 p-10">
            <h2 className="text-2xl font-serif font-bold text-white mb-8">Live <span className="text-white/20">Activity</span></h2>
            <div className="space-y-8">
              {[
                { event: "New Order", user: "Mazen H.", time: " Just now", amount: "3,200 EGP" },
                { event: "Seller Registered", user: "Urban Ceramics", time: " 15m ago", amount: null },
                { event: "Payment Processed", user: "Stripe", time: " 1h ago", amount: "12,400 EGP" },
                { event: "System Alert", user: "Storage Node", time: " 3h ago", amount: "Warning" }
              ].map((log, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent))] mt-2 shrink-0"></div>
                  <div>
                    <p className="text-sm text-white font-medium">{log.event}: <span className="text-white/50">{log.user}</span></p>
                    <p className="text-xs text-white/20 mt-1">{log.time} {log.amount && `• ${log.amount}`}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-12 py-4 border border-white/5 rounded-2xl text-xs uppercase tracking-widest text-white/40 font-bold hover:bg-white/5 transition-all">
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
