import type { CSSProperties } from 'react';
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
