export function getOrCreateGuestId(): string {
  let guestId = localStorage.getItem('coreaudit_guest_id');
  if (!guestId || !guestId.startsWith('guest_')) {
    const randomStr = Math.random().toString(36).substring(2, 10);
    guestId = `guest_${Date.now()}_${randomStr}`;
    localStorage.setItem('coreaudit_guest_id', guestId);
  }
  return guestId;
}
