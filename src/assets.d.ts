/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [key: string]: string };
  export default content;
}

declare module 'leaflet/dist/leaflet.css';

declare module '*.jpg' {
  const source: string;
  export default source;
}

declare module '*.jpeg' {
  const source: string;
  export default source;
}

declare module '*.png' {
  const source: string;
  export default source;
}

declare module '*.svg' {
  const source: string;
  export default source;
}
