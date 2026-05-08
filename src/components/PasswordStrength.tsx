'use client';

interface PasswordStrengthProps {
  password: string;
}

type Strength = 0 | 1 | 2 | 3 | 4;

function scorePassword(pw: string): Strength {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score) as Strength;
}

const LABELS: Record<Strength, { label: string; color: string }> = {
  0: { label: '', color: '' },
  1: { label: 'Weak', color: 'bg-red-500' },
  2: { label: 'Fair', color: 'bg-amber-500' },
  3: { label: 'Good', color: 'bg-yellow-500' },
  4: { label: 'Strong', color: 'bg-emerald-500' },
};

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = scorePassword(password);
  const label = LABELS[strength];

  const tips = [
    { ok: password.length >= 8, text: 'At least 8 characters' },
    { ok: /[A-Z]/.test(password) && /[a-z]/.test(password), text: 'Mix upper and lower case' },
    { ok: /[0-9]/.test(password), text: 'Contains a number' },
    { ok: /[^A-Za-z0-9]/.test(password), text: 'Contains a symbol' },
  ];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              strength >= i ? label.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {label.label && (
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${
            strength === 1 ? 'text-red-600' :
            strength === 2 ? 'text-amber-600' :
            strength === 3 ? 'text-yellow-600' :
            'text-emerald-600'
          }`}>
            Password strength: {label.label}
          </span>
        </div>
      )}
      <ul className="mt-2 space-y-0.5">
        {tips.map((t) => (
          <li key={t.text} className={`text-[11px] flex items-center gap-2 ${t.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span>{t.ok ? '✓' : '○'}</span>
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
