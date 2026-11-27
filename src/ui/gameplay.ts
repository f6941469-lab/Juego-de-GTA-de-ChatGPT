import type { Command } from '../core/input';
import { dialogueTopics } from '../simulation/dialogue';
import { type EventKind } from '../simulation/model';
import type { Session } from '../simulation/session';
import './gameplay.css';

const descriptions: Record<EventKind, string> = {
  shot: 'Se oyeron disparos en el barrio.',
  threat: 'Presencié una amenaza con un arma.',
  robbery: 'Un asalto en un comercio. Nos pusimos a salvo.',
  glass: 'Un escaparate se hizo añicos.',
  collision: 'Un vehículo sufrió una colisión en el bulevar.',
  report: 'Se avisó a las autoridades.',
  theft: 'Robo de un vehículo delante de testigos.',
  altercation: 'Un altercado fuerte entre vecinos en la calle.',
};
const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function createGameplayUI(command: (command: Command) => void, select: (index: number) => void) {
  const abort = new AbortController();
  const get = (id: string) => document.getElementById(id)!;
  const status = get('session-status');
  const prompt = get('interaction-prompt');
  const notice = get('game-notice');
  const reticle = get('reticle');
  const overlay = get('interaction-panel');
  const title = get('interaction-title');
  const body = get('interaction-body');
  const subtitle = get('interaction-subtitle');
  const footer = get('interaction-footer');
  const threat = get('threat-progress');
  let panelKey = '';
  let statusKey = '';

  document.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-command], [data-select]');
    if (!target) return;
    if (target.dataset.command) command(target.dataset.command as Command);
    else if (target.dataset.select) select(Number(target.dataset.select));
  }, { signal: abort.signal });

  function update(session: Session, hour: number) {
    const { economy, weapon, police } = session;
    const vehLabel = session.currentVehicle
      ? (session.currentVehicle.kind === 'bus' ? 'EN AUTOBÚS' : session.currentVehicle.kind === 'metro' ? 'EN METRO' : 'CONDUCIENDO')
      : weapon.equipped
        ? `PISTOLA <b>${weapon.rounds}</b> / ${weapon.reserve}${weapon.reloadTime > 0 ? ' · RECARGANDO' : ''}`
        : 'MANOS LIBRES';
    const cooldownPct = Math.round(police.cooldownProgress * 100);
    const key = [
      economy.money,
      session.health,
      session.armor,
      weapon.equipped,
      weapon.rounds,
      weapon.reserve,
      weapon.reloadTime > 0,
      police.state,
      police.stars,
      police.evading,
      police.evading ? Math.floor(cooldownPct / 5) : 0,
      session.currentVehicle?.id ?? '',
      session.currentDistrict,
      session.inPrison,
    ].join('|');
    if (key !== statusKey) {
      statusKey = key;
      const armorText = session.armor > 0 ? ` · Prot. ${session.armor}` : '';
      const starsMarkup = [1, 2, 3, 4, 5]
        .map((n) => `<span class="wanted-star${n <= police.stars ? ' active' : ''}" aria-hidden="true">★</span>`)
        .join('');
      const wantedMode = police.stars === 0 ? 'calm' : police.evading ? 'evade' : 'pursue';
      const statusText = session.inPrison
        ? 'DETENIDO · CÁRCEL DE PALMA'
        : police.stars === 0
          ? session.currentDistrict.toUpperCase()
          : police.evading
            ? `${police.starLabel} · EVADIENDO`
            : `${police.starLabel} · PERSECUCIÓN`;
      const evadeBar = police.evading
        ? `<div class="wanted-evade-bar"><div style="width:${cooldownPct}%"></div></div>`
        : '';
      status.innerHTML = `<div class="wallet">$${economy.money}<span>Salud ${session.health}${armorText}</span></div><div class="weapon-state">${vehLabel}</div><div class="wanted-stars" data-mode="${wantedMode}" aria-label="Nivel de búsqueda ${police.stars} de 5 estrellas">${starsMarkup}</div><div class="police-state" data-alert="${police.stars > 0 || session.inPrison}">${escape(statusText)}</div>${evadeBar}`;
    }

    prompt.textContent = session.overlay === 'world' ? session.prompt : '';
    notice.textContent = session.notice;
    notice.hidden = !session.notice;
    reticle.hidden = !weapon.equipped || session.overlay !== 'world' || !!session.currentVehicle;
    reticle.dataset.aim = String(session.aiming);
    reticle.dataset.hit = String(session.hit);
    threat.hidden = session.threat <= 0;
    threat.textContent = `Amenaza reconocida · ${Math.round(session.threat * 100)}%`;
    threat.style.setProperty('--progress', `${session.threat * 100}%`);
    overlay.hidden = session.overlay === 'world';
    if (overlay.hidden) { panelKey = ''; return; }

    const activeStore = session.activeShop;
    const storeLedger = economy.store(activeStore.id);
    const replay = session.replayState;
    const venuePanel = session.venuePanel;
    const nextKey = [
      session.overlay,
      session.phonePage,
      session.selection,
      activeStore.id,
      venuePanel ? `${venuePanel.venue.id}:${venuePanel.subtitle}:${venuePanel.intro}:${venuePanel.options.map((o) => `${o.label}:${o.badge ?? ''}`).join(',')}` : '',
      session.activeTalkNpc?.id ?? '',
      session.talkReply,
      replay.angle,
      replay.frame,
      replay.playing,
      replay.clips.length,
      economy.money,
      economy.armor,
      session.health,
      session.houseOwned,
      session.inPrison,
      session.casinoNet,
      JSON.stringify(economy.inventory),
      JSON.stringify(storeLedger?.stock ?? {}),
      journalKey(session),
      session.muted,
      Math.floor(hour * 60),
    ].join('|');
    if (nextKey === panelKey) return;
    panelKey = nextKey;
    overlay.className = `interaction-panel ${session.overlay === 'venue' ? 'shop' : session.overlay}`;

    if (session.overlay === 'shop') {
      title.textContent = activeStore.name;
      subtitle.textContent = `${activeStore.merchantName.toUpperCase()} · TU SALDO $${economy.money}`;
      footer.textContent = '↑ ↓ Elegir · Enter Comprar · Esc Salir';
      const stockMap = storeLedger?.stock ?? {};
      body.innerHTML = `<p class="panel-intro">${escape(activeStore.tagline)}</p><div class="product-list">${activeStore.catalog.map((product, index) => `<button class="product ${session.selection === index ? 'selected' : ''}" data-select="${index}"><span><strong>${escape(product.name)}</strong><small>${escape(product.detail)}</small><small>${stockMap[product.id] ?? 0} disponibles · Tienes ${economy.inventory[product.id] ?? 0}</small></span><b>$${product.price}</b></button>`).join('')}</div><p class="panel-note">Tus compras van a la mochila del teléfono.</p>`;
    } else if (session.overlay === 'venue' && venuePanel) {
      title.textContent = venuePanel.venue.name;
      subtitle.textContent = venuePanel.subtitle;
      footer.textContent = '↑ ↓ Elegir · Enter Confirmar · Esc Salir';
      body.innerHTML = `<p class="panel-intro">${escape(venuePanel.intro)}</p><div class="product-list">${venuePanel.options.map((option, index) => `<button class="product ${session.selection === index ? 'selected' : ''}" data-select="${index}"><span><strong>${escape(option.label)}</strong><small>${escape(option.detail)}</small></span>${option.badge ? `<b>${escape(option.badge)}</b>` : ''}</button>`).join('')}</div><p class="panel-note">${escape(venuePanel.note)}</p>`;
    } else if (session.overlay === 'talk' && session.activeTalkNpc) {
      const npc = session.activeTalkNpc;
      title.textContent = npc.name;
      subtitle.textContent = `${npc.job.toUpperCase()} · ${npc.activityLabel.toUpperCase()}`;
      footer.textContent = '↑ ↓ Tema · Enter Hablar · Esc Salir';
      body.innerHTML = `<p class="talk-reply">“${escape(session.talkReply)}”</p><div class="product-list">${dialogueTopics.map((topic, index) => `<button class="product ${session.selection === index ? 'selected' : ''}" data-select="${index}"><span><strong>${escape(topic.label)}</strong></span></button>`).join('')}</div>`;
    } else if (session.overlay === 'replay') {
      const clip = replay.clip;
      title.textContent = replay.title || 'Cobertura grabada';
      const statusLabel = clip
        ? `${clip.author} · ${clip.frames.length ? `${replay.frame + 1}/${clip.frames.length}` : '0/0'} · ${clip.status === 'partial' ? 'PARCIAL' : 'COMPLETO'}`
        : 'Sin grabación';
      subtitle.textContent = `● REC ${replay.playing ? 'REPRODUCIENDO' : 'PAUSA'} · ${statusLabel}`;
      footer.textContent = '← → Cambiar ángulo · Enter Pausa/Play · Esc Cerrar';
      const warn = clip?.interruptedReason ? `<p class="panel-note">⚠ ${escape(clip.interruptedReason)}</p>` : '';
      body.innerHTML = `${warn}<div class="replay-angles">${replay.clips.map((c, idx) => `<button class="replay-angle ${idx === replay.angle ? 'selected' : ''}" data-select="${idx}">Ángulo ${idx + 1}: ${escape(c.author)}</button>`).join('')}</div>`;
    } else {
      const minute = Math.floor(hour * 60) % 60;
      const time = `${Math.floor(hour).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const titles = { home: 'palma', feed: 'Palma Social', bag: 'Tu mochila', help: 'Guía del barrio' };
      title.textContent = titles[session.phonePage];
      subtitle.textContent = `${time} · ${session.currentDistrict.toUpperCase()}`;
      footer.textContent = 'Flechas Navegar · Enter Elegir · Esc Volver';
      if (session.phonePage === 'home') {
        body.innerHTML = `<p class="phone-greeting">El barrio, en tu bolsillo.</p><div class="app-grid">${[['◈', 'Palma Social', `${session.journal.posts.length} publicaciones`], ['▣', 'Mochila', 'Productos y munición'], ['↗', 'Guía', 'Distritos y lugares'], [session.muted ? '♪̸' : '♪', 'Sonido', session.muted ? 'Desactivado' : 'Activado']].map(([icon, name, text], index) => `<button data-select="${index}" class="phone-app ${index === session.selection ? 'selected' : ''}"><span>${icon}</span><strong>${name}</strong><small>${text}</small></button>`).join('')}</div><div class="phone-balance"><small>EFECTIVO DISPONIBLE</small><b>$${economy.money}</b></div>`;
      } else if (session.phonePage === 'feed') {
        body.innerHTML = session.journal.posts.length
          ? session.journal.posts.map((post, index) => {
              const hasClips = post.clips.length > 0;
              const recLabel = hasClips
                ? `${post.clips.length} ángulo${post.clips.length > 1 ? 's' : ''} POV · Enter para reproducir${post.recording === 'partial' ? ' (parcial)' : ''}`
                : 'Grabación de video no disponible';
              const topComment = post.comments[0] ? `<small>💬 ${escape(post.comments[0])}</small>` : '';
              return `<button data-select="${index}" class="social-post ${index === session.selection ? 'selected' : ''}"><div><b>${escape(post.author)}</b><small>hace ${Math.max(0, Math.floor(session.time - post.event.time))} s</small></div><p>${escape(post.caption ?? descriptions[post.event.kind])}</p><span class="event-thumbnail">${hasClips ? '▶' : post.event.kind === 'collision' ? '◇' : '◎'}<small>${hasClips ? 'Clip real del incidente' : 'Testimonio del barrio'}</small></span><small>${recLabel}</small><div class="social-meta"><span>👁 ${post.views}</span><span>♥ ${post.likes}</span></div>${topComment}</button>`;
            }).join('')
          : '<div class="empty-feed"><span>◈</span><h3>Por ahora, todo tranquilo.</h3><p>Los testimonios y clips de los vecinos aparecerán aquí cuando presencien un incidente.</p></div>';
      } else if (session.phonePage === 'bag') {
        const owned = economy.ownedItems();
        body.innerHTML = `<p class="panel-intro">Selecciona un producto para utilizarlo.</p>${owned.map(({ item, count }, index) => `<button data-select="${index}" class="product ${session.selection === index ? 'selected' : ''}"><span><strong>${escape(item.name)}</strong><small>${escape(item.detail)}</small></span><b>×${count}</b></button>`).join('')}<p class="panel-note">Salud ${session.health}/100 · Protección ${session.armor}/100 · Reserva ${weapon.reserve} cartuchos</p>`;
      } else {
        body.innerHTML = '<div class="phone-guide"><h3>Costa Palmera · Gran Mapa</h3><p>Cruza los grandes puentes colgantes hacia <b>Isla Fortuna</b> (Casino Royale Palma, hoteles y villas). Al norte están el <b>Distrito Cívico</b> (Comisaría Central), <b>Barrio del Sol</b> y la <b>Cárcel de Palma</b>. Al sur tienes <b>Colinas del Sur</b> y el <b>Restaurante El Mirador</b>. Sube la carretera panorámica de <b>Sierra Palmera</b> hasta tu mansión moderna <b>Casa del Mirador</b> ($350) en la cumbre.</p><h3>Controles a mano</h3><p>WASD: caminar o conducir · Mayús: correr · Espacio: saltar o frenar · F: subir, bajar o robar vehículo · E: interactuar.</p><p>1: pistola · Clic derecho/izquierdo: apuntar y disparar · R: recargar · ↑: Palma Social.</p></div>';
      }
    }
    body.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
  }
  return { update, dispose() { abort.abort(); } };
}

function journalKey(session: Session) {
  return session.journal.posts.map((post) => `${post.id}:${post.clips.length}:${post.recording}:${post.views}`).join(',');
}
