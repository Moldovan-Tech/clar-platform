import {
  FolderKanban,
  BookOpen,
  Briefcase,
  CalendarDays,
  Compass,
  LayoutDashboard,
  Target,
  UserCheck,
  type LucideIcon
} from 'lucide-react';
import type { AppTab } from './types';
import { messages } from './i18n/locale';

export interface Section {
  tab: AppTab;
  // Nombre completo (pestañas de escritorio y nombre accesible en todos los tamaños)
  label: string;
  // Nombre corto de la barra inferior del móvil; está contenido en `label`, así se oye lo que se ve
  short: string;
  icon: LucideIcon;
  // Solo icono en escritorio: con su nombre la cabecera no cabe en una línea a 1280 px
  iconOnly?: boolean;
}

type SectionNames = Record<AppTab, { label: string; short: string }>;

const m = messages<{ sections: SectionNames; pending: (n: number) => string }>(
  {
    sections: {
      home: { label: 'Inicio', short: 'Inicio' },
      tasks: { label: 'Listas', short: 'Listas' },
      agenda: { label: 'Agenda', short: 'Agenda' },
      wheel: { label: 'Rueda de la Vida', short: 'Rueda' },
      goals: { label: 'Metas', short: 'Metas' },
      projects: { label: 'Proyectos', short: 'Proyectos' },
      help: { label: 'Ayuda', short: 'Ayuda' },
      access: { label: 'Administración', short: 'Administración' }
    },
    pending: (n) => `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`
  },
  {
    sections: {
      home: { label: 'Home', short: 'Home' },
      tasks: { label: 'Lists', short: 'Lists' },
      agenda: { label: 'Agenda', short: 'Agenda' },
      wheel: { label: 'Wheel of Life', short: 'Wheel' },
      goals: { label: 'Goals', short: 'Goals' },
      projects: { label: 'Projects', short: 'Projects' },
      help: { label: 'Help', short: 'Help' },
      access: { label: 'Admin', short: 'Admin' }
    },
    pending: (n) => `${n} pending`
  }
);

export const SECTIONS: Section[] = [
  { tab: 'home', ...m.sections.home, icon: LayoutDashboard },
  { tab: 'tasks', ...m.sections.tasks, icon: Briefcase },
  { tab: 'agenda', ...m.sections.agenda, icon: CalendarDays },
  { tab: 'wheel', ...m.sections.wheel, icon: Compass },
  { tab: 'goals', ...m.sections.goals, icon: Target },
  { tab: 'projects', ...m.sections.projects, icon: FolderKanban },
  { tab: 'help', ...m.sections.help, icon: BookOpen, iconOnly: true }
];

// Solo para la administración (solicitudes de acceso y mensajes de contacto), delante de «Ayuda»
const ACCESS_SECTION: Section = {
  tab: 'access',
  ...m.sections.access,
  icon: UserCheck,
  iconOnly: true
};

export const sectionsFor = (isAdmin: boolean) =>
  isAdmin ? [...SECTIONS.slice(0, -1), ACCESS_SECTION, ...SECTIONS.slice(-1)] : SECTIONS;

// En el móvil estas van en la barra inferior; las demás (la Rueda incluida), en «Más»
export const PRIMARY_TABS: readonly AppTab[] = ['home', 'tasks', 'agenda', 'goals'];

// Nombre accesible con lo pendiente en administración: solicitudes y mensajes nuevos (el globo es solo visual)
export const sectionLabel = ({ tab, label }: Section, pendingAccessCount: number) =>
  tab === 'access' && pendingAccessCount > 0 ? `${label}, ${m.pending(pendingAccessCount)}` : label;
