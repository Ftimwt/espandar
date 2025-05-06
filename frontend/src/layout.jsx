import {Container} from "@mui/material";
import * as React from 'react';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import {prefixer} from 'stylis';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';

const theme = (outerTheme) =>
    createTheme({
        direction: 'rtl',
    });

const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
});

/**
 *
 * @param children {{children: React.ReactNode}}
 * @returns {JSX.Element}
 * @constructor
 */
const Layout = ({children}) => {
    return <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
            <Container dir="rtl">
                {children}
            </Container>
        </ThemeProvider>
    </CacheProvider>
}

export default Layout;