import { useTheme, getHoverColor } from '../contexts/ThemeContext';

export function useThemeStyles() {
  const { themeColor } = useTheme();
  const hoverColor = getHoverColor(themeColor);

  return {
    themeColor,
    hoverColor,
    buttonStyle: {
      backgroundColor: themeColor,
      color: 'white',
    },
    buttonHoverStyle: {
      backgroundColor: hoverColor,
    },
    buttonClassName: `text-white`,
    // For inline styles
    getButtonStyle: (isHover = false) => ({
      backgroundColor: isHover ? hoverColor : themeColor,
      color: 'white',
    }),
  };
}


