// Métro (Expo) gère les imports CSS ; on déclare les types pour `tsc`.
declare module '*.css';

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
