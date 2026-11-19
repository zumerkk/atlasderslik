export const lessonVideoApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function uploadLessonVideo(form: FormData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Lütfen yeniden giriş yapın.');
  const response = await fetch(`${lessonVideoApiBase}/lesson-videos/upload`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
    signal: AbortSignal.timeout(240000), cache: 'no-store',
  });
  if (localStorage.getItem('token') !== token) throw new Error('Oturum değiştiği için yükleme sonucu gösterilmedi.');
  return response;
}
