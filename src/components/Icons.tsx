import type { ReactNode } from 'react';
const I = ({ children }: { children: ReactNode }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
export const Home = () => <I><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></I>;
export const MapIcon = () => <I><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></I>;
export const Bell = () => <I><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></I>;
export const Chat = () => <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
export const User = () => <I><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></I>;
export const Calendar = () => <I><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>;
export const Check = () => <I><path d="M20 6 9 17l-5-5" /></I>;
