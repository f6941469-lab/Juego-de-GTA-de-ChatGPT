import '../ui/cinematic.css';
import type { DialogueCue, TitleCardCue } from './types';

export interface CinematicOverlay {
  show(chapterLabel: string): void;
  hide(): void;
  update(state: {
    letterbox: number;
    fadeBlack: number;
    flashWhite: number;
    progress: number;
    dialogue?: DialogueCue;
    titleCard?: TitleCardCue;
  }): void;
  dispose(): void;
}

export function createCinematicOverlay(onSkip: () => void): CinematicOverlay {
  if (typeof document === 'undefined') {
    return { show() {}, hide() {}, update() {}, dispose() {} };
  }

  const root = document.createElement('section');
  root.className = 'cinematic-overlay';
  root.setAttribute('aria-label', 'Escena cinemática');
  root.hidden = true;

  root.innerHTML = `
    <div class="cinematic-fade" data-el="fade"></div>
    <div class="cinematic-bar cinematic-bar-top" data-el="barTop"></div>
    <div class="cinematic-bar cinematic-bar-bottom" data-el="barBottom"></div>
    <div class="cinematic-flash" data-el="flash"></div>
    <div class="cinematic-top-bar">
      <span class="cinematic-chapter-tag" data-el="chapter"></span>
      <button type="button" class="cinematic-skip" data-el="skip">Saltar <kbd>Espacio</kbd></button>
    </div>
    <div class="cinematic-title-card" data-el="card">
      <p class="cinematic-title-eyebrow" data-el="cardEyebrow"></p>
      <h2 class="cinematic-title-main" data-el="cardTitle"></h2>
      <p class="cinematic-title-sub" data-el="cardSub"></p>
    </div>
    <div class="cinematic-subtitle-wrap" data-el="subWrap" role="status" aria-live="polite">
      <div class="cinematic-subtitle-box">
        <span class="cinematic-speaker" data-el="speaker"></span>
        <p class="cinematic-dialogue" data-el="dialogue"></p>
      </div>
    </div>
    <div class="cinematic-progress"><div class="cinematic-progress-fill" data-el="progress"></div></div>
  `;

  document.body.appendChild(root);

  const q = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-el="${name}"]`)!;
  const fadeEl = q<HTMLDivElement>('fade');
  const flashEl = q<HTMLDivElement>('flash');
  const barTop = q<HTMLDivElement>('barTop');
  const barBottom = q<HTMLDivElement>('barBottom');
  const chapterEl = q<HTMLSpanElement>('chapter');
  const skipBtn = q<HTMLButtonElement>('skip');
  const cardEl = q<HTMLDivElement>('card');
  const cardEyebrow = q<HTMLParagraphElement>('cardEyebrow');
  const cardTitle = q<HTMLHeadingElement>('cardTitle');
  const cardSub = q<HTMLParagraphElement>('cardSub');
  const subWrap = q<HTMLDivElement>('subWrap');
  const speakerEl = q<HTMLSpanElement>('speaker');
  const dialogueEl = q<HTMLParagraphElement>('dialogue');
  const progressFill = q<HTMLDivElement>('progress');

  let lastDialogueId = '';
  let lastCardId = '';

  const handleSkipClick = (event: MouseEvent) => {
    event.stopPropagation();
    onSkip();
  };
  skipBtn.addEventListener('click', handleSkipClick);

  return {
    show(chapterLabel: string) {
      chapterEl.textContent = chapterLabel;
      lastDialogueId = '';
      lastCardId = '';
      subWrap.classList.remove('visible');
      cardEl.classList.remove('visible');
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      subWrap.classList.remove('visible');
      cardEl.classList.remove('visible');
      fadeEl.style.opacity = '0';
      flashEl.style.opacity = '0';
    },
    update({ letterbox, fadeBlack, flashWhite, progress, dialogue, titleCard }) {
      barTop.style.transform = `scaleY(${letterbox.toFixed(3)})`;
      barBottom.style.transform = `scaleY(${letterbox.toFixed(3)})`;
      fadeEl.style.opacity = fadeBlack > 0.005 ? fadeBlack.toFixed(3) : '0';
      flashEl.style.opacity = flashWhite > 0.005 ? flashWhite.toFixed(3) : '0';
      progressFill.style.width = `${(Math.max(0, Math.min(1, progress)) * 100).toFixed(2)}%`;

      const nextDialogueId = dialogue?.id ?? '';
      if (nextDialogueId !== lastDialogueId) {
        lastDialogueId = nextDialogueId;
        if (dialogue) {
          speakerEl.textContent = dialogue.speaker;
          speakerEl.style.color = dialogue.speakerColor;
          dialogueEl.textContent = dialogue.text;
          subWrap.classList.add('visible');
        } else {
          subWrap.classList.remove('visible');
        }
      }

      const nextCardId = titleCard?.id ?? '';
      if (nextCardId !== lastCardId) {
        lastCardId = nextCardId;
        if (titleCard) {
          cardEyebrow.textContent = titleCard.eyebrow;
          cardTitle.textContent = titleCard.title;
          cardSub.textContent = titleCard.subtitle ?? '';
          cardSub.hidden = !titleCard.subtitle;
          cardEl.classList.add('visible');
        } else {
          cardEl.classList.remove('visible');
        }
      }
    },
    dispose() {
      skipBtn.removeEventListener('click', handleSkipClick);
      root.remove();
    },
  };
}
