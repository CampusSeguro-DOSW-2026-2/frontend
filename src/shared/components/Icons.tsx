import type { CSSProperties, ReactNode } from 'react';
import add from '../assets/icons/add.svg';
import bell from '../assets/icons/bell.svg';
import calendar from '../assets/icons/calendar.svg';
import check from '../assets/icons/check.svg';
import cross from '../assets/icons/cross.svg';
import chat from '../assets/icons/chat.svg';
import edit from '../assets/icons/edit.svg';
import filePen from '../assets/icons/file-pen-line.svg';
import filter from '../assets/icons/filter.svg';
import home from '../assets/icons/home.svg';
import info from '../assets/icons/info.svg';
import map from '../assets/icons/map.svg';
import profile from '../assets/icons/profile.svg';
import search from '../assets/icons/search.svg';
import send from '../assets/icons/send.svg';
import logoRed from '../assets/icons/logo-red.svg';

// Iconos oficiales (docs/mockups/icons). Se pintan como máscara para heredar el color del texto (currentColor).
function Ico({ src, w, h }: { src: string; w: number; h: number }) {
  const style = { '--w': `${w}px`, '--h': `${h}px`, WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")` } as CSSProperties;
  return <span className="ico" style={style} aria-hidden="true" />;
}
export const Home = () => <Ico src={home} w={18} h={20} />;
export const MapIcon = () => <Ico src={map} w={18} h={20} />;
export const Bell = () => <Ico src={bell} w={18} h={15} />;
export const Chat = () => <Ico src={chat} w={18} h={20} />;
export const User = () => <Ico src={profile} w={15} h={20} />;
export const Calendar = () => <Ico src={calendar} w={18} h={18} />;
export const Search = () => <Ico src={search} w={24} h={24} />;
export const Filter = () => <Ico src={filter} w={24} h={24} />;
export const Plus = () => <Ico src={add} w={20} h={20} />;
export const Edit = () => <Ico src={edit} w={19} h={19} />;
export const Info = () => <Ico src={info} w={20} h={20} />;
export const Send = () => <Ico src={send} w={17} h={17} />;
export const FilePen = () => <Ico src={filePen} w={14} h={14} />;

export const Check = () => <Ico src={check} w={20} h={19} />;
export const Close = () => <Ico src={cross} w={12} h={12} />;

export const Logo = () => <img src={logoRed} width={63} height={64} alt="" aria-hidden="true" style={{ objectFit: 'contain' }} />;
// El mockup del listado vacío muestra el logo relleno en negro: se usa la silueta del logo oficial como máscara.
export const EmptyLogo = () => <span className="ico empty-logo" style={{ '--w': '337px', '--h': '344px', WebkitMaskImage: `url("${logoRed}")`, maskImage: `url("${logoRed}")` } as CSSProperties} aria-hidden="true" />;

// Iconos de MS01 sin equivalente en docs/mockups/icons.
const I = ({ children }: { children: ReactNode }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
export const Mail = () => <I><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></I>;
export const Lock = () => <I><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></I>;
export const Eye = () => <I><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></I>;
export const EyeOff = () => <I><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></I>;
export const Users = () => <I><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></I>;
export const ShieldCheck = () => <I><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></I>;

// Iconos del menú principal (mismo trazo que los de MS01).
export const MenuIcon = () => <I><path d="M4 6h16M4 12h16M4 18h16" /></I>;
export const CloseIcon = () => <I><path d="M18 6 6 18M6 6l12 12" /></I>;
export const LifeBuoy = () => <I><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M14.83 9.17l4.24-4.24M4.93 19.07l4.24-4.24" /></I>;
export const ClipboardCheck = () => <I><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></I>;
export const CalendarIcon = () => <I><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></I>;
export const CalendarPlus = () => <I><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5" /></I>;
export const Megaphone = () => <I><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></I>;
export const BellIcon = () => <I><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></I>;
export const MapLine = () => <I><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></I>;
export const ChatIcon = () => <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
export const UserIcon = () => <I><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;
export const HomeIcon = () => <I><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></I>;
export const LogOut = () => <I><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></I>;
