/**
 * Tampon mémoire pour transporter les pages capturées (URIs `file://`) entre
 * l'écran de capture et l'écran de revue, sans les faire transiter par des
 * paramètres d'URL.
 */
let pages: string[] = [];

export const scanBuffer = {
  set(uris: string[]): void {
    pages = uris;
  },
  add(uri: string): void {
    pages = [...pages, uri];
  },
  get(): string[] {
    return pages;
  },
  clear(): void {
    pages = [];
  },
};
