export default function HelpPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>Help Center</h1>
      <p style={{ color: '#6B7280', fontSize: 16, marginBottom: 40 }}>Find answers to common questions or contact our support team.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[
          { q: 'How do I track my order?', a: 'You can track your order by visiting the Orders section in your dashboard.' },
          { q: 'What is your return policy?', a: 'We accept returns within 30 days of delivery. Items must be unused and in original packaging.' },
          { q: 'How do I become a seller?', a: 'Click on "Become a Seller" in your profile and fill out the application form.' },
          { q: 'What payment methods do you accept?', a: 'We accept credit cards, mobile wallets, and cash on delivery.' },
        ].map((faq, i) => (
          <div key={i} style={{ padding: 20, borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{faq.q}</h3>
            <p style={{ color: '#6B7280' }}>{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
