// Progresso salvo no aparelho (localStorage): missões liberadas, estrelas, recordes, modo difícil e opções.
const KEY = 'ibamaman.save.v1';

const DEFAULT = {
  unlocked: 1,          // maior missão liberada
  stars: {},            // { [missão]: [animais, semDano, tempo] } (melhor resultado de cada estrela)
  best: {},             // { [missão]: maior pontuação }
  highScore: 0,         // maior pontuação de campanha
  campaignDone: false,  // terminou as 4 missões (libera o modo difícil)
  hard: false,          // modo difícil ligado
  tipsDone: false,      // já viu as dicas da Missão 1
  music: true,
  sfx: true,
  pecOpened: 0          // quantas vezes abriu a consulta pública (só estatística local)
};

let data = null;

function load() {
  if (data) return data;
  try { data = { ...DEFAULT, ...JSON.parse(window.localStorage.getItem(KEY) || '{}') }; } catch (e) { data = { ...DEFAULT }; }
  return data;
}

function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sem storage: só nesta sessão */ }
}

export const Save = {
  get() { return load(); },
  set(patch) { Object.assign(load(), patch); persist(); return data; },

  starsOf(id) { return load().stars[id] || [false, false, false]; },
  starCount(id) { return this.starsOf(id).filter(Boolean).length; },
  totalStars() { return Object.keys(load().stars).reduce((n, id) => n + this.starCount(id), 0); },

  // grava o resultado de uma missão vencida; devolve o que é novo (para destacar na tela)
  recordWin(id, stars, score, lastId) {
    const d = load();
    const old = this.starsOf(id);
    const merged = old.map((v, i) => v || stars[i]);
    const newStars = stars.map((v, i) => v && !old[i]);
    const newBest = score > (d.best[id] || 0);
    d.stars[id] = merged;
    if (newBest) d.best[id] = score;
    d.unlocked = Math.max(d.unlocked, Math.min(id + 1, lastId));
    if (id === lastId) d.campaignDone = true;
    const newHigh = score > d.highScore;
    if (newHigh) d.highScore = score;
    persist();
    return { newStars, newBest, newHigh };
  }
};
