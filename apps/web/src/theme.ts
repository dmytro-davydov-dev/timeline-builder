import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1f2d5c' },
    secondary: { main: '#b3261e' }, // accident-date marker red, per Architecture §7.1
  },
  shape: { borderRadius: 8 },
});
