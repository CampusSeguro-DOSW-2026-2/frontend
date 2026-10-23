import type { ReactNode } from 'react';
const I = ({ children }: { children: ReactNode }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
export const Home = () => <I><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></I>;
export const MapIcon = () => <I><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></I>;
export const Bell = () => <I><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></I>;
export const Chat = () => <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
export const User = () => <I><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></I>;
export const Calendar = () => <I><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>;
export const Check = () => <I><path d="M20 6 9 17l-5-5" /></I>;
export const Search = () => <I><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></I>;
export const Filter = () => <I><path d="M22 3H2l8 9.46V19l4 2v-8.54z" /></I>;
export const Plus = () => <I><path d="M5 12h14M12 5v14" /></I>;
export const Edit = () => <I><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.4 2.6a2 2 0 0 1 3 3L12 15l-4 1 1-4z" /></I>;
export const Info = () => <I><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></I>;
export const Send = () => <I><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></I>;
export const FilePen = () => <I><path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9" /><path d="M14 2v4a2 2 0 0 0 2 2h4M10.4 12.6a2 2 0 0 1 3 3L8 21l-4 1 1-4z" /></I>;
export const Close = () => <svg className="x" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>;
export const Logo = ({ size = 64 }: { size?: number }) => (
  <img
    src="/logo.svg"
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    style={{ objectFit: 'contain' }}
  />
);
