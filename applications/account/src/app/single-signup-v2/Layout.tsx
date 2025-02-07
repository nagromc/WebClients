import { ReactNode } from 'react';

import { c } from 'ttag';

import { PublicTopBanners } from '@proton/components';
import { BRAND_NAME } from '@proton/shared/lib/constants';
import clsx from '@proton/utils/clsx';

import LayoutLogosV2 from '../public/LayoutLogosV2';
import Box from './Box';
import LayoutHeader from './LayoutHeader';
import { SignupTheme } from './interface';

import './Layout.scss';

export interface Props {
    theme: SignupTheme;
    logo: ReactNode;
    children: ReactNode;
    bottomRight?: ReactNode;
    hasDecoration?: boolean;
    headerClassName?: string;
    languageSelect?: boolean;
    onBack?: () => void;
    className?: string;
    footer?: ReactNode;
}

const Layout = ({
    theme,
    footer,
    logo,
    children,
    hasDecoration,
    headerClassName,
    languageSelect = true,
    onBack,
    bottomRight,
    className,
}: Props) => {
    return (
        <div
            className={clsx(
                'flex *:min-size-auto flex-nowrap flex-column h-full overflow-auto relative',
                theme.background === 'bf' ? 'signup-v2-bg--bf2023' : 'signup-v2-bg',
                theme.intent && `signup-v2-bg--${theme.intent.replace('proton-', '')}`,
                className
            )}
        >
            <PublicTopBanners />
            <LayoutHeader
                isDarkBg={theme.background === 'bf'}
                hasDecoration={hasDecoration}
                className={headerClassName}
                onBack={onBack}
                languageSelect={languageSelect}
                logo={logo}
            />
            <div className="flex-auto flex flex-nowrap flex-column justify-space-between mx-6">
                {children}
                {hasDecoration && (
                    <div className="flex items-center flex-column">
                        <Box className="w-full">
                            <footer
                                className="w-full min-h-custom pb-8 flex flex-column justify-space-between gap-4"
                                style={{ '--min-h-custom': '12rem' }}
                            >
                                <div className="mb-6"></div>
                                {footer}
                                <div className="w-full flex justify-space-between flex-column md:flex-row">
                                    <div className="flex gap-1 flex-column">
                                        <LayoutLogosV2 size={20} className="justify-center md:justify-start" />
                                        <span className="text-sm color-weak text-center mb-4 lg:mb-0">
                                            {
                                                // translator: full sentence 'Proton. Privacy by default.'
                                                c('Footer').t`${BRAND_NAME}. Privacy by default.`
                                            }
                                        </span>
                                    </div>
                                    {bottomRight}
                                </div>
                            </footer>
                        </Box>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Layout;
