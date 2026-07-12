import Navbar from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn more about Brandy - Egypt’s marketplace for local sellers and authentic brands.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">
            About Brandy
          </h1>
          <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed space-y-6">
            <p className="text-lg text-gray-700">
              Welcome to <strong>Brandy</strong>, Egypt’s premier online marketplace dedicated to
              showcasing authentic local sellers and independent brands. Our mission is to bridge
              the gap between talented Egyptian designers, artisans, and manufacturers, and
              passionate shoppers looking for high-quality, homegrown products.
            </p>
            <p>
              We believe in the power of local commerce. By providing Egyptian sellers with a
              state-of-the-art platform, robust logistics integration, secure payment options, and
              marketing reach, we empower them to grow their businesses and scale new heights.
            </p>
            <p>
              From stylish fashion and unique accessories to home goods, beauty products, and
              electronics, every purchase on Brandy directly supports local entrepreneurs and the
              Egyptian economy.
            </p>
            <h2 className="text-2xl font-black text-gray-900 mt-8 mb-4">Our Core Values</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Authenticity:</strong> We vet every seller to guarantee genuine local
                products and top quality.
              </li>
              <li>
                <strong>Empowerment:</strong> Supporting local business owners is at the heart of
                everything we do.
              </li>
              <li>
                <strong>Customer Satisfaction:</strong> Enjoy safe payments, domestic support, and
                fast delivery across Egypt.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
