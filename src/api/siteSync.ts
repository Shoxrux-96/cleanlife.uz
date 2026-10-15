import { erpApi } from './erpApi';
import {
  getStoredBeforeAfter,
  getStoredContactInfo,
  getStoredPortfolio,
  INITIAL_BEFORE_AFTER,
  INITIAL_BEFORE_AFTER_RU,
  INITIAL_CONTACT_INFO,
} from '../data/cmsInitialData';
import type {
  BeforeAfterContent,
  PortfolioProject,
  PublicContactInfo,
} from '../types';
import type { SiteLang } from '../i18n/index';

// Backend (DB) <-> Frontend mapping + localStorage cache.
// Hamma platforma (veb-sayt, dashboard, mobil) bitta DB manbadan o'qiydi;
// backend o'chiq bo'lsa localStorage keshi ishlatiladi.

type Raw = Record<string, unknown>;
const str = (v: unknown, fb = '') => (typeof v === 'string' ? v : fb);

// --- Contact info ---

export function mapSiteContact(o: Raw): PublicContactInfo {
  return {
    phone1: str(o.phone1, INITIAL_CONTACT_INFO.phone1),
    phone2: str(o.phone2, INITIAL_CONTACT_INFO.phone2),
    email: str(o.email, INITIAL_CONTACT_INFO.email),
    telegram: str(o.telegram, INITIAL_CONTACT_INFO.telegram),
    instagram: str(o.instagram, INITIAL_CONTACT_INFO.instagram),
    address: str(o.address, INITIAL_CONTACT_INFO.address),
    address_ru: str(o.address_ru, INITIAL_CONTACT_INFO.address_ru),
    workingHours: str(o.working_hours, INITIAL_CONTACT_INFO.workingHours),
    workingHours_ru: str(o.working_hours_ru, INITIAL_CONTACT_INFO.workingHours_ru),
  };
}

function toSnakeContact(info: PublicContactInfo): Raw {
  return {
    phone1: info.phone1,
    phone2: info.phone2,
    email: info.email,
    telegram: info.telegram,
    instagram: info.instagram,
    address: info.address,
    address_ru: info.address_ru || '',
    working_hours: info.workingHours,
    working_hours_ru: info.workingHours_ru || '',
  };
}

function cacheContact(info: PublicContactInfo) {
  try {
    localStorage.setItem('brendor_contact_info', JSON.stringify(info));
  } catch { /* noop */ }
}

export async function loadContactInfo(): Promise<PublicContactInfo> {
  try {
    const raw = await erpApi.site.contactInfo.get();
    const info = mapSiteContact(raw);
    cacheContact(info);
    return info;
  } catch {
    return getStoredContactInfo();
  }
}

export async function pushContactInfo(info: PublicContactInfo): Promise<void> {
  cacheContact(info);
  try {
    await erpApi.site.contactInfo.save(toSnakeContact(info));
  } catch (e) {
    console.error('Kontaktni DB ga yozishda xato:', e);
  }
}

// --- Portfolio ---

export function mapSiteProject(row: Raw): PortfolioProject {
  const d = (row.data as Raw) || {};
  return {
    ...(d as unknown as PortfolioProject),
    id: str(row.external_id, str(d.id, `proj-${row.id as number}`)),
    dbId: row.id as number,
    businessType: (row.business_type as PortfolioProject['businessType']) || (d.businessType as PortfolioProject['businessType']) || 'Restoran',
    isPublished: row.is_published !== false,
    publishedAt: str(row.published_at, str(d.publishedAt, '')),
  };
}

function toRowProject(p: PortfolioProject, lang: SiteLang): Raw {
  return {
    external_id: p.id,
    lang,
    business_type: p.businessType,
    is_published: p.isPublished !== false,
    published_at: p.publishedAt || '',
    data: {
      ...(p as unknown as Raw),
      id: undefined,
      dbId: undefined,
      isPublished: undefined,
      publishedAt: undefined,
      businessType: undefined,
    },
  };
}

function cachePortfolio(lang: SiteLang, projects: PortfolioProject[]) {
  try {
    localStorage.setItem(
      lang === 'ru' ? 'brendor_portfolio_projects_ru' : 'brendor_portfolio_projects',
      JSON.stringify(projects),
    );
  } catch { /* noop */ }
}

export async function loadPortfolio(lang: SiteLang): Promise<PortfolioProject[]> {
  try {
    const rows = await erpApi.site.portfolio.list(lang);
    const projects = rows.map(mapSiteProject);
    cachePortfolio(lang, projects);
    return projects;
  } catch {
    return getStoredPortfolio(lang);
  }
}

/** Dashboard massivini DB bilan sinxronlash: yangilash/yaratish + o'chirilganlarni o'chirish. */
export async function pushPortfolio(
  lang: SiteLang,
  next: PortfolioProject[],
  prev: PortfolioProject[],
): Promise<PortfolioProject[]> {
  cachePortfolio(lang, next);
  const nextIds = new Set(next.map((p) => p.dbId).filter(Boolean));
  const out: PortfolioProject[] = [];
  try {
    for (const gone of prev) {
      if (gone.dbId && !nextIds.has(gone.dbId)) {
        await erpApi.site.portfolio.remove(gone.dbId).catch(() => {});
      }
    }
    for (const p of next) {
      if (p.dbId) {
        await erpApi.site.portfolio.update(p.dbId, toRowProject(p, lang)).catch(() => {});
        out.push(p);
      } else {
        const withId =
          p.id && !p.id.startsWith('msg-')
            ? p
            : { ...p, id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
        const saved = await erpApi.site.portfolio
          .create(toRowProject(withId, lang))
          .catch(() => null);
        out.push(saved ? { ...withId, dbId: saved.id as number } : withId);
      }
    }
  } catch (e) {
    console.error('Portfolioni DB ga yozishda xato:', e);
    return next;
  }
  return out;
}

// --- Slider ---

function mergeSlider(seed: BeforeAfterContent, data: unknown): BeforeAfterContent {
  if (!data || typeof data !== 'object') return seed;
  const d = data as Partial<BeforeAfterContent>;
  return {
    ...seed,
    ...(d as object),
    pairs: { ...seed.pairs, ...((d.pairs as object) || {}) },
  };
}

function cacheSlider(lang: SiteLang, content: BeforeAfterContent) {
  try {
    localStorage.setItem(
      lang === 'ru' ? 'brendor_before_after_ru' : 'brendor_before_after',
      JSON.stringify(content),
    );
  } catch { /* noop */ }
}

export async function loadSlider(lang: SiteLang): Promise<BeforeAfterContent> {
  const seed = lang === 'ru' ? INITIAL_BEFORE_AFTER_RU : INITIAL_BEFORE_AFTER;
  try {
    const row = await erpApi.site.slider.get(lang);
    const content = mergeSlider(seed, row.data);
    cacheSlider(lang, content);
    return content;
  } catch {
    return getStoredBeforeAfter(lang);
  }
}

export async function pushSlider(lang: SiteLang, content: BeforeAfterContent): Promise<void> {
  cacheSlider(lang, content);
  try {
    await erpApi.site.slider.save(lang, content as unknown as Raw);
  } catch (e) {
    console.error('Slayderni DB ga yozishda xato:', e);
  }
}
