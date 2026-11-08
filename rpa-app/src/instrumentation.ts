export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initDeliScheduler } = await import('@/lib/deliScheduler');
    initDeliScheduler();
  }
}
