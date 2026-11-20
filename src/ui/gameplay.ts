import type { Command } from '../core/input';
import { products, type EventKind } from '../simulation/model';
import type { Session } from '../simulation/session';
import './gameplay.css';

const descriptions: Record<EventKind, string> = {
  shot: 'Se oyeron disparos junto a Mercado Palma.', threat: 'Presencié una amenaza con un arma.',
  robbery: 'Un asalto en el mercado. Nos pusimos a salvo.', glass: 'Un escaparate se hizo añicos.',
  collision: 'Un vehículo sufrió una colisión en el bulevar.', report: 'Se avisó a las autoridades.',
};
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export function createGameplayUI(command: (command: Command) => void, select: (index: number) => void) {
  const abort = new AbortController();
  const get = (id: string) => document.getElementById(id)!;
  const status = get('session-status'); const prompt = get('interaction-prompt'); const notice = get('game-notice');
  const reticle = get('reticle'); const overlay = get('interaction-panel'); const title = get('interaction-title');
  const body = get('interaction-body'); const subtitle = get('interaction-subtitle'); const footer = get('interaction-footer');
  const threat = get('threat-progress');
  let panelKey = ''; let statusKey = '';
  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-command], [data-select]');
    if (!target) return;
    if (target.dataset.command) command(target.dataset.command as Command);
    else if (target.dataset.select) select(Number(target.dataset.select));
  }, { signal: abort.signal });
  function update(session: Session, hour: number) {
    const { economy, weapon, police } = session;
    const labels = { patrol: 'BARRIO TRANQUILO', respond: 'AVISO · UNIDADES EN CAMINO', pursue: 'IDENTIFICADO · PERSECUCIÓN', search: 'BÚSQUEDA · ÚLTIMA UBICACIÓN' };
    const key = [economy.money, session.health, weapon.equipped, weapon.rounds, weapon.reserve, weapon.reloadTime > 0, police.state].join('|');
    if (key !== statusKey) {
      statusKey = key;
      status.innerHTML = `<div class="wallet">$${economy.money}<span>Salud ${session.health}</span></div><div class="weapon-state">${weapon.equipped ? `PISTOLA <b>${weapon.rounds}</b> / ${weapon.reserve}${weapon.reloadTime > 0 ? ' · RECARGANDO' : ''}` : 'MANOS LIBRES'}</div><div class="police-state" data-alert="${police.state !== 'patrol'}">${labels[police.state]}</div>`;
    }
    prompt.textContent = session.overlay === 'world' ? session.prompt : '';
    notice.textContent = session.notice; notice.hidden = !session.notice;
    reticle.hidden = !weapon.equipped || session.overlay !== 'world'; reticle.dataset.aim = String(session.aiming); reticle.dataset.hit = String(session.hit);
    threat.hidden = session.threat <= 0; threat.textContent = `Amenaza reconocida · ${Math.round(session.threat * 100)}%`;
    threat.style.setProperty('--progress', `${session.threat * 100}%`);
    overlay.hidden = session.overlay === 'world';
    if (overlay.hidden) { panelKey = ''; return; }
    const nextKey = [session.overlay, session.phonePage, session.selection, economy.money, Object.values(economy.inventory), Object.values(economy.stock), journalKey(session), session.muted, Math.floor(hour * 60)].join('|');
    if (nextKey === panelKey) return;
    panelKey = nextKey; overlay.className = `interaction-panel ${session.overlay}`;
    if (session.overlay === 'shop') {
      title.textContent = 'Mercado Palma'; subtitle.textContent = `MARA · TU SALDO $${economy.money}`;
      footer.textContent = '↑ ↓ Elegir · Enter Comprar · Esc Salir';
      body.innerHTML = `<p class="panel-intro">Algo fresco para el camino.</p><div class="product-list">${products.map((product, index) => `<button class="product ${session.selection === index ? 'selected' : ''}" data-select="${index}"><span><strong>${product.name}</strong><small>${product.detail}</small><small>${economy.stock[product.id]} disponibles · Tienes ${economy.inventory[product.id]}</small></span><b>$${product.price}</b></button>`).join('')}</div><p class="panel-note">Tus compras van a la mochila del teléfono.</p>`;
    } else {
      const minute = Math.floor(hour * 60) % 60; const time = `${Math.floor(hour).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const titles = { home: 'palma', feed: 'Palma Social', bag: 'Tu mochila', help: 'Guía del barrio' };
      title.textContent = titles[session.phonePage]; subtitle.textContent = `${time} · COSTA PALMERA`;
      footer.textContent = 'Flechas Navegar · Enter Elegir · Esc Volver';
      if (session.phonePage === 'home') {
        body.innerHTML = `<p class="phone-greeting">El barrio, en tu bolsillo.</p><div class="app-grid">${[['◈', 'Palma Social', `${session.journal.posts.length} testimonios`], ['▣', 'Mochila', 'Productos y munición'], ['↗', 'Guía', 'Encuentra tu ritmo'], [session.muted ? '♪̸' : '♪', 'Sonido', session.muted ? 'Desactivado' : 'Activado']].map(([icon, name, text], index) => `<button data-select="${index}" class="phone-app ${index === session.selection ? 'selected' : ''}"><span>${icon}</span><strong>${name}</strong><small>${text}</small></button>`).join('')}</div><div class="phone-balance"><small>EFECTIVO DISPONIBLE</small><b>$${economy.money}</b></div>`;
      } else if (session.phonePage === 'feed') {
        body.innerHTML = session.journal.posts.length ? session.journal.posts.map((post, index) => `<button data-select="${index}" class="social-post ${index === session.selection ? 'selected' : ''}"><div><b>${escape(post.author)}</b><small>hace ${Math.max(0, Math.floor(session.time - post.event.time))} s</small></div><p>${descriptions[post.event.kind]}</p><span class="event-thumbnail">${post.event.kind === 'collision' ? '◇' : '◎'}<small>Testimonio del barrio</small></span><small>Grabación de video no disponible</small></button>`).join('') : '<div class="empty-feed"><span>◈</span><h3>Por ahora, todo tranquilo.</h3><p>Los testimonios de los vecinos aparecerán aquí cuando presencien un incidente.</p></div>';
      } else if (session.phonePage === 'bag') {
        body.innerHTML = `<p class="panel-intro">Selecciona un producto para utilizarlo.</p>${products.map((product, index) => `<button data-select="${index}" class="product ${index === session.selection ? 'selected' : ''}"><span><strong>${product.name}</strong><small>${product.detail}</small></span><b>×${economy.inventory[product.id]}</b></button>`).join('')}<p class="panel-note">Salud ${session.health}/100 · Reserva ${weapon.reserve} cartuchos</p>`;
      } else {
        body.innerHTML = '<div class="phone-guide"><h3>Tu primera parada</h3><p>Entra por la puerta central de Mercado Palma y acércate al mostrador. Pulsa E para hablar con Mara.</p><h3>Controles a mano</h3><p>WASD: caminar · Mayús: correr · Espacio: saltar.</p><p>1: equipar o guardar pistola · Botón derecho: apuntar · Botón izquierdo: disparar · R: recargar.</p><p>Apuntar a Mara durante tres segundos provoca un asalto. Los vecinos pueden avisar a la policía. Los escaparates se rompen con disparos.</p><p>↑ abre este teléfono. Esc vuelve o cierra. Fuera del teléfono, Esc pausa.</p></div>';
      }
    }
    body.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
  }
  return { update, dispose() { abort.abort(); } };
}
function journalKey(session: Session) { return session.journal.posts.map((post) => post.id).join(','); }
