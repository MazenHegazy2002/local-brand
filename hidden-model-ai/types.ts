export enum ClothingCategory {
  MENS = 'Menswear',
  WOMENS = 'Womenswear',
  KIDS = 'Childrens Clothing',
  UNISEX = 'Unisex/Accessories',
}

export enum PoseType {
  PROFESSIONAL = 'Professional & Standing',
  DYNAMIC = 'Dynamic & Moving',
  STUDIO = 'Static Studio Pose',
  WALKING = 'Walking Pose',
  FLOATING = 'Creative Floating',
}

export enum ArtisticStyle {
  CINEMATIC = 'Cinematic Lighting',
  MINIMAL = 'Minimalist White',
  STUDIO_SOFT = 'Soft Studio Lighting',
  URBAN = 'Urban Street Style',
  VINTAGE = 'Vintage Film Look',
}

export enum GenerationType {
  IMAGE = 'Static Photo',
}

export interface GenerationConfig {
  type: GenerationType;
  category: ClothingCategory;
  pose: PoseType;
  bgColor: string;
  style: ArtisticStyle;
  image: string | null;
  designPrompt: string;
  colorName: string;
}

export interface AppState {
  isGenerating: boolean;
  resultImage: string | null;
  error: string | null;
  progressMessage: string;
  userPhoto: string | null;
  isTryOnMode: boolean;
}
