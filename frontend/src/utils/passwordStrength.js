export const getPasswordStrength = (password) => {
  let score = 0;
  if (!password) return { score: 0, label: '', color: '' };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 1, label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-500' },
    { score: 2, label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-500' },
    { score: 3, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { score: 5, label: 'Very Strong', color: 'bg-green-500', textColor: 'text-green-500' },
  ];

  const level = levels.find((l) => l.score === score) || levels[0];
  return { ...level, percent: (score / 5) * 100 };
};
