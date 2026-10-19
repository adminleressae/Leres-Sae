(function () {
  const root = document.getElementById('publicAgendaCalendar');
  if (!root) return;
  let cursor = new Date(); cursor.setDate(1);
  let agenda = [];
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const weekdays = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  function render() {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate();
    const prevTotal = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const n = i - first + 1;
      const day = n < 1 ? prevTotal + n : n > total ? n - total : n;
      const outside = n < 1 || n > total;
      const today = !outside && new Date().getFullYear() === y && new Date().getMonth() === m && new Date().getDate() === day;
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const items = outside ? [] : agenda.filter(item => item.date === dateKey);
      cells.push(`<button type="button" class="public-agenda-day${outside ? ' is-outside' : ''}${today ? ' is-today' : ''}${items.length ? ' has-agenda' : ''}" data-day="${day}" ${outside ? 'tabindex="-1"' : ''}><span>${day}</span>${items.length ? `<small>${items.map(item => escapeText(item.title)).join('<br>')}</small>` : ''}</button>`);
    }
    const monthItems = agenda.filter(item => String(item.date || '').startsWith(`${y}-${String(m + 1).padStart(2, '0')}`));
    root.innerHTML = `<div class="public-agenda-toolbar"><button type="button" data-agenda-prev aria-label="Bulan sebelumnya">‹</button><strong>${months[m]} ${y}</strong><button type="button" data-agenda-next aria-label="Bulan berikutnya">›</button></div><div class="public-agenda-body"><div class="public-agenda-calendar-grid"><div class="public-agenda-weekdays">${weekdays.map(x => `<span>${x}</span>`).join('')}</div><div class="public-agenda-days">${cells.join('')}</div></div><aside class="public-agenda-events"><h3>Kegiatan</h3>${monthItems.length ? monthItems.map(item => `<div class="public-agenda-event"><strong>${escapeText(item.date)}</strong><p>${escapeText(item.title)}</p></div>`).join('') : '<p>Belum ada agenda kegiatan pada bulan ini.</p>'}</aside></div>`;
    root.querySelector('[data-agenda-prev]').onclick = () => { cursor.setMonth(m - 1); render(); };
    root.querySelector('[data-agenda-next]').onclick = () => { cursor.setMonth(m + 1); render(); };
  }
  function escapeText(value) { return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  window.renderPublicAgenda = render;
  render();
  if (typeof apiRequest === 'function') apiRequest('getAgenda').then(response => { agenda = Array.isArray(response?.data) ? response.data : []; render(); }).catch(() => {});
})();
