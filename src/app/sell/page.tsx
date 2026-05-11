import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function SellPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-[#1e3b8a] text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Grow Your Brand<br />
            <span className="text-[#facc15]">With Brandy</span>
          </h1>
          <p className="text-lg text-white/70 max-w-xl mx-auto mb-10">
            Join thousands of Egyptian sellers reaching millions of customers. 
            Free to join. Keep 85% of every sale.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=seller" className="bg-[#facc15] text-[#1e3b8a] font-black py-3 px-8 rounded-lg text-sm hover:bg-yellow-300 transition-colors">
              Start Selling — Free
            </Link>
            <Link href="/login" className="bg-white/10 border border-white/30 text-white font-bold py-3 px-8 rounded-lg text-sm hover:bg-white/20 transition-colors">
              Already a seller? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-[#eef3f7] border-y border-gray-200">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '18,000+', label: 'Active buyers' },
            { value: '284', label: 'Verified sellers' },
            { value: '1.2M EGP', label: 'Monthly GMV' },
            { value: '85%', label: 'Seller keeps' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-black text-[#1e3b8a]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-semibold">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-black text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { num: '01', title: 'Register', desc: 'Create your seller account and submit your store for approval — takes 2 minutes.' },
            { num: '02', title: 'List Products', desc: 'Upload your products with photos, pricing, and variants. Go live instantly.' },
            { num: '03', title: 'Get Paid', desc: 'Receive weekly payouts directly to your bank. We handle the logistics.' },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#1e3b8a] text-[#facc15] font-black text-lg flex items-center justify-center mx-auto mb-4">{step.num}</div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1e3b8a] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black mb-4">Ready to start selling?</h2>
          <p className="text-white/60 mb-8">Join Egypt&apos;s fastest-growing marketplace for local sellers.</p>
          <Link href="/register?role=seller" className="inline-block bg-[#facc15] text-[#1e3b8a] font-black py-3 px-10 rounded-lg text-sm hover:bg-yellow-300 transition-colors">
            Apply to Join — Free
          </Link>
        </div>
      </section>
    </main>
  );
}
