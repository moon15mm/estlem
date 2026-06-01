import { TextStyle } from 'react-native';

export const fonts = {
  regular: 'NotoSansArabic_400Regular',
  medium: 'NotoSansArabic_500Medium',
  semibold: 'NotoSansArabic_600SemiBold',
  bold: 'NotoSansArabic_700Bold',
  heading: 'NotoKufiArabic_700Bold',
  headingBlack: 'NotoKufiArabic_800ExtraBold',
} as const;

export const typography: Record<string, TextStyle> = {
  h1: { fontFamily: fonts.headingBlack, fontSize: 32, lineHeight: 44 },
  h2: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 34 },
  h3: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 28 },
  h4: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  buttonSm: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
};
