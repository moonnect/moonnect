/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  equipment?: string;
  role?: string;
  order: number;
  images?: string[];
  group?: string;
  
  // Custom case study / Live Commerce layout fields
  commerceSection1Title?: string;
  commerceSection1Lead?: string;
  commerceSection1Text1?: string;
  commerceSection1Text2?: string;
  commercePillar1Title?: string;
  commercePillar1Desc?: string;
  commercePillar2Title?: string;
  commercePillar2Desc?: string;
  commercePillar3Title?: string;
  commercePillar3Desc?: string;
  commerceResolution?: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  description: string;
  period: string;
}

export interface BtsImage {
  id: string;
  url: string;
  caption?: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface GearItem {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ContactStyles {
  badgeText?: string;
  badgeFontSize?: string;
  badgeFontWeight?: string;
  badgeFontStyle?: string;
  badgeColor?: string;
  badgeTracking?: string;
  badgeAlign?: string;
  
  headlineText?: string;
  headlineFontSize?: string;
  headlineFontWeight?: string;
  headlineFontStyle?: string;
  headlineColor?: string;
  headlineTracking?: string;
  
  emailLabelText?: string;
  emailLabelFontSize?: string;
  emailLabelFontWeight?: string;
  emailLabelFontStyle?: string;
  emailLabelColor?: string;

  emailValueFontSize?: string;
  emailValueFontWeight?: string;
  emailValueFontStyle?: string;
  emailValueColor?: string;
  
  phoneLabelText?: string;
  phoneLabelFontSize?: string;
  phoneLabelFontWeight?: string;
  phoneLabelFontStyle?: string;
  phoneLabelColor?: string;

  phoneValueFontSize?: string;
  phoneValueFontWeight?: string;
  phoneValueFontStyle?: string;
  phoneValueColor?: string;

  buttonText?: string;
  buttonFontSize?: string;
  buttonFontWeight?: string;
  buttonFontStyle?: string;
  buttonColor?: string;

  mottoText?: string;
  mottoFontSize?: string;
  mottoFontWeight?: string;
  mottoFontStyle?: string;
  mottoFontFamily?: string;
  mottoColor?: string;
  mottoTracking?: string;
}

export interface TextStyleConfig {
  text: string;
  fontSize?: string;
  tracking?: string;
  align?: string;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
  color?: string;
  wordBreak?: string;
  whiteSpace?: string;
}

export interface PortfolioData {
  name: string;
  role: string;
  heroImage?: string;
  about: string;
  aboutHeadline: string;
  goal: string;
  contact: {
    email: string;
    phone: string;
  };
  items: PortfolioItem[];
  experiences: ExperienceItem[];
  stats?: StatItem[];
  gear?: GearItem[];
  btsImages?: BtsImage[];
  groupCovers?: Record<string, string>;
  groupTitles?: Record<string, string>;
  sectionTitles?: {
    works?: string;
    experience?: string;
    about?: string;
    contact?: string;
    contactHeadline?: string;
  };
  categoryTitles?: Record<string, string>;
  contactStyles?: ContactStyles;
  textStyles?: Record<string, TextStyleConfig>;
}
