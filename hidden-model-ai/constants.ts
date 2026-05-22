import { ClothingCategory, PoseType, ArtisticStyle } from './types';

export const BG_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light Gray', value: '#F3F4F6' },
  { name: 'Slate', value: '#1E293B' },
  { name: 'Charcoal', value: '#333333' },
  { name: 'Warm Beige', value: '#F5F5DC' },
  { name: 'Soft Blue', value: '#E0F2FE' },
  { name: 'Deep Black', value: '#000000' },
];

export const CATEGORIES = Object.values(ClothingCategory);
export const POSES = Object.values(PoseType);
export const STYLES = Object.values(ArtisticStyle);

export const LOADING_MESSAGES = [
  'Analyzing your clothing textures...',
  'Applying hidden model geometry...',
  'Adjusting lighting and shadows...',
  'Rendering final professional shot...',
  'Polishing the ghost mannequin effect...',
];
